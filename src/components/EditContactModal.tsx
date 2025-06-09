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
import { Client } from '@/types';

type Props = {
  open: boolean;
  onClose: () => void;
  contact: Client | null;
  onSave: (data: Partial<Client>) => void;
  contactType: 'SOI' | 'Prospect';
};

export default function EditContactModal({ open, onClose, contact, onSave, contactType }: Props) {
  const isEditMode = !!contact;
  const [firstNameError, setFirstNameError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [originalContact, setOriginalContact] = useState(new Date());

  // Reset all fields when closing
  const handleClose = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setNote('');
    setOriginalContact(new Date());
    setFirstNameError(null);
    onClose();
  };

  useEffect(() => {
    if (contact) {
      setFirstName(contact.first_name ?? '');
      setLastName(contact.last_name ?? '');
      setEmail(contact.email ?? '');
      setPhone(contact.phone_number ?? '');
      setAddress(contact.address ?? '');
      setNote(contact.prospect_note ?? '');
      setOriginalContact(
        contact.original_contact ? new Date(contact.original_contact) : new Date()
      );
    } else if (!open) { // Only reset when closing (not on initial render)
      handleClose();
    }
  }, [contact, open]);

  const handleSave = () => {
    if (!firstName.trim()) {
      setFirstNameError('First name is required');
      return;
    }
    setFirstNameError(null);

    onSave({
      ...(contact?.client_id ? { client_id: contact.client_id } : {}),
      first_name: firstName,
      last_name: lastName,
      email,
      phone_number: phone,
      address,
      prospect_note: note,
      original_contact: originalContact.toISOString()
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditMode ? `Edit ${contactType}` : `Add ${contactType}`}</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          <TextField
            label={
              <>
                First Name <span style={{ color: 'red' }}>*</span>
              </>
            }
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              if (firstNameError) setFirstNameError(null);
            }}
            error={!!firstNameError}
            helperText={firstNameError}
            fullWidth
            required
          />
          <TextField
            label="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            fullWidth
          />
          <TextField
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
          />
          <TextField
            label="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            fullWidth
          />
          <TextField
            label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            fullWidth
          />
          <TextField
            label="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            multiline
            minRows={3}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={handleSave} 
          variant="contained"
          disabled={!firstName.trim()}
        >
          {isEditMode ? 'Save Changes' : `Add ${contactType}`}
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}