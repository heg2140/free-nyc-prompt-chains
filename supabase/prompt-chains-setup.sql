-- Free NYC prompt chain tool: database setup.
-- Run this once in the Free NYC Supabase project: SQL Editor -> New query ->
-- paste -> Run. It is safe to run more than once.
--
-- It assumes free-nyc-admin's supabase/admin-setup.sql has already been run
-- (that adds profiles.is_superadmin and public.is_superadmin()). The first two
-- statements repeat that part so this file also works on its own.

alter table public.profiles
  add column if not exists is_superadmin boolean not null default false;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_superadmin from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_superadmin() from public;
grant execute on function public.is_superadmin() to anon, authenticated;

-- 1. Prompt chains: a named recipe that turns a Free NYC search
--    (starting point, activity type, time of day, travel time, neighborhood)
--    into suggestions, one LLM call per step.
create table if not exists public.prompt_chains (
  id bigint generated always as identity primary key,
  name text not null,
  description text,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Steps run in step_order (1, 2, 3, ...). Each step's prompts can use the
--    search inputs and earlier steps' outputs (see the app's step form).
create table if not exists public.prompt_chain_steps (
  id bigint generated always as identity primary key,
  chain_id bigint not null references public.prompt_chains (id) on delete cascade,
  step_order integer not null,
  title text not null,
  model text not null default 'gemini-3.6-flash',
  temperature numeric check (temperature is null or (temperature >= 0 and temperature <= 2)),
  system_prompt text,
  user_prompt text not null,
  -- 'text': free text passed on to the next step.
  -- 'suggestions': a JSON array of Free NYC suggestions (title, description,
  --   neighborhood, transit_directions), shown as suggestion cards.
  output_type text not null default 'text' check (output_type in ('text', 'suggestions')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prompt_chain_steps_chain_order_idx
  on public.prompt_chain_steps (chain_id, step_order);

-- 3. Runs: every time a chain is run, its inputs, each step's output and the
--    final suggestions are kept here. These stay out of the public
--    suggestions table so test runs never show up in users' Explore feed.
create table if not exists public.prompt_chain_runs (
  id bigint generated always as identity primary key,
  chain_id bigint not null references public.prompt_chains (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null default auth.uid(),
  inputs jsonb not null,
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  error text,
  final_output text,
  suggestions jsonb,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists prompt_chain_runs_chain_idx
  on public.prompt_chain_runs (chain_id, created_at desc);

create table if not exists public.prompt_chain_run_steps (
  id bigint generated always as identity primary key,
  run_id bigint not null references public.prompt_chain_runs (id) on delete cascade,
  -- The step may be edited or deleted later, so what was sent is copied here.
  step_id bigint references public.prompt_chain_steps (id) on delete set null,
  step_order integer not null,
  title text not null,
  model text not null,
  temperature numeric,
  system_prompt text,
  user_prompt text not null,
  output text,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists prompt_chain_run_steps_run_idx
  on public.prompt_chain_run_steps (run_id, step_order);

-- 4. Keep updated_at current.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.prompt_chains;
create trigger set_updated_at before update on public.prompt_chains
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.prompt_chain_steps;
create trigger set_updated_at before update on public.prompt_chain_steps
  for each row execute function public.set_updated_at();

-- 5. Only superadmins can see or change any of this.
alter table public.prompt_chains enable row level security;
alter table public.prompt_chain_steps enable row level security;
alter table public.prompt_chain_runs enable row level security;
alter table public.prompt_chain_run_steps enable row level security;

drop policy if exists "Superadmins manage prompt chains" on public.prompt_chains;
create policy "Superadmins manage prompt chains" on public.prompt_chains
  for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Superadmins manage prompt chain steps" on public.prompt_chain_steps;
create policy "Superadmins manage prompt chain steps" on public.prompt_chain_steps
  for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Superadmins manage prompt chain runs" on public.prompt_chain_runs;
create policy "Superadmins manage prompt chain runs" on public.prompt_chain_runs
  for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Superadmins manage prompt chain run steps" on public.prompt_chain_run_steps;
create policy "Superadmins manage prompt chain run steps" on public.prompt_chain_run_steps
  for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

-- 6. An example chain to start from (only added if there are no chains yet).
do $$
declare
  new_chain_id bigint;
begin
  if exists (select 1 from public.prompt_chains) then
    return;
  end if;

  insert into public.prompt_chains (name, description, created_by)
  values (
    'Hidden gems',
    'Brainstorms free spots, picks the most surprising ones, then writes Free NYC suggestions.',
    null
  )
  returning id into new_chain_id;

  insert into public.prompt_chain_steps
    (chain_id, step_order, title, model, temperature, system_prompt, user_prompt, output_type)
  values
  (
    new_chain_id, 1, 'Brainstorm free places', 'gemini-3.6-flash', 0.9,
    'You are a local NYC expert. You only recommend things that are completely free (the only acceptable cost is public transit fare).',
    'A college student is starting from ${startingPoint} and wants something in the category "${activityType}" during the ${timeOfDay}, at most ${maxTravelMinutes} minutes away by transit. Neighborhood: ${neighborhood}.

List 12 real, specific, free places or activities that fit. One per line, with a one-sentence reason each.',
    'text'
  ),
  (
    new_chain_id, 2, 'Pick the hidden gems', 'gemini-3.6-flash', 0.7,
    'You are a picky NYC guide who loves places most tourists miss.',
    'Here are some free ideas:

${step1Output}

Pick the 4 that are the most surprising or least touristy but still great for the ${timeOfDay}. For each, say in two sentences what makes it special.',
    'text'
  ),
  (
    new_chain_id, 3, 'Write Free NYC suggestions', 'gemini-3.6-flash', 0.4,
    null,
    'Turn these picks into Free NYC suggestions for someone starting from ${startingPoint}:

${step2Output}

For each one, give a title, a short friendly description, its neighborhood, and a best-guess public transit route from the starting point. Say in the transit directions that it is an AI estimate to double check before heading out.',
    'suggestions'
  );
end;
$$;

-- 7. If you aren't a superadmin yet, replace the email and run this line:
--
-- update public.profiles
--   set is_superadmin = true
--   where id = (select id from auth.users where email = 'you@example.com');
