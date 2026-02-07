-- 1) Profiles (optional but useful)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- 2) Chats (one user, many chats)
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New Chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chats_user_id_idx on public.chats(user_id);
create index if not exists chats_updated_at_idx on public.chats(updated_at desc);

-- 3) Messages (one chat, many messages)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  model text,
  created_at timestamptz not null default now()
);

create index if not exists messages_chat_id_idx on public.messages(chat_id);
create index if not exists messages_created_at_idx on public.messages(created_at);

-- 4) Update chats.updated_at when a new message is added
create or replace function public.touch_chat_updated_at()
returns trigger as $$
begin
  update public.chats set updated_at = now() where id = new.chat_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists messages_touch_chat on public.messages;
create trigger messages_touch_chat
after insert on public.messages
for each row execute function public.touch_chat_updated_at();

-- 5) RLS
alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;

-- Profiles policies
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id);

-- Chats policies
create policy "chats_select_own"
on public.chats for select
using (auth.uid() = user_id);

create policy "chats_insert_own"
on public.chats for insert
with check (auth.uid() = user_id);

create policy "chats_update_own"
on public.chats for update
using (auth.uid() = user_id);

create policy "chats_delete_own"
on public.chats for delete
using (auth.uid() = user_id);

-- Messages policies
create policy "messages_select_own"
on public.messages for select
using (
  exists (
    select 1 from public.chats
    where chats.id = messages.chat_id
    and chats.user_id = auth.uid()
  )
);

create policy "messages_insert_own"
on public.messages for insert
with check (
  exists (
    select 1 from public.chats
    where chats.id = messages.chat_id
    and chats.user_id = auth.uid()
  )
);

create policy "messages_update_own"
on public.messages for update
using (
  exists (
    select 1 from public.chats
    where chats.id = messages.chat_id
    and chats.user_id = auth.uid()
  )
);

create policy "messages_delete_own"
on public.messages for delete
using (
  exists (
    select 1 from public.chats
    where chats.id = messages.chat_id
    and chats.user_id = auth.uid()
  )
);
