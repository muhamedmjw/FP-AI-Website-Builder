-- =============================================================
-- 04 - Websites, Pages & Sections
-- Depends on: 03_chats_and_history.sql
-- Creates: public.websites, public.pages, public.sections
-- NOTE: pages and sections are reserved for future multi-page support.
-- =============================================================

-- Websites (1 chat -> 1 generated website)
create table if not exists public.websites (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null unique references public.chats(id) on delete cascade,
  business_prompt text not null,
  language public.app_language not null default 'en',
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Columns removed by migrations; drops are safe to re-run
alter table public.websites drop column if exists generated_html;
alter table public.websites drop column if exists page_count;

-- Added by migration v2
alter table public.websites
add column if not exists is_public boolean not null default false;

create index if not exists websites_chat_id_idx on public.websites(chat_id);
create index if not exists websites_updated_at_idx on public.websites(updated_at desc);

-- Pages (future multi-page support)
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

-- Sections (future multi-page support)
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
