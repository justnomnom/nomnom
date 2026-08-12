import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

/** @typedef {'openai' | 'anthropic' | 'google' | 'qwen'} RestaurantSearchAiProvider */

const ALLOWED = /** @type {const} */ (['openai', 'anthropic', 'google', 'qwen']);

/**
 * @param {string | null | undefined} override
 * @returns {RestaurantSearchAiProvider}
 */
export function resolveRestaurantSearchProvider(override) {
  const fromEnv = process.env.RESTAURANT_SEARCH_AI_PROVIDER || 'openai';
  const raw =
    override && ALLOWED.includes(/** @type {RestaurantSearchAiProvider} */ (override))
      ? override
      : fromEnv;
  return ALLOWED.includes(/** @type {RestaurantSearchAiProvider} */ (raw))
    ? /** @type {RestaurantSearchAiProvider} */ (raw)
    : 'openai';
}

/**
 * Returns a language model for structured restaurant search planning.
 *
 * Note: the `qwen` provider is NOT served here. Qwen (DashScope / OpenRouter, OpenAI-compatible)
 * runs through the same raw `response_format: json_object` helper as restaurant ingest
 * (`qwenJsonChat`), called directly from `mapUserQueryToSearchPlan` — the AI SDK's structured
 * output relies on tool-calling, which is unreliable on those endpoints for this model.
 *
 * @param {{ providerOverride?: string | null }} [opts]
 */
export function getRestaurantSearchLanguageModel(opts = {}) {
  const provider = resolveRestaurantSearchProvider(opts.providerOverride ?? null);

  switch (provider) {
    case 'openai': {
      const key = process.env.OPENAI_API_KEY;
      if (!key) {
        throw new Error('OPENAI_API_KEY is not set');
      }
      const openai = createOpenAI({ apiKey: key });
      const modelId = process.env.RESTAURANT_SEARCH_OPENAI_MODEL || 'gpt-4o-mini';
      return openai(modelId);
    }
    case 'anthropic': {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) {
        throw new Error('ANTHROPIC_API_KEY is not set');
      }
      const anthropic = createAnthropic({ apiKey: key });
      const modelId = process.env.RESTAURANT_SEARCH_ANTHROPIC_MODEL || 'claude-sonnet-4-5';
      return anthropic(modelId);
    }
    case 'google': {
      const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!key) {
        throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set');
      }
      const google = createGoogleGenerativeAI({ apiKey: key });
      const modelId = process.env.RESTAURANT_SEARCH_GOOGLE_MODEL || 'gemini-2.0-flash';
      return google(modelId);
    }
    default:
      // `qwen` is intentionally handled in `mapUserQueryToSearchPlan` (see note above), so it
      // should never reach here. Any other value is a misconfiguration.
      throw new Error(`Unsupported RESTAURANT_SEARCH_AI_PROVIDER: ${provider}`);
  }
}

export const RESTAURANT_SEARCH_AI_PROVIDERS = ALLOWED;
