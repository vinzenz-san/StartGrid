// Shared helpers for building dev-mode mock event fixtures — used by both
// Calendar (Google) and OutlookCalendar's MOCK_EVENTS arrays.

export function daysFromNow(days: number, hours = 0, minutes = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

export function allDayDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
