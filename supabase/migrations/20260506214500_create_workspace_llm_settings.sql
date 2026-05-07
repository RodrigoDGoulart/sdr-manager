create table if not exists public.workspace_llm_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  provider text not null default 'groq',
  model text not null,
  api_key_ciphertext text not null,
  api_key_preview text not null,
  validated_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint workspace_llm_settings_provider_check check (provider = 'groq')
);

alter table public.workspace_llm_settings enable row level security;

drop policy if exists "workspace_llm_settings_select_own_workspace" on public.workspace_llm_settings;
create policy "workspace_llm_settings_select_own_workspace"
on public.workspace_llm_settings
for select
to authenticated
using (
  exists (
    select 1
    from public.workspaces
    where workspaces.id = workspace_llm_settings.workspace_id
      and workspaces.owner_id = auth.uid()
  )
);

drop policy if exists "workspace_llm_settings_insert_own_workspace" on public.workspace_llm_settings;
create policy "workspace_llm_settings_insert_own_workspace"
on public.workspace_llm_settings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workspaces
    where workspaces.id = workspace_llm_settings.workspace_id
      and workspaces.owner_id = auth.uid()
  )
);

drop policy if exists "workspace_llm_settings_update_own_workspace" on public.workspace_llm_settings;
create policy "workspace_llm_settings_update_own_workspace"
on public.workspace_llm_settings
for update
to authenticated
using (
  exists (
    select 1
    from public.workspaces
    where workspaces.id = workspace_llm_settings.workspace_id
      and workspaces.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.workspaces
    where workspaces.id = workspace_llm_settings.workspace_id
      and workspaces.owner_id = auth.uid()
  )
);
