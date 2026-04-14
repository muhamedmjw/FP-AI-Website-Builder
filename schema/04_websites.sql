-- =============================================================
-- Websites
-- =============================================================

create table if not exists public.websites (
  id              uuid primary key default gen_random_uuid(),
  chat_id         uuid not null unique references public.chats(id) on delete cascade,
  business_prompt text not null,
  language        public.app_language not null default 'en',
  is_public       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists websites_chat_id_idx    on public.websites(chat_id);
create index if not exists websites_updated_at_idx on public.websites(updated_at desc);
