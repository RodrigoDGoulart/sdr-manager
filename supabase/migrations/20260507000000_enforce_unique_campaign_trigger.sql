with ranked_campaigns as (
  select
    id,
    row_number() over (
      partition by workspace_id, trigger_funnel_id
      order by updated_at desc, created_at desc, id
    ) as rank
  from public.campaigns
  where trigger_funnel_id is not null
)
update public.campaigns
set
  trigger_funnel_id = null,
  updated_at = now()
from ranked_campaigns
where campaigns.id = ranked_campaigns.id
  and ranked_campaigns.rank > 1;

create unique index if not exists idx_campaigns_unique_trigger_funnel
  on public.campaigns(workspace_id, trigger_funnel_id)
  where trigger_funnel_id is not null;
