import { AssignmentResponseDTO } from '../services/assignmentService';

// ─── ICS helpers ────────────────────────────────────────────────────────────

function escapeICS(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function toICSDate(dateStr: string): string {
  // deadline is typically "2025-06-01T23:59:59" – convert to UTC basic format
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

export interface CalendarExportData extends Partial<AssignmentResponseDTO> {
  paperTitle: string;
  deadline: string;
  id: string;
  reviewerName?: string;
}

function buildUID(id: string): string {
  return `papeers-deadline-${id}@papeers.app`;
}

function buildVEVENT(a: CalendarExportData): string {
  const d = new Date(a.deadline);
  const pad = (n: number) => String(n).padStart(2, '0');
  
  // Start: 00:00:00 of the deadline day (UTC)
  const startStr = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T000000Z`;
  
  // End: 23:59:59 of the deadline day (UTC)
  const endStr = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T235959Z`;

  const now = toICSDate(new Date().toISOString());
  
  const pairing = a.reviewerName 
    ? `${a.paperTitle || 'Untitled Paper'} - ${a.reviewerName}`
    : (a.paperTitle || 'Untitled Paper');

  const summary = escapeICS(`Review: ${pairing}`);
  const description = escapeICS(
    `Review assignment for "${a.paperTitle || 'Untitled Paper'}".\nReviewer: ${a.reviewerName || 'Unassigned'}\nPaPeers Paper Review System.`
  );

  return [
    'BEGIN:VEVENT',
    `UID:${buildUID(a.id)}`,
    `DTSTAMP:${now}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
  ].join('\r\n');
}

function buildICS(assignments: CalendarExportData[]): string {
  const events = assignments.map(buildVEVENT).join('\r\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PaPeers//Paper Review System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    events,
    'END:VCALENDAR',
  ].join('\r\n');
}

// ─── Export functions ────────────────────────────────────────────────────────

/**
 * Download all assignments as a single .ics file (works for Apple Calendar,
 * Outlook, Thunderbird, etc.)
 */
export function exportToICS(assignments: CalendarExportData[], filename = 'papeers-deadlines.ics') {
  const ics = buildICS(assignments);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Open a single assignment deadline in Google Calendar "add event" page.
 */
export function openInGoogleCalendar(a: CalendarExportData) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const d = new Date(a.deadline);
  
  // Format for Google: YYYYMMDDTHHMMSS
  const startStr = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T000000`;
  const endStr = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T235959`;

  const pairing = a.reviewerName 
    ? `${a.paperTitle || 'Untitled Paper'} - ${a.reviewerName}`
    : (a.paperTitle || 'Untitled Paper');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Review: ${pairing}`,
    dates: `${startStr}/${endStr}`,
    details: `Review assignment for "${a.paperTitle || 'Untitled Paper'}".\nReviewer: ${a.reviewerName || 'Unassigned'}\nManaged via PaPeers Paper Review System.`,
    sf: 'true',
  });

  window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank', 'noopener,noreferrer');
}

/**
 * Export ALL assignments as .ics (works with Apple Calendar too).
 * Also usable for a single assignment by passing a one-element array.
 */
export function exportAllToGoogleCalendar(assignments: AssignmentResponseDTO[]) {
  // Google Calendar doesn't support bulk import via URL; use ICS for bulk.
  // For single, use openInGoogleCalendar.
  exportToICS(assignments, 'papeers-deadlines.ics');
}
