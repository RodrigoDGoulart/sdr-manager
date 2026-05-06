import { Box, Typography } from '@mui/material';
import Sidebar from '../components/Sidebar';

export default function HomePage() {
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
        <Typography
          variant="h3"
          sx={{
            color: 'text.primary',
            opacity: 0.08,
            fontWeight: 700,
            userSelect: 'none',
            textAlign: 'center',
            px: 4,
          }}
        >
          Selecione um workspace
        </Typography>
      </Box>
    </Box>
  );
}
