'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { fetchOrderedCourses, type OrderedCourse } from '@/lib/courseOrder';
import { Box, Paper, Typography, CircularProgress, Button } from '@mui/material';

export default function CoursesPage() {
  const [courses, setCourses] = useState<OrderedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const orderedCourses = await fetchOrderedCourses(supabase);
        setCourses(orderedCourses);
      } catch (error) {
        console.error('Failed to load courses page:', error);
        setErrorMsg('Failed to load courses.');
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: 2, py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Courses</Typography>
        <Button component={Link} href="/dashboard" variant="outlined" size="small">
          Dashboard
        </Button>
      </Box>

      {loading && <CircularProgress sx={{ m: 2 }} />}
      {!loading && errorMsg && <Typography color="error">{errorMsg}</Typography>}

      {!loading && !errorMsg && courses.map((course, index) => (
        <Paper key={course.course_id} sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1">{index + 1}. {course.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {course.start_date
              ? `Starts: ${new Date(`${course.start_date}T00:00:00`).toLocaleDateString()}`
              : 'No start date'}
            {' • '}
            {course.duration_weeks} weeks
          </Typography>
        </Paper>
      ))}
    </Box>
  );
}
