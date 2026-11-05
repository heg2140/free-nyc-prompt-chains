# Free NYC Prompt Chains

A tool for building and testing the prompt chains that generate Free NYC suggestions. A chain is a list of steps. Each step is one Gemini call, and its output can feed into the next step. For example:

1. **Brainstorm free places**: take the search (starting point, activity type, time of day, travel time, neighborhood) and list 12 free ideas.
2. **Pick the hidden gems**: take step 1's list and keep the 4 most surprising ones.
3. **Write Free NYC suggestions**: take step 2's picks and output suggestions (title, description, neighborhood, transit directions) as JSON.

## What it does

- Create, rename, duplicate and delete prompt chains
- Add, edit and delete steps (model, temperature, system prompt, user prompt, output type)
- Reorder steps with up/down buttons
- Run a chain on a sample search and see every step's prompt and output
- View every suggestion a chain has generated (`/chains/<id>/runs`)
- Light, dark or system theme (the toggle in the header)

Only Free NYC superadmins can use it. The proxy (`src/proxy.ts`) checks every request, each page and server action checks again (`src/lib/auth.ts`), and row-level security on the new tables allows superadmins only.

Chain runs are saved in their own tables (`prompt_chain_runs`, `prompt_chain_run_steps`), never in `suggestions`, so test output never shows up in users' Explore feed.

## Prompt variables

Prompts can use these, and they're filled in when the chain runs:

| Variable | Value |
|---|---|
| `${startingPoint}` | The starting address |
| `${activityType}` | e.g. `Art / museums` |
| `${timeOfDay}` | `Morning`, `Afternoon`, `Evening` or `Night` |
| `${maxTravelMinutes}` | Maximum one-way travel time |
| `${neighborhood}` | A neighborhood, or `any neighborhood` |
| `${previousOutput}` | The output of the step just before |
| `${step1Output}`, `${step2Output}`, … | The output of that step |

A step can only use the outputs of the steps before it. The chain page flags any step that breaks this after a reorder.

A step whose output type is **Free NYC suggestions** asks Gemini for the same JSON shape as the main app. If a step's model is busy, it retries and then falls back to the other models, and the run records which model answered.

## Setup

1. In the Free NYC Supabase project, open the SQL Editor and run `supabase/prompt-chains-setup.sql`. It creates the tables, adds the security policies, and seeds an example "Hidden gems" chain.
2. Make sure your account is a superadmin (the last lines of that file show how).
3. Create `.env.local` with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   GEMINI_API_KEY=...
   ```
4. In Supabase → Authentication → URL Configuration, add `http://localhost:3000/auth/callback` and `https://<your-vercel-domain>/auth/callback` to the Redirect URLs.
5. `npm install && npm run dev`

On Vercel, set the same three environment variables. To make the site viewable in an incognito window, turn off Settings → Deployment Protection → Vercel Authentication.
