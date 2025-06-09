'use client';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Prospect = {
  client_id: string;
  first_name: string;
  last_name: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
};

export default function AddProspectModal({ open, onClose, onAdded }: Props) {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const fetchProspects = async () => {
      setLoading(true);
      setError(null);
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id;
      if (!uid) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      setUserId(uid);

      const { data, error } = await supabase.rpc('get_prospects_not_in_pipeline', {
        uid,
      });

      if (error) {
        setError(error.message);
      } else {
        setProspects(data || []);
      }

      setLoading(false);
    };

    fetchProspects();
  }, [open]);

  const handleAdd = async (clientId: string) => {
    if (!userId) return;

    const { data: pipelineType } = await supabase
      .from('client_types')
      .select('id')
      .eq('name', 'Pipeline')
      .single();

    if (!pipelineType) return;

    const { error } = await supabase.from('client_client_types').insert([
      {
        client_id: clientId,
        client_type_id: pipelineType.id,
      },
    ]);

    if (error) {
      setError(error.message);
    } else {
      setProspects((prev) => prev.filter((p) => p.client_id !== clientId));
      onAdded();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Prospect to Pipeline</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" mt={2}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : prospects.length === 0 ? (
          <Typography>No prospects available to add.</Typography>
        ) : (
          <List>
            {prospects.map((prospect) => (
              <ListItem
                key={prospect.client_id}
                secondaryAction={
                  <IconButton
                    edge="end"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAdd(prospect.client_id);
                    }}
                    type="button"
                  >
                    <AddIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={`${prospect.first_name} ${prospect.last_name ?? ''}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} type="button">Close</Button>
      </DialogActions>
    </Dialog>
  );
}
