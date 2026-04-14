-- =============================================================
-- AI Website Builder - Complete Database Schema
-- =============================================================
-- Single source of truth for all tables, indexes, RLS policies,
-- triggers, and enums.
--
-- To set up: paste this entire file into the Supabase SQL Editor
-- and run it. It is safe to re-run (uses IF NOT EXISTS throughout).
--
-- Last consolidated: includes archived chats, version history,
-- public sharing, deploy tracking, and file upload support.
-- =============================================================

create extension if not exists pgcrypto;

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_language') then
    create type public.app_language as enum ('en', 'ar', 'ku');
  end if;

  if not exists (select 1 from pg_type where typname = 'history_role') then
    create type public.history_role as enum ('user', 'assistant', 'system');
  end if;

  if not exists (select 1 from pg_type where typname = 'section_type') then
    create type public.section_type as enum ('hero', 'about', 'services', 'pricing', 'contact', 'custom');
  end if;

  if not exists (select 1 from pg_type where typname = 'generation_status') then
    create type public.generation_status as enum ('pending', 'success', 'error');
  end if;
end
$$;

-- 1) Users (maps to Supabase auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep schema re-runnable for existing projects
alter table public.users
add column if not exists avatar_url text;

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

-- 2) User Preferences
create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  language public.app_language not null default 'en',
  theme text not null default 'dark',
  default_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_preferences_user_id_unique_idx
  on public.user_preferences(user_id);

-- 3) Chats
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

-- 4) History (chat messages)
create table if not exists public.history (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  role public.history_role not null,
  content text,
  image_file_ids uuid[] default array[]::uuid[],
  tokens_used int,
  created_at timestamptz not null default now()
);

alter table public.history
add column if not exists tokens_used int;

create index if not exists history_chat_id_idx on public.history(chat_id);
create index if not exists history_created_at_idx on public.history(created_at);

-- 5) Websites (1 chat -> 1 generated website)
create table if not exists public.websites (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null unique references public.chats(id) on delete cascade,
  business_prompt text not null,
  language public.app_language not null default 'en',
  generated_html text,
  page_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.websites
add column if not exists generated_html text;

alter table public.websites
add column if not exists page_count int not null default 0;

create index if not exists websites_chat_id_idx on public.websites(chat_id);
create index if not exists websites_updated_at_idx on public.websites(updated_at desc);

-- 6) Pages
-- NOTE: pages table reserved for future multi-page support
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  title text not null,
  slug text not null,
  page_order int not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists pages_website_slug_unique_idx
  on public.pages(website_id, slug);
create index if not exists pages_website_id_idx on public.pages(website_id);

-- 7) Sections
-- NOTE: sections table reserved for future multi-page support
create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  type public.section_type not null default 'custom',
  heading text,
  body text,
  html_override text,
  section_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.sections
add column if not exists html_override text;

create index if not exists sections_page_id_idx on public.sections(page_id);
create index if not exists sections_page_order_idx on public.sections(page_id, section_order);

-- 8) Files (final generated code files)
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  file_name text not null,
  content text not null,
  file_size int,
  created_at timestamptz not null default now()
);

alter table public.files
add column if not exists file_size int;

create unique index if not exists files_website_file_name_unique_idx
  on public.files(website_id, file_name);
create index if not exists files_website_id_idx on public.files(website_id);

-- 9) ZIP Downloads
create table if not exists public.zip_downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  file_count int,
  downloaded_at timestamptz not null default now()
);

create index if not exists zip_downloads_user_id_idx on public.zip_downloads(user_id);
create index if not exists zip_downloads_website_id_idx on public.zip_downloads(website_id);

-- 10) Guest prompt limit tracking (no saved history for guests)
-- Uses rolling 24-hour window from first_prompt_at
create table if not exists public.guest_usage (
  id uuid primary key default gen_random_uuid(),
  guest_token text not null unique,
  prompts_used_today int not null default 0,
  first_prompt_at timestamptz,
  last_prompt_at timestamptz,
  session_data text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add new columns if table already exists
alter table public.guest_usage
add column if not exists session_data text;

alter table public.guest_usage
add column if not exists first_prompt_at timestamptz;

-- Drop old index that relied on usage_date
-- Create new index for guest_token lookups
create index if not exists guest_usage_token_idx
  on public.guest_usage(guest_token);

-- 11) AI Generations (logs every AI API call)
create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  history_id uuid references public.history(id) on delete set null,
  model_name text not null,
  prompt_tokens int,
  completion_tokens int,
  total_tokens int,
  status public.generation_status not null default 'pending',
  error_message text,
  duration_ms int,
  created_at timestamptz not null default now()
);

