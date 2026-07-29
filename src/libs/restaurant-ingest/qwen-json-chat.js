/**
 * Shared Qwen (DashScope OpenAI-compatible) JSON chat helper used by every
 * restaurant-ingest LLM call. Centralizes timeout, single retry on transient
 * failures (429 / 5xx), JSON-mode response parsing, and fail-open behavior.
 *
 * Returns the parsed JSON object on success, or null on:
 *   - missing API key
 *   - non-retriable HTTP error
 *   - retried-but-still-failed transient HTTP error
 *   - timeout / network error
 *   - unparseable response content
 *
 * Callers should treat null as "no signal" and skip persistence.
 */

import { QWEN_API } from 'src/config-global';

const DEFAULT_TIMEOUT_MS = 25_000;
const RETRY_DELAY_MS = 500;

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * @typedef {{ ok: true, data: Record<string, unknown> }
 *   | { ok: false, retriable: boolean }} AttemptResult
 */

/**
 * Single HTTP attempt. Caller decides whether to retry based on `retriable`.
 * @param {{
 *   url: string,
 *   key: string,
 *   body: string,
 *   timeoutMs: number,
 *   logTag: string,
 * }} params
 * @returns {Promise<AttemptResult>}
 */
async function attemptQwenCall({ url, key, body, timeoutMs, logTag }) {
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body,
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      const retriable = res.status === 429 || res.status >= 500;
      console.error(`[${logTag}] Qwen HTTP`, res.status, txt.slice(0, 500));
      return { ok: false, retriable };
    }

    const respBody = await res.json();
    const content = respBody?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return { ok: false, retriable: false };

    try {
      return { ok: true, data: JSON.parse(content) };
    } catch {
      console.error(`[${logTag}] JSON parse failed`);
      return { ok: false, retriable: false };
    }
  } catch (e) {
    // AbortError / network errors are not retried — likely config or DNS issues
    // where a second attempt won't help, and we'd rather fail fast.
    if (e?.name === 'AbortError') {
      console.error(`[${logTag}] Qwen timeout`);
    } else {
      console.error(`[${logTag}]`, e);
    }
    return { ok: false, retriable: false };
  } finally {
    clearTimeout(to);
  }
}

/**
 * @param {{
 *   system: string,
 *   user: string | object,
 *   model?: string,
 *   maxTokens?: number,
 *   temperature?: number,
 *   timeoutMs?: number,
 *   logTag?: string,
 * }} params — `model` overrides the configured `QWEN_MODEL` (e.g. NL search uses a stronger model).
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function qwenJsonChat({
  system,
  user,
  model: modelOverride,
  maxTokens = 1024,
  temperature = 0.2,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  logTag = 'qwenJsonChat',
}) {
  const { key, model, baseUrl } = QWEN_API;
  if (!key || typeof key !== 'string') return null;

  const url = `${baseUrl}/chat/completions`;
  const body = JSON.stringify({
    model: modelOverride?.trim() || model?.trim() || 'qwen-turbo',
    temperature,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: typeof user === 'string' ? user : JSON.stringify(user) },
    ],
  });

  const first = await attemptQwenCall({ url, key, body, timeoutMs, logTag });
  if (first.ok) return first.data;
  if (!first.retriable) return null;

  await sleep(RETRY_DELAY_MS);
  const second = await attemptQwenCall({ url, key, body, timeoutMs, logTag });
  return second.ok ? second.data : null;
}
