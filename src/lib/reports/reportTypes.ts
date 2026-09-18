/** Stored report contract shared by SQL, native presentation, web and PDF. */
export type ReportMilestone = 'day30' | 'day60' | 'final';
export type ReportAchievement = {
  key: string;
  title: string;
  description?: string;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  artwork: string;
  shape: 'armor' | 'hexagon' | 'circle';
  earned_at: string;
  series_key?: string | null;
};
export type ReportActivity = {
  key: string;
  label: string;
  actual: number | null;
  minimum: number | null;
  optimum: number | null;
};
export type ReportSnapshot = {
  schema_version: 1;
  id: string;
  revision: number;
  user_id: string;
  course_id: string;
  course_name: string;
  member_name: string;
  milestone: ReportMilestone;
  period_start: string;
  period_end: string;
  days: number;
  course_days: number;
  reporting_timezone: string;
  generated_at: string;
  activities: ReportActivity[];
  business: {
    gross_revenue: number | null;
    pipeline_count: number | null;
    pipeline_value: number | null;
    pipeline_as_of: string | null;
    pipeline_status: 'recorded' | 'unavailable';
  };
  achievements: ReportAchievement[];
  achievement_count: number;
  seen_at?: string | null;
};
export type UpcomingReport = {
  course_id: string;
  course_name: string;
  milestone: ReportMilestone;
  period_start: string;
  period_end: string;
  available_on: string;
  days: number;
  course_days: number;
};
export type MemberReports = {
  enabled: boolean;
  reports: ReportSnapshot[];
  upcoming: UpcomingReport[];
};
