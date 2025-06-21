'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Suspense } from 'react';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  IconButton,
  InputAdornment,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [authenticating, setAuthenticating] = useState(true);

  const access_token = searchParams.get('access_token');
  const refresh_token = searchParams.get('refresh_token');

  useEffect(() => {
    const authenticate = async () => {
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) {
          setMessage('Authentication failed: ' + error.message);
        }
      } else {
        setMessage('Missing token information in URL.');
      }
      setAuthenticating(false);
    };

    authenticate();
  }, [access_token, refresh_token]);

  const handleUpdatePassword = async () => {
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage('Error updating password: ' + error.message);
    } else {
      setMessage('✅ Password updated successfully!');
    }
    setLoading(false);
  };

  const toggleShowPassword = () => {
    setShowPassword((prev) => !prev);
  };

  return (
     <Suspense fallback={<div>Loading...</div>}>
    <Container maxWidth="sm" sx={{ mt: 10 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Reset Your Password
        </Typography>

        {authenticating ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TextField
              type={showPassword ? 'text' : 'password'}
              label="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              sx={{ my: 2 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={toggleShowPassword} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              type={showPassword ? 'text' : 'password'}
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              sx={{ my: 2 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={toggleShowPassword} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              variant="contained"
              color="primary"
              onClick={handleUpdatePassword}
              disabled={loading}
              fullWidth
              sx={{ mt: 2 }}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </>
        )}

        {message && (
          <Alert
            severity={message.startsWith('✅') ? 'success' : 'error'}
            sx={{ mt: 2 }}
          >
            {message}
          </Alert>
        )}
      </Paper>
    </Container>
    </Suspense>
  );
}
