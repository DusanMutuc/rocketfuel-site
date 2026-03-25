'use client';

import { useEffect, useMemo, useState } from 'react';
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
  Divider,
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
  const [userSearch, setUserSearch] = useState('');

  // Delete user
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Create course
  const [showCreateCourseDialog, setShowCreateCourseDialog] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseStartDate, setNewCourseStartDate] = useState(''); // YYYY-MM-DD
  const [newCourseDurationWeeks, setNewCourseDurationWeeks] = useState<number>(12);
  const [creatingCourse, setCreatingCourse] = useState(false);

  // NEW: edit selected course
  const selectedCourse = useMemo(
    () => courses.find((c) => c.course_id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  );
  const [courseEditName, setCourseEditName] = useState('');
  const [courseEditStartDate, setCourseEditStartDate] = useState(''); // YYYY-MM-DD
  const [courseEditDurationWeeks, setCourseEditDurationWeeks] = useState<number>(12);
  const [updatingCourse, setUpdatingCourse] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfiles = async () => {
    const { data, error } = await supabase.rpc('get_profiles_with_email');
    if (!error) setUsers(data || []);
  };

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('course_id, name, start_date, duration_weeks')
      .order('start_date', { ascending: false, nullsFirst: false });

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

      merged.sort((a, b) => {
        const an = `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim();
        const bn = `${b.first_name ?? ''} ${b.last_name ?? ''}`.trim();
        return an.localeCompare(bn, undefined, { sensitivity: 'base' });
      });

      setCourseUsers(merged);
    }

    setCourseLoading(false);
  };

  const handleToggleUserActive = (u: any) => setConfirmToggleUser(u);

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

  const downloadUserExport = async (
    accessToken: string,
    userId: string,
    dataset: 'contacts' | 'pipeline' | 'kpis',
    customFileName?: string
  ) => {
    const query = new URLSearchParams({ user_id: userId, dataset });
    const response = await fetch(`/api/exports/superadmin-user-data?${query.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to export ${dataset} for user`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = customFileName ?? `${dataset}-export-${userId}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportUserData = async (targetUserId: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setSnackbarMsg('You must be logged in to export user data.');
      return;
    }

    try {
      await downloadUserExport(session.access_token, targetUserId, 'contacts');
      await downloadUserExport(session.access_token, targetUserId, 'pipeline');
      await downloadUserExport(session.access_token, targetUserId, 'kpis');
      setSnackbarMsg('Started export for contacts, pipeline, and KPIs.');
    } catch (err) {
      console.error(err);
      setSnackbarMsg('Failed to export one or more data files for this user.');
    }
  };

  const handleExportAllUserKpis = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setSnackbarMsg('You must be logged in to export KPI reports.');
      return;
    }

    if (users.length === 0) {
      setSnackbarMsg('No users found to export.');
      return;
    }

    try {
      for (const u of users) {
        const first = (u.first_name ?? '').trim();
        const last = (u.last_name ?? '').trim();
        const fullName = `${first} ${last}`.trim() || 'Unnamed User';
        const safeName = fullName.replace(/[<>:\"/\\\\|?*]+/g, ' ').replace(/\\s+/g, ' ').trim();

        await downloadUserExport(
          session.access_token,
          u.id,
          'kpis',
          `${safeName}.csv`
        );
      }

      setSnackbarMsg('Started KPI exports for all users.');
    } catch (err) {
      console.error(err);
      setSnackbarMsg('Failed while exporting KPI reports for all users.');
    }
  };

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;

    return users.filter((u) => {
      const fullName = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim().toLowerCase();
      const email = (u.email ?? '').toLowerCase();
      return fullName.includes(q) || email.includes(q);
    });
  }, [users, userSearch]);

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
      fetchProfiles();
    } else {
      setSnackbarMsg(result.error || 'Failed to create user');
    }

    setCreatingUser(false);
  };

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

  const handleCreateCourse = async () => {
    if (!newCourseName.trim()) {
      setSnackbarMsg('Course name is required.');
      return;
    }
    if (newCourseDurationWeeks < 1 || newCourseDurationWeeks > 104) {
      setSnackbarMsg('Duration must be between 1 and 104 weeks.');
      return;
    }

    setCreatingCourse(true);

    const payload: any = {
      name: newCourseName.trim(),
      duration_weeks: newCourseDurationWeeks,
      start_date: newCourseStartDate ? newCourseStartDate : null,
    };

    const { data, error } = await supabase
      .from('courses')
      .insert(payload)
      .select('course_id')
      .single();

    if (error) {
      console.error('Create course error:', error);
      setSnackbarMsg('Failed to create course.');
      setCreatingCourse(false);
      return;
    }

    setSnackbarMsg('Course created!');
    setShowCreateCourseDialog(false);
    setNewCourseName('');
    setNewCourseStartDate('');
    setNewCourseDurationWeeks(12);

    await fetchCourses();
    if (data?.course_id) {
      setSelectedCourseId(data.course_id);
      fetchUsersInCourse(data.course_id);
    }

    setCreatingCourse(false);
  };

  // NEW: when selected course changes, populate the edit fields
  useEffect(() => {
    if (!selectedCourse) {
      setCourseEditName('');
      setCourseEditStartDate('');
      setCourseEditDurationWeeks(12);
      return;
    }

    setCourseEditName(selectedCourse.name ?? '');
    setCourseEditDurationWeeks(
      typeof selectedCourse.duration_weeks === 'number'
        ? selectedCourse.duration_weeks
        : 12
    );
    setCourseEditStartDate(selectedCourse.start_date ?? '');
  }, [selectedCourse]);

  // NEW: update course handler
  const handleUpdateCourse = async () => {
    if (!selectedCourseId) return;

    if (!courseEditName.trim()) {
      setSnackbarMsg('Course name is required.');
      return;
    }
    if (courseEditDurationWeeks < 1 || courseEditDurationWeeks > 104) {
      setSnackbarMsg('Duration must be between 1 and 104 weeks.');
      return;
    }

    setUpdatingCourse(true);

    const { error } = await supabase
      .from('courses')
      .update({
        name: courseEditName.trim(),
        duration_weeks: courseEditDurationWeeks,
        start_date: courseEditStartDate ? courseEditStartDate : null,
      })
      .eq('course_id', selectedCourseId);

    if (error) {
      console.error('Update course error:', error);
      setSnackbarMsg('Failed to update course.');
      setUpdatingCourse(false);
      return;
    }

    setSnackbarMsg('Course updated!');
    await fetchCourses();
    setUpdatingCourse(false);
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
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              onClick={() => setShowCreateUserDialog(true)}
            >
              Add New User
            </Button>
            <Button
              variant="outlined"
              onClick={handleExportAllUserKpis}
            >
              Export All KPI Reports
            </Button>
            <TextField
              label="Search users"
              placeholder="Search by name or email"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              sx={{ minWidth: 320 }}
            />
          </Box>

          {filteredUsers.map((u) => (
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

                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => requestDeleteUser(u)}
                >
                  Delete
                </Button>

                <Button
                  variant="outlined"
                  onClick={() => handleExportUserData(u.id)}
                >
                  Export Data
                </Button>
              </Box>
            </Paper>
          ))}
        </>
      )}

      {selectedTab === 1 && (
        <>
          <Button
            variant="outlined"
            onClick={() => setShowCreateCourseDialog(true)}
            sx={{ mb: 2 }}
          >
            Add New Course
          </Button>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Course</InputLabel>
            <Select
              value={selectedCourseId ?? ''}
              label="Select Course"
              onChange={(e) => {
                const courseId = e.target.value as string;
                setSelectedCourseId(courseId);
                fetchUsersInCourse(courseId);
              }}
            >
              {courses.map((c) => {
                const dateLabel = c.start_date
                  ? new Date(`${c.start_date}T00:00:00`).toLocaleDateString()
                  : 'No start date';
                return (
                  <MenuItem key={c.course_id} value={c.course_id}>
                    {c.name} — {dateLabel} — {c.duration_weeks}w
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          {/* NEW: edit selected course panel */}
          {selectedCourseId && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Edit Selected Course
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  label="Course Name"
                  value={courseEditName}
                  onChange={(e) => setCourseEditName(e.target.value)}
                  sx={{ minWidth: 260 }}
                />

                <TextField
                  label="Start Date"
                  type="date"
                  value={courseEditStartDate}
                  onChange={(e) => setCourseEditStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 220 }}
                />

                <TextField
                  label="Duration (weeks)"
                  type="number"
                  value={courseEditDurationWeeks}
                  onChange={(e) => setCourseEditDurationWeeks(Number(e.target.value))}
                  inputProps={{ min: 1, max: 104 }}
                  sx={{ minWidth: 220 }}
                />

                <Button
                  variant="contained"
                  onClick={handleUpdateCourse}
                  disabled={updatingCourse}
                >
                  {updatingCourse ? 'Saving...' : 'Save Course'}
                </Button>
              </Box>
            </Paper>
          )}

          <Divider sx={{ mb: 2 }} />

          <Button
            variant="outlined"
            onClick={openAddUserDialog}
            sx={{ mb: 3 }}
            disabled={!selectedCourseId}
          >
            Add User to Course
          </Button>

          {courseLoading ? (
            <CircularProgress sx={{ m: 2 }} />
          ) : (
            courseUsers.map((cu) => (
              <Paper
                key={cu.id}
                sx={{
                  p: 2,
                  mb: 2,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography>
                  {cu.first_name} {cu.last_name}
                </Typography>
                <Checkbox
                  checked={cu.is_active}
                  onChange={() => handleToggleUserActive(cu)}
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
              onChange={(e) => setSelectedAddUserId(e.target.value as string)}
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

      {/* Create Course */}
      <Dialog
        open={showCreateCourseDialog}
        onClose={() => setShowCreateCourseDialog(false)}
      >
        <DialogTitle>Add New Course</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Course Name"
            value={newCourseName}
            onChange={(e) => setNewCourseName(e.target.value)}
            sx={{ mt: 2 }}
          />

          <TextField
            fullWidth
            label="Start Date"
            type="date"
            value={newCourseStartDate}
            onChange={(e) => setNewCourseStartDate(e.target.value)}
            sx={{ mt: 2 }}
            InputLabelProps={{ shrink: true }}
            helperText="Optional"
          />

          <TextField
            fullWidth
            label="Duration (weeks)"
            type="number"
            value={newCourseDurationWeeks}
            onChange={(e) => setNewCourseDurationWeeks(Number(e.target.value))}
            sx={{ mt: 2 }}
            inputProps={{ min: 1, max: 104 }}
            helperText="1–104 weeks"
          />
        </DialogContent>

        <DialogActions>
          <Button
            onClick={handleCreateCourse}
            variant="contained"
            disabled={creatingCourse}
          >
            {creatingCourse ? 'Creating...' : 'Create'}
          </Button>
          <Button onClick={() => setShowCreateCourseDialog(false)}>
            Cancel
          </Button>
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
