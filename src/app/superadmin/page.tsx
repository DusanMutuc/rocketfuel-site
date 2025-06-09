'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Snackbar,
} from '@mui/material';

const allowedEmails = ['dusanmutuc@gmail.com', 'other@example.com'];

export default function SuperadminPage() {
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user?.email && allowedEmails.includes(user.email)) {
        fetchProfiles();
      } else {
        setLoading(false);
      }
    };

    const fetchProfiles = async () => {
       const { data, error } = await supabase.rpc('get_profiles_with_email');


  console.log('📦 fetched profiles:', data);
  console.error('❗ error fetching profiles:', error);

  if (error) {
    setLoading(false);
    return;
  }

  setUsers(data || []);
  setLoading(false);
    };

    fetchUser();
  }, []);

  const handleUpdate = async (id: string, first_name: string, last_name: string) => {
    setSavingId(id);
    const { error } = await supabase
      .from('profiles')
      .update({ first_name, last_name })
      .eq('id', id);

    if (error) {
      console.error('Error updating name:', error);
      setSnackbarMsg('❌ Update failed.');
    } else {
      setSnackbarMsg('✅ Name updated!');
    }

    setSavingId(null);
  };

  if (loading) return <CircularProgress sx={{ m: 5 }} />;

  if (!user || !allowedEmails.includes(user.email)) {
    return (
      <Box m={5}>
        <Typography color="error">🚫 Access Denied</Typography>
      </Box>
    );
  }

  return (
  <Box sx={{ maxWidth: 1200, mx: 'auto', px: 2, py: 4 }}>
    <Typography variant="h4" gutterBottom>
      Superadmin Panel
    </Typography>
    <Typography variant="subtitle1" gutterBottom>
      Edit user names linked to auth accounts
    </Typography>

    {users.map((u) => (
      <Paper
        key={u.id}
        sx={{
          p: 3,
          mb: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>
  ✉️ {u.email}
</Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="First Name"
            value={u.first_name || ''}
            onChange={(e) =>
              setUsers((prev) =>
                prev.map((item) =>
                  item.id === u.id ? { ...item, first_name: e.target.value } : item
                )
              )
            }
          />
          <TextField
            label="Last Name"
            value={u.last_name || ''}
            onChange={(e) =>
              setUsers((prev) =>
                prev.map((item) =>
                  item.id === u.id ? { ...item, last_name: e.target.value } : item
                )
              )
            }
          />
          <Button
            variant="contained"
            onClick={() => handleUpdate(u.id, u.first_name, u.last_name)}
            disabled={savingId === u.id}
          >
            {savingId === u.id ? 'Saving...' : 'Save'}
          </Button>
        </Box>
      </Paper>
    ))}

    <Snackbar
      open={!!snackbarMsg}
      autoHideDuration={3000}
      onClose={() => setSnackbarMsg('')}
      message={snackbarMsg}
    />
  </Box>
);

}
