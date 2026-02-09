-- AI Website Builder - simplified schema
-- Tables: users, chats, history, websites, pages, sections, files, guest_usage
-- Run this in Supabase SQL Editor.

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
end
$$;

-- 1) Users (maps to Supabase auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
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

-- 2) Chats
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null default 'New Chat',
  model_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chats_user_id_idx on public.chats(user_id);
create index if not exists chats_updated_at_idx on public.chats(updated_at desc);

-- 3) History (chat messages)
create table if not exists public.history (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  role public.history_role not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists history_chat_id_idx on public.history(chat_id);
create index if not exists history_created_at_idx on public.history(created_at);

-- 4) Websites (1 chat -> 1 generated website)
create table if not exists public.websites (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null unique references public.chats(id) on delete cascade,
  business_prompt text not null,
  language public.app_language not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists websites_chat_id_idx on public.websites(chat_id);
create index if not exists websites_updated_at_idx on public.websites(updated_at desc);

-- 5) Pages
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

-- 6) Sections
create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  type public.section_type not null default 'custom',
  heading text,
  body text,
  section_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists sections_page_id_idx on public.sections(page_id);
create index if not exists sections_page_order_idx on public.sections(page_id, section_order);

-- 7) Files (final generated code files)
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  file_name text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists files_website_file_name_unique_idx
  on public.files(website_id, file_name);
create index if not exists files_website_id_idx on public.files(website_id);

-- 8) Guest prompt limit tracking (no saved history for guests)
create table if not exists public.guest_usage (
  id uuid primary key default gen_random_uuid(),
  guest_token text not null unique,
  prompts_used_today int not null default 0,
  usage_date date not null default current_date,
  last_prompt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists guest_usage_date_idx on public.guest_usage(usage_date);

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
alter table public.chats enable row level security;
alter table public.history enable row level security;
alter table public.websites enable row level security;
alter table public.pages enable row level security;
alter table public.sections enable row level security;
alter table public.files enable row level security;
alter table public.guest_usage enable row level security;

-- Drop and recreate policies so script can be re-run safely
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

-- Guest usage: no client policies on purpose.
-- Use server-side code with service role key to read/write guest limits.
