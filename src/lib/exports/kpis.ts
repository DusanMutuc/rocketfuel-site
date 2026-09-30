export type KpiCsvRow = {
  week_start: string;
  ask: number;
  follow_up: number;
  open_house: number;
  handwritten_card: number;
  action_promise: number;
  exercise: number;
  week_total: number;
};

export const kpiCsvHeaders: { key: keyof KpiCsvRow; label: string }[] = [
  { key: 'week_start', label: 'week_start' },
  { key: 'ask', label: 'ask' },
  { key: 'follow_up', label: 'follow_up' },
  { key: 'open_house', label: 'open_house' },
  { key: 'handwritten_card', label: 'handwritten_card' },
  { key: 'action_promise', label: 'action_promise' },
  { key: 'exercise', label: 'exercise' },
  { key: 'week_total', label: 'week_total' },
];

type RawWeekly = {
  week_start?: string;
  asks?: number | null;
  follow_ups?: number | null;
  open_houses?: number | null;
  handwritten_cards?: number | null;
  action_promises?: number | null;
  exercises?: number | null;
};

export function mapWeeklyRowToKpiCsvRow(row: RawWeekly): KpiCsvRow {
  const ask = Number(row.asks ?? 0);
  const follow_up = Number(row.follow_ups ?? 0);
  const open_house = Number(row.open_houses ?? 0);
  const handwritten_card = Number(row.handwritten_cards ?? 0);
  const action_promise = Number(row.action_promises ?? 0);
  const exercise = Number(row.exercises ?? 0);

  return {
    week_start: row.week_start ?? '',
    ask,
    follow_up,
    open_house,
    handwritten_card,
    action_promise,
    exercise,
    week_total: ask + follow_up + open_house + handwritten_card + action_promise + exercise,
  };
}
