/**
 * Unit configuration, conversions, and persistence for Praias de Portugal.
 */

const STORAGE_KEY = 'appUnitsSettings';

export const UNIT_TYPES = {
  TEMPERATURE: 'temperature',
  WIND_SPEED: 'windSpeed',
  WAVE_HEIGHT: 'waveHeight',
  TIDE_HEIGHT: 'tideHeight'
};

export const DEFAULT_UNITS = {
  temperature: 'C',    // 'C' | 'F'
  windSpeed: 'kmh',    // 'kmh' | 'kt' | 'mph' | 'ms'
  waveHeight: 'm',     // 'm' | 'ft'
  tideHeight: 'm'      // 'm' | 'ft'
};

export const UNIT_SYMBOLS = {
  temperature: {
    C: '°C',
    F: '°F'
  },
  windSpeed: {
    kmh: 'km/h',
    kt: 'kt',
    mph: 'mph',
    ms: 'm/s'
  },
  waveHeight: {
    m: 'm',
    ft: 'ft'
  },
  tideHeight: {
    m: 'm',
    ft: 'ft'
  }
};

/**
 * Loads current unit settings from localStorage, merging with defaults.
 * @returns {typeof DEFAULT_UNITS}
 */
export function getUnitSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_UNITS, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.warn("Could not read unit settings from localStorage:", err);
  }
  return { ...DEFAULT_UNITS };
}

/**
 * Updates a specific unit setting and persists it.
 * @param {'temperature'|'windSpeed'|'waveHeight'|'tideHeight'} type
 * @param {string} value
 * @returns {typeof DEFAULT_UNITS}
 */
export function setUnitSetting(type, value) {
  const current = getUnitSettings();
  if (current[type] !== undefined) {
    current[type] = value;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch (err) {
      console.warn("Could not save unit settings to localStorage:", err);
    }
  }
  return current;
}

/**
 * Returns the display symbol for a unit type and value.
 * @param {'temperature'|'windSpeed'|'waveHeight'|'tideHeight'} type
 * @param {string} [value]
 * @returns {string}
 */
export function getUnitSymbol(type, value) {
  const units = getUnitSettings();
  const val = value || units[type];
  return UNIT_SYMBOLS[type]?.[val] || '';
}

/**
 * Converts Celsius to target unit.
 * @param {number} celsius
 * @param {'C'|'F'} [targetUnit]
 * @returns {number}
 */
export function convertTemperature(celsius, targetUnit) {
  if (celsius === null || celsius === undefined || isNaN(celsius)) return 0;
  const unit = targetUnit || getUnitSettings().temperature;
  if (unit === 'F') {
    return (celsius * 9) / 5 + 32;
  }
  return celsius;
}

/**
 * Converts km/h to target wind speed unit.
 * @param {number} kmh
 * @param {'kmh'|'kt'|'mph'|'ms'} [targetUnit]
 * @returns {number}
 */
export function convertWindSpeed(kmh, targetUnit) {
  if (kmh === null || kmh === undefined || isNaN(kmh)) return 0;
  const unit = targetUnit || getUnitSettings().windSpeed;
  switch (unit) {
    case 'kt':
      return kmh * 0.539957;
    case 'mph':
      return kmh * 0.621371;
    case 'ms':
      return kmh / 3.6;
    case 'kmh':
    default:
      return kmh;
  }
}

/**
 * Converts meters to target height unit (meters or feet).
 * @param {number} meters
 * @param {'m'|'ft'} [targetUnit]
 * @returns {number}
 */
export function convertHeight(meters, targetUnit) {
  if (meters === null || meters === undefined || isNaN(meters)) return 0;
  const unit = targetUnit || getUnitSettings().waveHeight;
  if (unit === 'ft') {
    return meters * 3.28084;
  }
  return meters;
}
