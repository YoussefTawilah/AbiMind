-- Abimind Phase 2: Cloud-Sync-Schema (Decks, Cards, Review Logs)
-- Im Supabase Dashboard → SQL Editor ausführen (oder via Supabase CLI).

-- ── Tabellen ─────────────────────────────────────────────────────

create table if not exists public.decks (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists decks_user_id_idx on public.decks (user_id);

create table if not exists public.cards (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  deck_id uuid not null references public.decks (id) on delete cascade,
  front text not null,
  back text not null,
  tag text,
  easiness_factor double precision not null,
  interval integer not null,
  repetitions integer not null,
  due_date date not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists cards_user_id_idx on public.cards (user_id);
create index if not exists cards_deck_id_idx on public.cards (deck_id);
create index if not exists cards_deck_due_idx on public.cards (deck_id, due_date);

create table if not exists public.review_logs (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  deck_id uuid not null references public.decks (id) on delete cascade,
  quality smallint not null check (quality between 1 and 5),
  mode text not null check (mode in ('sm2', 'practice')),
  previous_easiness_factor double precision not null,
  new_easiness_factor double precision not null,
  previous_interval integer not null,
  new_interval integer not null,
  reviewed_at timestamptz not null
);

create index if not exists review_logs_user_id_idx on public.review_logs (user_id);
create index if not exists review_logs_card_id_idx on public.review_logs (card_id);
create index if not exists review_logs_deck_id_idx on public.review_logs (deck_id);

-- ── Row Level Security ───────────────────────────────────────────

alter table public.decks enable row level security;
alter table public.cards enable row level security;
alter table public.review_logs enable row level security;

-- decks
drop policy if exists "decks_select_own" on public.decks;
create policy "decks_select_own"
  on public.decks for select
  using (auth.uid() = user_id);

drop policy if exists "decks_insert_own" on public.decks;
create policy "decks_insert_own"
  on public.decks for insert
  with check (auth.uid() = user_id);

drop policy if exists "decks_update_own" on public.decks;
create policy "decks_update_own"
  on public.decks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "decks_delete_own" on public.decks;
create policy "decks_delete_own"
  on public.decks for delete
  using (auth.uid() = user_id);

-- cards
drop policy if exists "cards_select_own" on public.cards;
create policy "cards_select_own"
  on public.cards for select
  using (auth.uid() = user_id);

drop policy if exists "cards_insert_own" on public.cards;
create policy "cards_insert_own"
  on public.cards for insert
  with check (auth.uid() = user_id);

drop policy if exists "cards_update_own" on public.cards;
create policy "cards_update_own"
  on public.cards for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "cards_delete_own" on public.cards;
create policy "cards_delete_own"
  on public.cards for delete
  using (auth.uid() = user_id);

-- review_logs
drop policy if exists "review_logs_select_own" on public.review_logs;
create policy "review_logs_select_own"
  on public.review_logs for select
  using (auth.uid() = user_id);

drop policy if exists "review_logs_insert_own" on public.review_logs;
create policy "review_logs_insert_own"
  on public.review_logs for insert
  with check (auth.uid() = user_id);

drop policy if exists "review_logs_update_own" on public.review_logs;
create policy "review_logs_update_own"
  on public.review_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "review_logs_delete_own" on public.review_logs;
create policy "review_logs_delete_own"
  on public.review_logs for delete
  using (auth.uid() = user_id);
