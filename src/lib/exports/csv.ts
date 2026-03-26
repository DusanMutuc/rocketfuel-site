export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';

  const str = String(value);
  if (str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  if (str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str}"`;
  }

  return str;
}

export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  headers: { key: keyof T; label: string }[]
): string {
  const headerLine = headers.map((h) => escapeCsvCell(h.label)).join(',');
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCsvCell(row[h.key])).join(',')
  );

  return [headerLine, ...dataLines].join('\n');
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
