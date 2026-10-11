import { env } from "./env";
import { logger } from "./logger";

/**
 * Minimal OpenAI-compatible Gemini client.
 * Uses the deployed Gemini Web2API service on Vercel.
 */

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GeminiChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

interface GeminiChoice {
  message: { role: string; content: string };
}

interface GeminiResponse {
  choices: GeminiChoice[];
}

export async function geminiChat(options: GeminiChatOptions): Promise<string> {
  const { messages, temperature = 0.7, maxTokens = 4096, timeoutMs = 30_000 } = options;

  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const url = `${env.GEMINI_API_BASE_URL}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.GEMINI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.GEMINI_MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Gemini API returned ${res.status}: ${body.slice(0, 200)}`);
    }

    const data: GeminiResponse = await res.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Gemini returned empty response");
    }

    return content;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Call Gemini expecting a JSON response. Attempts to extract JSON from markdown fences.
 * Retries once on parse failure with a repair prompt.
 */
export async function geminiJsonChat<T>(options: GeminiChatOptions): Promise<T> {
  const raw = await geminiChat(options);
  const parsed = tryParseJson<T>(raw);
  if (parsed !== null) return parsed;

  // Retry with repair prompt
  logger.warn({
    module: "gemini",
    action: "JSON_PARSE_RETRY",
    status: "STARTED",
    message: "First Gemini response was not valid JSON, retrying with repair prompt",
  });

  const repairMessages: ChatMessage[] = [
    ...options.messages,
    { role: "assistant", content: raw },
    {
      role: "user",
      content:
        "Your previous response was not valid JSON. Please output ONLY valid JSON with no markdown fences, no commentary, no text before or after the JSON array. Output just the raw JSON array.",
    },
  ];

  const repairRaw = await geminiChat({ ...options, messages: repairMessages });
  const repaired = tryParseJson<T>(repairRaw);
  if (repaired !== null) return repaired;

  throw new Error(`Gemini returned invalid JSON after retry. Raw: ${repairRaw.slice(0, 300)}`);
}

function tryParseJson<T>(raw: string): T | null {
  // Try direct parse
  try {
    return JSON.parse(raw);
  } catch {
    // noop
  }

  // Extract from markdown code fences
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // noop
    }
  }

  // Try to find JSON array or object boundaries
  const arrayMatch = raw.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {
      // noop
    }
  }

  const objMatch = raw.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]);
    } catch {
      // noop
    }
  }

  return null;
}
