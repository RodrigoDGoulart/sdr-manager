alter table if exists public.leads
  add column if not exists generated_messages jsonb not null default '[]'::jsonb;

alter table public.leads
  drop constraint if exists leads_generated_messages_is_array;

alter table public.leads
  add constraint leads_generated_messages_is_array
  check (jsonb_typeof(generated_messages) = 'array');
