'use client';
import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Snackbar,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { supabase } from '@/lib/supabaseClient';
import EditContactModal from './EditContactModal';
import EditAgentModal from './EditAgentModal';
import { Client, Agent } from '@/types';

type ContactType = 'Prospect' | 'SOI' | 'Agent';

export default function ContactsTab() {
  const [selectedTab, setSelectedTab] = useState<ContactType>('Prospect');
  const [contacts, setContacts] = useState<(Client | Agent)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [snackbar, setSnackbar] = useState('');
  const [contactToRemove, setContactToRemove] = useState<Client | Agent | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [clientTypeIds, setClientTypeIds] = useState<{ [key in ContactType]?: number }>({});

  const fetchContacts = async (type: ContactType, uid: string) => {
    setLoading(true);
    setError(null);
    let result;
    if (type === 'Agent') {
      result = await supabase.rpc('get_agents_by_user', { uid });
    } else {
      result = await supabase.rpc('get_clients_by_client_type', {
        uid,
        client_type_name: type,
      });
    }

    const { data, error } = result;
    if (error) setError(error.message);
    else setContacts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (!user || error) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }
      setUserId(user.id);
      fetchContacts(selectedTab, user.id);
    };
    init();
  }, []);

  useEffect(() => {
    if (userId) fetchContacts(selectedTab, userId);
  }, [selectedTab]);

  useEffect(() => {
    const fetchTypeIds = async () => {
      const { data, error } = await supabase.from('client_types').select();
      if (!error && data) {
        const ids: any = {};
        data.forEach((entry: any) => {
          if (entry.name === 'Prospect' || entry.name === 'SOI') {
            ids[entry.name] = entry.id;
          }
        });
        setClientTypeIds(ids);
      }
    };
    fetchTypeIds();
  }, []);

  const handleSaveClient = async (data: Partial<Client>) => {
    console.log('📤 Saving client:', data);
    if (!userId) return;
    const isEdit = !!data.client_id;

    try {
      let result;
      if (isEdit) {
        const { data: updated, error } = await supabase
          .from('clients')
          .update(data)
          .eq('client_id', data.client_id)
          .select();
        if (error) throw error;
        result = updated;
      } else {
        const insertPayload = {
          ...data,
          user_id: userId,
          created_at: new Date().toISOString(),
        };
        console.log('➕ Inserting new client:', insertPayload);
        const { data: inserted, error } = await supabase
          .from('clients')
          .insert([insertPayload])
          .select();
        if (error) throw error;
        result = inserted;

        if (result?.length) {
          const typeId = selectedTab === 'Prospect' ? 2 : 1;
          const { error: linkErr } = await supabase
            .from('client_client_types')
            .insert([{ client_id: result[0].client_id, client_type_id: typeId }]);
          if (linkErr) throw linkErr;
        }
      }

      setSnackbar(isEdit ? 'Contact updated' : 'Contact added');
      setSelectedClient(null);
      setClientModalOpen(false);
      fetchContacts(selectedTab, userId);
    } catch (e: any) {
      console.error('❌ Error saving client:', e);
      setSnackbar(`Error: ${e.message}`);
    }
  };

  const handleSaveAgent = async (data: Partial<Agent>) => {
    console.log('📤 Saving agent:', data);
    if (!userId) return;
    const isEdit = !!data.id;

    try {
      if (isEdit) {
        const { error } = await supabase
          .from('agent_contacts')
          .update(data)
          .eq('id', data.id);
        if (error) throw new Error(error.message);
        setSnackbar('Agent updated');
      } else {
        const payload = {
          ...data,
          user_id: userId,
        };
        delete (payload as any).id;
        console.log('➕ Inserting new agent:', payload);
        const { error } = await supabase.from('agent_contacts').insert([payload]);
        if (error) throw new Error(error.message);
        setSnackbar('Agent added');
      }

      setSelectedAgent(null);
      setAgentModalOpen(false);
      fetchContacts(selectedTab, userId);
    } catch (e: any) {
      console.error('❌ Error saving agent:', e);
      setSnackbar(`Error: ${e.message}`);
    }
  };

  const handleCardClick = (contact: any) => {
    if (selectedTab === 'Agent') {
      setSelectedAgent(contact);
      setAgentModalOpen(true);
    } else {
      setSelectedClient(contact);
      setClientModalOpen(true);
    }
  };

  const handleAdd = () => {
    if (selectedTab === 'Agent') {
      setSelectedAgent(null);
      setAgentModalOpen(true);
    } else {
      setSelectedClient(null);
      setClientModalOpen(true);
    }
  };

  const confirmRemove = (contact: Client | Agent) => {
    setContactToRemove(contact);
    setRemoveDialogOpen(true);
  };

  const handleRemove = async () => {
    if (!contactToRemove || !userId) return;

    try {
      if (selectedTab === 'Agent') {
        const { error } = await supabase
          .from('agent_contacts')
          .delete()
          .eq('id', (contactToRemove as Agent).id);
        if (error) throw error;
      } else {
        const clientId = (contactToRemove as Client).client_id;
        const clientTypeId = clientTypeIds[selectedTab];
        if (!clientTypeId) throw new Error('Missing client type ID');
        const { error } = await supabase
          .from('client_client_types')
          .delete()
          .eq('client_id', clientId)
          .eq('client_type_id', clientTypeId);
        if (error) throw error;
      }

      setSnackbar('Contact removed');
      setContactToRemove(null);
      setRemoveDialogOpen(false);
      fetchContacts(selectedTab, userId);
    } catch (e: any) {
      console.error('❌ Error removing contact:', e);
      setSnackbar(`Error: ${e.message}`);
      setRemoveDialogOpen(false);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
  <Tabs
    value={selectedTab}
    onChange={(_, newVal) => setSelectedTab(newVal)}
    textColor="primary"
    indicatorColor="primary"
  >
    <Tab value="Prospect" label="Prospect" />
    <Tab value="SOI" label="SOI" />
    <Tab value="Agent" label="Agent" />
  </Tabs>

  <Button
    variant="contained"
    startIcon={<AddIcon />}
    onClick={handleAdd}
    sx={{
      textTransform: 'none',
      borderRadius: 2,
      boxShadow: 2,
      ml: 2,
      fontSize: 16
    }}
  >
    Add {selectedTab}
  </Button>
</Box>


      {loading && <CircularProgress sx={{ mt: 2 }} />}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      {!loading && !error && contacts.length === 0 && (
        <Typography sx={{ mt: 2 }}>No contacts available.</Typography>
      )}

      <Box display="flex" flexDirection="column" gap={2} mt={2}>
        {contacts.map((contact: any) => (
          <Paper
            key={contact.client_id || contact.id}
            sx={{
              p: 2,
              cursor: 'pointer',
              position: 'relative',
              '&:hover': { boxShadow: 3 },
            }}
            onClick={() => handleCardClick(contact)}
          >
            <Typography variant="h6">
              {selectedTab === 'Agent' ? contact.name : `${contact.first_name} ${contact.last_name}`}
            </Typography>
            {contact.email && <Typography>Email: {contact.email}</Typography>}
            {contact.phone_number && <Typography>Phone: {contact.phone_number}</Typography>}
            {contact.address && <Typography>Address: {contact.address}</Typography>}

            <IconButton
              size="small"
              sx={{ position: 'absolute', bottom: 8, right: 8 }}
              onClick={(e) => {
                e.stopPropagation();
                confirmRemove(contact);
              }}
            >
              <DeleteIcon />
            </IconButton>
          </Paper>
        ))}
      </Box>

      <EditContactModal
        open={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        contact={selectedClient}
        onSave={handleSaveClient}
        contactType={selectedTab === 'Agent' ? 'Prospect' : selectedTab}
      />

      <EditAgentModal
        open={agentModalOpen}
        onClose={() => setAgentModalOpen(false)}
        agent={selectedAgent}
        onSave={handleSaveAgent}
      />

      <Box display="flex" justifyContent="flex-end" mt={3}>
  
</Box>


      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar('')}
        message={snackbar}
      />

      <Dialog open={removeDialogOpen} onClose={() => setRemoveDialogOpen(false)}>
        <DialogTitle>Remove Contact?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove{' '}
            <strong>
              {selectedTab === 'Agent'
                ? (contactToRemove as Agent)?.name
                : `${(contactToRemove as Client)?.first_name} ${(contactToRemove as Client)?.last_name}`}
            </strong>{' '}
            from {selectedTab}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRemove} variant="contained" color="error">
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
