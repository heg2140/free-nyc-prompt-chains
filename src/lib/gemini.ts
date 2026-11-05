import { MODELS } from "@/lib/chain";
import { NEIGHBORHOODS } from "@/lib/explore-constants";

const TIMEOUT_MS = 45_000;
// Busy (503), rate limited (429), server error (500): worth retrying.
const RETRY_STATUSES = new Set([429, 500, 503]);
const RETRY_DELAYS_MS = [1_000, 3_000];

class RetryableError extends Error {}

// Same shape the main Free NYC app asks Gemini for.
const SUGGESTIONS_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      title: { type: "STRING" },
      description: { type: "STRING" },
      neighborhood: { type: "STRING", enum: [...NEIGHBORHOODS] },
      transit_directions: { type: "STRING" },
    },
    required: ["title", "description", "neighborhood", "transit_directions"],
  },
};

type Request = {
  model: string;
  systemPrompt: string | null;
  userPrompt: string;
  temperature: number | null;
  wantSuggestions: boolean;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Calls the step's model, retrying briefly when Gemini is busy, then falls
// back to the other models (like the main Free NYC app does). Returns the
// model that actually answered so runs record it.
export async function generate(request: Request): Promise<{ text: string; model: string }> {
  const fallbacks = MODELS.filter((m) => m !== request.model);
  let lastError: unknown;

  for (const [attempt, delay] of [0, ...RETRY_DELAYS_MS].entries()) {
    if (attempt > 0) await sleep(delay);
    try {
      return { text: await callModel(request), model: request.model };
    } catch (err) {
      if (!(err instanceof RetryableError)) throw err;
      lastError = err;
    }
  }
  for (const model of fallbacks) {
    try {
      return { text: await callModel({ ...request, model }), model };
    } catch (err) {
      if (!(err instanceof RetryableError)) throw err;
      lastError = err;
    }
  }
  throw lastError;
}

async function callModel({
  model,
  systemPrompt,
  userPrompt,
  temperature,
  wantSuggestions,
}: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("The server is missing GEMINI_API_KEY.");

  const generationConfig: Record<string, unknown> = {};
  if (temperature !== null) generationConfig.temperature = temperature;
  if (wantSuggestions) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = SUGGESTIONS_SCHEMA;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        ...(systemPrompt ? { systemInstruction: { parts: [{ text: systemPrompt }] } } : {}),
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }
  ).catch((err) => {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new RetryableError(`${model} didn't answer within ${TIMEOUT_MS / 1000} seconds.`);
    }
    throw err;
  });

  if (!response.ok) {
    const detail = await response.text();
    let message = detail;
    try {
      message = JSON.parse(detail)?.error?.message ?? detail;
    } catch {}
    const Err = RETRY_STATUSES.has(response.status) ? RetryableError : Error;
    throw new Err(`${model} returned ${response.status}: ${message}`);
  }

  const data = await response.json();
  const parts: { text?: string }[] = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p.text ?? "").join("");
  if (!text) {
    const reason = data?.candidates?.[0]?.finishReason ?? data?.promptFeedback?.blockReason;
    throw new Error(`${model} returned no text${reason ? ` (${reason})` : ""}.`);
  }
  return text;
}
