/**
 * Client-side CSV export.
 *
 * Built from the rows already on screen rather than a second server round
 * trip, so what downloads is exactly what was read — no risk of the export
 * and the table disagreeing because a payment landed between the two calls.
 */

/** Quotes a field only when it needs it, per RFC 4180. */
function escapeCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');
}

/**
 * Hands the CSV to the browser as a download.
 *
 * The BOM is what makes Excel open a UTF-8 file as UTF-8; without it "Ñ" and
 * the peso sign arrive mangled, which is not a subtlety in a Philippine
 * tenant list.
 */
export function downloadCsv(fileName: string, csv: string): void {
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
