-- =============================================================
-- 03 - Chats & History
-- Depends on: 02_users_and_preferences.sql
-- Creates: public.chats, public.history
-- =============================================================

-- Chats
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null default 'New Chat',
  model_name text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.chats
add column if not exists archived_at timestamptz;

create index if not exists chats_user_id_idx on public.chats(user_id);
create index if not exists chats_updated_at_idx on public.chats(updated_at desc);
create index if not exists chats_archived_at_idx on public.chats(archived_at desc);

-- History (chat messages)
create table if not exists public.history (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  role public.history_role not null,
  content text,
  tokens_used int,
  created_at timestamptz not null default now()
);

-- tokens_used removed in migrations; kept here via add column for idempotency
alter table public.history
add column if not exists tokens_used int;

-- Removed by migration 01 cleanup; drop is safe to re-run
alter table public.history drop column if exists tokens_used;

create index if not exists history_chat_id_idx on public.history(chat_id);
create index if not exists history_created_at_idx on public.history(created_at);

-- Added by image attachment refactoring
alter table public.history
add column if not exists image_file_ids uuid[] default array[]::uuid[];
