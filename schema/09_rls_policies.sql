-- =============================================================
-- 09 - Row Level Security (RLS) Policies
-- Depends on: 02–07 (all tables must exist first)
-- Enables RLS and defines all access policies.
-- =============================================================

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.user_preferences enable row level security;
alter table public.chats enable row level security;
alter table public.history enable row level security;
alter table public.websites enable row level security;
alter table public.pages enable row level security;
alter table public.sections enable row level security;
alter table public.files enable row level security;
alter table public.file_versions enable row level security;
alter table public.zip_downloads enable row level security;
alter table public.guest_usage enable row level security;
alter table public.ai_generations enable row level security;
alter table public.deploys enable row level security;

-- ---------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------
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

-- ---------------------------------------------------------------
-- User Preferences
-- ---------------------------------------------------------------
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

-- ---------------------------------------------------------------
-- Chats
-- ---------------------------------------------------------------
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

-- ---------------------------------------------------------------
-- History
-- ---------------------------------------------------------------
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

-- ---------------------------------------------------------------
-- Websites
-- ---------------------------------------------------------------
drop policy if exists websites_select_own on public.websites;
drop policy if exists websites_insert_own on public.websites;
drop policy if exists websites_update_own on public.websites;
drop policy if exists websites_delete_own on public.websites;
drop policy if exists websites_select_public on public.websites;

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

-- Public sharing (anon read for is_public websites)
create policy websites_select_public
on public.websites for select
to anon
using (is_public = true);

-- ---------------------------------------------------------------
-- Pages
-- ---------------------------------------------------------------
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

-- ---------------------------------------------------------------
-- Sections
-- ---------------------------------------------------------------
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

-- ---------------------------------------------------------------
-- Files
-- ---------------------------------------------------------------
drop policy if exists files_select_own on public.files;
drop policy if exists files_insert_own on public.files;
drop policy if exists files_update_own on public.files;
drop policy if exists files_delete_own on public.files;
drop policy if exists files_select_public on public.files;

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

-- Public sharing (anon read for files belonging to a public website)
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

-- ---------------------------------------------------------------
-- File Versions
-- ---------------------------------------------------------------
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

-- ---------------------------------------------------------------
-- ZIP Downloads
-- ---------------------------------------------------------------
drop policy if exists zip_downloads_select_own on public.zip_downloads;
drop policy if exists zip_downloads_insert_own on public.zip_downloads;

create policy zip_downloads_select_own
on public.zip_downloads for select
using (auth.uid() = user_id);

create policy zip_downloads_insert_own
on public.zip_downloads for insert
with check (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- AI Generations
-- ---------------------------------------------------------------
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

-- ---------------------------------------------------------------
-- Deploys
-- ---------------------------------------------------------------
drop policy if exists deploys_select_own on public.deploys;
drop policy if exists deploys_insert_own on public.deploys;

create policy deploys_select_own
on public.deploys for select
using (auth.uid() = user_id);

create policy deploys_insert_own
on public.deploys for insert
with check (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- Guest Usage
-- NOTE: No client policies by design.
-- Access via service role key from server-side code only.
-- ---------------------------------------------------------------
