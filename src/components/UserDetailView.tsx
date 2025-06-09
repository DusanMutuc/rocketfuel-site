'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Paper,
  Typography,
  Box,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
  TextField,
  Snackbar
} from '@mui/material';
import Link from 'next/link';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import RepeatIcon from '@mui/icons-material/Repeat';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import EditNoteIcon from '@mui/icons-material/EditNote';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

interface WeeklyData {
  week_start: string;
  asks: number;
  follow_ups: number;
  open_houses: number;
  handwritten_cards: number;
  action_promises: number;
  exercises: number;
}

type TaskKeys = Exclude<keyof WeeklyData, 'week_start'>;

interface Props {
  userId: string;
  disableRedirect?: boolean;
}

export default function UserDetailView({ userId, disableRedirect }: Props) {

  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [selectedWeekStart, setSelectedWeekStart] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pipelineCount, setPipelineCount] = useState<number>(0);
  const [pipelineRevenue, setPipelineRevenue] = useState<number>(0);
  const [totalGrossRevenue, setTotalGrossRevenue] = useState<number>(0);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTaskKey, setSelectedTaskKey] = useState<TaskKeys | null>(null);
  const [newValue, setNewValue] = useState<number>(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const taskTypeMapping: Record<TaskKeys, string> = {
    asks: 'ask',
    follow_ups: 'follow_up',
    open_houses: 'open_house',
    handwritten_cards: 'handwritten_card',
    action_promises: 'action_promise',
    exercises: 'exercise',
  };

  useEffect(() => {
    const getData = async () => {
      setLoading(true);

      const { data: course } = await supabase
        .from('courses')
        .select('start_date')
        .order('start_date', { ascending: false })
        .limit(1)
        .single();

      const courseStart = course?.start_date;
      const endDate = format(new Date(), 'yyyy-MM-dd');

      const { data: weekly } = await supabase.rpc('get_weekly_task_counts', {
        course_start: courseStart,
        uid: userId,
      });

      if (weekly && Array.isArray(weekly)) {
  setWeeklyData(weekly);

  const courseStartDate = new Date(courseStart);
  const today = new Date();

  const diffInDays = Math.floor((today.getTime() - courseStartDate.getTime()) / (1000 * 60 * 60 * 24));
  let weekIndex = Math.floor(diffInDays / 7);

  // Clamp between week 0 and 11 (Weeks 1 to 12)
  weekIndex = Math.max(0, Math.min(11, weekIndex));

  const weekData = weekly[weekIndex];
  if (weekData) {
    setSelectedWeekStart(weekData.week_start);
  }
}


      const { data: taskTypesData } = await supabase
        .from('task_types')
        .select('name, minimal_amount');

      const minimalAmounts: Record<string, number> = {};
      taskTypesData?.forEach((task) => {
        minimalAmounts[task.name] = task.minimal_amount;
      });

      const scalingFactors = {
        asks: 1,
        follow_ups: minimalAmounts[taskTypeMapping.asks] / minimalAmounts[taskTypeMapping.follow_ups],
        open_houses: minimalAmounts[taskTypeMapping.asks] / minimalAmounts[taskTypeMapping.open_houses],
        handwritten_cards: minimalAmounts[taskTypeMapping.asks] / minimalAmounts[taskTypeMapping.handwritten_cards],
        action_promises: minimalAmounts[taskTypeMapping.asks] / minimalAmounts[taskTypeMapping.action_promises],
        exercises: minimalAmounts[taskTypeMapping.asks] / minimalAmounts[taskTypeMapping.exercises],
      };

      const { data: dailyData } = await supabase.rpc(
        'get_daily_task_counts_all_types_in_range',
        {
          uid: userId,
          start_date: courseStart,
          end_date: endDate,
        }
      );

      let running = {
        asks: 0,
        follow_ups: 0,
        open_houses: 0,
        handwritten_cards: 0,
        action_promises: 0,
        exercises: 0,
        gross_revenue: 0,
      };

      const baselineDaily = minimalAmounts[taskTypeMapping.asks] / 7;

      const transformed = dailyData.map((row: any, index: number) => {
        running.asks += row.asks;
        running.follow_ups += row.follow_ups;
        running.open_houses += row.open_houses;
        running.handwritten_cards += row.handwritten_cards;
        running.action_promises += row.action_promises;
        running.exercises += row.exercises;
        running.gross_revenue += row.gross_revenue;

        return {
          day: format(new Date(row.day), 'MMM d'),
          asks: running.asks * scalingFactors.asks,
          follow_ups: running.follow_ups * scalingFactors.follow_ups,
          open_houses: running.open_houses * scalingFactors.open_houses,
          handwritten_cards: running.handwritten_cards * scalingFactors.handwritten_cards,
          action_promises: running.action_promises * scalingFactors.action_promises,
          exercises: running.exercises * scalingFactors.exercises,
          gross_revenue: running.gross_revenue,
          baseline: baselineDaily * (index + 1),
        };
      });

      setChartData(transformed);

      const { data: pipelineData } = await supabase.rpc(
        'get_clients_by_client_type',
        { uid: userId, client_type_name: 'Pipeline' }
      );

      if (pipelineData) {
        setPipelineCount(pipelineData.length);
        const totalRevenue = pipelineData.reduce(
          (sum: number, c: any) => sum + (c.pipeline_revenue || 0),
          0
        );
        setPipelineRevenue(totalRevenue);
      }

      const { data: grossRevData } = await supabase.rpc('get_total_gross_revenue', {
        uid: userId,
      });

      if (grossRevData) {
        setTotalGrossRevenue(grossRevData);
      }

      setLoading(false);
    };

    getData();
  }, [userId]);

  const handleCardClick = (key: TaskKeys, value: number) => {
    setSelectedTaskKey(key);
    setNewValue(value);
    setEditModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedTaskKey || !selectedWeekStart) return;

    const dbTaskName = taskTypeMapping[selectedTaskKey];
    const { data: taskTypes } = await supabase
      .from('task_types')
      .select('task_type_id, name')
      .eq('name', dbTaskName);

    if (!taskTypes || taskTypes.length === 0) return;

    const taskTypeId = taskTypes[0].task_type_id;
    const { error } = await supabase.rpc('update_weekly_task_logs', {
      _user_id: userId,
      _task_type_id: taskTypeId,
      _week_start: selectedWeekStart,
      _new_total: newValue,
    });

    if (!error) {
  setWeeklyData((prev) =>
    prev.map((w) =>
      w.week_start === selectedWeekStart
        ? { ...w, [selectedTaskKey]: newValue }
        : w
    )
  );
  setSnackbarMessage('Task updated successfully!');
  setSnackbarOpen(true);
} else {
  setSnackbarMessage('Error saving task.');
  setSnackbarOpen(true);
}

setEditModalOpen(false);

  };

  if (loading) return <p>Loading...</p>;

  const currentWeek = weeklyData.find((w) => w.week_start === selectedWeekStart);

  const goals: Record<TaskKeys, number> = {
    asks: 70,
    follow_ups: 50,
    open_houses: 3,
    handwritten_cards: 20,
    action_promises: 20,
    exercises: 5,
  };

  const iconMap: Record<TaskKeys, React.ReactNode> = {
    asks: <RecordVoiceOverIcon fontSize="small" />,
    follow_ups: <RepeatIcon fontSize="small" />,
    open_houses: <HomeWorkIcon fontSize="small" />,
    handwritten_cards: <EditNoteIcon fontSize="small" />,
    action_promises: <CheckCircleOutlineIcon fontSize="small" />,
    exercises: <FitnessCenterIcon fontSize="small" />,
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Your Progress Overview
      </Typography>

      <FormControl sx={{ minWidth: 160, mb: 3 }} size="small">
        <InputLabel id="week-select-label">Week</InputLabel>
        <Select
          labelId="week-select-label"
          id="week-select"
          value={selectedWeekStart ?? ''}
          label="Week"
          onChange={(e) => setSelectedWeekStart(e.target.value)}
        >
          {weeklyData.map((week, index) => (
            <MenuItem key={week.week_start} value={week.week_start}>
              Week {index + 1}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        {currentWeek &&
          (Object.keys(taskTypeMapping) as TaskKeys[]).map((key) => {
            const value = currentWeek[key];
            const goal = goals[key];
            const percentage = Math.min(100, Math.round((value / goal) * 100));
            return (
              <Paper
                key={key}
                elevation={2}
                sx={{
                  flex: '1 1 30%',
                  minWidth: 250,
                  px: 2,
                  py: 2,
                  borderRadius: 2,
                  background: '#fdfdfd',
                  transition: 'box-shadow 0.2s ease',
                  '&:hover': {
                    boxShadow: 4,
                    cursor: 'pointer',
                  },
                }}
                onClick={() => handleCardClick(key, value)}
              >
                <Typography
                  variant="subtitle1"
                  fontWeight={600}
                  gutterBottom
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  {iconMap[key]}
                  {key.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </Typography>
                <Typography sx={{ mb: 1 }}>
                  {value} / {goal}
                </Typography>
                <Box
                  sx={{
                    backgroundColor: '#e0e0e0',
                    borderRadius: 5,
                    overflow: 'hidden',
                    height: 12,
                  }}
                >
                  <Box
                    sx={{
                      width: `${percentage}%`,
                      backgroundColor: '#1b52a6',
                      height: '100%',
                      transition: 'width 0.3s ease-in-out',
                    }}
                  />
                </Box>
                <Typography variant="caption" sx={{ color: '#666', mt: 1, display: 'block' }}>
                  {percentage}% complete
                </Typography>
              </Paper>
            );
          })}
      </Box>

      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)}>
        <DialogTitle>Edit Task</DialogTitle>
        <DialogContent>
          <Box display="flex" alignItems="center" justifyContent="center" gap={2} mt={1}>
            <IconButton onClick={() => setNewValue((v) => Math.max(0, v - 1))}>
              <RemoveIcon />
            </IconButton>
            <TextField
              value={newValue}
              onChange={(e) => setNewValue(Number(e.target.value))}
              type="number"
              inputProps={{ min: 0 }}
            />
            <IconButton onClick={() => setNewValue((v) => v + 1)}>
              <AddIcon />
            </IconButton>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSave}>Save</Button>
          <Button onClick={() => setEditModalOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Rest of your component remains the same */}
      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
       {disableRedirect ? (
  <Paper
    elevation={3}
    sx={{
      flex: 1,
      minWidth: 200,
      px: 3,
      py: 2,
      borderRadius: '16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textDecoration: 'none',
      transition: 'box-shadow 0.2s ease',
      '&:hover': {
        boxShadow: 6,
        cursor: 'default',
        backgroundColor: 'inherit',
      },
    }}
  >
    <Typography variant="body2" sx={{ color: '#666' }}>
      15/30 Pipeline
    </Typography>
    <Typography variant="h6" fontWeight={700} mt={0.5}>
      {pipelineCount}
    </Typography>
  </Paper>
) : (
  <Link href="/contacts" passHref legacyBehavior>
    <Paper
      component="a"
      elevation={3}
      sx={{
        flex: 1,
        minWidth: 200,
        px: 3,
        py: 2,
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textDecoration: 'none',
        transition: 'box-shadow 0.2s ease',
        '&:hover': {
          boxShadow: 6,
          cursor: 'pointer',
          backgroundColor: '#f5faff',
        },
      }}
    >
      <Typography variant="body2" sx={{ color: '#666' }}>
        15/30 Pipeline
      </Typography>
      <Typography variant="h6" fontWeight={700} mt={0.5}>
        {pipelineCount}
      </Typography>
    </Paper>
  </Link>
)}


        <Paper
          elevation={3}
          sx={{
            flex: 1,
            minWidth: 200,
            px: 3,
            py: 2,
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography variant="body2" sx={{ color: '#666' }}>
            15/30 Revenue
          </Typography>
          <Typography variant="h6" fontWeight={700} mt={0.5}>
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(pipelineRevenue)}
          </Typography>
        </Paper>
      </Box>

      <Paper elevation={3} sx={{ mt: 2, px: 3, py: 2, borderRadius: 2, gap: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Course Payoff
        </Typography>
        <Typography variant="subtitle1" fontWeight={600}>
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(totalGrossRevenue)}{' '}
          / $20,000
        </Typography>
        <Box sx={{ mt: 1 }}>
          <Box
            sx={{
              height: 10,
              width: '100%',
              backgroundColor: '#e0e0e0',
              borderRadius: 5,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                height: '100%',
                width: `${Math.min(100, (totalGrossRevenue / 20000) * 100)}%`,
                backgroundColor: '#1b52a6',
                transition: 'width 0.3s ease-in-out',
              }}
            />
          </Box>
        </Box>
      </Paper>

      <Divider sx={{ my: 4 }} />

      <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom>
          Long-Term Trends
        </Typography>
        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" />
              <YAxis domain={[0, 'auto']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                }}
              />
              <Legend />
              <Area type="monotone" dataKey="baseline" stroke="none" fill="#ef4444" fillOpacity={0.2} />
              <Line type="monotone" dataKey="asks" stroke="#3b82f6" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="follow_ups" stroke="#10b981" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="open_houses" stroke="#f97316" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="handwritten_cards" stroke="#eab308" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="action_promises" stroke="#8b5cf6" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="exercises" stroke="navy" dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Paper>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />

    </Box>
  );
}