-- =============================================================
-- Triggers and Functions
-- =============================================================

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