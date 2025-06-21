'use client';
import { Box, Typography } from '@mui/material';

export default function GlobalBanner() {
  return (
    <Box
      sx={{
        width: '100%',
        height: '60px',
        background: 'linear-gradient(to right, #173764, #1e447a)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        color: '#F2F3F5',
        fontWeight: 500,
        fontSize: '1rem',
        px: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <img
          src="/logo.png" // stored in /public/logo.png
          alt="Logo"
          style={{ height: '50px', marginRight: '8px' }}
        />
      </Box>
    </Box>
  );
}
