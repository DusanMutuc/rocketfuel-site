'use client';
import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Snackbar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { supabase } from '@/lib/supabaseClient';
import EditPipelineModal from './EditPipelineModal';
import AddProspectModal from './AddProspectModal';

type PipelineClient = {
  client_id: string;
  first_name: string;
  last_name: string;
  temperature: string;
  pipeline_note: string;
  pipeline_revenue: number;
  created_at: string;
};

const temperatureColors: Record<string, string> = {
  lukewarm: '#FFFACD',
  warm: '#FFDAB9',
  hot: '#FFA07A',
};

export default function PipelineTab() {
  const [userId, setUserId] = useState<string | null>(null);
  const [clients, setClients] = useState<PipelineClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<PipelineClient | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [snackbar, setSnackbar] = useState('');
  const [clientToRemove, setClientToRemove] = useState<PipelineClient | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [pipelineTypeId, setPipelineTypeId] = useState<number | null>(null);

  const openEdit = (client: PipelineClient) => {
    setSelectedClient(client);
    setIsEditOpen(true);
  };

  const closeEdit = () => {
    setIsEditOpen(false);
    setSelectedClient(null);
  };

  const refreshClients = async (uid: string) => {
    const { data, error: clientError } = await supabase.rpc('get_clients_by_client_type', {
      uid,
      client_type_name: 'Pipeline',
    });
    if (!clientError && data) setClients(data);
  };

  const handleSave = async (updated: Omit<PipelineClient, 'created_at'>) => {
    const { error } = await supabase
      .from('clients')
      .update({
        first_name: updated.first_name,
        last_name: updated.last_name,
        temperature: updated.temperature,
        pipeline_note: updated.pipeline_note,
        pipeline_revenue: updated.pipeline_revenue,
      })
      .eq('client_id', updated.client_id);

    if (error) {
      setSnackbar(`Error: ${error.message}`);
    } else {
      setSnackbar('Client updated successfully');
      closeEdit();
      if (userId) await refreshClients(userId);
    }
  };

  const confirmRemove = (client: PipelineClient) => {
    setClientToRemove(client);
    setRemoveDialogOpen(true);
  };

  const handleRemove = async () => {
    if (!clientToRemove || !pipelineTypeId) return;

    const { error } = await supabase
      .from('client_client_types')
      .delete()
      .eq('client_id', clientToRemove.client_id)
      .eq('client_type_id', pipelineTypeId);

    if (error) {
      setSnackbar(`Error removing: ${error.message}`);
    } else {
      setSnackbar('Client removed from pipeline');
      if (userId) await refreshClients(userId);
    }

    setClientToRemove(null);
    setRemoveDialogOpen(false);
  };

  useEffect(() => {
    const fetchUserAndClients = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!user || userError) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      setUserId(user.id);
      await refreshClients(user.id);
      setLoading(false);
    };

    const fetchPipelineTypeId = async () => {
      const { data, error } = await supabase
        .from('client_types')
        .select('id')
        .eq('name', 'Pipeline')
        .single();
      if (!error && data) setPipelineTypeId(data.id);
    };

    fetchUserAndClients();
    fetchPipelineTypeId();
  }, []);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (clients.length === 0) return <Typography>No pipeline contacts yet.</Typography>;

  return (
    <>
      <Box display="flex" flexDirection="column" gap={2}>
        {clients.map((client) => (
          <Paper
            key={client.client_id}
            elevation={2}
            onClick={() => openEdit(client)}
            sx={{
              p: 2,
              cursor: 'pointer',
              position: 'relative',
              transition: 'box-shadow 0.2s ease',
              borderLeft: `6px solid ${temperatureColors[client.temperature] || '#ccc'}`,
              '&:hover': {
                boxShadow: 6,
                backgroundColor: '#f9f9f9',
              },
            }}
          >
            <Box display="flex" justifyContent="space-between">
              <Box>
                <Typography variant="h6">
                  {client.first_name} {client.last_name}
                </Typography>
                <Chip
                  label={client.temperature}
                  sx={{
                    mt: 1,
                    backgroundColor: temperatureColors[client.temperature] || '#eee',
                    color: '#333',
                    fontWeight: 500,
                  }}
                />
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#666' }}>
                  Revenue
                </Typography>
                <Typography fontWeight={600}>
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  }).format(client.pipeline_revenue || 0)}
                </Typography>
              </Box>
            </Box>

            {client.pipeline_note && (
              <Typography sx={{ mt: 1, color: '#555' }}>
                <strong>Note:</strong> {client.pipeline_note}
              </Typography>
            )}
            <Typography variant="caption" sx={{ mt: 1, display: 'block', color: '#888' }}>
              Logged at: {new Date(client.created_at).toLocaleString()}
            </Typography>

            <IconButton
              size="small"
              sx={{ position: 'absolute', bottom: 8, right: 8 }}
              onClick={(e) => {
                e.stopPropagation(); // prevent opening modal
                confirmRemove(client);
              }}
            >
              <DeleteIcon fontSize="large" />
            </IconButton>
          </Paper>
        ))}
      </Box>

      <EditPipelineModal
        open={isEditOpen}
        onClose={closeEdit}
        client={selectedClient}
        onSave={handleSave}
      />

      <AddProspectModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdded={() => {
          if (userId) refreshClients(userId);
        }}
      />

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar('')}
        message={snackbar}
      />

      <Dialog open={removeDialogOpen} onClose={() => setRemoveDialogOpen(false)}>
        <DialogTitle>Remove from Pipeline?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove{' '}
            <strong>
              {clientToRemove?.first_name} {clientToRemove?.last_name}
            </strong>{' '}
            from the pipeline?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRemove} variant="contained" color="error">
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
