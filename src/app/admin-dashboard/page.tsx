'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
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
} from '@mui/material';
import UserDetailView from '@/components/UserDetailView';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

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
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const fetchData = async () => {
    setLoading(true);
    console.log('[DEBUG] Starting data fetch...');
    
    try {
      // Debug: Log supabase client status
      console.log('[DEBUG] Supabase client:', supabase);

      // 1. Fetch course start date
      console.log('[DEBUG] Fetching course start date...');
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('start_date')
        .order('start_date', { ascending: false })
        .limit(1)
        .single();

      if (courseError || !course?.start_date) {
        console.error('[ERROR] Course date fetch failed:', {
          error: courseError,
          receivedData: course
        });
        setLoading(false);
        return;
      }
      setCourseStartDate(course.start_date);
      console.log('[DEBUG] Course start date:', course.start_date);

      // Calculate current week index
      const courseStart = new Date(course.start_date);
      const now = new Date();
      const diffInDays = Math.floor((now.getTime() - courseStart.getTime()) / (1000 * 60 * 60 * 24));
      const weekIndex = Math.floor(diffInDays / 7);
      setCurrentWeekIndex(weekIndex >= 0 ? weekIndex : null);
      console.log('[DEBUG] Current week index:', weekIndex);

      // 2. Fetch user profiles
      console.log('[DEBUG] Fetching user profiles...');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role');

      if (profileError) {
        console.error('[ERROR] Profile fetch failed:', {
          message: profileError.message,
          details: profileError.details,
          code: profileError.code
        });
        setLoading(false);
        return;
      }

      const users = (profileData ?? []).filter((p) => p.role === 'user');
      console.log('[DEBUG] Found users:', users.length);

      // 3. Fetch task type metadata
      console.log('[DEBUG] Fetching task type metadata...');
      const { data: taskTypeMeta, error: taskTypeError } = await supabase
        .from('task_types')
        .select('minimal_amount')
        .eq('task_type_id', selectedTaskType.id)
        .single();

      if (taskTypeError) {
        console.error('[ERROR] Task type meta fetch failed:', {
          message: taskTypeError.message,
          details: taskTypeError.details,
          code: taskTypeError.code
        });
      }

      const minimal = taskTypeMeta?.minimal_amount || 1;
      console.log('[DEBUG] Minimal amount:', minimal);

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

      // 4. Process each user
      console.log('[DEBUG] Processing user data...');
      const rowPromises = users.map(async (user) => {
        console.log(`[DEBUG] Processing user ${user.id} (${user.first_name} ${user.last_name})`);
        
        try {
          // 4a. Get weekly counts
          console.log(`[DEBUG] Fetching weekly counts for user ${user.id}`);
          const { data: weekly, error: weeklyError } = await supabase.rpc('get_weekly_task_counts', {
            course_start: course.start_date,
            uid: user.id,
          });

          if (weeklyError) {
            console.error(`[ERROR] Weekly counts failed for user ${user.id}:`, {
              message: weeklyError.message,
              details: weeklyError.details,
              code: weeklyError.code
            });
          }

          // 4b. Get pipeline data
          console.log(`[DEBUG] Fetching pipeline data for user ${user.id}`);
          const { data: pipelineData, error: pipelineError } = await supabase.rpc(
            'get_clients_by_client_type',
            { uid: user.id, client_type_name: 'Pipeline' }
          );

          if (pipelineError) {
            console.error(`[ERROR] Pipeline data failed for user ${user.id}:`, {
              message: pipelineError.message,
              details: pipelineError.details,
              code: pipelineError.code
            });
          }

          const pipelineCount = pipelineData?.length || 0;
          const pipelineRevenue = pipelineData?.reduce(
            (sum: number, c: any) => sum + (Number(c.pipeline_revenue) || 0),
            0
          ) || 0;

          const row: any = {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            pipeline_count: pipelineCount,
            pipeline_revenue: pipelineRevenue,
          };

          // Process weekly data
          let total = 0;
          weekly?.forEach((week: any, i: number) => {
            const key = `week_${i + 1}`;
            const value = week[selectedTaskType.key] ?? 0;
            total += value;
            row[key] = value;
            totalsRow[key] = (totalsRow[key] || 0) + value;
          });

          totalsRow.pipeline_count += pipelineCount;
          totalsRow.pipeline_revenue += pipelineRevenue;

          // 4c. Check recent activity
          console.log(`[DEBUG] Checking recent activity for user ${user.id}`);
          const today = new Date();
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(today.getDate() - 7);
          const sevenDaysAgoISO = sevenDaysAgo.toISOString();

          const threeDaysAgo = new Date(today);
          threeDaysAgo.setDate(today.getDate() - 3);
          const threeDaysAgoISO = threeDaysAgo.toISOString();

          console.log(`[DEBUG] Fetching task logs for user ${user.id} (7 days)`);
          const { data: recentTaskLogs, error: recentTaskError } = await supabase
            .from('task_logs')
            .select('amount')
            .eq('user_id', user.id)
            .eq('task_type_id', selectedTaskType.id)
            .gte('created_at', sevenDaysAgoISO)
            .order('created_at', { ascending: false });

          if (recentTaskError) {
            console.error(`[ERROR] Recent task logs failed for user ${user.id}:`, {
              message: recentTaskError.message,
              details: recentTaskError.details,
              hint: recentTaskError.hint,
              code: recentTaskError.code
            });
          } else {
            console.log(`[DEBUG] Found ${recentTaskLogs?.length} recent task logs for user ${user.id}`);
          }

          const recentTaskTotal = recentTaskLogs?.reduce(
            (sum, log) => sum + (log.amount ?? 0),
            0
          ) ?? 0;

          console.log(`[DEBUG] Fetching any recent logs for user ${user.id} (3 days)`);
          const { data: anyRecentLogs, error: recentLogsError } = await supabase
            .from('task_logs')
            .select('task_log_id')
            .eq('user_id', user.id)
            .gte('created_at', threeDaysAgoISO)
            .order('created_at', { ascending: false })
            .limit(1);

          if (recentLogsError) {
            console.error(`[ERROR] Recent logs check failed for user ${user.id}:`, {
              message: recentLogsError.message,
              details: recentLogsError.details,
              hint: recentLogsError.hint,
              code: recentLogsError.code
            });
          } else {
            console.log(`[DEBUG] Found ${anyRecentLogs?.length} recent logs for user ${user.id}`);
          }

          const isInactive = !anyRecentLogs || anyRecentLogs.length === 0;

          if (isInactive) {
            row.status = 'inactive';
            console.log(`[DEBUG] User ${user.id} marked as inactive`);
          } else if (recentTaskTotal >= 2 * minimal) {
            row.status = 'excellent';
            console.log(`[DEBUG] User ${user.id} marked as excellent (${recentTaskTotal} tasks)`);
          } else if (recentTaskTotal <= 0.5 * minimal) {
            row.status = 'poor';
            console.log(`[DEBUG] User ${user.id} marked as poor (${recentTaskTotal} tasks)`);
          } else {
            row.status = 'normal';
            console.log(`[DEBUG] User ${user.id} marked as normal (${recentTaskTotal} tasks)`);
          }

          return row;
        } catch (err) {
          console.error(`[ERROR] Processing failed for user ${user.id}:`, err);
          return null;
        }
      });

      const resolvedRows = (await Promise.all(rowPromises)).filter(Boolean);
      console.log('[DEBUG] Processed rows:', resolvedRows.length);

      // Calculate cumulative totals
      let cumulativeTotal = 0;
      Array.from({ length: 12 }).forEach((_, i) => {
        const key = `week_${i + 1}`;
        cumulativeTotal += totalsRow[key] || 0;
        totalsRow[key] = cumulativeTotal;
      });

      setRows([...resolvedRows, totalsRow]);
      console.log('[DEBUG] Data fetch completed successfully');
    } catch (err) {
      console.error('[ERROR] Fatal error in fetchData:', err);
      setSnackbar({ open: true, message: 'Failed to load data', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, [selectedTaskType.key]);

  const processRowUpdate = async (newRow: GridRowModel, oldRow: GridRowModel) => {
    if (newRow.id === 'totals') return oldRow;
    try {
      const changedWeek = Object.keys(newRow).find(
        key => key.startsWith('week_') && newRow[key] !== oldRow[key]
      );
      if (!changedWeek || !courseStartDate) return oldRow;

      const weekIndex = parseInt(changedWeek.replace('week_', ''), 10);
      const weekStartDate = new Date(courseStartDate);
      weekStartDate.setDate(weekStartDate.getDate() + (weekIndex - 1) * 7);
      const weekStart = weekStartDate.toISOString().split('T')[0];

      const { error } = await supabase.rpc('update_weekly_task_logs', {
        _user_id: newRow.id,
        _task_type_id: selectedTaskType.id,
        _week_start: weekStart,
        _new_total: newRow[changedWeek],
      });

      if (error) throw error;

      setRows(prev => prev.map(r => (r.id === newRow.id ? newRow : r)));
      setSnackbar({ open: true, message: 'Task updated!', severity: 'success' });
      return newRow;
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Update failed', severity: 'error' });
      return oldRow;
    }
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
    headerClassName: currentWeekIndex !== null && i === currentWeekIndex ? 'current-week-col' : '',
    cellClassName: (params) => currentWeekIndex !== null && i === currentWeekIndex ? 'current-week-col' : '',
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
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
        <FormControl sx={{ minWidth: 200, mb: 3 }}>
          <InputLabel>Task Type</InputLabel>
          <Select
            value={selectedTaskType.key}
            label="Task Type"
            onChange={(e) => {
              const selected = TASK_TYPES.find(t => t.key === e.target.value);
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

      {selectedUserId && (
        <Box mt={4}>
          <Typography variant="h6" gutterBottom>
            Detailed View for {selectedUser?.first_name} {selectedUser?.last_name}
          </Typography>

          <UserDetailView userId={selectedUser.id} disableRedirect />

        </Box>
      )}
    </Box>
  );
}