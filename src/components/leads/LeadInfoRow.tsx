import { Box, Typography } from '@mui/material';

interface LeadInfoRowProps {
  label: string;
  value: string;
}

export default function LeadInfoRow({ label, value }: LeadInfoRowProps) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" component="dt">
        {label}
      </Typography>
      <Typography variant="body2" color="text.primary" component="dd" sx={{ m: 0, whiteSpace: 'pre-wrap' }}>
        {value || '-'}
      </Typography>
    </Box>
  );
}
