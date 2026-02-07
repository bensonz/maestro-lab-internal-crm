/**
 * Escape a CSV cell value per RFC 4180:
 * - If value contains commas, double quotes, or newlines, wrap in quotes
 * - Escape inner double quotes by doubling them
 */
function escapeCSVValue(value: string): string {
  if (
    value.includes(',') ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Generate a CSV string from headers and rows.
 * Includes UTF-8 BOM prefix so Excel opens it correctly.
 */
export function generateCSV(headers: string[], rows: string[][]): string {
  const BOM = '\uFEFF'
  const headerLine = headers.map(escapeCSVValue).join(',')
  const dataLines = rows.map((row) => row.map(escapeCSVValue).join(','))
  return BOM + [headerLine, ...dataLines].join('\n')
}

/**
 * Build a Response object for CSV download.
 */
export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
