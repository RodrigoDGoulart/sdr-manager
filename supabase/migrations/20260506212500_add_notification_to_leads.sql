alter table if exists public.leads
  add column if not exists notification boolean not null default false;
