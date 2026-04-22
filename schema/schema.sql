-- =============================================================
-- AI Website Builder — Complete Database Schema
-- =============================================================
-- Single source of truth for all tables, indexes, RLS policies,
-- triggers, and enums.
--
-- To set up: paste this entire file into the Supabase SQL Editor
-- and run it. It is safe to re-run (uses IF NOT EXISTS throughout).
--
-- Tables:
--   users, user_preferences, chats, history, websites, files,
--   file_versions, guest_usage, ai_generations, deploys
-- =============================================================

create extension if not exists pgcrypto;

-- -------------------------------------------------------
-- Enums
-- -------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_language') then
    create type public.app_language as enum ('en', 'ar', 'ku');
  end if;

  if not exists (select 1 from pg_type where typname = 'history_role') then
    create type public.history_role as enum ('user', 'assistant', 'system');
  end if;

  if not exists (select 1 from pg_type where typname = 'generation_status') then
    create type public.generation_status as enum ('pending', 'success', 'error');
  end if;
end
$$;

-- -------------------------------------------------------
-- 1) Users (maps to Supabase auth.users)
-- -------------------------------------------------------

create table if not exists public.users (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null unique,
  name       text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create public.users row when a new auth user signs up
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

-- -------------------------------------------------------
-- 2) User Preferences
-- -------------------------------------------------------

create table if not exists public.user_preferences (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  language   public.app_language not null default 'en',
  theme      text not null default 'dark',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_preferences_user_id_unique_idx
  on public.user_preferences(user_id);

-- -------------------------------------------------------
-- 3) Chats
-- -------------------------------------------------------

create table if not exists public.chats (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  title        text not null default 'New Chat',
  is_locked    boolean not null default false,
  age_verified boolean not null default false,
  needs_age_verification boolean not null default false,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists chats_user_id_idx     on public.chats(user_id);
create index if not exists chats_updated_at_idx  on public.chats(updated_at desc);
create index if not exists chats_archived_at_idx on public.chats(archived_at desc);

-- -------------------------------------------------------
-- 4) History (chat messages)
-- -------------------------------------------------------

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

-- -------------------------------------------------------
-- 5) Websites (1 chat -> 1 generated website)
-- -------------------------------------------------------

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

-- -------------------------------------------------------
-- 6) Files (generated code + uploaded images)
--
--    Generated files: file_name = 'index.html', is_user_upload = false
--    Uploaded images: file_name = 'photo.png',  is_user_upload = true
-- -------------------------------------------------------

create table if not exists public.files (
  id             uuid primary key default gen_random_uuid(),
  website_id     uuid not null references public.websites(id) on delete cascade,
  file_name      text not null,
  content        text not null,
  version        int not null default 1,
  is_user_upload boolean not null default false,
  mime_type      text,
  created_at     timestamptz not null default now()
);

create unique index if not exists files_website_file_name_unique_idx
  on public.files(website_id, file_name);
create index if not exists files_website_id_idx
  on public.files(website_id);
create index if not exists files_website_file_name_idx
  on public.files(website_id, file_name);

-- -------------------------------------------------------
-- 7) File Versions (version history for rollback)
-- -------------------------------------------------------

create table if not exists public.file_versions (
  id         uuid primary key default gen_random_uuid(),
  file_id    uuid not null references public.files(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  version    int not null,
  content    text not null,
  label      text,
  created_at timestamptz not null default now()
);

create unique index if not exists file_versions_file_id_version_unique_idx
  on public.file_versions(file_id, version);
create index if not exists file_versions_file_id_idx
  on public.file_versions(file_id);
create index if not exists file_versions_website_id_version_idx
  on public.file_versions(website_id, version desc);
create index if not exists file_versions_website_label_idx
  on public.file_versions(website_id, label)
  where label is not null;

-- -------------------------------------------------------
-- 8) Guest Usage (rate limiting for unauthenticated users)
-- -------------------------------------------------------

create table if not exists public.guest_usage (
  id              uuid primary key default gen_random_uuid(),
  guest_token     text not null unique,
  prompts_used_today int not null default 0,
  first_prompt_at timestamptz,
  last_prompt_at  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists guest_usage_token_idx
  on public.guest_usage(guest_token);

-- -------------------------------------------------------
-- 9) AI Generations (logs every AI API call for budget tracking)
-- -------------------------------------------------------

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

