/**
 * DashScope/Qwen JSON chat for Remotion ops scripts.
 * Do not import src/libs/restaurant-ingest/qwen-json-chat.js (Next/Sentry).
 * Fail closed: missing env or unparseable JSON throws.
 */

const DEFAULT_TIMEOUT_MS = 25_000;
const RETRY_DELAY_MS = 500;

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Require Qwen env after the same dotenv load as supabase-client.mjs.
 * @returns {{ key: string, baseUrl: string, model: string }}
 */
export function requireQwenEnv() {
  const key = process.env.QWEN_API_KEY?.trim();
  const baseUrl = process.env.QWEN_BASE_URL?.trim();
  const model = process.env.QWEN_MODEL?.trim();
  if (!key) {
    throw new Error('Missing QWEN_API_KEY (repo-root .env.local / .env)');
  }
  if (!baseUrl) {
    throw new Error('Missing QWEN_BASE_URL (repo-root .env.local / .env)');
  }
  if (!model) {
    throw new Error('Missing QWEN_MODEL (repo-root .env.local / .env)');
  }
  return { key, baseUrl, model };
}

/**
 * @param {{
 *   system: string,
 *   user: string | object,
 *   maxTokens?: number,
 *   temperature?: number,
 *   timeoutMs?: number,
 *   logTag?: string,
 * }} params
 * @returns {Promise<Record<string, unknown>>}
 */
export async function qwenJsonChat({
  system,
  user,
  maxTokens = 4096,
  temperature = 0.2,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  logTag = 'article-to-list',
}) {
  const { key, baseUrl, model } = requireQwenEnv();
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const userContent = typeof user === 'string' ? user : JSON.stringify(user);
  const body = JSON.stringify({
    model,
    temperature,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userContent },
    ],
  });

  const attempt = async () => {
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
      const txt = await res.text().catch(() => '');
      if (!res.ok) {
        const retriable = res.status === 429 || res.status >= 500;
        return { ok: false, retriable, error: `Qwen HTTP ${res.status} ${txt.slice(0, 400)}` };
      }
      let respBody;
      try {
        respBody = JSON.parse(txt);
      } catch {
        return { ok: false, retriable: false, error: `[${logTag}] Qwen response was not JSON` };
      }
      const content = respBody?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        return { ok: false, retriable: false, error: `[${logTag}] Qwen response missing message content` };
      }
      try {
        const data = JSON.parse(content);
        if (!data || typeof data !== 'object') {
          return { ok: false, retriable: false, error: `[${logTag}] Qwen JSON was not an object` };
        }
        return { ok: true, data };
      } catch {
        return { ok: false, retriable: false, error: `[${logTag}] Qwen message content was not JSON` };
      }
    } catch (e) {
      const msg = e?.name === 'AbortError' ? `[${logTag}] Qwen timeout` : `[${logTag}] ${e?.message || e}`;
      return { ok: false, retriable: false, error: msg };
    } finally {
      clearTimeout(to);
    }
  };

  const first = await attempt();
  if (first.ok) return first.data;
  if (!first.retriable) {
    throw new Error(first.error);
  }
  await sleep(RETRY_DELAY_MS);
  const second = await attempt();
  if (second.ok) return second.data;
  throw new Error(second.error || first.error);
}
