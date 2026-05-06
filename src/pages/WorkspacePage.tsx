import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { workspaceService, type Workspace } from '../services/api';

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    workspaceService
      .getById(id)
      .then((res) => setWorkspace(res.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

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
        }}
      >
        {loading ? (
          <CircularProgress />
        ) : (
          <Typography
            variant="h2"
            sx={{
              color: 'text.primary',
              opacity: 0.07,
              fontWeight: 700,
              userSelect: 'none',
              textAlign: 'center',
              px: 4,
            }}
          >
            {workspace?.name}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