create index if not exists ai_generations_chat_id_idx on public.ai_generations(chat_id);
create index if not exists ai_generations_history_id_idx on public.ai_generations(history_id);

-- Generic updated_at trigger function
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

-- Row Level Security
alter table public.users enable row level security;
alter table public.user_preferences enable row level security;
alter table public.chats enable row level security;
alter table public.history enable row level security;
alter table public.websites enable row level security;
alter table public.pages enable row level security;
alter table public.sections enable row level security;
alter table public.files enable row level security;
alter table public.zip_downloads enable row level security;
alter table public.guest_usage enable row level security;
alter table public.ai_generations enable row level security;

-- Drop and recreate policies so script can be re-run safely

-- User Preferences policies
drop policy if exists user_prefs_select_own on public.user_preferences;
drop policy if exists user_prefs_insert_own on public.user_preferences;
drop policy if exists user_prefs_update_own on public.user_preferences;

create policy user_prefs_select_own
on public.user_preferences for select
using (auth.uid() = user_id);

create policy user_prefs_insert_own
on public.user_preferences for insert
with check (auth.uid() = user_id);

create policy user_prefs_update_own
on public.user_preferences for update
using (auth.uid() = user_id);

-- Users policies
drop policy if exists users_select_own on public.users;
drop policy if exists users_insert_own on public.users;
drop policy if exists users_update_own on public.users;

create policy users_select_own
on public.users for select
using (auth.uid() = id);

create policy users_insert_own
on public.users for insert
with check (auth.uid() = id);

create policy users_update_own
on public.users for update
using (auth.uid() = id);

drop policy if exists chats_select_own on public.chats;
drop policy if exists chats_insert_own on public.chats;
drop policy if exists chats_update_own on public.chats;
drop policy if exists chats_delete_own on public.chats;

create policy chats_select_own
on public.chats for select
using (auth.uid() = user_id);

create policy chats_insert_own
on public.chats for insert
with check (auth.uid() = user_id);

create policy chats_update_own
on public.chats for update
using (auth.uid() = user_id);

create policy chats_delete_own
on public.chats for delete
using (auth.uid() = user_id);

drop policy if exists history_select_own on public.history;
drop policy if exists history_insert_own on public.history;
drop policy if exists history_update_own on public.history;
drop policy if exists history_delete_own on public.history;

create policy history_select_own
on public.history for select
using (
  exists (
    select 1 from public.chats c
    where c.id = history.chat_id and c.user_id = auth.uid()
  )
);

create policy history_insert_own
on public.history for insert
with check (
  exists (
    select 1 from public.chats c
    where c.id = history.chat_id and c.user_id = auth.uid()
  )
);

create policy history_update_own
on public.history for update
using (
  exists (
    select 1 from public.chats c
    where c.id = history.chat_id and c.user_id = auth.uid()
  )
);

create policy history_delete_own
on public.history for delete
using (
  exists (
    select 1 from public.chats c
    where c.id = history.chat_id and c.user_id = auth.uid()
  )
);

drop policy if exists websites_select_own on public.websites;
drop policy if exists websites_insert_own on public.websites;
drop policy if exists websites_update_own on public.websites;
drop policy if exists websites_delete_own on public.websites;

create policy websites_select_own
on public.websites for select
using (
  exists (
    select 1 from public.chats c
    where c.id = websites.chat_id and c.user_id = auth.uid()
  )
);

create policy websites_insert_own
on public.websites for insert
with check (
  exists (
    select 1 from public.chats c
    where c.id = websites.chat_id and c.user_id = auth.uid()
  )
);

create policy websites_update_own
on public.websites for update
using (
  exists (
    select 1 from public.chats c
    where c.id = websites.chat_id and c.user_id = auth.uid()
  )
);

