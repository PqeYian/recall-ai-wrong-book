-- Recall AI Wrong Book: cloud persistence schema
-- Run once in Supabase Dashboard > SQL Editor.
create table if not exists public.app_state (
  user_id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;
