'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import {
  DataGrid,
  GridColDef,
  GridRowModel,
} from '@mui/x-data-grid';
import {
  Box,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Typography,
  CircularProgress,
  Paper,
  Tooltip,
  Snackbar,
  Alert,
  Button, // ⬅️ added
} from '@mui/material';
import UserDetailView from '@/components/UserDetailView';

interface TaskType {
  key: string;
  label: string;
  id: number;
}

const TASK_TYPES: TaskType[] = [
  { key: 'asks', label: 'Asks', id: 1 },
  { key: 'follow_ups', label: 'Follow Ups', id: 2 },
  { key: 'open_houses', label: 'Open Houses', id: 3 },
  { key: 'handwritten_cards', label: 'Handwritten Cards', id: 4 },
  { key: 'action_promises', label: 'Action Promises', id: 5 },
  { key: 'exercises', label: 'Exercises', id: 6 },
];

export default function AdminDashboard() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskType, setSelectedTaskType] = useState<TaskType>(TASK_TYPES[0]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [courseStartDate, setCourseStartDate] = useState<string | null>(null);
  const [currentWeekIndex, setCurrentWeekIndex] = useState<number | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courses, setCourses] = useState<{ id: string; start_date: string }[]>([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('course_id, start_date')
      .order('start_date', { ascending: false });

    if (!error && data && data.length > 0) {
      setCourses(data.map(c => ({ id: c.course_id, start_date: c.start_date })));
      setSelectedCourseId(data[0].course_id);
      setCourseStartDate(data[0].start_date);
    }
  };

  const fetchData = async () => {
    if (!selectedCourseId) return;
    setLoading(true);

    try {
      const course = courses.find((c) => c.id === selectedCourseId);
      if (!course) return;

      setCourseStartDate(course.start_date);
      const courseStart = new Date(course.start_date);
      const now = new Date();
      const diffInDays = Math.floor(
        (now.getTime() - courseStart.getTime()) / (1000 * 60 * 60 * 24),
      );
      const weekIndex = Math.floor(diffInDays / 7);
      setCurrentWeekIndex(weekIndex >= 0 ? weekIndex : null);

      const { data: userCourses, error: ucError } = await supabase
        .from('user_courses')
        .select('user_id')
        .eq('course_id', selectedCourseId);

      if (ucError || !userCourses) {
        setSnackbar({
          open: true,
          message: 'Failed to load course users',
          severity: 'error',
        });
        setLoading(false);
        return;
      }

      const userIds = userCourses.map((uc) => uc.user_id);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .in('id', userIds);

      const users = (profileData ?? []).filter((p) => p.role === 'user');

      const { data: taskTypeMeta } = await supabase
        .from('task_types')
        .select('minimal_amount')
        .eq('task_type_id', selectedTaskType.id)
        .single();

      const minimal = taskTypeMeta?.minimal_amount || 1;

      let totalsRow: any = {
        id: 'totals',
        first_name: '—',
        last_name: 'TOTAL',
        pipeline_count: 0,
        pipeline_revenue: 0,
      };
      Array.from({ length: 12 }).forEach((_, i) => {
        totalsRow[`week_${i + 1}`] = 0;
      });

      const rowPromises = users.map(async (user) => {
        const { data: weekly } = await supabase.rpc('get_weekly_task_counts', {
          _course_id: selectedCourseId,
          uid: user.id,
        });

        const { data: pipelineData } = await supabase.rpc(
          'get_clients_by_client_type',
          { uid: user.id, client_type_name: 'Pipeline' },
        );

        const pipelineCount = pipelineData?.length || 0;
        const pipelineRevenue =
          pipelineData?.reduce(
            (sum: number, c: any) => sum + (Number(c.pipeline_revenue) || 0),
            0,
          ) || 0;

        const row: any = {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          pipeline_count: pipelineCount,
          pipeline_revenue: pipelineRevenue,
        };

        weekly?.forEach((week: any, i: number) => {
          const key = `week_${i + 1}`;
          const value = week[selectedTaskType.key] ?? 0;
          row[key] = value;
          totalsRow[key] = (totalsRow[key] || 0) + value;
        });

        totalsRow.pipeline_count += pipelineCount;
        totalsRow.pipeline_revenue += pipelineRevenue;

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const { data: recentTaskLogs } = await supabase
          .from('task_logs')
          .select('amount')
          .eq('user_id', user.id)
          .eq('task_type_id', selectedTaskType.id)
          .eq('course_id', selectedCourseId)
          .gte('created_at', sevenDaysAgo.toISOString());

        const { data: anyRecentLogs } = await supabase
          .from('task_logs')
          .select('task_log_id')
          .eq('user_id', user.id)
          .eq('course_id', selectedCourseId)
          .gte('created_at', threeDaysAgo.toISOString())
          .limit(1);

        const recentTaskTotal =
          recentTaskLogs?.reduce(
            (sum, log) => sum + (log.amount ?? 0),
            0,
          ) ?? 0;

        const isInactive = !anyRecentLogs || anyRecentLogs.length === 0;

        if (isInactive) {
          row.status = 'inactive';
        } else if (recentTaskTotal >= 2 * minimal) {
          row.status = 'excellent';
        } else if (recentTaskTotal <= 0.5 * minimal) {
          row.status = 'poor';
        } else {
          row.status = 'normal';
        }

        return row;
      });

      const resolvedRows = (await Promise.all(rowPromises)).filter(Boolean);

      let cumulativeTotal = 0;
      Array.from({ length: 12 }).forEach((_, i) => {
        const key = `week_${i + 1}`;
        cumulativeTotal += totalsRow[key] || 0;
        totalsRow[key] = cumulativeTotal;
      });

      setRows([...resolvedRows, totalsRow]);
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to load data',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      fetchData();
    }
  }, [selectedCourseId, selectedTaskType.key]);

  const processRowUpdate = async (
    newRow: GridRowModel,
    oldRow: GridRowModel,
  ) => {
    if (newRow.id === 'totals' || !courseStartDate || !selectedCourseId)
      return oldRow;

    const changedWeek = Object.keys(newRow).find(
      (key) => key.startsWith('week_') && newRow[key] !== oldRow[key],
    );
    if (!changedWeek) return oldRow;

    const weekIndex = parseInt(changedWeek.replace('week_', ''), 10);
    const weekStartDate = new Date(courseStartDate);
    weekStartDate.setDate(weekStartDate.getDate() + (weekIndex - 1) * 7);
    const weekStart = weekStartDate.toISOString().split('T')[0];

    const { error } = await supabase.rpc('update_weekly_task_logs', {
      _course_id: selectedCourseId,
      _user_id: newRow.id,
      _task_type_id: selectedTaskType.id,
      _week_start: weekStart,
      _new_total: newRow[changedWeek],
    });

    if (!error) {
      setSnackbar({
        open: true,
        message: 'Task updated!',
        severity: 'success',
      });
      setRows((prev) => prev.map((r) => (r.id === newRow.id ? newRow : r)));
    } else {
      setSnackbar({
        open: true,
        message: 'Update failed',
        severity: 'error',
      });
    }

    return newRow;
  };

  const handleProcessRowUpdateError = (error: Error) => {
    setSnackbar({ open: true, message: error.message, severity: 'error' });
  };

  const weekColumns: GridColDef[] = Array.from({ length: 12 }, (_, i) => ({
    field: `week_${i + 1}`,
    width: 60,
    type: 'number',
    align: 'right',
    headerAlign: 'right',
    editable: true,
    headerClassName:
      currentWeekIndex !== null && i === currentWeekIndex
        ? 'current-week-col'
        : '',
    cellClassName: (params) =>
      currentWeekIndex !== null && i === currentWeekIndex
        ? 'current-week-col'
        : '',
    renderHeader: () => (
      <Tooltip title={`Week ${i + 1} – Task counts since course start`}>
        <span>{`W ${i + 1}`}</span>
      </Tooltip>
    ),
  }));

  const columns: GridColDef[] = [
    {
      field: 'first_name',
      headerName: 'First Name',
      width: 150,
      cellClassName: (params) => `cell-${params.row?.status || 'normal'}`,
    },
    {
      field: 'last_name',
      headerName: 'Last Name',
      width: 150,
      cellClassName: (params) => `cell-${params.row?.status || 'normal'}`,
    },
    {
      field: 'pipeline_count',
      headerName: '15/30',
      width: 60,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: 'pipeline_revenue',
      headerName: 'PP Revenue',
      width: 120,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
    },
    ...weekColumns,
  ];

  if (!mounted) return null;
  const selectedUser = rows.find((r) => r.id === selectedUserId);

  return (
    <Box sx={{ p: 4, maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top bar: title + Superadmin button */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h4">Admin Dashboard</Typography>
        <Button
          component={Link}
          href="/superadmin"
          variant="outlined"
          size="small"
        >
          Superadmin
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Course</InputLabel>
          <Select
            value={selectedCourseId ?? ''}
            label="Course"
            onChange={(e) => setSelectedCourseId(e.target.value)}
          >
            {courses.map((course) => (
              <MenuItem key={course.id} value={course.id}>
                {new Date(course.start_date).toLocaleDateString()}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Task Type</InputLabel>
          <Select
            value={selectedTaskType.key}
            label="Task Type"
            onChange={(e) => {
              const selected = TASK_TYPES.find(
                (t) => t.key === e.target.value,
              );
              if (selected) setSelectedTaskType(selected);
            }}
          >
            {TASK_TYPES.map((task) => (
              <MenuItem key={task.key} value={task.key}>
                {task.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" mt={4}>
            <CircularProgress />
          </Box>
        ) : (
          <DataGrid
            rows={rows}
            columns={columns}
            autoHeight
            processRowUpdate={processRowUpdate}
            onProcessRowUpdateError={handleProcessRowUpdateError}
            getRowClassName={(params) =>
              params.id === 'totals' ? 'totals-row' : ''
            }
            sx={{
              borderRadius: 2,
              '& .totals-row': {
                fontWeight: 'bold',
                backgroundColor: '#f3f4f6',
                borderTop: '2px solid #ccc',
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: '#f0f0f0',
              },
              '& .MuiDataGrid-row:nth-of-type(even)': {
                backgroundColor: '#fafafa',
              },
              '& .MuiDataGrid-row.Mui-selected': {
                backgroundColor: '#e3f2fd !important',
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: '#f9fafb',
                fontWeight: 'bold',
              },
              '& .MuiDataGrid-columnHeaderTitle': {
                fontWeight: 600,
                fontSize: '0.95rem',
              },
              '& .cell-excellent': {
                backgroundColor: '#d1fae5',
                fontWeight: 'bold',
              },
              '& .cell-poor': {
                backgroundColor: '#fef9c3',
              },
              '& .cell-inactive': {
                backgroundColor: '#fee2e2',
              },
              '& .cell-normal': {
                backgroundColor: '#f3f4f6',
              },
              '& .current-week-col': {
                backgroundColor: '#f0f9ff',
              },
              '& .MuiDataGrid-columnHeader.current-week-col': {
                backgroundColor: '#e0f2fe',
                fontWeight: 'bold',
                borderBottom: '2px solid #0284c7',
              },
            }}
            disableRowSelectionOnClick
            pageSizeOptions={[5, 10, 20]}
            onRowClick={(params) => {
              if (params.id !== 'totals') {
                setSelectedUserId(params.row.id);
              }
            }}
          />
        )}
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {selectedUser && selectedCourseId && (
        <Box mt={4}>
          <Typography variant="h6" gutterBottom>
            Detailed View for {selectedUser.first_name}{' '}
            {selectedUser.last_name}
          </Typography>
          <UserDetailView
            userId={selectedUser.id}
            courseId={selectedCourseId}
            disableRedirect
          />
        </Box>
      )}
    </Box>
  );
}
