import { useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { CreateCampaignPayload, Funnel } from '../../services/api';

const emptyCampaign: CreateCampaignPayload = {
  name: '',
  context: '',
  generationPrompt: '',
  triggerFunnelId: null,
};

const contextHint =
  'Descrição da campanha/oferta, informações sobre o produto ou serviço, informações sobre a empresa se necessário, período ou condições da oferta e outras informações relevantes';
const generationPromptHint =
  'Definição da persona/personagem que está escrevendo, tom de voz desejado (formal, informal, consultivo, etc.), formato e tamanho da mensagem, exemplos de mensagens (se desejado), referências aos campos do lead que devem ser utilizados (tanto os padrão quanto personalizados) e outras instruções de estilo e abordagem';

interface CampaignDialogProps {
  open: boolean;
  title: string;
  loading: boolean;
  error: string;
  funnels: Funnel[];
  initialCampaign?: CreateCampaignPayload | null;
  llmConfigured: boolean;
  onClose: () => void;
  onSubmit: (campaign: CreateCampaignPayload) => Promise<void>;
}

export default function CampaignDialog({
  open,
  title,
  loading,
  error,
  funnels,
  initialCampaign,
  llmConfigured,
  onClose,
  onSubmit,
}: CampaignDialogProps) {
  const [campaign, setCampaign] = useState<CreateCampaignPayload>(
    initialCampaign || emptyCampaign,
  );
  const [validationError, setValidationError] = useState('');

  function handleClose() {
    if (loading) return;
    onClose();
  }

  function updateField(key: keyof CreateCampaignPayload, value: string) {
    setCampaign((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit() {
    if (
      !campaign.name.trim() ||
      !campaign.context.trim() ||
      !campaign.generationPrompt.trim()
    ) {
      setValidationError('Preencha todos os campos da campanha.');
      return;
    }

    setValidationError('');
    await onSubmit({
      name: campaign.name.trim(),
      context: campaign.context.trim(),
      generationPrompt: campaign.generationPrompt.trim(),
      triggerFunnelId: campaign.triggerFunnelId || null,
    });
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {!llmConfigured && (
            <Alert severity="warning">
              Este workspace ainda não possui LLM Groq configurada. As campanhas podem ser salvas, mas a geração automática e manual de mensagens ficará indisponível até a configuração.
            </Alert>
          )}
          <TextField
            label="Nome da campanha"
            value={campaign.name}
            onChange={(event) => updateField('name', event.target.value)}
            autoComplete="off"
            required
            fullWidth
          />
          <TextField
            label="Contexto"
            value={campaign.context}
            onChange={(event) => updateField('context', event.target.value)}
            required
            multiline
            minRows={4}
            helperText={contextHint}
            fullWidth
          />
          <TextField
            label="Prompt de geração"
            value={campaign.generationPrompt}
            onChange={(event) => updateField('generationPrompt', event.target.value)}
            required
            multiline
            minRows={5}
            helperText={generationPromptHint}
            fullWidth
          />
          <TextField
            label="Etapa gatilho"
            select
            value={campaign.triggerFunnelId || ''}
            onChange={(event) => updateField('triggerFunnelId', event.target.value)}
            fullWidth
            helperText="Opcional. Etapas ja usadas por outras campanhas ficam ocultas."
          >
            <MenuItem value="">Nenhuma</MenuItem>
            {funnels.map((funnel) => (
              <MenuItem key={funnel.id} value={funnel.id}>
                {funnel.name}
              </MenuItem>
            ))}
          </TextField>

          {(validationError || error) && (
            <Typography variant="body2" color="error">
              {validationError || error}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
