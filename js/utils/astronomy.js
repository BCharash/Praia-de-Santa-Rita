/**
 * Astronomical calculations including lunar phase cycle.
 */

const SYNODIC_MONTH = 29.53058770576; // Mean synodic month in days
const KNOWN_NEW_MOON_MS = new Date('2000-01-06T18:14:00Z').getTime();
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Calculates the moon phase emoji for a given Date object.
 * @param {Date} date
 * @returns {string} Emoji representing lunar phase
 */
export function getMoonPhaseIcon(date = new Date()) {
  const diffDays = (date.getTime() - KNOWN_NEW_MOON_MS) / MS_PER_DAY;
  const phase = ((diffDays % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;

  if (phase < 1.84 || phase >= 27.69) return '🌑'; // New Moon
  if (phase < 5.53) return '🌒'; // Waxing Crescent
  if (phase < 9.22) return '🌓'; // First Quarter
  if (phase < 12.91) return '🌔'; // Waxing Gibbous
  if (phase < 16.61) return '🌕'; // Full Moon
  if (phase < 20.30) return '🌖'; // Waning Gibbous
  if (phase < 24.00) return '🌗'; // Last Quarter
  return '🌘'; // Waning Crescent
}