-- -------------------------------------------------------
-- 10) Deploys (Netlify deployment records)
-- -------------------------------------------------------

create table if not exists public.deploys (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  website_id        uuid not null references public.websites(id) on delete cascade,
  netlify_site_id   text,
  netlify_deploy_id text,
  deploy_url        text,
  status            text not null default 'pending',
  created_at        timestamptz not null default now()
);

create index if not exists deploys_user_id_idx      on public.deploys(user_id);
create index if not exists deploys_website_id_idx   on public.deploys(website_id);
create index if not exists deploys_created_at_idx   on public.deploys(created_at desc);
create index if not exists deploys_website_user_idx on public.deploys(website_id, user_id, created_at desc);

-- -------------------------------------------------------
-- Triggers
-- -------------------------------------------------------

-- Generic updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists chats_set_updated_at on public.chats;
create trigger chats_set_updated_at
before update on public.chats
for each row execute function public.set_updated_at();

drop trigger if exists websites_set_updated_at on public.websites;
create trigger websites_set_updated_at
before update on public.websites
for each row execute function public.set_updated_at();

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

drop trigger if exists guest_usage_set_updated_at on public.guest_usage;
create trigger guest_usage_set_updated_at
before update on public.guest_usage
for each row execute function public.set_updated_at();

-- Update chat.updated_at whenever a new history message is inserted
create or replace function public.touch_chat_updated_at_from_history()
returns trigger
language plpgsql
as $$
begin
  update public.chats
  set updated_at = now()
  where id = new.chat_id;
  return new;
end;
$$;

drop trigger if exists history_touch_chat on public.history;
create trigger history_touch_chat
after insert on public.history
for each row execute function public.touch_chat_updated_at_from_history();

-- -------------------------------------------------------
-- Row Level Security
-- -------------------------------------------------------

alter table public.users            enable row level security;
alter table public.user_preferences enable row level security;
alter table public.chats            enable row level security;
alter table public.history          enable row level security;
alter table public.websites         enable row level security;
alter table public.files            enable row level security;
alter table public.file_versions    enable row level security;
alter table public.ai_generations   enable row level security;
alter table public.deploys          enable row level security;

-- Users
drop policy if exists users_select_own on public.users;
drop policy if exists users_insert_own on public.users;
drop policy if exists users_update_own on public.users;

create policy users_select_own on public.users for select
  using (auth.uid() = id);
create policy users_insert_own on public.users for insert
  with check (auth.uid() = id);
create policy users_update_own on public.users for update
  using (auth.uid() = id);

-- User Preferences
drop policy if exists user_prefs_select_own on public.user_preferences;
drop policy if exists user_prefs_insert_own on public.user_preferences;
drop policy if exists user_prefs_update_own on public.user_preferences;

create policy user_prefs_select_own on public.user_preferences for select
  using (auth.uid() = user_id);
create policy user_prefs_insert_own on public.user_preferences for insert
  with check (auth.uid() = user_id);
create policy user_prefs_update_own on public.user_preferences for update
  using (auth.uid() = user_id);

-- Chats
drop policy if exists chats_select_own on public.chats;
drop policy if exists chats_insert_own on public.chats;
drop policy if exists chats_update_own on public.chats;
drop policy if exists chats_delete_own on public.chats;

create policy chats_select_own on public.chats for select
  using (auth.uid() = user_id);
create policy chats_insert_own on public.chats for insert
  with check (auth.uid() = user_id);
create policy chats_update_own on public.chats for update
  using (auth.uid() = user_id);
create policy chats_delete_own on public.chats for delete
  using (auth.uid() = user_id);

-- History
drop policy if exists history_select_own on public.history;
drop policy if exists history_insert_own on public.history;
drop policy if exists history_update_own on public.history;
drop policy if exists history_delete_own on public.history;

create policy history_select_own on public.history for select
  using (exists (
    select 1 from public.chats c
    where c.id = history.chat_id and c.user_id = auth.uid()
  ));
create policy history_insert_own on public.history for insert
  with check (exists (
    select 1 from public.chats c
    where c.id = history.chat_id and c.user_id = auth.uid()
  ));
create policy history_update_own on public.history for update
  using (exists (
    select 1 from public.chats c
    where c.id = history.chat_id and c.user_id = auth.uid()
  ));
create policy history_delete_own on public.history for delete
  using (exists (
    select 1 from public.chats c
    where c.id = history.chat_id and c.user_id = auth.uid()
  ));

