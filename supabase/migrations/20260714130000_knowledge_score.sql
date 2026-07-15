-- Kenntnis-Score: ersetzt SM-2 für Lernplanung (SM-2-Spalten bleiben für Legacy)
-- Idempotent: sicher mehrfach ausführbar. Enthält KEINE RLS-Policy-Änderungen.

-- ── cards: knowledge_score + review_count ────────────────────────

alter table public.cards
  add column if not exists knowledge_score smallint not null default 50
    check (knowledge_score between 0 and 100);

alter table public.cards
  add column if not exists review_count integer not null default 0
    check (review_count >= 0);

create index if not exists cards_deck_score_idx on public.cards (deck_id, knowledge_score);

-- ── review_logs: Score vor/nach Bewertung ────────────────────────

alter table public.review_logs
  add column if not exists previous_knowledge_score smallint
    check (previous_knowledge_score between 0 and 100);

alter table public.review_logs
  add column if not exists new_knowledge_score smallint
    check (new_knowledge_score between 0 and 100);

-- Bestehende Review-Logs: neutrale Defaults (nur wo noch NULL)
update public.review_logs
set
  previous_knowledge_score = coalesce(previous_knowledge_score, 50),
  new_knowledge_score = coalesce(new_knowledge_score, 50)
where previous_knowledge_score is null or new_knowledge_score is null;

-- NOT NULL nur setzen, falls Spalten noch nullable sind (idempotent)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'review_logs'
      and column_name = 'previous_knowledge_score'
      and is_nullable = 'YES'
  ) then
    alter table public.review_logs
      alter column previous_knowledge_score set not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'review_logs'
      and column_name = 'new_knowledge_score'
      and is_nullable = 'YES'
  ) then
    alter table public.review_logs
      alter column new_knowledge_score set not null;
  end if;
end $$;
