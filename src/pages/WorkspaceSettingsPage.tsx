import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import KeyIcon from '@mui/icons-material/Key';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import { useNavigate, useParams } from 'react-router-dom';
import type { AxiosError } from 'axios';
import Sidebar from '../components/Sidebar';
import {
  llmSettingsService,
  workspaceService,
  type LlmModel,
  type Workspace,
  type WorkspaceLlmSettings,
} from '../services/api';

interface ApiError {
  error: string;
}

export default function WorkspaceSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [settings, setSettings] = useState<WorkspaceLlmSettings | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [models, setModels] = useState<LlmModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [toast, setToast] = useState('');
  const isConfigured = Boolean(settings?.isConfigured);

  useEffect(() => {
    if (!id) return;
    let ignore = false;
    setLoading(true);

    Promise.all([workspaceService.getById(id), llmSettingsService.get(id)])
      .then(([workspaceRes, settingsRes]) => {
        if (ignore) return;
        setWorkspace(workspaceRes.data);
        setSettings(settingsRes.data);
        setSelectedModel(settingsRes.data.model);
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

  async function loadModels(apiKeyOverride?: string) {
    if (!id) return;
    setTesting(true);
    setTokenStatus('idle');
    setStatusMessage('');

    try {
      const res = await llmSettingsService.listModels(id, apiKeyOverride);
      setModels(res.data);
      setTokenStatus('valid');
      setStatusMessage('Chave Groq validada com sucesso.');

      if (!selectedModel && res.data.length > 0) {
        setSelectedModel(res.data[0].id);
      }
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      setModels([]);
      setTokenStatus('invalid');
      setStatusMessage(axiosErr.response?.data?.error || 'Token inválido.');
    } finally {
      setTesting(false);
    }
  }

  async function handleTestToken() {
    const key = apiKey.trim();
    if (!key && !isConfigured) {
      setTokenStatus('invalid');
      setStatusMessage('Informe uma chave de API Groq.');
      return;
    }

    await loadModels(key || undefined);
  }

  async function handleSave() {
    if (!id || !selectedModel) {
      setTokenStatus('invalid');
      setStatusMessage('Selecione um modelo Groq.');
      return;
    }

    if (!apiKey.trim() && !isConfigured) {
      setTokenStatus('invalid');
      setStatusMessage('Informe uma chave de API Groq.');
      return;
    }

    setSaving(true);
    setStatusMessage('');

    try {
      const res = await llmSettingsService.save(id, {
        model: selectedModel,
        apiKey: apiKey.trim() || undefined,
      });
      setSettings(res.data);
      setApiKey('');
      setTokenStatus('valid');
      setStatusMessage('Configuração salva e token validado.');
      setToast('Configuração de LLM salva com sucesso.');
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      setTokenStatus('invalid');
      setStatusMessage(axiosErr.response?.data?.error || 'Não foi possível salvar a configuração.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flex: 1, p: { xs: 3, md: 5 }, bgcolor: 'background.default', minWidth: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ maxWidth: 780, mx: 'auto' }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h4" color="text.primary">
                  Configurações
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {workspace?.name}
                </Typography>
              </Box>

              <Box
                sx={{
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: { xs: 2, sm: 3 },
                }}
              >
                <Stack spacing={2.5}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      LLM Groq
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Use uma chave de API Groq para listar modelos e preparar a geração de mensagens.
                      {' '}
                      <Link href="https://console.groq.com/keys" target="_blank" rel="noreferrer">
                        Abrir chaves no Groq
                      </Link>
                    </Typography>
                  </Box>

                  {isConfigured && (
                    <Alert severity="success" icon={<CheckCircleIcon />}>
                      Token configurado: {settings?.apiKeyPreview}. O campo de edição permanece vazio por segurança.
                    </Alert>
                  )}

                  <TextField
                    label="Chave de API Groq"
                    value={apiKey}
                    onChange={(event) => {
                      setApiKey(event.target.value);
                      setTokenStatus('idle');
                      setStatusMessage('');
                    }}
                    type="password"
                    autoComplete="off"
                    placeholder={isConfigured ? 'Informe uma nova chave para substituir a atual' : 'gsk_...'}
                    fullWidth
                  />

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                    <Button
                      variant="outlined"
                      startIcon={testing ? <CircularProgress size={16} /> : <KeyIcon />}
                      onClick={handleTestToken}
                      disabled={testing || saving}
                    >
                      Testar e carregar modelos
                    </Button>
                    {tokenStatus === 'valid' && (
                      <Stack direction="row" spacing={0.75} alignItems="center" color="success.main">
                        <CheckCircleIcon fontSize="small" />
                        <Typography variant="body2">{statusMessage}</Typography>
                      </Stack>
                    )}
                    {tokenStatus === 'invalid' && (
                      <Stack direction="row" spacing={0.75} alignItems="center" color="error.main">
                        <ErrorIcon fontSize="small" />
                        <Typography variant="body2">{statusMessage}</Typography>
                      </Stack>
                    )}
                  </Stack>

                  <FormControl fullWidth disabled={models.length === 0 && !selectedModel}>
                    <InputLabel id="groq-model-label">Modelo Groq</InputLabel>
                    <Select
                      labelId="groq-model-label"
                      label="Modelo Groq"
                      value={selectedModel}
                      onChange={(event) => setSelectedModel(event.target.value)}
                    >
                      {selectedModel && !models.some((model) => model.id === selectedModel) && (
                        <MenuItem value={selectedModel}>{selectedModel}</MenuItem>
                      )}
                      {models.map((model) => (
                        <MenuItem key={model.id} value={model.id}>
                          {model.id}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <Button
                      variant="contained"
                      startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                      onClick={handleSave}
                      disabled={saving || testing || !selectedModel}
                    >
                      Salvar configuração
                    </Button>
                    {isConfigured && (
                      <Button
                        variant="text"
                        startIcon={<RefreshIcon />}
                        onClick={() => loadModels()}
                        disabled={saving || testing}
                      >
                        Recarregar modelos com token salvo
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Box>
            </Stack>
          </Box>
        )}
      </Box>

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast('')}>
        <Alert severity="success" variant="filled" onClose={() => setToast('')}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
