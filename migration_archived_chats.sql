-- Archived chats support
-- Run this in Supabase SQL editor before using archive/restore features.

alter table public.chats
add column if not exists archived_at timestamptz;

create index if not exists chats_archived_at_idx on public.chats(archived_at desc);
