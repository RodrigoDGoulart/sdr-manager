import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CloseIcon from '@mui/icons-material/Close';
import NotesIcon from '@mui/icons-material/Notes';
import NumbersIcon from '@mui/icons-material/Numbers';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import type { CreateLeadPayload, LeadCustomField, LeadFieldType } from '../../services/api';

const emptyLead: CreateLeadPayload = {
  name: '',
  email: '',
  phone: '',
  company: '',
  role: '',
  source: '',
  notes: '',
  customFields: [],
};

const fieldTypeOptions: Array<{ value: LeadFieldType; label: string; icon: typeof TextFieldsIcon }> = [
  { value: 'text', label: 'A', icon: TextFieldsIcon },
  { value: 'long_text', label: 'Abc', icon: NotesIcon },
  { value: 'number', label: '123', icon: NumbersIcon },
  { value: 'date', label: 'Data', icon: CalendarMonthIcon },
];

interface AddLeadDialogProps {
  open: boolean;
  loading: boolean;
  error: string;
  title?: string;
  initialLead?: CreateLeadPayload | null;
  onClose: () => void;
  onSubmit: (lead: CreateLeadPayload) => Promise<void>;
}

export default function AddLeadDialog({ open, loading, error, title = 'Adicionar lead', initialLead, onClose, onSubmit }: AddLeadDialogProps) {
  const [lead, setLead] = useState<CreateLeadPayload>(initialLead || emptyLead);
  const [customFields, setCustomFields] = useState<LeadCustomField[]>(initialLead?.customFields || []);
  const [validationError, setValidationError] = useState('');

  const requiredFields = useMemo(
    () => [
      { key: 'name', label: 'Nome', autoComplete: 'name' },
      { key: 'email', label: 'E-mail', autoComplete: 'email' },
      { key: 'phone', label: 'Telefone', autoComplete: 'tel' },
      { key: 'company', label: 'Empresa', autoComplete: 'organization' },
      { key: 'role', label: 'Cargo', autoComplete: 'organization-title' },
      { key: 'source', label: 'Origem do lead', autoComplete: 'off' },
    ] as const,
    [],
  );

  function handleClose() {
    if (loading) return;
    setLead(emptyLead);
    setCustomFields([]);
    setValidationError('');
    onClose();
  }

  function updateLeadField(key: keyof CreateLeadPayload, value: string) {
    setLead((current) => ({ ...current, [key]: value }));
  }

  function addCustomField() {
    setCustomFields((current) => [...current, { label: '', value: '', type: 'text' }]);
  }

  function updateCustomField(index: number, patch: Partial<LeadCustomField>) {
    setCustomFields((current) => current.map((field, fieldIndex) => (fieldIndex === index ? { ...field, ...patch } : field)));
  }

  function removeCustomField(index: number) {
    setCustomFields((current) => current.filter((_, fieldIndex) => fieldIndex !== index));
  }

  async function handleSubmit() {
    const hasEmptyRequired = requiredFields.some((field) => !String(lead[field.key]).trim()) || !lead.notes.trim();
    const hasIncompleteCustomField = customFields.some((field) => !field.label.trim() || !field.value.trim());

    if (hasEmptyRequired) {
      setValidationError('Preencha todos os campos obrigatórios do lead.');
      return;
    }

    if (hasIncompleteCustomField) {
      setValidationError('Preencha ou remova as informações adicionais incompletas.');
      return;
    }

    setValidationError('');
    await onSubmit({
      ...lead,
      customFields: customFields.map((field) => ({
        label: field.label.trim(),
        type: field.type,
        value: field.value.trim(),
      })),
    });
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
            }}
          >
            {requiredFields.map((field) => (
              <TextField
                key={field.key}
                label={field.label}
                value={lead[field.key]}
                onChange={(event) => updateLeadField(field.key, event.target.value)}
                autoComplete={field.autoComplete}
                required
                fullWidth
              />
            ))}
          </Box>

          <TextField
            label="Observações"
            value={lead.notes}
            onChange={(event) => updateLeadField('notes', event.target.value)}
            required
            multiline
            minRows={4}
            fullWidth
          />

          <Divider />

          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
            <Typography variant="h6">Informações adicionais</Typography>
            <Button startIcon={<AddIcon />} onClick={addCustomField} size="small" variant="outlined">
              Adicionar informação
            </Button>
          </Stack>

          {customFields.map((field, index) => (
            <Box
              key={index}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1.4fr 132px 40px' },
                gap: 1.5,
                alignItems: 'start',
              }}
            >
              <TextField
                label="Rótulo"
                value={field.label}
                onChange={(event) => updateCustomField(index, { label: event.target.value })}
                fullWidth
              />
              <TextField
                label="Informação"
                value={field.value}
                onChange={(event) => updateCustomField(index, { value: event.target.value })}
                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                multiline={field.type === 'long_text'}
                minRows={field.type === 'long_text' ? 3 : undefined}
                slotProps={{ inputLabel: field.type === 'date' ? { shrink: true } : undefined }}
                fullWidth
              />
              <TextField
                label="Tipo"
                select
                value={field.type}
                onChange={(event) => updateCustomField(index, { type: event.target.value as LeadFieldType, value: '' })}
                fullWidth
              >
                {fieldTypeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <MenuItem key={option.value} value={option.value}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Icon fontSize="small" />
                        <span>{option.label}</span>
                      </Stack>
                    </MenuItem>
                  );
                })}
              </TextField>
              <Tooltip title="Remover informação">
                <IconButton aria-label="Remover informação" onClick={() => removeCustomField(index)}>
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Box>
          ))}

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
