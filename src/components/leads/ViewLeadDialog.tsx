import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import SendIcon from '@mui/icons-material/Send';
import type { Campaign, Lead } from '../../services/api';
import LeadInfoRow from './LeadInfoRow';

interface ViewLeadDialogProps {
  lead: Lead | null;
  open: boolean;
  campaigns: Campaign[];
  generatingMessages: boolean;
  llmConfigured: boolean;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onGenerateMessages: (campaignId: string) => Promise<void>;
  onCopyMessage: (message: string) => Promise<void>;
  onSendMessage: (message: string) => Promise<void>;
}

export default function ViewLeadDialog({
  lead,
  open,
  campaigns,
  generatingMessages,
  llmConfigured,
  onClose,
  onDelete,
  onEdit,
  onGenerateMessages,
  onCopyMessage,
  onSendMessage,
}: ViewLeadDialogProps) {
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [sendingMessageIndex, setSendingMessageIndex] = useState<number | null>(null);
  const hasGeneratedMessages = Boolean(lead?.generatedMessages.length);

  useEffect(() => {
    if (!open) return;
    setSelectedCampaignId((current) => current || campaigns[0]?.id || '');
    setSendingMessageIndex(null);
  }, [campaigns, open]);

  async function handleGenerateMessages() {
    if (!selectedCampaignId) return;
    await onGenerateMessages(selectedCampaignId);
  }

  async function handleSendMessage(message: string, index: number) {
    setSendingMessageIndex(index);
    try {
      await onSendMessage(message);
    } finally {
      setSendingMessageIndex(null);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle component="div">
        <Typography variant="h2" sx={{ fontSize: { xs: '1.75rem', sm: '2.25rem' }, fontWeight: 700 }}>
          {lead?.name}
        </Typography>
        <Typography variant="h4" color="text.secondary" sx={{ mt: 0.5, fontSize: '1.1rem', fontWeight: 600 }}>
          {lead ? `${lead.role} - ${lead.company}` : ''}
        </Typography>
      </DialogTitle>
      <DialogContent>
        {lead && (
          <Stack spacing={2.5} component="dl" sx={{ m: 0 }}>
            <LeadInfoRow label="Telefone" value={lead.phone} />
            <LeadInfoRow label="E-mail" value={lead.email} />
            <LeadInfoRow label="Origem do lead" value={lead.source} />
            <LeadInfoRow label="Observações" value={lead.notes} />

            <Divider />

            <Typography variant="h3" sx={{ fontSize: '1.2rem', fontWeight: 700 }}>
              Demais informações
            </Typography>

            {lead.customFields.length > 0 ? (
              lead.customFields.map((field, index) => (
                <LeadInfoRow key={`${field.label}-${index}`} label={field.label} value={field.value} />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                Nenhuma informação adicional cadastrada.
              </Typography>
            )}

            <Divider />

            <Typography variant="h3" sx={{ fontSize: '1.2rem', fontWeight: 700 }}>
              Gerar mensagem
            </Typography>

            <Stack spacing={1.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="lead-campaign-select-label">Campanha</InputLabel>
                  <Select
                    labelId="lead-campaign-select-label"
                    label="Campanha"
                    value={selectedCampaignId}
                    onChange={(event) => setSelectedCampaignId(event.target.value)}
                    disabled={generatingMessages || campaigns.length === 0}
                  >
                    {campaigns.map((campaign) => (
                      <MenuItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  variant="contained"
                  startIcon={
                    generatingMessages ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : hasGeneratedMessages ? (
                      <RefreshIcon />
                    ) : (
                      <AutoAwesomeIcon />
                    )
                  }
                  onClick={handleGenerateMessages}
                  disabled={generatingMessages || !selectedCampaignId || !llmConfigured}
                  sx={{ minWidth: { sm: 190 } }}
                >
                  {hasGeneratedMessages ? 'Regenerar mensagens' : 'Gerar mensagens'}
                </Button>
              </Stack>

              {campaigns.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Nenhuma campanha cadastrada neste workspace.
                </Typography>
              )}
              {campaigns.length > 0 && !llmConfigured && (
                <Typography variant="body2" color="text.secondary">
                  Configure a LLM Groq do workspace para gerar mensagens.
                </Typography>
              )}

              {generatingMessages && (
                <Stack spacing={1}>
                  {[0, 1, 2].map((item) => (
                    <Card key={item} variant="outlined" sx={{ boxShadow: 'none' }}>
                      <CardContent>
                        <Skeleton />
                        <Skeleton width="92%" />
                        <Skeleton width="64%" />
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}

              {!generatingMessages && lead.generatedMessages.length > 0 && (
                <Stack spacing={1}>
                  {lead.generatedMessages.map((message, index) => (
                    <Card key={`${message}-${index}`} variant="outlined" sx={{ boxShadow: 'none' }}>
                      <CardContent sx={{ pb: 1 }}>
                        <Typography variant="body2">{message}</Typography>
                      </CardContent>
                      <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 1.5 }}>
                        <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => onCopyMessage(message)}>
                          Copiar
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={
                            sendingMessageIndex === index ? (
                              <CircularProgress size={14} color="inherit" />
                            ) : (
                              <SendIcon />
                            )
                          }
                          onClick={() => handleSendMessage(message, index)}
                          disabled={sendingMessageIndex !== null}
                        >
                          Enviar
                        </Button>
                      </CardActions>
                    </Card>
                  ))}
                </Stack>
              )}
            </Stack>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
        <Button color="error" startIcon={<DeleteIcon />} onClick={onDelete} disabled={!lead}>
          Excluir
        </Button>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose}>Fechar</Button>
          <Button variant="contained" startIcon={<EditIcon />} onClick={onEdit} disabled={!lead}>
            Editar
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
