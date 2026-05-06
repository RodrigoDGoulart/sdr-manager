import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { workspaceService } from '../services/api';
import { useWorkspaces } from '../contexts/WorkspaceContext';
import type { AxiosError } from 'axios';

interface ApiError {
  error: string;
}

export default function CreateWorkspacePage() {
  const navigate = useNavigate();
  const { addWorkspace } = useWorkspaces();

  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await workspaceService.create(name.trim());
      addWorkspace(res.data);
      navigate(`/workspace/${res.data.id}`);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      setError(axiosErr.response?.data?.error || 'Erro ao criar workspace');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          p: 4,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 480,
            p: 4,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Novo workspace
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Crie um workspace para organizar seus leads
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nome do workspace"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            />

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleCreate}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
            >
              Criar
            </Button>

            {error && (
              <Typography variant="caption" color="error" sx={{ mt: -1 }}>
                {error}
              </Typography>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
