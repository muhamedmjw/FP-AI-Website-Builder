-- =============================================================
-- Guest Usage and AI Generations
-- =============================================================

-- Guest Usage (rate limiting for unauthenticated users)
create table if not exists public.guest_usage (
  id                 uuid primary key default gen_random_uuid(),
  guest_token        text not null unique,
  prompts_used_today int not null default 0,
  first_prompt_at    timestamptz,
  last_prompt_at     timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists guest_usage_token_idx
  on public.guest_usage(guest_token);

-- AI Generations (logs every AI API call for budget tracking)
create table if not exists public.ai_generations (
  id                uuid primary key default gen_random_uuid(),
  chat_id           uuid not null references public.chats(id) on delete cascade,
  model_name        text not null,
  prompt_tokens     int,
  completion_tokens int,
  total_tokens      int,
  status            public.generation_status not null default 'pending',
  error_message     text,
  duration_ms       int,
  created_at        timestamptz not null default now()
);

create index if not exists ai_generations_chat_id_idx
  on public.ai_generations(chat_id);
create index if not exists ai_generations_status_created_idx
  on public.ai_generations(status, created_at);
