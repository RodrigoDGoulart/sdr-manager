alter table public.funnels
  add column if not exists required_fields jsonb not null default '[]'::jsonb;

alter table public.funnels
  drop constraint if exists funnels_required_fields_is_array;

alter table public.funnels
  add constraint funnels_required_fields_is_array
  check (jsonb_typeof(required_fields) = 'array');