-- Websites
drop policy if exists websites_select_own    on public.websites;
drop policy if exists websites_insert_own    on public.websites;
drop policy if exists websites_update_own    on public.websites;
drop policy if exists websites_delete_own    on public.websites;
drop policy if exists websites_select_public on public.websites;

create policy websites_select_own on public.websites for select
  using (exists (
    select 1 from public.chats c
    where c.id = websites.chat_id and c.user_id = auth.uid()
  ));
create policy websites_insert_own on public.websites for insert
  with check (exists (
    select 1 from public.chats c
    where c.id = websites.chat_id and c.user_id = auth.uid()
  ));
create policy websites_update_own on public.websites for update
  using (exists (
    select 1 from public.chats c
    where c.id = websites.chat_id and c.user_id = auth.uid()
  ));
create policy websites_delete_own on public.websites for delete
  using (exists (
    select 1 from public.chats c
    where c.id = websites.chat_id and c.user_id = auth.uid()
  ));
create policy websites_select_public on public.websites for select
  to anon
  using (is_public = true);

-- Files
drop policy if exists files_select_own    on public.files;
drop policy if exists files_insert_own    on public.files;
drop policy if exists files_update_own    on public.files;
drop policy if exists files_delete_own    on public.files;
drop policy if exists files_select_public on public.files;

create policy files_select_own on public.files for select
  using (exists (
    select 1 from public.websites w
    join public.chats c on c.id = w.chat_id
    where w.id = files.website_id and c.user_id = auth.uid()
  ));
create policy files_insert_own on public.files for insert
  with check (exists (
    select 1 from public.websites w
    join public.chats c on c.id = w.chat_id
    where w.id = files.website_id and c.user_id = auth.uid()
  ));
create policy files_update_own on public.files for update
  using (exists (
    select 1 from public.websites w
    join public.chats c on c.id = w.chat_id
    where w.id = files.website_id and c.user_id = auth.uid()
  ));
create policy files_delete_own on public.files for delete
  using (exists (
    select 1 from public.websites w
    join public.chats c on c.id = w.chat_id
    where w.id = files.website_id and c.user_id = auth.uid()
  ));
create policy files_select_public on public.files for select
  to anon
  using (exists (
    select 1 from public.websites w
    where w.id = files.website_id and w.is_public = true
  ));

-- File Versions
drop policy if exists file_versions_select_own on public.file_versions;
drop policy if exists file_versions_insert_own on public.file_versions;
drop policy if exists file_versions_update_own on public.file_versions;
drop policy if exists file_versions_delete_own on public.file_versions;

create policy file_versions_select_own on public.file_versions for select
  using (exists (
    select 1 from public.websites w
    join public.chats c on c.id = w.chat_id
    where w.id = file_versions.website_id and c.user_id = auth.uid()
  ));
create policy file_versions_insert_own on public.file_versions for insert
  with check (exists (
    select 1 from public.websites w
    join public.chats c on c.id = w.chat_id
    where w.id = file_versions.website_id and c.user_id = auth.uid()
  ));
create policy file_versions_update_own on public.file_versions for update
  using (exists (
    select 1 from public.websites w
    join public.chats c on c.id = w.chat_id
    where w.id = file_versions.website_id and c.user_id = auth.uid()
  ));
create policy file_versions_delete_own on public.file_versions for delete
  using (exists (
    select 1 from public.websites w
    join public.chats c on c.id = w.chat_id
    where w.id = file_versions.website_id and c.user_id = auth.uid()
  ));

-- AI Generations
drop policy if exists ai_generations_select_own on public.ai_generations;
drop policy if exists ai_generations_insert_own on public.ai_generations;

create policy ai_generations_select_own on public.ai_generations for select
  using (exists (
    select 1 from public.chats c
    where c.id = ai_generations.chat_id and c.user_id = auth.uid()
  ));
create policy ai_generations_insert_own on public.ai_generations for insert
  with check (exists (
    select 1 from public.chats c
    where c.id = ai_generations.chat_id and c.user_id = auth.uid()
  ));

-- Deploys
drop policy if exists deploys_select_own on public.deploys;
drop policy if exists deploys_insert_own on public.deploys;

create policy deploys_select_own on public.deploys for select
  using (auth.uid() = user_id);
create policy deploys_insert_own on public.deploys for insert
  with check (auth.uid() = user_id);

-- Guest usage: no client policies — accessed via service role key only.
