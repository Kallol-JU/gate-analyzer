import { env } from '../../config/env.js';

/** An AI-provider failure with a message that is safe to show to an admin (never contains the API key). */
export class AiError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AiError';
    this.code = code;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Minimal Gemini REST client (no SDK dependency). `generateJson` forces structured JSON output through
 * responseSchema, retries only transient failures (429 and 5xx) with backoff, and enforces a timeout and
 * an output-token cap so one request cannot run up the bill.
 */
export function createGeminiClient({ apiKey, model, timeoutMs, maxRetries, fetchImpl = fetch }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  async function generateJson({ system, user, schema, maxOutputTokens, temperature = 0.7 }) {
    const body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature, maxOutputTokens, responseMimeType: 'application/json', responseSchema: schema },
    };

    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetchImpl(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, // header, never in the URL or logs
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          const candidate = data.candidates?.[0];
          const text = (candidate?.content?.parts ?? []).map((p) => p.text ?? '').join('');
          if (!text) throw new AiError('AI_EMPTY', `The model returned no content${candidate?.finishReason ? ` (${candidate.finishReason})` : ''}.`);
          if (candidate.finishReason === 'MAX_TOKENS') throw new AiError('AI_TRUNCATED', 'The model response was cut off. Ask for fewer questions per request.');
          return { text, usage: { promptTokens: data.usageMetadata?.promptTokenCount ?? 0, outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0 } };
        }
        const detail = (await res.json().catch(() => null))?.error?.message ?? res.statusText;
        if (res.status === 429 || res.status >= 500) {
          lastError = new AiError('AI_UNAVAILABLE', `Gemini is busy or unavailable (HTTP ${res.status}).`);
        } else if (res.status === 401 || res.status === 403) {
          throw new AiError('AI_AUTH', 'Gemini rejected the API key. Check GEMINI_API_KEY and that the Generative Language API is enabled.');
        } else {
          throw new AiError('AI_REQUEST', `Gemini rejected the request (HTTP ${res.status}): ${String(detail).slice(0, 200)}`);
        }
      } catch (err) {
        if (err instanceof AiError && !['AI_UNAVAILABLE'].includes(err.code)) throw err;
        lastError = err instanceof AiError ? err : new AiError('AI_NETWORK', err.name === 'AbortError' ? 'Gemini did not respond in time.' : 'Could not reach Gemini.');
      } finally {
        clearTimeout(timer);
      }
      if (attempt < maxRetries) await sleep(1000 * 2 ** attempt + Math.random() * 300);
    }
    throw lastError;
  }

  return { model, generateJson };
}

let override;
let cached;

/** Tests inject a fake client here, so no test ever calls the real API. */
export function setAiClientForTests(client) {
  override = client;
}

/** The configured client, or null when GEMINI_API_KEY is not set. The key never leaves the server. */
export function getAiClient() {
  if (override !== undefined) return override;
  if (!env.GEMINI_API_KEY) return null;
  cached ??= createGeminiClient({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL, timeoutMs: env.GEMINI_TIMEOUT_MS, maxRetries: env.AI_MAX_RETRIES });
  return cached;
}