create policy websites_delete_own
on public.websites for delete
using (
  exists (
    select 1 from public.chats c
    where c.id = websites.chat_id and c.user_id = auth.uid()
  )
);

drop policy if exists pages_select_own on public.pages;
drop policy if exists pages_insert_own on public.pages;
drop policy if exists pages_update_own on public.pages;
drop policy if exists pages_delete_own on public.pages;

create policy pages_select_own
on public.pages for select
using (
  exists (
    select 1
    from public.websites w
    join public.chats c on c.id = w.chat_id
    where w.id = pages.website_id and c.user_id = auth.uid()
  )
);

create policy pages_insert_own
on public.pages for insert
with check (
  exists (
    select 1
    from public.websites w
    join public.chats c on c.id = w.chat_id
    where w.id = pages.website_id and c.user_id = auth.uid()
  )
);

create policy pages_update_own
on public.pages for update
using (
  exists (
    select 1
    from public.websites w
    join public.chats c on c.id = w.chat_id
    where w.id = pages.website_id and c.user_id = auth.uid()
  )
);

create policy pages_delete_own
on public.pages for delete
using (
  exists (
    select 1
    from public.websites w
    join public.chats c on c.id = w.chat_id
    where w.id = pages.website_id and c.user_id = auth.uid()
  )
);

drop policy if exists sections_select_own on public.sections;
drop policy if exists sections_insert_own on public.sections;
drop policy if exists sections_update_own on public.sections;
drop policy if exists sections_delete_own on public.sections;

create policy sections_select_own
on public.sections for select
using (
  exists (
    select 1
    from public.pages p
    join public.websites w on w.id = p.website_id
    join public.chats c on c.id = w.chat_id
    where p.id = sections.page_id and c.user_id = auth.uid()
  )
);

create policy sections_insert_own
on public.sections for insert
with check (
  exists (
    select 1
    from public.pages p
    join public.websites w on w.id = p.website_id
    join public.chats c on c.id = w.chat_id
    where p.id = sections.page_id and c.user_id = auth.uid()
  )
);

create policy sections_update_own
on public.sections for update
using (
  exists (
    select 1
    from public.pages p
    join public.websites w on w.id = p.website_id
    join public.chats c on c.id = w.chat_id
    where p.id = sections.page_id and c.user_id = auth.uid()
  )
);

create policy sections_delete_own
on public.sections for delete
using (
  exists (
    select 1
    from public.pages p
    join public.websites w on w.id = p.website_id
    join public.chats c on c.id = w.chat_id
    where p.id = sections.page_id and c.user_id = auth.uid()
  )
);

drop policy if exists files_select_own on public.files;
drop policy if exists files_insert_own on public.files;
drop policy if exists files_update_own on public.files;
drop policy if exists files_delete_own on public.files;

create policy files_select_own
on public.files for select
using (
  exists (
    select 1
    from public.websites w
    join public.chats c on c.id = w.chat_id
    where w.id = files.website_id and c.user_id = auth.uid()
  )
);

create policy files_insert_own
on public.files for insert
with check (
  exists (
    select 1
    from public.websites w
    join public.chats c on c.id = w.chat_id
    where w.id = files.website_id and c.user_id = auth.uid()
  )
);

create policy files_update_own
on public.files for update
using (
  exists (
    select 1
    from public.websites w
    join public.chats c on c.id = w.chat_id
    where w.id = files.website_id and c.user_id = auth.uid()
  )
);

create policy files_delete_own
on public.files for delete
using (
  exists (
    select 1
    from public.websites w
    join public.chats c on c.id = w.chat_id
    where w.id = files.website_id and c.user_id = auth.uid()
  )
);

-- ZIP Downloads policies
drop policy if exists zip_downloads_select_own on public.zip_downloads;
drop policy if exists zip_downloads_insert_own on public.zip_downloads;

create policy zip_downloads_select_own
on public.zip_downloads for select
using (auth.uid() = user_id);

create policy zip_downloads_insert_own
on public.zip_downloads for insert
with check (auth.uid() = user_id);

-- AI Generations policies (access through chat ownership)
drop policy if exists ai_generations_select_own on public.ai_generations;
drop policy if exists ai_generations_insert_own on public.ai_generations;

