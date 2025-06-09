'use client';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
} from '@mui/material';
import { useState, useEffect } from 'react';

type PipelineClient = {
  client_id: string;
  first_name: string;
  last_name: string;
  temperature: string;
  pipeline_note: string;
  pipeline_revenue: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  client: PipelineClient | null;
  onSave: (updated: EditableClient) => void;
};

export default function EditPipelineModal({ open, onClose, client, onSave }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [temperature, setTemperature] = useState('lukewarm');
  const [note, setNote] = useState('');
  const [revenue, setRevenue] = useState('');

  useEffect(() => {
    if (client) {
      setFirstName(client.first_name);
      setLastName(client.last_name || '');
      setTemperature(client.temperature || 'lukewarm');
      setNote(client.pipeline_note || '');
      setRevenue(client.pipeline_revenue?.toString() || '');
    }
  }, [client]);

  const handleSave = () => {
    if (!client) return;
    onSave({
      ...client,
      first_name: firstName,
      last_name: lastName,
      temperature,
      pipeline_note: note,
      pipeline_revenue: parseInt(revenue, 10) || 0,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Pipeline Contact</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          <TextField
            label="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            fullWidth
          />
          <TextField
            label="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            fullWidth
          />
          <TextField
            label="Temperature"
            select
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            fullWidth
          >
            <MenuItem value="lukewarm">Lukewarm</MenuItem>
            <MenuItem value="warm">Warm</MenuItem>
            <MenuItem value="hot">Hot</MenuItem>
          </TextField>
          <TextField
            label="Pipeline Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
            multiline
            minRows={3}
          />
          <TextField
            label="Pipeline Revenue"
            value={revenue}
            onChange={(e) => setRevenue(e.target.value)}
            fullWidth
            type="number"
            InputProps={{
              startAdornment: <span style={{ marginRight: 4 }}>$</span>,
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleSave} variant="contained">Save</Button>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
