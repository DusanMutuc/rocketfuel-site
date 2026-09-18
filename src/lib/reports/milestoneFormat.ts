import type { ReportActivity, ReportMilestone, ReportSnapshot } from './reportTypes';
export const reportTitle = (milestone: ReportMilestone) => milestone === 'final' ? 'Final report' : milestone === 'day60' ? '60-day report' : '30-day report';
export const count = (value: number | null) => value === null ? 'Not available' : value.toLocaleString('en-US', { maximumFractionDigits: 0 });
export const money = (value: number | null) => value === null ? 'Not available' : `${value < 0 ? '-' : ''}$${Math.abs(value).toLocaleString('en-US', {maximumFractionDigits:0})}`;
export function reportDate(value: string) {
  return new Date(value.slice(0,10) + 'T12:00:00Z').toLocaleDateString('en-US', { month:'short',day:'numeric',year:'numeric',timeZone:'UTC' });
}
export function reportTimestamp(value:string,timeZone:string){ return new Date(value).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone}); }
export function activityGoal(row: ReportActivity) {
  const target = row.optimum !== null && row.optimum > 0 ? row.optimum : row.minimum !== null && row.minimum > 0 ? row.minimum : null;
  return {fill: target && row.actual !== null ? Math.max(0,Math.min(1,row.actual / target)) : 0,
    marker: target && row.minimum !== null && row.minimum > 0 ? Math.max(0, Math.min(1,row.minimum / target)) : null,
    target, single: row.minimum === row.optimum,
    status: row.actual === null ? 'Not available' : row.actual === 0 ? 'No activity recorded' : row.optimum !== null && row.optimum > 0 && row.actual >= row.optimum ? row.minimum === row.optimum ? 'Goal reached' : 'Optimum reached' : row.minimum !== null && row.minimum > 0 && row.actual >= row.minimum ? 'Minimum reached' : 'Recorded activity'};
}
export function reportFilename(report: ReportSnapshot) { return `rocketfuel-${report.milestone}-${report.period_end}-v${report.revision}.pdf`; }
// Only report paths can continue through login; reject external URLs and encoded separators.
export function safeReportReturn(value: string | null) { return value && /^\/reports\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : null; }
export const isReportId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