create policy ai_generations_select_own
on public.ai_generations for select
using (
  exists (
    select 1 from public.chats c
    where c.id = ai_generations.chat_id and c.user_id = auth.uid()
  )
);

create policy ai_generations_insert_own
on public.ai_generations for insert
with check (
  exists (
    select 1 from public.chats c
    where c.id = ai_generations.chat_id and c.user_id = auth.uid()
  )
);

-- Guest usage: no client policies on purpose.
-- Use server-side code with service role key to read/write guest limits.

-- Consolidated migrations (previously split across migration.sql, migration_v2.sql, migration_v3.sql)

-- Migration: Clean up unused columns and add missing indexes
-- Remove dead columns
alter table public.websites drop column if exists generated_html;
alter table public.websites drop column if exists page_count;
alter table public.history drop column if exists tokens_used;

-- Add missing indexes (hit on every page load)
create index if not exists files_website_file_name_idx
  on public.files(website_id, file_name);

create index if not exists ai_generations_status_created_idx
  on public.ai_generations(status, created_at);

-- Migration v2 - Version history, public sharing, and deploy tracking

-- 1) Add version tracking to files
alter table public.files
add column if not exists version int not null default 1;

-- 2) Historical versions of website files
create table if not exists public.file_versions (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.files(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  version int not null,
  content text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists file_versions_file_id_version_unique_idx
  on public.file_versions(file_id, version);

create index if not exists file_versions_file_id_idx
  on public.file_versions(file_id);

create index if not exists file_versions_website_id_version_idx
  on public.file_versions(website_id, version desc);

alter table public.file_versions enable row level security;

drop policy if exists file_versions_select_own on public.file_versions;
drop policy if exists file_versions_insert_own on public.file_versions;
drop policy if exists file_versions_update_own on public.file_versions;
drop policy if exists file_versions_delete_own on public.file_versions;

create policy file_versions_select_own
on public.file_versions for select
using (
  exists (
    select 1
    from public.websites w
    join public.chats c on c.id = w.chat_id
    where w.id = file_versions.website_id and c.user_id = auth.uid()
  )
);

create policy file_versions_insert_own
on public.file_versions for insert
with check (
  exists (
    select 1
    from public.websites w
    join public.chats c on c.id = w.chat_id
    where w.id = file_versions.website_id and c.user_id = auth.uid()
  )
);

create policy file_versions_update_own
on public.file_versions for update
using (
  exists (
    select 1
    from public.websites w
    join public.chats c on c.id = w.chat_id
    where w.id = file_versions.website_id and c.user_id = auth.uid()
  )
);

create policy file_versions_delete_own
on public.file_versions for delete
using (
  exists (
    select 1
    from public.websites w
    join public.chats c on c.id = w.chat_id
    where w.id = file_versions.website_id and c.user_id = auth.uid()
  )
);

-- 3) Public sharing
alter table public.websites
add column if not exists is_public boolean not null default false;

drop policy if exists websites_select_public on public.websites;
create policy websites_select_public
on public.websites for select
to anon
using (is_public = true);

drop policy if exists files_select_public on public.files;
create policy files_select_public
on public.files for select
to anon
using (
  exists (
    select 1
    from public.websites w
    where w.id = files.website_id and w.is_public = true
  )
);

-- 4) Deploy records
create table if not exists public.deploys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  netlify_site_id text,
  netlify_deploy_id text,
  deploy_url text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists deploys_user_id_idx on public.deploys(user_id);
create index if not exists deploys_website_id_idx on public.deploys(website_id);
create index if not exists deploys_created_at_idx on public.deploys(created_at desc);
create index if not exists deploys_website_user_idx
  on public.deploys(website_id, user_id, created_at desc);

alter table public.deploys enable row level security;

drop policy if exists deploys_select_own on public.deploys;
drop policy if exists deploys_insert_own on public.deploys;

create policy deploys_select_own
on public.deploys for select
using (auth.uid() = user_id);

create policy deploys_insert_own
on public.deploys for insert
with check (auth.uid() = user_id);

-- Migration v3 - Version labels
alter table public.file_versions
add column if not exists label text;

create index if not exists file_versions_website_label_idx
  on public.file_versions(website_id, label)
  where label is not null;
