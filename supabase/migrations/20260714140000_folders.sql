-- Abimind: Ordner für Deck-Organisation
-- Im Supabase Dashboard → SQL Editor ausführen (oder via Supabase CLI).

create table if not exists public.folders (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists folders_user_id_idx on public.folders (user_id);

alter table public.decks
  add column if not exists folder_id uuid references public.folders (id) on delete set null;

create index if not exists decks_folder_id_idx on public.decks (folder_id);

-- ── Row Level Security ───────────────────────────────────────────

alter table public.folders enable row level security;

drop policy if exists "folders_select_own" on public.folders;
create policy "folders_select_own"
  on public.folders for select
  using (auth.uid() = user_id);

drop policy if exists "folders_insert_own" on public.folders;
create policy "folders_insert_own"
  on public.folders for insert
  with check (auth.uid() = user_id);

drop policy if exists "folders_update_own" on public.folders;
create policy "folders_update_own"
  on public.folders for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "folders_delete_own" on public.folders;
create policy "folders_delete_own"
  on public.folders for delete
  using (auth.uid() = user_id);
