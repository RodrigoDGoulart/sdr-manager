alter table if exists public.workspaces
  add column if not exists auto_message_destination_funnel_id uuid references public.funnels(id) on delete set null;

update public.workspaces
set auto_message_destination_funnel_id = destination_funnels.id
from public.funnels as destination_funnels
where destination_funnels.workspace_id = workspaces.id
  and lower(destination_funnels.name) = lower('Tentando contato')
  and workspaces.auto_message_destination_funnel_id is null;
