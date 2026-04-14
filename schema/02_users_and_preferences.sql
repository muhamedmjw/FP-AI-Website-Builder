-- =============================================================
-- Users and Preferences
-- =============================================================

create table if not exists public.users (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null unique,
  name       text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User Preferences
create table if not exists public.user_preferences (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  language   public.app_language not null default 'en',
  theme      text not null default 'dark',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_preferences_user_id_unique_idx
  on public.user_preferences(user_id);
