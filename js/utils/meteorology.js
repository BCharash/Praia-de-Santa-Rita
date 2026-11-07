/**
 * Meteorological decoding and conversion utilities.
 */

import { getMoonPhaseIcon } from './astronomy.js';
import { getTranslations } from '../i18n.js';

/**
 * Decodes WMO weather interpretation code into appropriate icon and localized description.
 * @param {number} code - WMO code
 * @param {number|boolean} isDay - 1/true if daylight, 0/false if night
 * @param {Date} dateObj - Date for moon phase calculation
 * @param {string} [lang] - Language code ('PT' | 'EN')
 * @returns {{ icon: string, text: string }}
 */
export function decodeWMO(code, isDay = 1, dateObj = new Date(), lang) {
  const moonIcon = `<span class="moon-icon">${getMoonPhaseIcon(dateObj)}</span>`;
  const w = getTranslations(lang).weather;
  const dayFlag = Boolean(isDay);

  if (code === 0) return { icon: dayFlag ? '☀️' : moonIcon, text: w.clear };
  if (code === 1 || code === 2) return { icon: dayFlag ? '🌤️' : moonIcon, text: w.partlyCloudy };
  if (code === 3) return { icon: '☁️', text: w.overcast };
  if (code >= 45 && code <= 48) return { icon: '🌫️', text: w.foggy };
  if (code >= 51 && code <= 55) return { icon: '🌦️', text: w.drizzle };
  if (code >= 61 && code <= 65) return { icon: '🌧️', text: w.rain };
  if (code >= 80 && code <= 82) return { icon: '🌦️', text: w.showers };
  if (code >= 95) return { icon: '🌩️', text: w.thunderstorm };
  return { icon: dayFlag ? '🌤️' : moonIcon, text: w.fair };
}

/**
 * Classifies UV Index into level description and badge colors.
 * @param {number} uv - UV index value
 * @param {string} [lang] - Language code ('PT' | 'EN')
 * @returns {{ text: string, bg: string, color: string }}
 */
export function getUVBadge(uv, lang) {
  const lvl = getTranslations(lang).uvLevels;
  const val = Number(uv) || 0;

  if (val <= 2) return { text: lvl.low, bg: '#38b000', color: '#fff' };
  if (val <= 5) return { text: lvl.mod, bg: '#ffb703', color: '#000' };
  if (val <= 7) return { text: lvl.high, bg: '#fb8500', color: '#fff' };
  if (val <= 10) return { text: lvl.vhigh, bg: '#d00000', color: '#fff' };
  return { text: lvl.extreme, bg: '#9d4edd', color: '#fff' };
}
