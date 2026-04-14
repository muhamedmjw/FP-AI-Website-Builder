-- =============================================================
-- Deploys
-- =============================================================

create table if not exists public.deploys (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  website_id        uuid not null references public.websites(id) on delete cascade,
  netlify_site_id   text,
  netlify_deploy_id text,
  deploy_url        text,
  status            text not null default 'pending',
  created_at        timestamptz not null default now()
);

create index if not exists deploys_user_id_idx      on public.deploys(user_id);
create index if not exists deploys_website_id_idx   on public.deploys(website_id);
create index if not exists deploys_created_at_idx   on public.deploys(created_at desc);
create index if not exists deploys_website_user_idx on public.deploys(website_id, user_id, created_at desc);
