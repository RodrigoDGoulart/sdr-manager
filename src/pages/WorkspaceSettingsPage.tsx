import { memo, useEffect, useState } from 'react';
import {
  Alert,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import KeyIcon from '@mui/icons-material/Key';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import { useNavigate, useParams } from 'react-router-dom';
import type { AxiosError } from 'axios';
import Sidebar from '../components/Sidebar';
import {
  funnelService,
  llmSettingsService,
  workspaceService,
  type Funnel,
  type LlmModel,
  type Workspace,
  type WorkspaceLlmSettings,
} from '../services/api';
import { nativeLeadRequiredFieldOptions } from '../utils/leadRequiredFields';

interface ApiError {
  error: string;
}

interface CustomRequiredFieldRowProps {
  field: string;
  index: number;
  onCommit: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}

const CustomRequiredFieldRow = memo(function CustomRequiredFieldRow({
  field,
  index,
  onCommit,
  onRemove,
}: CustomRequiredFieldRowProps) {
  const [value, setValue] = useState(field);

  useEffect(() => {
    setValue(field);
  }, [field]);

  function commitValue() {
    if (value !== field) onCommit(index, value);
  }

  return (
    <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ width: '100%' }}>
      <Checkbox
        checked
        aria-label={`Remover campo customizado obrigatorio ${value || index + 1}`}
        onChange={(event) => {
          if (!event.target.checked) onRemove(index);
        }}
        sx={{ mt: 0.25 }}
      />
      <TextField
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commitValue}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          }
        }}
        size="small"
        fullWidth
      />
    </Stack>
  );
});

