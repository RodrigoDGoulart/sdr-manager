alter table if exists public.campaigns
  alter column trigger_funnel_id drop not null;
