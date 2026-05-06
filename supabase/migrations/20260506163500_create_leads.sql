create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null,
  company text not null,
  role text not null,
  source text not null,
  notes text not null,
  custom_fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint leads_custom_fields_is_array check (jsonb_typeof(custom_fields) = 'array')
);

alter table public.leads enable row level security;

create index if not exists idx_leads_workspace_id
  on public.leads(workspace_id);

drop policy if exists "leads_insert_own_workspace" on public.leads;
create policy "leads_insert_own_workspace"
on public.leads
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workspaces
    where workspaces.id = leads.workspace_id
      and workspaces.owner_id = auth.uid()
  )
);

drop policy if exists "leads_select_own_workspace" on public.leads;
create policy "leads_select_own_workspace"
on public.leads
for select
to authenticated
using (
  exists (
    select 1
    from public.workspaces
    where workspaces.id = leads.workspace_id
      and workspaces.owner_id = auth.uid()
  )
);
