// Shared types and prompt templating for prompt chains.

export type OutputType = "text" | "suggestions";

export type Chain = {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Step = {
  id: number;
  chain_id: number;
  step_order: number;
  title: string;
  model: string;
  temperature: number | null;
  system_prompt: string | null;
  user_prompt: string;
  output_type: OutputType;
};

export type RunInputs = {
  startingPoint: string;
  // Missing on runs made before the address autocomplete was added.
  startingLat?: number;
  startingLon?: number;
  activityType: string;
  timeOfDay: string;
  maxTravelMinutes: number;
  neighborhood: string | null;
};

export type Suggestion = {
  title: string;
  description: string;
  neighborhood: string;
  transit_directions: string;
};

// The first is the default for new steps. The order is also the fallback
// order when a step's model is busy.
export const MODELS = [
  "gemini-3.6-flash",
  "gemini-flash-latest",
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  // No Pro models: the free Gemini tier has no Pro quota at all.
] as const;

export const INPUT_VARIABLES = [
  { name: "startingPoint", help: "Address the search starts from" },
  { name: "startingCoordinates", help: "Latitude, longitude of the starting point" },
  { name: "activityType", help: "e.g. Art / museums" },
  { name: "timeOfDay", help: "Morning, Afternoon, Evening or Night" },
  { name: "maxTravelMinutes", help: "Maximum one-way travel time" },
  { name: "neighborhood", help: 'A neighborhood, or "any neighborhood"' },
] as const;

const INPUT_NAMES = new Set<string>(INPUT_VARIABLES.map((v) => v.name));
const VARIABLE = /\$\{([A-Za-z0-9_]+)\}/g;
const STEP_OUTPUT = /^step(\d+)Output$/;

// Problems with the ${...} variables a step uses, given its position.
// A step can only read the outputs of the steps that run before it.
export function variableProblems(step: Pick<Step, "system_prompt" | "user_prompt">, position: number) {
  const problems: string[] = [];
  const text = `${step.system_prompt ?? ""}\n${step.user_prompt}`;
  for (const [, name] of text.matchAll(VARIABLE)) {
    if (INPUT_NAMES.has(name)) continue;
    if (name === "previousOutput") {
      if (position === 1) problems.push("${previousOutput} is empty in step 1");
      continue;
    }
    const match = name.match(STEP_OUTPUT);
    if (match) {
      const n = Number(match[1]);
      if (n < 1 || n >= position) problems.push(`\${${name}} isn't available until after step ${n}`);
      continue;
    }
    problems.push(`\${${name}} isn't a known variable`);
  }
  return [...new Set(problems)];
}

export function renderPrompt(template: string, inputs: RunInputs, outputs: string[]) {
  const values: Record<string, string> = {
    startingPoint: inputs.startingPoint,
    startingCoordinates:
      inputs.startingLat !== undefined && inputs.startingLon !== undefined
        ? `${inputs.startingLat}, ${inputs.startingLon}`
        : "unknown",
    activityType: inputs.activityType,
    timeOfDay: inputs.timeOfDay,
    maxTravelMinutes: String(inputs.maxTravelMinutes),
    neighborhood: inputs.neighborhood ?? "any neighborhood",
    previousOutput: outputs.at(-1) ?? "",
  };
  outputs.forEach((output, i) => {
    values[`step${i + 1}Output`] = output;
  });
  return template.replace(VARIABLE, (whole, name: string) => values[name] ?? whole);
}

export function isSuggestion(value: unknown): value is Suggestion {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.title === "string" &&
    typeof v.description === "string" &&
    typeof v.neighborhood === "string" &&
    typeof v.transit_directions === "string"
  );
}

export function parseId(raw: unknown) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}
