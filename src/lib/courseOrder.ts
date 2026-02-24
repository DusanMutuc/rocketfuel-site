import type { SupabaseClient } from '@supabase/supabase-js';

type CourseRow = {
  course_id: string | number;
  name?: string | null;
  start_date: string | null;
  duration_weeks: number | null;
};

type SortOrderRow = {
  course_node_id: string | number;
  sort_order: number;
};

export type OrderedCourse = {
  course_id: string;
  name: string;
  start_date: string | null;
  duration_weeks: number;
  sort_order: number | null;
};

const fallbackDate = (date: string | null) => (date ? new Date(date).getTime() : 0);

export async function fetchOrderedCourses(client: SupabaseClient): Promise<OrderedCourse[]> {
  const [{ data: coursesData, error: coursesError }, { data: sortData, error: sortError }] =
    await Promise.all([
      client
        .from('courses')
        .select('course_id, name, start_date, duration_weeks'),
      client
        .from('course_sort_orders')
        .select('course_node_id, sort_order')
        .order('sort_order', { ascending: true }),
    ]);

  if (coursesError) throw coursesError;
  if (sortError) throw sortError;

  const courses = (coursesData ?? []) as CourseRow[];
  const sortRows = (sortData ?? []) as SortOrderRow[];

  const sortMap = new Map<string, number>();
  for (const row of sortRows) {
    sortMap.set(String(row.course_node_id), row.sort_order);
  }

  return courses
    .map((course) => ({
      course_id: String(course.course_id),
      name: course.name ?? 'Untitled Course',
      start_date: course.start_date,
      duration_weeks: course.duration_weeks ?? 12,
      sort_order: sortMap.get(String(course.course_id)) ?? null,
    }))
    .sort((a, b) => {
      if (a.sort_order !== null && b.sort_order !== null) return a.sort_order - b.sort_order;
      if (a.sort_order !== null) return -1;
      if (b.sort_order !== null) return 1;
      return fallbackDate(b.start_date) - fallbackDate(a.start_date);
    });
}
