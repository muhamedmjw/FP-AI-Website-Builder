-- =============================================================
-- 01 - Extensions & Enums
-- Run first: sets up pgcrypto and all custom enum types.
-- =============================================================

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

  if not exists (select 1 from pg_type where typname = 'generation_status') then
    create type public.generation_status as enum ('pending', 'success', 'error');
  end if;
end
$$;
