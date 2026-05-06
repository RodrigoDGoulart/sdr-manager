create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  trigger_funnel_id uuid,
  name text not null,
  context text not null,
  generation_prompt text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_trigger_funnel_same_workspace
    foreign key (workspace_id, trigger_funnel_id)
    references public.funnels(workspace_id, id)
    on delete restrict
);

alter table public.campaigns enable row level security;

create index if not exists idx_campaigns_workspace_id
  on public.campaigns(workspace_id);

create index if not exists idx_campaigns_trigger_funnel_id
  on public.campaigns(trigger_funnel_id);

drop policy if exists "campaigns_insert_own_workspace" on public.campaigns;
create policy "campaigns_insert_own_workspace"
on public.campaigns
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workspaces
    where workspaces.id = campaigns.workspace_id
      and workspaces.owner_id = auth.uid()
  )
);

drop policy if exists "campaigns_select_own_workspace" on public.campaigns;
create policy "campaigns_select_own_workspace"
on public.campaigns
for select
to authenticated
using (
  exists (
    select 1
    from public.workspaces
    where workspaces.id = campaigns.workspace_id
      and workspaces.owner_id = auth.uid()
  )
);

drop policy if exists "campaigns_update_own_workspace" on public.campaigns;
create policy "campaigns_update_own_workspace"
on public.campaigns
for update
to authenticated
using (
  exists (
    select 1
    from public.workspaces
    where workspaces.id = campaigns.workspace_id
      and workspaces.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.workspaces
    where workspaces.id = campaigns.workspace_id
      and workspaces.owner_id = auth.uid()
  )
);

drop policy if exists "campaigns_delete_own_workspace" on public.campaigns;
create policy "campaigns_delete_own_workspace"
on public.campaigns
for delete
to authenticated
using (
  exists (
    select 1
    from public.workspaces
    where workspaces.id = campaigns.workspace_id
      and workspaces.owner_id = auth.uid()
  )
);
