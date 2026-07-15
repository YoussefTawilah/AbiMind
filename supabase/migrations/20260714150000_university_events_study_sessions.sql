-- Abimind: Uni-Events (Prüfungsplaner) + Lernzeit-Sessions
-- Bereits in Cloud angelegt? Diese Datei dient als Referenz / für neue Umgebungen.

create table if not exists public.university_events (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  event_date date not null,
  subject text,
  notes text,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists university_events_user_id_idx on public.university_events (user_id);
create index if not exists university_events_event_date_idx on public.university_events (event_date);

create table if not exists public.study_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  deck_id uuid not null references public.decks (id) on delete cascade,
  duration_seconds integer not null check (duration_seconds > 0),
  ended_at timestamptz not null,
  created_at timestamptz not null
);

create index if not exists study_sessions_user_id_idx on public.study_sessions (user_id);
create index if not exists study_sessions_deck_id_idx on public.study_sessions (deck_id);

alter table public.university_events enable row level security;
alter table public.study_sessions enable row level security;

drop policy if exists "university_events_select_own" on public.university_events;
create policy "university_events_select_own"
  on public.university_events for select using (auth.uid() = user_id);

drop policy if exists "university_events_insert_own" on public.university_events;
create policy "university_events_insert_own"
  on public.university_events for insert with check (auth.uid() = user_id);

drop policy if exists "university_events_update_own" on public.university_events;
create policy "university_events_update_own"
  on public.university_events for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "university_events_delete_own" on public.university_events;
create policy "university_events_delete_own"
  on public.university_events for delete using (auth.uid() = user_id);

drop policy if exists "study_sessions_select_own" on public.study_sessions;
create policy "study_sessions_select_own"
  on public.study_sessions for select using (auth.uid() = user_id);

drop policy if exists "study_sessions_insert_own" on public.study_sessions;
create policy "study_sessions_insert_own"
  on public.study_sessions for insert with check (auth.uid() = user_id);