export default function WorkspaceSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [settings, setSettings] = useState<WorkspaceLlmSettings | null>(null);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [selectedDestinationFunnelId, setSelectedDestinationFunnelId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [models, setModels] = useState<LlmModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingDestination, setSavingDestination] = useState(false);
  const [savingRequiredFunnelId, setSavingRequiredFunnelId] = useState('');
  const [destinationError, setDestinationError] = useState('');
  const [requiredFieldsError, setRequiredFieldsError] = useState('');
  const [tokenStatus, setTokenStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [toast, setToast] = useState('');
  const isConfigured = Boolean(settings?.isConfigured);

  useEffect(() => {
    if (!id) return;
    let ignore = false;
    setLoading(true);

    Promise.all([workspaceService.getById(id), llmSettingsService.get(id), funnelService.list(id)])
      .then(([workspaceRes, settingsRes, funnelsRes]) => {
        if (ignore) return;
        const defaultFunnel = funnelsRes.data.find((funnel) => funnel.name.toLowerCase() === 'tentando contato');
        setWorkspace(workspaceRes.data);
        setSettings(settingsRes.data);
        setFunnels(funnelsRes.data);
        setSelectedDestinationFunnelId(workspaceRes.data.autoMessageDestinationFunnelId || defaultFunnel?.id || '');
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

  async function handleSaveDestination() {
    if (!id || !selectedDestinationFunnelId) return;

    setSavingDestination(true);
    setDestinationError('');

    try {
      const res = await workspaceService.updateAutoMessageDestination(id, selectedDestinationFunnelId);
      setWorkspace(res.data);
      setToast('Coluna de destino salva com sucesso.');
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      setDestinationError(axiosErr.response?.data?.error || 'Não foi possível salvar a coluna de destino.');
    } finally {
      setSavingDestination(false);
    }
  }

  function updateFunnelRequiredFields(funnelId: string, requiredFields: string[]) {
    setFunnels((current) =>
      current.map((funnel) =>
        funnel.id === funnelId
          ? {
              ...funnel,
              requiredFields,
            }
          : funnel,
      ),
    );
    setRequiredFieldsError('');
  }

  function toggleRequiredField(funnel: Funnel, field: string, checked: boolean) {
    const currentFields = funnel.requiredFields || [];
    const nextFields = checked
      ? [...currentFields, field]
      : currentFields.filter((currentField) => currentField !== field);

    updateFunnelRequiredFields(funnel.id, Array.from(new Set(nextFields)));
  }

  function addCustomRequiredField(funnel: Funnel) {
    const baseLabel = 'Campo customizado';
    const existingLabels = new Set(funnel.requiredFields.map((field) => field.toLowerCase()));
    let nextLabel = baseLabel;
    let suffix = 2;

    while (existingLabels.has(nextLabel.toLowerCase())) {
      nextLabel = `${baseLabel} ${suffix}`;
      suffix += 1;
    }

    updateFunnelRequiredFields(funnel.id, [...funnel.requiredFields, nextLabel]);
  }

  function removeRequiredFieldAtIndex(funnel: Funnel, fieldIndex: number) {
    updateFunnelRequiredFields(
      funnel.id,
      funnel.requiredFields.filter((_, index) => index !== fieldIndex),
    );
  }

  function updateCustomRequiredField(funnel: Funnel, fieldIndex: number, nextLabel: string) {
    updateFunnelRequiredFields(
      funnel.id,
      funnel.requiredFields.map((field, index) => (index === fieldIndex ? nextLabel : field)),
    );
  }

  async function handleSaveRequiredFields(funnel: Funnel) {
    if (!id) return;

    const normalizedFields = funnel.requiredFields.map((field) => field.trim()).filter(Boolean);

    if (normalizedFields.length !== new Set(normalizedFields.map((field) => field.toLowerCase())).size) {
      setRequiredFieldsError('Remova campos obrigatorios duplicados antes de salvar.');
      return;
    }

    setSavingRequiredFunnelId(funnel.id);
    setRequiredFieldsError('');

    try {
      const res = await funnelService.update(id, funnel.id, { requiredFields: normalizedFields });
      setFunnels((current) => current.map((item) => (item.id === funnel.id ? res.data : item)));
      setToast('Campos obrigatorios salvos com sucesso.');
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      setRequiredFieldsError(axiosErr.response?.data?.error || 'Nao foi possivel salvar os campos obrigatorios.');
    } finally {
      setSavingRequiredFunnelId('');
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
                      Colunas de destino
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Defina para qual coluna o lead será movido ao enviar uma mensagem automática.
                    </Typography>
                  </Box>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                    <FormControl fullWidth>
                      <InputLabel id="auto-message-destination-label">
                        Ao enviar mensagem automática, mover Lead para...
                      </InputLabel>
                      <Select
                        labelId="auto-message-destination-label"
                        label="Ao enviar mensagem automática, mover Lead para..."
                        value={selectedDestinationFunnelId}
                        onChange={(event) => {
                          setSelectedDestinationFunnelId(event.target.value);
                          setDestinationError('');
                        }}
                        disabled={savingDestination || funnels.length === 0}
                      >
                        {funnels.map((funnel) => (
                          <MenuItem key={funnel.id} value={funnel.id}>
                            {funnel.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Button
                      variant="contained"
                      startIcon={savingDestination ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                      onClick={handleSaveDestination}
                      disabled={
                        savingDestination ||
                        !selectedDestinationFunnelId ||
                        selectedDestinationFunnelId === workspace?.autoMessageDestinationFunnelId
                      }
                      sx={{ minWidth: { sm: 120 } }}
                    >
                      Salvar
                    </Button>
                  </Stack>
                  {destinationError && (
                    <Alert severity="error">
                      {destinationError}
                    </Alert>
                  )}
                </Stack>
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
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Campos obrigatorios por funil
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Configure quais informacoes precisam existir antes de criar ou mover um lead para cada coluna.
                    </Typography>
                  </Box>

                  <Stack spacing={1}>
                    {funnels.map((funnel) => {
                      const nativeKeys = new Set<string>(nativeLeadRequiredFieldOptions.map((field) => field.key));
                      const customRequiredFields = funnel.requiredFields
                        .map((field, index) => ({ field, index }))
                        .filter(({ field }) => !nativeKeys.has(field));

                      return (
                        <Accordion key={funnel.id} disableGutters variant="outlined" sx={{ boxShadow: 'none' }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} sx={{ width: '100%', pr: 1 }}>
                              <Typography sx={{ fontWeight: 700 }}>{funnel.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {funnel.requiredFields.length} obrigatorio(s)
                              </Typography>
                            </Stack>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Stack spacing={2}>
                              <Box
                                sx={{
                                  display: 'grid',
                                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                                  gap: 0.5,
                                }}
                              >
                                {nativeLeadRequiredFieldOptions.map((field) => (
                                  <FormControlLabel
                                    key={field.key}
                                    control={
                                      <Checkbox
                                        checked={funnel.requiredFields.includes(field.key)}
                                        onChange={(event) => toggleRequiredField(funnel, field.key, event.target.checked)}
                                      />
                                    }
                                    label={field.label}
                                  />
                                ))}
                              </Box>

                              <Stack spacing={1}>
                                {customRequiredFields.map(({ field, index }) => (
                                  <CustomRequiredFieldRow
                                    key={`${funnel.id}-custom-${index}`}
                                    field={field}
                                    index={index}
                                    onCommit={(fieldIndex, value) => updateCustomRequiredField(funnel, fieldIndex, value)}
                                    onRemove={(fieldIndex) => removeRequiredFieldAtIndex(funnel, fieldIndex)}
                                  />
                                ))}
                              </Stack>

                              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                                <Button
                                  variant="outlined"
                                  startIcon={<AddIcon />}
                                  onClick={() => addCustomRequiredField(funnel)}
                                >
                                  Campo customizado
                                </Button>
                                <Button
                                  variant="contained"
                                  startIcon={
                                    savingRequiredFunnelId === funnel.id ? (
                                      <CircularProgress size={16} color="inherit" />
                                    ) : (
                                      <SaveIcon />
                                    )
                                  }
                                  onClick={() => handleSaveRequiredFields(funnel)}
                                  disabled={savingRequiredFunnelId === funnel.id}
                                >
                                  Salvar funil
                                </Button>
                              </Stack>
                            </Stack>
                          </AccordionDetails>
                        </Accordion>
                      );
                    })}
                  </Stack>

                  {requiredFieldsError && <Alert severity="error">{requiredFieldsError}</Alert>}
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
