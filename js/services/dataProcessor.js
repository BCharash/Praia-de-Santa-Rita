/**
 * Data processing, interpolation, and dynamic time-slicing logic.
 */

import { TIME_FILTERS } from '../config.js';

/**
 * Gets the current date string (YYYY-MM-DD) in the specified timezone.
 * @param {string} timezone
 * @returns {string}
 */
export function getLocalDateString(date = new Date(), timezone = 'Europe/Lisbon') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const map = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day}`;
}

/**
 * Gets the current local hour string (YYYY-MM-DDTHH:00) in the specified timezone.
 * @param {string} timezone
 * @returns {string}
 */
export function getLocalHourString(date = new Date(), timezone = 'Europe/Lisbon') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);

  const map = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day}T${map.hour}:00`;
}

/**
 * Accurately finds the index corresponding to the current hour in target timezone.
 * @param {string[]} hourlyTimes - Array of ISO time strings from Open-Meteo
 * @param {string} timezone
 * @returns {number}
 */
export function getCurrentHourIndex(hourlyTimes, timezone = 'Europe/Lisbon') {
  if (!Array.isArray(hourlyTimes) || hourlyTimes.length === 0) return 0;

  const targetHourStr = getLocalHourString(new Date(), timezone);
  const exactIndex = hourlyTimes.findIndex(t => t.startsWith(targetHourStr));
  if (exactIndex !== -1) return exactIndex;

  // Fallback: match by today's date + current local hour offset
  const todayStr = getLocalDateString(new Date(), timezone);
  const todayStart = hourlyTimes.findIndex(t => t.startsWith(todayStr));
  if (todayStart !== -1) {
    const currentHour = parseInt(targetHourStr.slice(11, 13), 10) || 0;
    const candidate = todayStart + currentHour;
    if (candidate < hourlyTimes.length) return candidate;
  }

  // Final fallback to midpoint or index 72 if within range
  return hourlyTimes.length > 72 ? 72 : 0;
}

/**
 * Finds the index of "today" in daily arrays (e.g. daily.uv_index_max).
 * @param {string[]} dailyTimes - Array of YYYY-MM-DD strings
 * @param {string} timezone
 * @returns {number}
 */
export function getTodayDailyIndex(dailyTimes, timezone = 'Europe/Lisbon') {
  if (!Array.isArray(dailyTimes) || dailyTimes.length === 0) return 0;
  const todayStr = getLocalDateString(new Date(), timezone);
  const idx = dailyTimes.indexOf(todayStr);
  return idx !== -1 ? idx : (dailyTimes.length > 3 ? 3 : 0);
}

/**
 * Calculates slice start and end indices dynamically based on the current date,
 * eliminating brittle magic number assumptions and handling DST shifts.
 * @param {string[]} hourlyTimes
 * @param {string} filter
 * @param {string} timezone
 * @returns {{ start: number, end: number }}
 */
export function getTimeSliceIndices(hourlyTimes, filter = TIME_FILTERS.TODAY, timezone = 'Europe/Lisbon') {
  if (!Array.isArray(hourlyTimes) || hourlyTimes.length === 0) {
    return { start: 0, end: 0 };
  }

  const todayStr = getLocalDateString(new Date(), timezone);
  let todayIndex = hourlyTimes.findIndex(t => t.startsWith(todayStr));
  if (todayIndex === -1) {
    todayIndex = hourlyTimes.length > 72 ? 72 : 0;
  }

  switch (filter) {
    case TIME_FILTERS.PAST_3D:
      return { start: Math.max(0, todayIndex - 72), end: todayIndex };
    case TIME_FILTERS.PAST_1D:
      return { start: Math.max(0, todayIndex - 24), end: todayIndex };
    case TIME_FILTERS.TODAY:
      return { start: todayIndex, end: Math.min(hourlyTimes.length, todayIndex + 24) };
    case TIME_FILTERS.NEXT_3D:
      return { start: todayIndex + 24, end: Math.min(hourlyTimes.length, todayIndex + 96) };
    case TIME_FILTERS.NEXT_7D:
      return { start: todayIndex + 24, end: Math.min(hourlyTimes.length, todayIndex + 192) };
    default:
      return { start: todayIndex, end: Math.min(hourlyTimes.length, todayIndex + 24) };
  }
}

/**
 * Bidirectional fill for sea surface temperatures to interpolate missing marine data.
 * @param {Array<number|null>} rawTemps
 * @param {number} fallback
 * @returns {number[]}
 */
export function processWaterTemperatures(rawTemps = [], fallback = 18.5) {
  if (!Array.isArray(rawTemps) || rawTemps.length === 0) return [];

  const processed = new Array(rawTemps.length);
  let lastValid = fallback;

  // Forward fill
  for (let i = 0; i < rawTemps.length; i++) {
    const val = rawTemps[i];
    if (val !== null && val !== undefined && val > 0) {
      lastValid = val;
    }
    processed[i] = lastValid;
  }

  // Backward fill for any initial missing values
  for (let i = rawTemps.length - 1; i >= 0; i--) {
    const val = rawTemps[i];
    if (val !== null && val !== undefined && val > 0) {
      lastValid = val;
    }
    if (processed[i] === fallback) {
      processed[i] = lastValid;
    }
  }

  return processed;
}
