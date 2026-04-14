-- =============================================================
-- Chats and History
-- =============================================================

create table if not exists public.chats (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  title       text not null default 'New Chat',
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists chats_user_id_idx     on public.chats(user_id);
create index if not exists chats_updated_at_idx  on public.chats(updated_at desc);
create index if not exists chats_archived_at_idx on public.chats(archived_at desc);

-- History (chat messages)
create table if not exists public.history (
  id             uuid primary key default gen_random_uuid(),
  chat_id        uuid not null references public.chats(id) on delete cascade,
  role           public.history_role not null,
  content        text,
  image_file_ids uuid[] default array[]::uuid[],
  created_at     timestamptz not null default now()
);

create index if not exists history_chat_id_idx    on public.history(chat_id);
create index if not exists history_created_at_idx on public.history(created_at);
