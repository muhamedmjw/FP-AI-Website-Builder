-- Migration v2 - Version history, public sharing, and deploy tracking
-- Feature 1 (versioning) is implemented first in this file.

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

-- 3) Public sharing (Feature 3)
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

-- 4) Deploy records (Feature 5)
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

alter table public.deploys enable row level security;

drop policy if exists deploys_select_own on public.deploys;
drop policy if exists deploys_insert_own on public.deploys;

create policy deploys_select_own
on public.deploys for select
using (auth.uid() = user_id);

create policy deploys_insert_own
on public.deploys for insert
with check (auth.uid() = user_id);