import { MODELS } from "@/lib/chain";
import { NEIGHBORHOODS } from "@/lib/explore-constants";

const TIMEOUT_MS = 45_000;
// Busy or server error: worth trying the same model again after a pause.
const BUSY_STATUSES = new Set([500, 503]);
// Out of quota: the same model won't recover soon, so go straight to the next.
const QUOTA_STATUS = 429;
const BUSY_RETRY_DELAYS_MS = [1_500, 4_000];
// Don't start another attempt with less than this left before the deadline.
const MIN_ATTEMPT_MS = 8_000;

// A failure that another attempt (or another model) might get past.
class RetryableError extends Error {
  constructor(
    readonly summary: string,
    readonly retrySameModel: boolean
  ) {
    super(summary);
  }
}

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

// "a: busy · a: busy · b: timed out" -> "a: busy ×2 · b: timed out"
function summarize(attempts: string[]) {
  const counts = new Map<string, number>();
  for (const a of attempts) counts.set(a, (counts.get(a) ?? 0) + 1);
  const list = [...counts].map(([a, n]) => (n > 1 ? `${a} ×${n}` : a)).join(" · ");
  return `No model could answer. ${list}`;
}

// Calls the step's model, retrying briefly when Gemini is busy, then falls
// back to the other models (like the main Free NYC app does). Stops before
// `deadline` (a Date.now() timestamp) so the whole run fits in the server's
// time limit. Returns the model that actually answered so runs record it.
export async function generate(
  request: Request,
  deadline: number
): Promise<{ text: string; model: string }> {
  const models = [request.model, ...MODELS.filter((m) => m !== request.model)];
  const attempts: string[] = [];

  for (const model of models) {
    for (let retry = 0; retry <= BUSY_RETRY_DELAYS_MS.length; retry++) {
      if (retry > 0) await sleep(BUSY_RETRY_DELAYS_MS[retry - 1]);
      const timeLeft = deadline - Date.now();
      if (timeLeft < MIN_ATTEMPT_MS) {
        attempts.push("ran out of time");
        throw new Error(summarize(attempts));
      }
      try {
        return { text: await callModel({ ...request, model }, Math.min(TIMEOUT_MS, timeLeft)), model };
      } catch (err) {
        if (!(err instanceof RetryableError)) throw err;
        attempts.push(`${model}: ${err.summary}`);
        if (!err.retrySameModel) break;
      }
    }
  }
  throw new Error(summarize(attempts));
}

async function callModel({
  model,
  systemPrompt,
  userPrompt,
  temperature,
  wantSuggestions,
}: Request, timeoutMs: number) {
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
      signal: AbortSignal.timeout(timeoutMs),
    }
  ).catch((err) => {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new RetryableError(`timed out after ${Math.round(timeoutMs / 1000)}s`, false);
    }
    throw err;
  });

  if (!response.ok) {
    const detail = await response.text();
    let message = detail;
    try {
      message = JSON.parse(detail)?.error?.message ?? detail;
    } catch {}
    if (BUSY_STATUSES.has(response.status)) throw new RetryableError(`busy (${response.status})`, true);
    if (response.status === QUOTA_STATUS) throw new RetryableError("out of quota (429)", false);
    throw new Error(`${model} returned ${response.status}: ${message}`);
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
