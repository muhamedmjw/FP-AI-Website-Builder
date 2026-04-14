-- =============================================================
-- Extensions and Enums
-- =============================================================

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_language') then
    create type public.app_language as enum ('en', 'ar', 'ku');
  end if;

  if not exists (select 1 from pg_type where typname = 'history_role') then
    create type public.history_role as enum ('user', 'assistant', 'system');
  end if;

  if not exists (select 1 from pg_type where typname = 'generation_status') then
    create type public.generation_status as enum ('pending', 'success', 'error');
  end if;
end
$$;
