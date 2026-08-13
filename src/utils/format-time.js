import { format, getTime, isValid, startOfDay, formatDistanceToNow, differenceInCalendarDays } from 'date-fns';

// ----------------------------------------------------------------------

export function fDate(date, newFormat) {
  const fm = newFormat || 'dd MMM yyyy';

  return date ? format(new Date(date), fm) : '';
}

export function fTime(date, newFormat) {
  const fm = newFormat || 'p';

  return date ? format(new Date(date), fm) : '';
}

export function fDateTime(date, newFormat) {
  const fm = newFormat || 'dd MMM yyyy p';

  return date ? format(new Date(date), fm) : '';
}

export function fTimestamp(date) {
  return date ? getTime(new Date(date)) : '';
}

export function fToNow(date) {
  return date
    ? formatDistanceToNow(new Date(date), {
        addSuffix: true,
      })
    : '';
}

export function isBetween(inputDate, startDate, endDate) {
  const date = new Date(inputDate);
  const start = new Date(startDate);
  const end = new Date(endDate);
  if ([date, start, end].some((d) => Number.isNaN(d.getTime()))) return false;

  const results =
    new Date(date.toDateString()) >= new Date(start.toDateString()) &&
    new Date(date.toDateString()) <= new Date(end.toDateString());

  return results;
}

export function isAfter(startDate, endDate) {
  const results =
    startDate && endDate ? new Date(startDate).getTime() > new Date(endDate).getTime() : false;

  return results;
}

/**
 * Calculate duration in days between start and end dates (inclusive).
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @returns {number} - Number of days (inclusive), defaults to 1 for invalid/missing dates
 */
export function calculateDuration(startDate, endDate) {
  if (!startDate) return 1;
  if (!endDate) return 1;
  const start = startOfDay(new Date(startDate));
  const end = startOfDay(new Date(endDate));
  if (!isValid(start) || !isValid(end)) return 1;
  const diff = differenceInCalendarDays(end, start);
  if (diff < 0) return 1;
  return diff + 1;
}
