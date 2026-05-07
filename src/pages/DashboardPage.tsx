import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import {
  campaignService,
  funnelService,
  leadService,
  workspaceService,
  type Campaign,
  type Funnel,
  type Lead,
  type Workspace,
} from '../services/api';

const FUNNEL_COLORS = [
  '#2563eb',
  '#16a34a',
  '#f59e0b',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#4f46e5',
];

export default function DashboardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    let ignore = false;

    Promise.all([
      workspaceService.getById(id),
      leadService.list(id),
      funnelService.list(id),
      campaignService.list(id),
    ])
      .then(([workspaceRes, leadsRes, funnelsRes, campaignsRes]) => {
        if (ignore) return;
        setWorkspace(workspaceRes.data);
        setLeads(leadsRes.data);
        setFunnels(funnelsRes.data);
        setCampaigns(campaignsRes.data);
      })
      .catch(() => {
        if (!ignore) navigate('/');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [id, navigate]);

  const leadsByFunnel = useMemo(
    () =>
      funnels.map((funnel, index) => ({
        funnel,
        count: leads.filter((lead) => lead.funnelId === funnel.id).length,
        color: FUNNEL_COLORS[index % FUNNEL_COLORS.length],
      })),
    [funnels, leads],
  );

  const maxFunnelLeads = Math.max(1, ...leadsByFunnel.map((item) => item.count));

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box
        sx={{
          flex: 1,
          p: { xs: 3, md: 5 },
          bgcolor: 'background.default',
          minWidth: 0,
        }}
      >
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              minHeight: '60vh',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ maxWidth: 1180, mx: 'auto' }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h4" color="text.primary">
                Dashboard
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {workspace?.name}
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 2,
                alignItems: 'stretch',
              }}
            >
              <Stack spacing={2}>
                <IndicatorCard title="Total de leads cadastrados" value={leads.length} />
                <IndicatorCard title="Campanhas cadastradas" value={campaigns.length} />
              </Stack>

              <Card
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  boxShadow: 'none',
                  minHeight: { xs: 360, md: 460 },
                  height: '100%',
                }}
              >
                <CardContent
                  sx={{
                    p: 3,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    '&:last-child': { pb: 3 },
                  }}
                >
                  <Typography variant="h6" color="text.primary">
                    Leads por funil
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    Distribuicao atual dos leads
                  </Typography>

                  {leadsByFunnel.length > 0 ? (
                    <Stack spacing={2} sx={{ mt: 3, flex: 1, justifyContent: 'center' }}>
                      {leadsByFunnel.map(({ funnel, count, color }) => (
                        <Box key={funnel.id}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            spacing={2}
                            sx={{ mb: 0.75 }}
                          >
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                              <Box
                                sx={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  bgcolor: color,
                                  flexShrink: 0,
                                }}
                              />
                              <Typography
                                variant="body2"
                                color="text.primary"
                                sx={{ fontWeight: 600 }}
                                noWrap
                              >
                                {funnel.name}
                              </Typography>
                            </Stack>
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                              {count}
                            </Typography>
                          </Stack>
                          <Box
                            sx={{
                              height: 12,
                              borderRadius: 1,
                              bgcolor: 'rgba(17, 24, 39, 0.08)',
                              overflow: 'hidden',
                            }}
                          >
                            <Box
                              sx={{
                                width: `${Math.max(count === 0 ? 0 : 8, (count / maxFunnelLeads) * 100)}%`,
                                height: '100%',
                                bgcolor: color,
                                borderRadius: 1,
                                transition: 'width 180ms ease',
                              }}
                            />
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Box
                      sx={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        px: 2,
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Nenhum funil cadastrado neste workspace.
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

interface IndicatorCardProps {
  title: string;
  value: number;
}

function IndicatorCard({ title, value }: IndicatorCardProps) {
  return (
    <Card
      sx={{
        border: 1,
        borderColor: 'divider',
        boxShadow: 'none',
        minHeight: { xs: 170, md: 222 },
        display: 'flex',
      }}
    >
      <CardContent
        sx={{
          p: 3,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          '&:last-child': { pb: 3 },
        }}
      >
        <Typography variant="subtitle2" color="text.secondary" sx={{ alignSelf: 'flex-start' }}>
          {title}
        </Typography>
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          <Typography
            variant="h3"
            color="text.primary"
            sx={{ fontWeight: 800, lineHeight: 1 }}
          >
            {value}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
