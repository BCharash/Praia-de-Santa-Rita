/**
 * Network fetching service for Open-Meteo and IPMA APIs.
 */

import { API_ENDPOINTS, BEACH_CONFIG } from '../config.js';

/**
 * Fetches both atmospheric and marine forecast data.
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{ weatherData: object, marineData: object }>}
 */
export async function fetchForecastData(lat = BEACH_CONFIG.lat, lng = BEACH_CONFIG.lng) {
  const weatherUrl = API_ENDPOINTS.weather(lat, lng);
  const marineUrl = API_ENDPOINTS.marine(lat, lng);

  const [wRes, mRes] = await Promise.all([
    fetch(weatherUrl),
    fetch(marineUrl)
  ]);

  if (!wRes.ok) {
    throw new Error(`Failed to load weather forecast: HTTP ${wRes.status}`);
  }
  if (!mRes.ok) {
    throw new Error(`Failed to load marine forecast: HTTP ${mRes.status}`);
  }

  const [weatherData, marineData] = await Promise.all([
    wRes.json(),
    mRes.json()
  ]);

  if (weatherData.error) {
    throw new Error(`Weather API error: ${weatherData.reason || 'Unknown'}`);
  }

  return { weatherData, marineData };
}

/**
 * Fetches official warnings from IPMA and filters for the target region.
 * @param {string} areaCode
 * @returns {Promise<Array<object>>}
 */
export async function fetchIPMAWarnings(areaCode = BEACH_CONFIG.ipmaAreaCode) {
  try {
    const res = await fetch(API_ENDPOINTS.ipmaWarnings);
    if (!res.ok) {
      console.warn(`IPMA returned HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      console.warn("Unexpected IPMA response shape:", data);
      return [];
    }

    // Filter active warnings for the region excluding normal ("green") level
    return data.filter(w =>
      w &&
      w.idAreaAviso === areaCode &&
      w.awarenessLevelID &&
      w.awarenessLevelID.toLowerCase() !== 'green'
    );
  } catch (err) {
    console.warn("Could not retrieve IPMA alerts:", err);
    return [];
  }
}
