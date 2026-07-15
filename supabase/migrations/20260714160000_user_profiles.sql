-- Abimind: Persönliches Abitur-Profil (Countdown + Prüfungsplaner-Sync)

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  bundesland text,
  abitur_year integer,
  first_written_exam_date date,
  linked_university_event_id uuid references public.university_events (id) on delete set null,
  onboarding_dismissed boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

alter table public.user_profiles enable row level security;

create policy "Users can view own profile"
  on public.user_profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.user_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = user_id);

create policy "Users can delete own profile"
  on public.user_profiles for delete
  using (auth.uid() = user_id);
