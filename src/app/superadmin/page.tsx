'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Snackbar,
  Tabs,
  Tab,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';

const superadminEmails =
  process.env.NEXT_PUBLIC_SUPERADMIN_EMAILS?.split(';') ?? [];

export default function SuperadminPage() {
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(true); // page-wide loading
  const [courseLoading, setCourseLoading] = useState(false); // course fetch loading
  const [savingId, setSavingId] = useState<string | null>(null);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courseUsers, setCourseUsers] = useState<any[]>([]);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [usersNotInCourse, setUsersNotInCourse] = useState<any[]>([]);
  const [selectedAddUserId, setSelectedAddUserId] = useState<string | null>(null);
  const [setAsActive, setSetAsActive] = useState<boolean>(false);
  const [confirmToggleUser, setConfirmToggleUser] = useState<any | null>(null);
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  // New: delete state
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) console.error('Error fetching user:', error);
      setUser(user);

      if (user?.email && superadminEmails.includes(user.email)) {
        try {
          await Promise.all([fetchProfiles(), fetchCourses()]);
        } catch (err) {
          console.error('Error in fetchProfiles or fetchCourses:', err);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const fetchProfiles = async () => {
    const { data, error } = await supabase.rpc('get_profiles_with_email');
    if (!error) setUsers(data || []);
  };

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('course_id, start_date');
    if (!error) setCourses(data || []);
  };

  const fetchUsersInCourse = async (courseId: string) => {
    setCourseLoading(true);
    const { data: links, error: linksError } = await supabase
      .from('user_courses')
      .select('user_id, is_active')
      .eq('course_id', courseId);

    if (linksError) {
      console.error('Error fetching user_courses links:', linksError);
      setCourseUsers([]);
      setCourseLoading(false);
      return;
    }

    const userIdMap: Record<string, boolean> = {};
    for (const link of links ?? []) {
      if (link.user_id) userIdMap[link.user_id] = link.is_active;
    }

    const userIds = Object.keys(userIdMap);
    if (userIds.length === 0) {
      setCourseUsers([]);
      setCourseLoading(false);
      return;
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    } else {
      const merged = (profiles ?? []).map((u) => ({
        ...u,
        is_active: userIdMap[u.id] ?? false,
      }));
      // after computing `merged` in fetchUsersInCourse
merged.sort((a, b) => {
  const an = `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim();
  const bn = `${b.first_name ?? ''} ${b.last_name ?? ''}`.trim();
  return an.localeCompare(bn, undefined, { sensitivity: 'base' });
});

      setCourseUsers(merged);
    }

    setCourseLoading(false);
  };

  const handleToggleUserActive = (user: any) => {
    setConfirmToggleUser(user);
  };

  const confirmToggle = async () => {
    if (!confirmToggleUser || !selectedCourseId) return;
    const newStatus = !confirmToggleUser.is_active;

    const { error } = await supabase
      .from('user_courses')
      .update({ is_active: newStatus })
      .eq('user_id', confirmToggleUser.id)
      .eq('course_id', selectedCourseId);

    if (!error) {
      setSnackbarMsg(newStatus ? 'Course activated for user.' : 'Course deactivated for user.');
      fetchUsersInCourse(selectedCourseId);
    } else {
      setSnackbarMsg('Failed to update user status.');
    }

    setConfirmToggleUser(null);
  };

  const handleUpdate = async (id: string, first_name: string, last_name: string) => {
    setSavingId(id);
    const { error } = await supabase
      .from('profiles')
      .update({ first_name, last_name })
      .eq('id', id);

    setSnackbarMsg(error ? 'Update failed.' : 'Name updated!');
    setSavingId(null);
  };

  const openAddUserDialog = async () => {
    if (!selectedCourseId) return;
  
    const { data: allLinks } = await supabase
      .from('user_courses')
      .select('user_id')
      .eq('course_id', selectedCourseId);
  
    const userIdsInCourse = allLinks?.map((l) => l.user_id) ?? [];
  
    const { data: allUsers } = await supabase
      .from('profiles')
      .select('id, first_name, last_name');
  
    const filtered = (allUsers ?? []).filter((u) => !userIdsInCourse.includes(u.id));
  
    // NEW: sort A→Z by first_name, then last_name
    filtered.sort((a, b) => {
      const an = `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim();
      const bn = `${b.first_name ?? ''} ${b.last_name ?? ''}`.trim();
      return an.localeCompare(bn, undefined, { sensitivity: 'base' });
    });
  
    setUsersNotInCourse(filtered);
    setShowAddUserDialog(true);
  };
  

  const handleAddUser = async () => {
    if (!selectedCourseId || !selectedAddUserId) return;

    if (setAsActive) {
      const { data: currentActive = [] } = await supabase
        .from('user_courses')
        .select('course_id')
        .eq('user_id', selectedAddUserId)
        .eq('is_active', true);

      if ((currentActive ?? []).length > 0) {
        const { error: deactivateErr } = await supabase
          .from('user_courses')
          .update({ is_active: false })
          .eq('user_id', selectedAddUserId)
          .eq('is_active', true);

        if (deactivateErr) {
          setSnackbarMsg('Failed to deactivate old course.');
          return;
        }
      }
    }

    const { error } = await supabase.from('user_courses').insert({
      user_id: selectedAddUserId,
      course_id: selectedCourseId,
      is_active: setAsActive,
    });

    if (!error) {
      setSnackbarMsg('User added to course!');
      fetchUsersInCourse(selectedCourseId);
      setShowAddUserDialog(false);
      setSelectedAddUserId(null);
      setSetAsActive(false);
    } else {
      setSnackbarMsg('Failed to add user.');
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail) {
      setSnackbarMsg('Email is required.');
      return;
    }

    setCreatingUser(true);

    const res = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newUserEmail,
        first_name: newFirstName,
        last_name: newLastName,
      }),
    });

    const result = await res.json();

    if (res.ok) {
      setSnackbarMsg('User created!');
      setShowCreateUserDialog(false);
      setNewUserEmail('');
      setNewFirstName('');
      setNewLastName('');
      fetchProfiles(); // refresh user list
    } else {
      setSnackbarMsg(result.error || 'Failed to create user');
    }

    setCreatingUser(false);
  };

  // --- Delete flow (calls DELETE on /api/create-user) ---
  const requestDeleteUser = (u: any) => setUserToDelete(u);

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/create-user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userToDelete.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete user');

      setUsers((prev) => prev.filter((x) => x.id !== userToDelete.id));
      setSnackbarMsg('User deleted.');
      setUserToDelete(null);
    } catch (err: any) {
      setSnackbarMsg(err.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <CircularProgress sx={{ m: 5 }} />;

  if (!user || !user.email || !superadminEmails.includes(user.email)) {
    return (
      <Box m={5}>
        <Typography color="error">Access Denied</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: 2, py: 4 }}>
      {/* Top bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h4" gutterBottom>Superadmin Panel</Typography>
        <Button component={Link} href="/admin-dashboard" variant="outlined" size="small">
          Admin Dashboard
        </Button>
      </Box>

      <Typography variant="subtitle1" gutterBottom>
        Edit user names & manage course memberships
      </Typography>

      <Tabs value={selectedTab} onChange={(_, val) => setSelectedTab(val)} sx={{ mb: 3 }}>
        <Tab label="Users" />
        <Tab label="Courses" />
      </Tabs>

      {selectedTab === 0 && (
        <>
          <Button
            variant="outlined"
            onClick={() => setShowCreateUserDialog(true)}
            sx={{ mb: 2 }}
          >
            Add New User
          </Button>

          {users.map((u) => (
            <Paper key={u.id} sx={{ p: 3, mb: 3 }}>
              <Typography variant="subtitle1">{u.email}</Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                <TextField
                  label="First Name"
                  value={u.first_name || ''}
                  onChange={(e) =>
                    setUsers((prev) =>
                      prev.map((item) =>
                        item.id === u.id
                          ? { ...item, first_name: e.target.value }
                          : item
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
                        item.id === u.id
                          ? { ...item, last_name: e.target.value }
                          : item
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

                {/* NEW: Delete */}
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => requestDeleteUser(u)}
                >
                  Delete
                </Button>
              </Box>
            </Paper>
          ))}
        </>
      )}

      {selectedTab === 1 && (
        <>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Select Course</InputLabel>
            <Select
              value={selectedCourseId ?? ''}
              label="Select Course"
              onChange={(e) => {
                setSelectedCourseId(e.target.value);
                fetchUsersInCourse(e.target.value);
              }}
            >
              {courses.map((c) => (
                <MenuItem key={c.course_id} value={c.course_id}>
                  {new Date(c.start_date).toLocaleDateString()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button variant="outlined" onClick={openAddUserDialog} sx={{ mb: 3 }}>
            Add User to Course
          </Button>

          {courseLoading ? (
            <CircularProgress sx={{ m: 2 }} />
          ) : (
            courseUsers.map((user) => (
              <Paper
                key={user.id}
                sx={{
                  p: 2,
                  mb: 2,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography>
                  {user.first_name} {user.last_name}
                </Typography>
                <Checkbox
                  checked={user.is_active}
                  onChange={() => handleToggleUserActive(user)}
                />
              </Paper>
            ))
          )}

          <Dialog open={!!confirmToggleUser} onClose={() => setConfirmToggleUser(null)}>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogContent>
              <Typography>
                {confirmToggleUser
                  ? confirmToggleUser.is_active
                    ? `Deactivate course for ${confirmToggleUser.first_name} ${confirmToggleUser.last_name}?`
                    : `Activate course for ${confirmToggleUser.first_name} ${confirmToggleUser.last_name}?`
                  : ''}
              </Typography>
            </DialogContent>

            <DialogActions>
              <Button onClick={confirmToggle} variant="contained">Yes</Button>
              <Button onClick={() => setConfirmToggleUser(null)}>Cancel</Button>
            </DialogActions>
          </Dialog>
        </>
      )}

      {/* Add User to Course */}
      <Dialog open={showAddUserDialog} onClose={() => setShowAddUserDialog(false)}>
        <DialogTitle>Add User to Course</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>User</InputLabel>
            <Select
              value={selectedAddUserId ?? ''}
              onChange={(e) => setSelectedAddUserId(e.target.value)}
              label="User"
            >
              {usersNotInCourse.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.first_name} {u.last_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box mt={2} display="flex" alignItems="center" gap={1}>
            <Checkbox
              checked={setAsActive}
              onChange={(e) => setSetAsActive(e.target.checked)}
            />
            Set as active course
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAddUser} variant="contained">Add</Button>
          <Button onClick={() => setShowAddUserDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Create User */}
      <Dialog open={showCreateUserDialog} onClose={() => setShowCreateUserDialog(false)}>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Email"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="First Name"
            value={newFirstName}
            onChange={(e) => setNewFirstName(e.target.value)}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Last Name"
            value={newLastName}
            onChange={(e) => setNewLastName(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateUser} variant="contained" disabled={creatingUser}>
            {creatingUser ? 'Creating...' : 'Create'}
          </Button>
          <Button onClick={() => setShowCreateUserDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Delete User confirm */}
      <Dialog open={!!userToDelete} onClose={() => setUserToDelete(null)}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            {userToDelete
              ? `Are you sure you want to permanently delete ${userToDelete.email}? This cannot be undone.`
              : ''}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={confirmDeleteUser}
            variant="contained"
            color="error"
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
          <Button onClick={() => setUserToDelete(null)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snackbarMsg}
        autoHideDuration={3000}
        onClose={() => setSnackbarMsg('')}
        message={snackbarMsg}
      />
    </Box>
  );
}
