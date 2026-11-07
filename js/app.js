/**
 * Main application orchestrator for Praias de Portugal.
 */

import { BEACH_CONFIG, TIME_FILTERS } from './config.js';
import { getCurrentLanguage, toggleLanguage } from './i18n.js';
import { fetchForecastData, fetchIPMAWarnings } from './services/weatherApi.js';
import {
  processWaterTemperatures,
  getCurrentHourIndex,
  getTodayDailyIndex,
  getTimeSliceIndices
} from './services/dataProcessor.js';
import { updateCharts, hideTooltip } from './components/charts.js';
import {
  applyLanguageUI,
  updateCurrentMetricsDisplay,
  updateAlertBanner,
  openAlertModal,
  closeAlertModal,
  setTimeFilterButtons
} from './components/domView.js';

// Application state
let currentFilter = TIME_FILTERS.TODAY;
let weatherData = null;
let marineData = null;
let processedSeaTemps = [];
let activeWarnings = [];

/**
 * Renders or updates the charts according to current filter and language.
 */
function renderCurrentCharts() {
  if (!weatherData?.hourly) return;

  const times = weatherData.hourly.time;
  const { start, end } = getTimeSliceIndices(times, currentFilter, BEACH_CONFIG.timezone);
  const lang = getCurrentLanguage();

  const sliceTimes = times.slice(start, end);
  const airTemps = weatherData.hourly.temperature_2m.slice(start, end);
  const windSpeeds = weatherData.hourly.wind_speed_10m.slice(start, end);
  const windGusts = weatherData.hourly.wind_gusts_10m.slice(start, end);
  const windDirections = weatherData.hourly.wind_direction_10m
    ? weatherData.hourly.wind_direction_10m.slice(start, end)
    : Array(end - start).fill(0);
  const weatherCodes = weatherData.hourly.weather_code.slice(start, end);
  const isDayList = weatherData.hourly.is_day
    ? weatherData.hourly.is_day.slice(start, end)
    : Array(end - start).fill(1);

  const waveHeights = marineData?.hourly?.wave_height?.slice(start, end) || Array(end - start).fill(1.2);
  const seaTemps = processedSeaTemps.slice(start, end);
  const rawTides = marineData?.hourly?.sea_level_height_msl?.slice(start, end) || Array(end - start).fill(0);
  const tides = rawTides.map(val => parseFloat((val + BEACH_CONFIG.hydrographicZeroOffset).toFixed(2)));

  updateCharts({
    times: sliceTimes,
    airTemps,
    windSpeeds,
    windGusts,
    windDirections,
    weatherCodes,
    isDayList,
    waveHeights,
    seaTemps,
    tides,
    currentFilter,
    lang
  });
}

/**
 * Updates current metrics card based on accurate local timezone hour.
 */
function renderCurrentMetrics() {
  if (!weatherData?.hourly) return;

  const currentHourIndex = getCurrentHourIndex(weatherData.hourly.time, BEACH_CONFIG.timezone);
  const todayDailyIndex = getTodayDailyIndex(weatherData.daily?.time || [], BEACH_CONFIG.timezone);

  updateCurrentMetricsDisplay({
    weatherData,
    marineData,
    processedSeaTemps,
    currentHourIndex,
    todayDailyIndex,
    lang: getCurrentLanguage()
  });
}

/**
 * Loads forecast and IPMA warning data.
 */
async function loadData() {
  try {
    const data = await fetchForecastData(BEACH_CONFIG.lat, BEACH_CONFIG.lng);
    weatherData = data.weatherData;
    marineData = data.marineData;

    processedSeaTemps = processWaterTemperatures(
      marineData?.hourly?.sea_surface_temperature,
      BEACH_CONFIG.fallbackSeaTemp
    );

    renderCurrentMetrics();
    renderCurrentCharts();

    // Fetch IPMA alerts asynchronously
    fetchIPMAWarnings(BEACH_CONFIG.ipmaAreaCode).then(warnings => {
      activeWarnings = warnings;
      updateAlertBanner(activeWarnings, getCurrentLanguage());
    });

  } catch (err) {
    console.error("Failed to load forecast data:", err);
    const mainText = document.getElementById('main-weather-text');
    if (mainText) {
      mainText.textContent = "Unable to load weather data";
    }
  }
}

/**
 * Handles language toggle button.
 */
function handleLanguageToggle() {
  const newLang = toggleLanguage();
  applyLanguageUI(newLang);
  renderCurrentMetrics();
  renderCurrentCharts();
  updateAlertBanner(activeWarnings, newLang);
}

/**
 * Handles time filter selection.
 */
function handleTimeFilter(filter) {
  if (currentFilter === filter) return;
  currentFilter = filter;
  setTimeFilterButtons(currentFilter);
  renderCurrentCharts();
}

/**
 * Attaches unobtrusive DOM event listeners.
 */
function initEventListeners() {
  // Language toggle
  const langToggleBtn = document.querySelector('.lang-toggle');
  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', handleLanguageToggle);
  }

  // Time filter buttons
  document.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      if (filter) handleTimeFilter(filter);
    });
  });

  // Alert modal open/close
  const alertBanner = document.getElementById('alert-banner');
  if (alertBanner) {
    alertBanner.addEventListener('click', openAlertModal);
    alertBanner.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openAlertModal();
      }
    });
  }

  const modalCloseBtn = document.getElementById('modal-close-btn');
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeAlertModal);
  }

  const modalOverlay = document.getElementById('alert-modal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeAlertModal();
    });
  }

  // Keyboard accessibility: Close modal on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAlertModal();
  });

  // Tooltip dismiss on pointer down outside canvas
  document.addEventListener('pointerdown', (e) => {
    const isChartTouch = e.target.tagName === 'CANVAS';
    if (!isChartTouch) {
      hideTooltip();
    }
  });
}

// Lifecycle boot
document.addEventListener('DOMContentLoaded', () => {
  const initialLang = getCurrentLanguage();
  applyLanguageUI(initialLang);
  setTimeFilterButtons(currentFilter);
  initEventListeners();
  loadData();
});
