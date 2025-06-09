'use client';
import { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Divider,
} from '@mui/material';
import Link from 'next/link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PipelineTab from '@/components/PipelineTab';
import ContactsTab from '@/components/ContactsTab';
import AddIcon from '@mui/icons-material/Add';
import AddProspectModal from '@/components/AddProspectModal';

export default function ContactsPage() {
  const [tabIndex, setTabIndex] = useState(0);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  const triggerRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      {/* Back button */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Link href="/dashboard" passHref legacyBehavior>
          <Button
            component="a"
            startIcon={<ArrowBackIcon />}
            variant="outlined"
            sx={{ textTransform: 'none' }}
          >
            Back to Dashboard
          </Button>
        </Link>
      </Box>

      {/* Page title */}
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Contacts
      </Typography>

      {/* Tabs and Add Button */}
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Tabs value={tabIndex} onChange={handleTabChange} aria-label="contacts tabs">
          <Tab label="All Contacts" />
          <Tab label="Pipeline (15/30)" />
        </Tabs>

        {tabIndex === 1 && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsAddOpen(true)}
            type="button"
  sx={{ textTransform: 'none', fontSize: 16 }}
          >
            Add Prospect to Pipeline
          </Button>
        )}
      </Box>
      <Divider sx={{ mb: 3 }} />

      {/* Tab content */}
      {tabIndex === 0 && <ContactsTab key={refreshKey} />}

      {tabIndex === 1 && <PipelineTab key={refreshKey} />}

      <AddProspectModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdded={() => {
          setIsAddOpen(false);
          triggerRefresh();
        }}
      />
    </Box>
  );
}
