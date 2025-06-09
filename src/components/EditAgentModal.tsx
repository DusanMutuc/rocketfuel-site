'use client';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { Agent } from '@/types';

type Props = {
  open: boolean;
  onClose: () => void;
  agent: Agent | null;
  onSave: (data: Partial<Agent>) => void;
};

export default function EditAgentModal({ open, onClose, agent, onSave }: Props) {
  const isEditMode = !!agent;
  const [nameError, setNameError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [brokerage, setBrokerage] = useState('');
  const [notes, setNotes] = useState('');
  const [originalContact, setOriginalContact] = useState(new Date());

  // Reset all fields when closing
  const handleClose = () => {
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setBrokerage('');
    setNotes('');
    setOriginalContact(new Date());
    setNameError(null);
    onClose();
  };

  useEffect(() => {
    if (agent) {
      setName(agent.name ?? '');
      setPhone(agent.phone_number ?? '');
      setEmail(agent.email ?? '');
      setAddress(agent.address ?? '');
      setBrokerage(agent.brokerage ?? '');
      setNotes(agent.notes ?? '');
      setOriginalContact(agent.original_contact ? new Date(agent.original_contact) : new Date());
    } else if (!open) { // Only reset when closing (not on initial render)
      handleClose();
    }
  }, [agent, open]);

  const handleSave = () => {
    if (!name.trim()) {
      setNameError('Name is required');
      return;
    }
    setNameError(null);

    onSave({
      ...(agent?.id ? { id: agent.id } : {}),
      name,
      phone_number: phone,
      email,
      address,
      brokerage,
      notes,
      original_contact: originalContact.toISOString().split('T')[0],
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditMode ? 'Edit Agent' : 'Add Agent'}</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          <TextField
            label={
              <>
                Name <span style={{ color: 'red' }}>*</span>
              </>
            }
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(null);
            }}
            error={!!nameError}
            helperText={nameError}
            fullWidth
            required
          />
          <TextField label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth />
          <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
          <TextField label="Address" value={address} onChange={(e) => setAddress(e.target.value)} fullWidth />
          <TextField label="Brokerage" value={brokerage} onChange={(e) => setBrokerage(e.target.value)} fullWidth />
          <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={3} fullWidth />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={handleSave} 
          variant="contained"
          disabled={!name.trim()}
        >
          {isEditMode ? 'Save Changes' : 'Add Agent'}
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}