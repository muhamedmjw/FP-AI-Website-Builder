-- =============================================================
-- 05 - Files, File Versions & ZIP Downloads
-- Depends on: 04_websites_pages_sections.sql
-- Creates: public.files, public.file_versions, public.zip_downloads
-- =============================================================

-- Files (final generated code files)
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  file_name text not null,
  content text not null,
  file_size int,
  version int not null default 1,
  created_at timestamptz not null default now()
);

alter table public.files
add column if not exists file_size int;

-- Added by migration v2
alter table public.files
add column if not exists version int not null default 1;

create unique index if not exists files_website_file_name_unique_idx
  on public.files(website_id, file_name);
create index if not exists files_website_id_idx on public.files(website_id);
create index if not exists files_website_file_name_idx
  on public.files(website_id, file_name);

-- File Versions (historical snapshots — migration v2)
create table if not exists public.file_versions (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.files(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  version int not null,
  content text not null,
  label text,                        -- added by migration v3
  created_at timestamptz not null default now()
);

alter table public.file_versions
add column if not exists label text;

create unique index if not exists file_versions_file_id_version_unique_idx
  on public.file_versions(file_id, version);
create index if not exists file_versions_file_id_idx
  on public.file_versions(file_id);
create index if not exists file_versions_website_id_version_idx
  on public.file_versions(website_id, version desc);
create index if not exists file_versions_website_label_idx
  on public.file_versions(website_id, label)
  where label is not null;

-- ZIP Downloads
create table if not exists public.zip_downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  file_count int,
  downloaded_at timestamptz not null default now()
);

create index if not exists zip_downloads_user_id_idx on public.zip_downloads(user_id);
create index if not exists zip_downloads_website_id_idx on public.zip_downloads(website_id);
