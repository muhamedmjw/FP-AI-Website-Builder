-- =============================================================
-- Files and Versions
-- =============================================================

-- Files (generated code + uploaded images)
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

-- File Versions (version history for rollback)
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
