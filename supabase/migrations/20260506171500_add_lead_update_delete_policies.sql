drop policy if exists "leads_update_own_workspace" on public.leads;
create policy "leads_update_own_workspace"
on public.leads
for update
to authenticated
using (
  exists (
    select 1
    from public.workspaces
    where workspaces.id = leads.workspace_id
      and workspaces.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.workspaces
    where workspaces.id = leads.workspace_id
      and workspaces.owner_id = auth.uid()
  )
);

drop policy if exists "leads_delete_own_workspace" on public.leads;
create policy "leads_delete_own_workspace"
on public.leads
for delete
to authenticated
using (
  exists (
    select 1
    from public.workspaces
    where workspaces.id = leads.workspace_id
      and workspaces.owner_id = auth.uid()
  )
);
