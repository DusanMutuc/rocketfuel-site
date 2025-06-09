'use client';
import { Box, Typography } from '@mui/material';

export default function GlobalBanner() {
  return (
    <Box
      sx={{
        width: '100%',
        height: '48px',
        background: 'linear-gradient(to right, #173764, #1e447a)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#F2F3F5',
        fontWeight: 500,
        fontSize: '1rem',
      }}
    >
      {/* Placeholder for optional message or logo */}
    </Box>
  );
}
