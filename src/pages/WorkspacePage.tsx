import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Snackbar,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useParams, useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import Sidebar from '../components/Sidebar';
import AddLeadDialog from '../components/leads/AddLeadDialog';
import ViewLeadDialog from '../components/leads/ViewLeadDialog';
import { leadService, workspaceService, type CreateLeadPayload, type Lead, type Workspace } from '../services/api';

interface ApiError {
  error: string;
}

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [createLeadLoading, setCreateLeadLoading] = useState(false);
  const [createLeadError, setCreateLeadError] = useState('');
  const [deleteLeadLoading, setDeleteLeadLoading] = useState(false);
  const [deleteLeadError, setDeleteLeadError] = useState('');
  const [toast, setToast] = useState('');

  const editingLeadPayload = useMemo(() => (editingLead ? getLeadPayload(editingLead) : null), [editingLead]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    workspaceService
      .getById(id)
      .then((res) => setWorkspace(res.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    if (!id) return;
    setLeadsLoading(true);
    leadService
      .list(id)
      .then((res) => setLeads(res.data))
      .catch(() => setLeads([]))
      .finally(() => setLeadsLoading(false));
  }, [id]);

  async function handleCreateLead(payload: CreateLeadPayload) {
    if (!id) return;
    setCreateLeadLoading(true);
    setCreateLeadError('');

    try {
      const res = await leadService.create(id, payload);
      setLeads((current) => [res.data, ...current]);
      setAddLeadOpen(false);
      setToast('Lead cadastrado com sucesso.');
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      setCreateLeadError(axiosErr.response?.data?.error || 'Não foi possível cadastrar o lead. Revise os dados e tente novamente.');
    } finally {
      setCreateLeadLoading(false);
    }
  }

  async function handleUpdateLead(payload: CreateLeadPayload) {
    if (!id || !editingLead) return;
    setCreateLeadLoading(true);
    setCreateLeadError('');

    try {
      const res = await leadService.update(id, editingLead.id, payload);
      setLeads((current) => current.map((lead) => (lead.id === res.data.id ? res.data : lead)));
      setEditingLead(null);
      setSelectedLead(res.data);
      setToast('Lead atualizado com sucesso.');
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      setCreateLeadError(axiosErr.response?.data?.error || 'Não foi possível atualizar o lead. Revise os dados e tente novamente.');
    } finally {
      setCreateLeadLoading(false);
    }
  }

  async function handleDeleteLead() {
    if (!id || !selectedLead) return;
    setDeleteLeadLoading(true);
    setDeleteLeadError('');

    try {
      await leadService.remove(id, selectedLead.id);
      setLeads((current) => current.filter((lead) => lead.id !== selectedLead.id));
      setSelectedLead(null);
      setDeleteConfirmOpen(false);
      setToast('Lead excluído com sucesso.');
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      setDeleteLeadError(axiosErr.response?.data?.error || 'Não foi possível excluir o lead. Tente novamente.');
    } finally {
      setDeleteLeadLoading(false);
    }
  }

  function getLeadPayload(lead: Lead): CreateLeadPayload {
    return {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      role: lead.role,
      source: lead.source,
      notes: lead.notes,
      customFields: lead.customFields,
    };
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box
        sx={{
          flex: 1,
          p: { xs: 3, md: 5 },
          bgcolor: 'background.default',
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ maxWidth: 920, mx: 'auto' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: { xs: 'stretch', sm: 'center' },
                justifyContent: 'space-between',
                gap: 2,
                flexDirection: { xs: 'column', sm: 'row' },
                mb: 3,
              }}
            >
              <Box>
                <Typography variant="h4" color="text.primary">
                  {workspace?.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Leads cadastrados neste workspace
                </Typography>
              </Box>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddLeadOpen(true)}>
                Adicionar Lead
              </Button>
            </Box>

            {leadsLoading ? (
              <Box sx={{ display: 'flex', py: 8, justifyContent: 'center' }}>
                <CircularProgress size={28} />
              </Box>
            ) : leads.length > 0 ? (
              <List
                sx={{
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  overflow: 'hidden',
                }}
              >
                {leads.map((lead) => (
                  <ListItemButton key={lead.id} onClick={() => setSelectedLead(lead)} divider>
                    <ListItemText
                      primary={`${lead.name}, ${lead.role} - ${lead.company}`}
                      slotProps={{ primary: { fontWeight: 600 } }}
                    />
                  </ListItemButton>
                ))}
              </List>
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
                <Typography variant="h6">Nenhum lead cadastrado</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Adicione o primeiro lead para começar a organizar os contatos deste workspace.
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>

      <AddLeadDialog
        key={editingLead ? `edit-lead-${editingLead.id}` : addLeadOpen ? 'add-lead-open' : 'add-lead-closed'}
        open={addLeadOpen || Boolean(editingLead)}
        loading={createLeadLoading}
        error={createLeadError}
        title={editingLead ? `Editando lead ${editingLead.name}` : 'Adicionar lead'}
        initialLead={editingLeadPayload}
        onClose={() => {
          setCreateLeadError('');
          if (editingLead) {
            setEditingLead(null);
          } else {
            setAddLeadOpen(false);
          }
        }}
        onSubmit={editingLead ? handleUpdateLead : handleCreateLead}
      />
      <ViewLeadDialog
        open={Boolean(selectedLead) && !editingLead && !deleteConfirmOpen}
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onEdit={() => {
          if (selectedLead) setEditingLead(selectedLead);
        }}
        onDelete={() => {
          setDeleteLeadError('');
          setDeleteConfirmOpen(true);
        }}
      />
      <Dialog open={deleteConfirmOpen} onClose={() => !deleteLeadLoading && setDeleteConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Excluir lead</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja excluir {selectedLead?.name}? Esta ação não pode ser desfeita.
          </DialogContentText>
          {deleteLeadError && (
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              {deleteLeadError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deleteLeadLoading}>
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteLead}
            disabled={deleteLeadLoading}
            startIcon={deleteLeadLoading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast('')}>
        <Alert severity="success" variant="filled" onClose={() => setToast('')}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
