import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { useNavigate, useParams } from 'react-router-dom';
import type { AxiosError } from 'axios';
import Sidebar from '../components/Sidebar';
import CampaignDialog from '../components/campaigns/CampaignDialog';
import {
  campaignService,
  funnelService,
  workspaceService,
  type Campaign,
  type CreateCampaignPayload,
  type Funnel,
  type Workspace,
} from '../services/api';

interface ApiError {
  error: string;
}

export default function CampaignsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogVersion, setDialogVersion] = useState(0);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [viewingCampaign, setViewingCampaign] = useState<Campaign | null>(null);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [campaignError, setCampaignError] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [toast, setToast] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error'>('success');

  const editingPayload = useMemo<CreateCampaignPayload | null>(
    () =>
      editingCampaign
        ? {
            name: editingCampaign.name,
            context: editingCampaign.context,
            generationPrompt: editingCampaign.generationPrompt,
            triggerFunnelId: editingCampaign.triggerFunnelId,
          }
        : null,
    [editingCampaign],
  );

  useEffect(() => {
    if (!id) return;

    let ignore = false;
    setLoading(true);

    Promise.all([
      workspaceService.getById(id),
      funnelService.list(id),
      campaignService.list(id),
    ])
      .then(([workspaceRes, funnelsRes, campaignsRes]) => {
        if (ignore) return;
        setWorkspace(workspaceRes.data);
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

  function showSuccess(message: string) {
    setToastSeverity('success');
    setToast(message);
  }

  function showError(message: string) {
    setToastSeverity('error');
    setToast(message);
  }

  function getFunnelName(funnelId: string | null) {
    if (!funnelId) return 'Sem etapa gatilho';
    return funnels.find((funnel) => funnel.id === funnelId)?.name || 'Etapa removida';
  }

  function openCreateDialog() {
    setCampaignError('');
    setEditingCampaign(null);
    setDialogVersion((current) => current + 1);
    setDialogOpen(true);
  }

  function openCampaignMenu(event: MouseEvent<HTMLElement>, campaign: Campaign) {
    setActiveCampaign(campaign);
    setMenuAnchor(event.currentTarget);
  }

  function openEditDialog() {
    if (activeCampaign) {
      openEditCampaign(activeCampaign);
    }
    setMenuAnchor(null);
  }

  function openDeleteConfirm() {
    setDeleteError('');
    setDeleteConfirmOpen(true);
    setMenuAnchor(null);
  }

  function openEditCampaign(campaign: Campaign) {
    setCampaignError('');
    setViewingCampaign(null);
    setEditingCampaign(campaign);
    setDialogVersion((current) => current + 1);
    setDialogOpen(true);
  }

  function openDeleteCampaignConfirm(campaign: Campaign) {
    setDeleteError('');
    setViewingCampaign(null);
    setActiveCampaign(campaign);
    setDeleteConfirmOpen(true);
  }

  async function handleSaveCampaign(payload: CreateCampaignPayload) {
    if (!id) return;
    setSavingCampaign(true);
    setCampaignError('');

    try {
      if (editingCampaign) {
        const res = await campaignService.update(id, editingCampaign.id, payload);
        setCampaigns((current) =>
          current.map((campaign) => (campaign.id === res.data.id ? res.data : campaign)),
        );
        showSuccess('Campanha atualizada com sucesso.');
      } else {
        const res = await campaignService.create(id, payload);
        setCampaigns((current) => [res.data, ...current]);
        showSuccess('Campanha criada com sucesso.');
      }

      setDialogOpen(false);
      setEditingCampaign(null);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      setCampaignError(
        axiosErr.response?.data?.error || 'Nao foi possivel salvar a campanha.',
      );
    } finally {
      setSavingCampaign(false);
    }
  }

  async function handleDeleteCampaign() {
    if (!id || !activeCampaign) return;
    setDeleteLoading(true);
    setDeleteError('');

    try {
      await campaignService.remove(id, activeCampaign.id);
      setCampaigns((current) =>
        current.filter((campaign) => campaign.id !== activeCampaign.id),
      );
      setDeleteConfirmOpen(false);
      setActiveCampaign(null);
      showSuccess('Campanha excluida com sucesso.');
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      setDeleteError(
        axiosErr.response?.data?.error || 'Nao foi possivel excluir a campanha.',
      );
      showError('Nao foi possivel excluir a campanha.');
    } finally {
      setDeleteLoading(false);
    }
  }

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
          <Box sx={{ maxWidth: 980, mx: 'auto' }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              justifyContent="space-between"
              spacing={2}
              sx={{ mb: 3 }}
            >
              <Box>
                <Typography variant="h4" color="text.primary">
                  Campanhas
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {workspace?.name}
                </Typography>
              </Box>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
                Adicionar campanha
              </Button>
            </Stack>

            {campaigns.length > 0 ? (
              <Stack spacing={1.5}>
                {campaigns.map((campaign) => (
                  <Card
                    key={campaign.id}
                    onClick={() => setViewingCampaign(campaign)}
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      boxShadow: 'none',
                      cursor: 'pointer',
                      transition: 'border-color 120ms ease, box-shadow 120ms ease',
                      '&:hover': {
                        borderColor: 'secondary.light',
                        boxShadow: '0 1px 6px rgba(17, 24, 39, 0.08)',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Stack direction="row" alignItems="flex-start" spacing={2}>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {campaign.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Etapa gatilho: {getFunnelName(campaign.triggerFunnelId)}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              mt: 1,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {campaign.context}
                          </Typography>
                        </Box>
                        <IconButton
                          aria-label="Ações da campanha"
                          onClick={(event) => {
                            event.stopPropagation();
                            openCampaignMenu(event, campaign);
                          }}
                        >
                          <MoreHorizIcon />
                        </IconButton>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Box
                sx={{
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  px: 3,
                  py: 5,
                  textAlign: 'center',
                }}
              >
                <Typography variant="h6">Nenhuma campanha cadastrada</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Crie campanhas ligadas as etapas do funil deste workspace.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openCreateDialog}
                  sx={{ mt: 2 }}
                >
                  Adicionar campanha
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Box>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 140 } } }}
      >
        <MenuItem onClick={openEditDialog}>Editar</MenuItem>
        <MenuItem onClick={openDeleteConfirm} sx={{ color: 'error.main' }}>
          Excluir
        </MenuItem>
      </Menu>

      <CampaignDialog
        key={editingCampaign ? `edit-${editingCampaign.id}-${dialogVersion}` : `create-campaign-${dialogVersion}`}
        open={dialogOpen}
        title={editingCampaign ? 'Editar campanha' : 'Adicionar campanha'}
        loading={savingCampaign}
        error={campaignError}
        funnels={funnels}
        initialCampaign={editingPayload}
        onClose={() => {
          setDialogOpen(false);
          setEditingCampaign(null);
          setCampaignError('');
        }}
        onSubmit={handleSaveCampaign}
      />

      <Dialog
        open={Boolean(viewingCampaign)}
        onClose={() => setViewingCampaign(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pr: 6 }}>
          {viewingCampaign?.name}
          <IconButton
            aria-label="Fechar"
            onClick={() => setViewingCampaign(null)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Etapa gatilho
              </Typography>
              <Typography variant="body1" color="text.primary">
                {getFunnelName(viewingCampaign?.triggerFunnelId || null)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Contexto
              </Typography>
              <Typography variant="body2" color="text.primary" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
                {viewingCampaign?.context}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Prompt de geração
              </Typography>
              <Typography variant="body2" color="text.primary" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
                {viewingCampaign?.generationPrompt}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            color="error"
            onClick={() => {
              if (viewingCampaign) openDeleteCampaignConfirm(viewingCampaign);
            }}
          >
            Excluir
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (viewingCampaign) openEditCampaign(viewingCampaign);
            }}
          >
            Editar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => !deleteLoading && setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Excluir campanha</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja excluir {activeCampaign?.name}? Esta acao nao pode ser desfeita.
          </DialogContentText>
          {deleteError && (
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              {deleteError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deleteLoading}>
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteCampaign}
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast('')}>
        <Alert severity={toastSeverity} variant="filled" onClose={() => setToast('')}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
