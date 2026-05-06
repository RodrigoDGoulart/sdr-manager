import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Button,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
} from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import LogoutIcon from '@mui/icons-material/Logout';
import AddIcon from '@mui/icons-material/Add';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { useWorkspaces } from '../contexts/useWorkspaces';
import { userService, workspaceService } from '../services/api';
import type { AxiosError } from 'axios';

interface ApiError {
  error: string;
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, updateUser } = useAuth();
  const { workspaces, removeWorkspace, updateWorkspace } = useWorkspaces();

  const [userMenuAnchor, setUserMenuAnchor] = useState<HTMLElement | null>(null);
  const [wsMenuAnchor, setWsMenuAnchor] = useState<HTMLElement | null>(null);
  const [activeWsId, setActiveWsId] = useState<string | null>(null);

  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserError, setEditUserError] = useState('');
  const [editUserLoading, setEditUserLoading] = useState(false);

  const [deleteUserOpen, setDeleteUserOpen] = useState(false);
  const [deleteUserLoading, setDeleteUserLoading] = useState(false);

  const [editWsOpen, setEditWsOpen] = useState(false);
  const [editWsName, setEditWsName] = useState('');
  const [editWsError, setEditWsError] = useState('');
  const [editWsLoading, setEditWsLoading] = useState(false);

  const [deleteWsOpen, setDeleteWsOpen] = useState(false);
  const [deleteWsLoading, setDeleteWsLoading] = useState(false);

  const isCreateWs = location.pathname === '/workspace/new';

  function openEditUser() {
    setEditUserName(user?.name || '');
    setEditUserEmail(user?.email || '');
    setEditUserError('');
    setEditUserOpen(true);
    setUserMenuAnchor(null);
  }

  async function handleSaveUser() {
    if (!editUserName.trim() || !editUserEmail.trim()) {
      setEditUserError('Nome e e-mail são obrigatórios');
      return;
    }
    setEditUserLoading(true);
    setEditUserError('');
    try {
      await userService.update(user!.id, { name: editUserName.trim(), email: editUserEmail.trim() });
      updateUser(editUserName.trim(), editUserEmail.trim());
      setEditUserOpen(false);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      setEditUserError(axiosErr.response?.data?.error || 'Erro ao salvar');
    } finally {
      setEditUserLoading(false);
    }
  }

  async function handleDeleteUser() {
    setDeleteUserLoading(true);
    try {
      await userService.remove(user!.id);
      logout();
    } catch {
      // ignore, logout anyway
      logout();
    } finally {
      setDeleteUserLoading(false);
    }
  }

  function openWsMenu(e: React.MouseEvent<HTMLElement>, wsId: string) {
    e.stopPropagation();
    setActiveWsId(wsId);
    setWsMenuAnchor(e.currentTarget);
  }

  function openEditWs() {
    const ws = workspaces.find((w) => w.id === activeWsId);
    if (ws) {
      setEditWsName(ws.name);
      setEditWsError('');
      setEditWsOpen(true);
    }
    setWsMenuAnchor(null);
  }

  function openDeleteWs() {
    setDeleteWsOpen(true);
    setWsMenuAnchor(null);
  }

  async function handleSaveWs() {
    if (!editWsName.trim()) {
      setEditWsError('Nome é obrigatório');
      return;
    }
    setEditWsLoading(true);
    setEditWsError('');
    try {
      const res = await workspaceService.update(activeWsId!, editWsName.trim());
      updateWorkspace(res.data);
      setEditWsOpen(false);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      setEditWsError(axiosErr.response?.data?.error || 'Erro ao salvar');
    } finally {
      setEditWsLoading(false);
    }
  }

  async function handleDeleteWs() {
    setDeleteWsLoading(true);
    try {
      await workspaceService.remove(activeWsId!);
      removeWorkspace(activeWsId!);
      setDeleteWsOpen(false);
      if (location.pathname === `/workspace/${activeWsId}`) {
        navigate('/');
      }
    } catch {
      setDeleteWsOpen(false);
    } finally {
      setDeleteWsLoading(false);
    }
  }

  return (
    <Box
      sx={{
        width: 240,
        minHeight: '100vh',
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* User section */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Avatar sx={{ bgcolor: 'primary.light', width: 36, height: 36 }}>
          <AccountCircleIcon fontSize="small" />
        </Avatar>
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {user?.name}
        </Typography>
        <IconButton
          size="small"
          onClick={(e) => setUserMenuAnchor(e.currentTarget)}
          sx={{ color: 'primary.contrastText', opacity: 0.8, '&:hover': { opacity: 1 } }}
        >
          <MoreHorizIcon fontSize="small" />
        </IconButton>
      </Box>

      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={() => setUserMenuAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 140 } } }}
      >
        <MenuItem onClick={openEditUser}>Editar</MenuItem>
        <MenuItem onClick={() => { setDeleteUserOpen(true); setUserMenuAnchor(null); }} sx={{ color: 'error.main' }}>
          Excluir
        </MenuItem>
      </Menu>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)' }} />

      {/* Workspaces */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 1, py: 1.5 }}>
        <Typography variant="caption" sx={{ px: 1, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem' }}>
          Workspaces
        </Typography>

        <List dense disablePadding sx={{ mt: 0.5 }}>
          <ListItemButton
            onClick={() => navigate('/workspace/new')}
            selected={isCreateWs}
            sx={{
              borderRadius: 1,
              py: 0.5,
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
              '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } },
            }}
          >
            <AddIcon sx={{ fontSize: 16, mr: 1, opacity: 0.8 }} />
            <ListItemText
              primary="Criar workspace"
              slotProps={{ primary: { variant: 'body2', fontWeight: isCreateWs ? 600 : 400 } }}
            />
          </ListItemButton>

          {workspaces.map((ws) => {
            const isActive = location.pathname === `/workspace/${ws.id}`;
            return (
              <ListItemButton
                key={ws.id}
                onClick={() => navigate(`/workspace/${ws.id}`)}
                selected={isActive}
                sx={{
                  borderRadius: 1,
                  py: 0.5,
                  color: 'primary.contrastText',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                  '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } },
                  pr: 0.5,
                }}
              >
                <ListItemText
                  primary={ws.name}
                  slotProps={{ primary: { variant: 'body2', fontWeight: isActive ? 600 : 400, sx: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } } }}
                />
                <IconButton
                  size="small"
                  onClick={(e) => openWsMenu(e, ws.id)}
                  sx={{ color: 'primary.contrastText', opacity: 0.6, '&:hover': { opacity: 1 }, ml: 0.5 }}
                >
                  <MoreHorizIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      <Menu
        anchorEl={wsMenuAnchor}
        open={Boolean(wsMenuAnchor)}
        onClose={() => setWsMenuAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 140 } } }}
      >
        <MenuItem onClick={openEditWs}>Editar</MenuItem>
        <MenuItem onClick={openDeleteWs} sx={{ color: 'error.main' }}>Excluir</MenuItem>
      </Menu>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)' }} />

      {/* Logout */}
      <Box sx={{ p: 1.5 }}>
        <Button
          fullWidth
          variant="contained"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={logout}
          size="small"
          sx={{ justifyContent: 'flex-start', fontWeight: 600 }}
        >
          Sair
        </Button>
      </Box>

      {/* Edit User Modal */}
      <Dialog open={editUserOpen} onClose={() => setEditUserOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Editar perfil</DialogTitle>
        <DialogContent>
          <TextField
            label="Nome"
            name="name"
            autoComplete="name"
            value={editUserName}
            onChange={(e) => setEditUserName(e.target.value)}
            fullWidth
            margin="normal"
            size="small"
          />
          <TextField
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            value={editUserEmail}
            onChange={(e) => setEditUserEmail(e.target.value)}
            fullWidth
            margin="normal"
            size="small"
          />
          {editUserError && (
            <Typography variant="caption" color="error">{editUserError}</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUserOpen(false)} disabled={editUserLoading}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSaveUser}
            disabled={editUserLoading}
            startIcon={editUserLoading ? <CircularProgress size={14} color="inherit" /> : null}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Confirm */}
      <Dialog open={deleteUserOpen} onClose={() => setDeleteUserOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Excluir conta</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteUserOpen(false)} disabled={deleteUserLoading}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteUser}
            disabled={deleteUserLoading}
            startIcon={deleteUserLoading ? <CircularProgress size={14} color="inherit" /> : null}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Workspace Modal */}
      <Dialog open={editWsOpen} onClose={() => setEditWsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Editar workspace</DialogTitle>
        <DialogContent>
          <TextField
            label="Nome"
            name="workspace-name"
            autoComplete="organization"
            value={editWsName}
            onChange={(e) => setEditWsName(e.target.value)}
            fullWidth
            margin="normal"
            size="small"
          />
          {editWsError && (
            <Typography variant="caption" color="error">{editWsError}</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditWsOpen(false)} disabled={editWsLoading}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSaveWs}
            disabled={editWsLoading}
            startIcon={editWsLoading ? <CircularProgress size={14} color="inherit" /> : null}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Workspace Confirm */}
      <Dialog open={deleteWsOpen} onClose={() => setDeleteWsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Excluir workspace</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Tem certeza que deseja excluir este workspace?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteWsOpen(false)} disabled={deleteWsLoading}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteWs}
            disabled={deleteWsLoading}
            startIcon={deleteWsLoading ? <CircularProgress size={14} color="inherit" /> : null}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
