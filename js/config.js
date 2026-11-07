/**
 * Configuration and constant definitions for Praias de Portugal.
 */

export const BEACH_CONFIG = {
  name: 'Praia de Santa Rita',
  lat: 39.172,
  lng: -9.362,
  timezone: 'Europe/Lisbon',
  ipmaAreaCode: 'LSB', // Lisbon District
  hydrographicZeroOffset: 2.08, // Chart Datum (ZH) offset in meters
  fallbackSeaTemp: 18.5 // °C default fallback when SST data has gaps
};

export const API_ENDPOINTS = {
  weather: (lat, lng) =>
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code,uv_index,is_day&daily=temperature_2m_max,temperature_2m_min,uv_index_max,wind_gusts_10m_max&timezone=auto&past_days=3&forecast_days=8`,
  marine: (lat, lng) =>
    `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&hourly=wave_height,wave_period,sea_surface_temperature,sea_level_height_msl&timezone=auto&past_days=3&forecast_days=8`,
  ipmaWarnings: 'https://api.ipma.pt/open-data/forecast/warnings/warnings_www.json'
};

export const TIME_FILTERS = {
  PAST_3D: 'past3d',
  PAST_1D: 'past1d',
  TODAY: 'today',
  NEXT_3D: 'next3d',
  NEXT_7D: 'next7d'
};
