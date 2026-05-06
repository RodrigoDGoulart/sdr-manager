import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import type { Lead } from '../../services/api';
import LeadInfoRow from './LeadInfoRow';

interface ViewLeadDialogProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

export default function ViewLeadDialog({ lead, open, onClose, onDelete, onEdit }: ViewLeadDialogProps) {
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
