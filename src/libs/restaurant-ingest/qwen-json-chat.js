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

import * as Sentry from '@sentry/nextjs';

import { QWEN_API, SENTRY_API, INTEGRATION_FLAGS } from 'src/config-global';

const DEFAULT_TIMEOUT_MS = 25_000;
const RETRY_DELAY_MS = 500;
const SPAN_TEXT_MAX = 8_000;

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * @param {unknown} value
 * @returns {string}
 */
function truncateForSpan(value) {
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  if (typeof s !== 'string') return '';
  return s.length > SPAN_TEXT_MAX ? `${s.slice(0, SPAN_TEXT_MAX)}…` : s;
}

/**
 * @typedef {{ ok: true, data: Record<string, unknown>, usage?: Record<string, number>, responseId?: string, responseModel?: string }
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

    /** @type {Record<string, number> | undefined} */
    let usage;
    if (respBody?.usage && typeof respBody.usage === 'object') {
      usage = {
        prompt_tokens: Number(respBody.usage.prompt_tokens) || 0,
        completion_tokens: Number(respBody.usage.completion_tokens) || 0,
        total_tokens: Number(respBody.usage.total_tokens) || 0,
      };
    }

    try {
      return {
        ok: true,
        data: JSON.parse(content),
        usage,
        responseId: typeof respBody?.id === 'string' ? respBody.id : undefined,
        responseModel: typeof respBody?.model === 'string' ? respBody.model : undefined,
      };
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
 * @param {import('@sentry/core').Span | undefined} span
 * @param {Extract<AttemptResult, { ok: true }>} result
 */
function applySuccessAttributes(span, result) {
  if (!span) return;
  if (result.responseId) span.setAttribute('gen_ai.response.id', result.responseId);
  if (result.responseModel) span.setAttribute('gen_ai.response.model', result.responseModel);
  if (result.usage) {
    span.setAttribute('gen_ai.usage.input_tokens', result.usage.prompt_tokens);
    span.setAttribute('gen_ai.usage.output_tokens', result.usage.completion_tokens);
    span.setAttribute('gen_ai.usage.total_tokens', result.usage.total_tokens);
  }
  span.setAttribute('gen_ai.output.messages', truncateForSpan(result.data));
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

  const resolvedModel = modelOverride?.trim() || model?.trim() || 'qwen-turbo';
  const url = `${baseUrl}/chat/completions`;
  const userContent = typeof user === 'string' ? user : JSON.stringify(user);
  const body = JSON.stringify({
    model: resolvedModel,
    temperature,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userContent },
    ],
  });

  /**
   * @param {import('@sentry/core').Span | undefined} [span]
   * @returns {Promise<Record<string, unknown> | null>}
   */
  const run = async (span) => {
    const first = await attemptQwenCall({ url, key, body, timeoutMs, logTag });
    if (first.ok) {
      applySuccessAttributes(span, first);
      return first.data;
    }
    if (!first.retriable) {
      span?.setStatus({ code: 2, message: 'internal_error' });
      return null;
    }

    await sleep(RETRY_DELAY_MS);
    const second = await attemptQwenCall({ url, key, body, timeoutMs, logTag });
    if (second.ok) {
      applySuccessAttributes(span, second);
      span?.setAttribute('gen_ai.request.retried', true);
      return second.data;
    }
    span?.setStatus({ code: 2, message: 'internal_error' });
    return null;
  };

  const sentryOn = INTEGRATION_FLAGS.sentry && !!SENTRY_API.dsn;
  if (!sentryOn || typeof Sentry.startSpan !== 'function') {
    return run();
  }

  return Sentry.startSpan(
    {
      name: `chat ${resolvedModel}`,
      op: 'gen_ai.chat',
      attributes: {
        'gen_ai.operation.name': 'chat',
        'gen_ai.system': 'qwen',
        'gen_ai.request.model': resolvedModel,
        'gen_ai.request.temperature': temperature,
        'gen_ai.request.max_tokens': maxTokens,
        'gen_ai.agent.name': logTag,
        'gen_ai.input.messages': truncateForSpan([
          { role: 'system', content: system },
          { role: 'user', content: userContent },
        ]),
      },
    },
    (span) => run(span)
  );
}
