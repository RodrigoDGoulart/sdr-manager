create table if not exists public.funnels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.funnels enable row level security;

create index if not exists idx_funnels_workspace_sort_order
  on public.funnels(workspace_id, sort_order);

insert into public.funnels (workspace_id, name, sort_order)
select workspaces.id, default_funnels.name, default_funnels.sort_order
from public.workspaces
cross join (
  values
    ('Base', 0),
    ('Lead Mapeado', 1),
    ('Tentando contato', 2),
    ('conexão iniciada', 3),
    ('desqualificado', 4),
    ('qualificado', 5),
    ('reunião agendada', 6)
) as default_funnels(name, sort_order)
where not exists (
  select 1
  from public.funnels
  where funnels.workspace_id = workspaces.id
);

alter table public.leads
  add column if not exists funnel_id uuid references public.funnels(id) on delete restrict;

update public.leads
set funnel_id = base_funnels.id
from public.funnels as base_funnels
where base_funnels.workspace_id = leads.workspace_id
  and base_funnels.sort_order = 0
  and leads.funnel_id is null;

alter table public.leads
  alter column funnel_id set not null;

create index if not exists idx_leads_funnel_id
  on public.leads(funnel_id);

drop policy if exists "funnels_insert_own_workspace" on public.funnels;
create policy "funnels_insert_own_workspace"
on public.funnels
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workspaces
    where workspaces.id = funnels.workspace_id
      and workspaces.owner_id = auth.uid()
  )
);

drop policy if exists "funnels_select_own_workspace" on public.funnels;
create policy "funnels_select_own_workspace"
on public.funnels
for select
to authenticated
using (
  exists (
    select 1
    from public.workspaces
    where workspaces.id = funnels.workspace_id
      and workspaces.owner_id = auth.uid()
  )
);

drop policy if exists "funnels_update_own_workspace" on public.funnels;
create policy "funnels_update_own_workspace"
on public.funnels
for update
to authenticated
using (
  exists (
    select 1
    from public.workspaces
    where workspaces.id = funnels.workspace_id
      and workspaces.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.workspaces
    where workspaces.id = funnels.workspace_id
      and workspaces.owner_id = auth.uid()
  )
);

drop policy if exists "funnels_delete_own_workspace" on public.funnels;
create policy "funnels_delete_own_workspace"
on public.funnels
for delete
to authenticated
using (
  exists (
    select 1
    from public.workspaces
    where workspaces.id = funnels.workspace_id
      and workspaces.owner_id = auth.uid()
  )
);

alter table public.leads
  drop constraint if exists leads_funnel_same_workspace;

alter table public.funnels
  drop constraint if exists funnels_workspace_id_id_unique;

alter table public.funnels
  add constraint funnels_workspace_id_id_unique unique (workspace_id, id);

alter table public.leads
  add constraint leads_funnel_same_workspace
  foreign key (workspace_id, funnel_id)
  references public.funnels(workspace_id, id)
  on delete restrict;
