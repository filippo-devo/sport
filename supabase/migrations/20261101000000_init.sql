-- GameChanger backend: accounts, coach <-> client links, assigned plans, synced workouts, AI usage.
-- Everything else in the app stays on the device.

-- Profiles -------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null default '',
  is_coach boolean not null default false,
  -- Code a coach gives to clients so they can connect (only set for coaches).
  invite_code text unique,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Coach <-> client -------------------------------------------------------------
create table public.coach_clients (
  coach_id uuid not null references public.profiles on delete cascade,
  client_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (coach_id, client_id),
  check (coach_id <> client_id)
);

create or replace function public.is_coach_of(p_client uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from coach_clients where coach_id = auth.uid() and client_id = p_client);
$$;

-- Turns the caller into a coach (or back) and returns their invite code.
create or replace function public.set_coach(p_on boolean) returns text
language plpgsql security definer set search_path = public as $$
declare code text;
begin
  if p_on then
    select invite_code into code from profiles where id = auth.uid();
    if code is null then
      code := upper(substr(md5(gen_random_uuid()::text), 1, 8));
    end if;
    update profiles set is_coach = true, invite_code = code where id = auth.uid();
    return code;
  else
    update profiles set is_coach = false where id = auth.uid();
    return null;
  end if;
end $$;

-- A client connects to a coach with the coach's invite code.
create or replace function public.join_coach(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare coach uuid;
begin
  select id into coach from profiles where invite_code = upper(trim(p_code)) and is_coach;
  if coach is null then raise exception 'invalid_code'; end if;
  if coach = auth.uid() then raise exception 'own_code'; end if;
  insert into coach_clients (coach_id, client_id) values (coach, auth.uid()) on conflict do nothing;
  return coach;
end $$;

-- Plans a coach assigns to a client --------------------------------------------
create table public.coach_plans (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles on delete cascade,
  client_id uuid not null references public.profiles on delete cascade,
  name text not null,
  description text not null default '',
  -- { program: Program, routines: Routine[] } in the app's own format.
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.coach_plans (client_id);

-- Workouts logged by users, synced so their coaches see live stats ---------------
create table public.workouts (
  id text not null,
  user_id uuid not null references public.profiles on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  name text not null default '',
  volume_kg numeric not null default 0,
  sets_done int not null default 0,
  -- The full Session object from the app.
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index on public.workouts (user_id, started_at desc);

-- AI trainer usage (written only by the Edge Function with the service role) ---
create table public.ai_usage (
  user_id uuid not null references auth.users on delete cascade,
  day date not null default current_date,
  count int not null default 0,
  primary key (user_id, day)
);

-- Returns the new count, or -1 when the daily limit is reached.
create or replace function public.bump_ai_usage(p_user uuid, p_limit int) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into ai_usage (user_id, day, count) values (p_user, current_date, 1)
  on conflict (user_id, day) do update set count = ai_usage.count + 1
  where ai_usage.count < p_limit
  returning count into n;
  return coalesce(n, -1);
end $$;
revoke execute on function public.bump_ai_usage(uuid, int) from public, anon, authenticated;

-- Row level security -----------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.coach_clients enable row level security;
alter table public.coach_plans enable row level security;
alter table public.workouts enable row level security;
alter table public.ai_usage enable row level security;

create policy "own profile" on public.profiles for select using (id = auth.uid());
create policy "clients see their coaches" on public.profiles for select
  using (exists (select 1 from coach_clients c where c.coach_id = profiles.id and c.client_id = auth.uid()));
create policy "coaches see their clients" on public.profiles for select using (public.is_coach_of(id));
create policy "update own profile" on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid());
-- is_coach / invite_code change only through set_coach().
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

create policy "see own links" on public.coach_clients for select using (coach_id = auth.uid() or client_id = auth.uid());
create policy "either side can disconnect" on public.coach_clients for delete using (coach_id = auth.uid() or client_id = auth.uid());

create policy "coach manages plans for own clients" on public.coach_plans for all
  using (coach_id = auth.uid()) with check (coach_id = auth.uid() and public.is_coach_of(client_id));
create policy "client reads assigned plans" on public.coach_plans for select using (client_id = auth.uid());

create policy "own workouts" on public.workouts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "coach reads client workouts" on public.workouts for select using (public.is_coach_of(user_id));

-- Live updates for the coach dashboard and for clients receiving plan changes.
alter publication supabase_realtime add table public.workouts, public.coach_plans, public.coach_clients;
