/**
 * DOM management: UI rendering, metrics cards, modals, and language application.
 */

import { getTranslations } from '../i18n.js';
import { decodeWMO, getUVBadge } from '../utils/meteorology.js';
import {
  convertTemperature,
  convertWindSpeed,
  convertHeight,
  getUnitSymbol,
  getUnitSettings
} from '../utils/units.js';

let activeAlertDetails = '';

export function setCompass(degrees) {
  const arrow = document.getElementById('compass-arrow');
  if (arrow) arrow.style.transform = `rotate(${degrees}deg)`;
}

export function applyLanguageUI(lang) {
  const t = getTranslations(lang);

  const langPt = document.getElementById('lang-pt');
  const langEn = document.getElementById('lang-en');
  if (langPt) langPt.classList.toggle('active', lang === 'PT');
  if (langEn) langEn.classList.toggle('active', lang === 'EN');

  const setEl = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setEl('app-title', t.appTitle);
  setEl('main-weather-sub', t.coastalConditions);
  setEl('lbl-uv-index', t.uvIndex);
  setEl('lbl-card-air', t.airTemp);
  setEl('lbl-card-wind', t.wind);
  setEl('lbl-card-sea', t.seaTemp);
  setEl('lbl-card-sea-sub', t.seaSub);
  setEl('lbl-card-surf', t.surfSwell);

  setEl('btn-past3d', t.past3d);
  setEl('btn-past1d', t.past1d);
  setEl('btn-today', t.today);
  setEl('btn-next3d', t.next3d);
  setEl('btn-next7d', t.next7d);

  setEl('title-chart1', t.chart1Title);
  setEl('title-chart2', t.chart2Title);
  setEl('modal-alert-title', t.ipmaTitle);
  setEl('alert-details-link', t.details);
  setEl('modal-close-btn', t.close);

  // Settings modal labels
  setEl('modal-settings-title', t.settingsTitle);
  setEl('settings-desc', t.settingsDesc);
  setEl('lbl-setting-temp', t.settingTemp);
  setEl('lbl-setting-wind', t.settingWind);
  setEl('lbl-setting-wave', t.settingWave);
  setEl('lbl-setting-tide', t.settingTide);
  setEl('settings-info-title', t.refUnitsTitle);
  setEl('lbl-ref-humidity', t.refHumidity);
  setEl('lbl-ref-uv', t.refUv);
  setEl('lbl-ref-period', t.refPeriod);
  setEl('lbl-ref-datum', t.refDatum);
  setEl('settings-close-btn', t.done);

  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.setAttribute('aria-label', t.settingsAria);
    settingsBtn.setAttribute('title', t.settingsAria);
  }
}

export function updateCurrentMetricsDisplay({
  weatherData,
  marineData,
  processedSeaTemps,
  currentHourIndex = 0,
  todayDailyIndex = 0,
  lang
}) {
  if (!weatherData?.hourly) return;
  const t = getTranslations(lang);
  const idx = currentHourIndex;
  const dailyIdx = todayDailyIndex;

  const now = new Date();
  const isDay = weatherData.hourly.is_day ? weatherData.hourly.is_day[idx] : 1;
  const wCode = weatherData.hourly.weather_code?.[idx] ?? 0;
  const wInfo = decodeWMO(wCode, isDay, now, lang);

  const mainIcon = document.getElementById('main-weather-icon');
  const mainText = document.getElementById('main-weather-text');
  if (mainIcon) mainIcon.innerHTML = wInfo.icon;
  if (mainText) mainText.textContent = wInfo.text;

  // Relative Humidity
  const humidity = weatherData.hourly.relative_humidity_2m?.[idx];
  const humEl = document.getElementById('main-humidity-val');
  if (humEl) {
    humEl.textContent = (humidity !== null && humidity !== undefined)
      ? `💧 ${t.humidity}: ${Math.round(humidity)}%`
      : '';
  }

  // UV Display: Peak & Current
  const todayMaxUV = weatherData.daily?.uv_index_max?.[dailyIdx] ?? 0;
  const currentUV = weatherData.hourly?.uv_index?.[idx] ?? 0;

  const uvMaxEl = document.getElementById('uv-index-max-val');
  const uvNowEl = document.getElementById('uv-index-now-val');
  if (uvMaxEl) uvMaxEl.textContent = `${Number(todayMaxUV).toFixed(1)} ${t.peak}`;
  if (uvNowEl) uvNowEl.textContent = `${t.now}: ${Number(currentUV).toFixed(1)}`;

  const uvInfo = getUVBadge(todayMaxUV, lang);
  const uvBadge = document.getElementById('uv-badge');
  if (uvBadge) {
    uvBadge.textContent = uvInfo.text;
    uvBadge.style.backgroundColor = uvInfo.bg;
    uvBadge.style.color = uvInfo.color;
  }

  // Air Temp with unit conversion
  const tempUnit = getUnitSymbol('temperature');
  const rawCurrentTemp = weatherData.hourly.temperature_2m?.[idx] ?? 0;
  const currentTemp = Math.round(convertTemperature(rawCurrentTemp));
  const rawMin = weatherData.daily?.temperature_2m_min?.[dailyIdx] ?? rawCurrentTemp;
  const minTemp = Math.round(convertTemperature(rawMin));
  const rawMax = weatherData.daily?.temperature_2m_max?.[dailyIdx] ?? rawCurrentTemp;
  const maxTemp = Math.round(convertTemperature(rawMax));

  const airTempEl = document.getElementById('air-temp');
  const airMinMaxEl = document.getElementById('air-min-max');
  if (airTempEl) airTempEl.textContent = `${currentTemp}${tempUnit}`;
  if (airMinMaxEl) airMinMaxEl.textContent = `Min: ${minTemp}° / Max: ${maxTemp}°`;

  // Wind with unit conversion
  const windUnit = getUnitSymbol('windSpeed');
  const rawWindSpd = weatherData.hourly.wind_speed_10m?.[idx] ?? 0;
  const windSpd = Math.round(convertWindSpeed(rawWindSpd));
  const rawGust = weatherData.hourly.wind_gusts_10m?.[idx] ?? 0;
  const windGust = Math.round(convertWindSpeed(rawGust));
  const windDir = weatherData.hourly.wind_direction_10m?.[idx] ?? 0;

  const windSpdEl = document.getElementById('wind-speed');
  const windGustEl = document.getElementById('wind-gusts');
  if (windSpdEl) windSpdEl.innerHTML = `${windSpd} <span style="font-size: 0.8rem;">${windUnit}</span>`;
  if (windGustEl) windGustEl.textContent = `${t.gusts}: ${windGust} ${windUnit}`;
  setCompass(windDir);

  // Sea Temp with unit conversion
  const rawSeaTemp = (processedSeaTemps && processedSeaTemps[idx] !== undefined)
    ? processedSeaTemps[idx]
    : 18.5;
  const convertedSeaTemp = convertTemperature(rawSeaTemp);
  const seaTempEl = document.getElementById('sea-temp');
  if (seaTempEl) seaTempEl.textContent = `${convertedSeaTemp.toFixed(1)}${tempUnit}`;

  // Surf Swell with unit conversion
  if (marineData?.hourly) {
    const waveUnit = getUnitSymbol('waveHeight');
    const rawWaveH = marineData.hourly.wave_height?.[idx] ?? 1.2;
    const waveH = convertHeight(rawWaveH);
    const waveP = marineData.hourly.wave_period?.[idx] ?? 8;
    const surfH = document.getElementById('surf-height');
    const surfP = document.getElementById('surf-period');
    if (surfH) surfH.textContent = `${Number(waveH).toFixed(1)} ${waveUnit}`;
    if (surfP) surfP.textContent = `${t.period}: ${Math.round(waveP)} s`;
  }
}

export function updateAlertBanner(warnings = [], lang = 'PT') {
  const banner = document.getElementById('alert-banner');
  const bannerText = document.getElementById('alert-banner-text');
  if (!banner || !bannerText) return;

  if (warnings.length === 0) {
    banner.classList.remove('visible');
    activeAlertDetails = '';
    return;
  }

  let highestLevel = 'yellow';
  if (warnings.some(w => w.awarenessLevelID === 'red')) highestLevel = 'red';
  else if (warnings.some(w => w.awarenessLevelID === 'orange')) highestLevel = 'orange';

  const summaryTitles = warnings.map(w => {
    const type = w.awarenessTypeName || w.title || 'Aviso';
    const level = w.awarenessLevelID ? w.awarenessLevelID.toUpperCase() : '';
    return `${type} (${level})`;
  });

  bannerText.textContent = `⚠️ IPMA Warning: ${summaryTitles.join(' | ')}`;
  banner.className = `alert-banner visible ${highestLevel}`;

  const details = warnings.map(w => {
    const start = w.startTime ? new Date(w.startTime).toLocaleString(lang === 'PT' ? 'pt-PT' : 'en-GB') : '';
    const end = w.endTime ? new Date(w.endTime).toLocaleString(lang === 'PT' ? 'pt-PT' : 'en-GB') : '';
    const text = w.text || w.awarenessTypeName || 'Aviso Meteorológico IPMA';
    return `• OFFICIAL IPMA ALERT (${w.awarenessLevelID?.toUpperCase()}): ${text}\n  Valid: ${start} to ${end}`;
  });

  activeAlertDetails = details.join('\n\n');
}

export function openAlertModal() {
  const modal = document.getElementById('alert-modal');
  const body = document.getElementById('modal-alert-body');
  if (modal && body) {
    body.textContent = activeAlertDetails || 'No additional details available.';
    modal.classList.add('visible');
  }
}

export function closeAlertModal() {
  const modal = document.getElementById('alert-modal');
  if (modal) modal.classList.remove('visible');
}

export function openSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (modal) {
    updateUnitToggleButtons(getUnitSettings());
    modal.classList.add('visible');
  }
}

export function closeSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (modal) modal.classList.remove('visible');
}

export function updateUnitToggleButtons(units = getUnitSettings()) {
  document.querySelectorAll('.unit-opt').forEach(btn => {
    const type = btn.dataset.unitType;
    const val = btn.dataset.unitVal;
    if (type && val) {
      btn.classList.toggle('active', units[type] === val);
    }
  });
}

export function setTimeFilterButtons(activeFilter) {
  document.querySelectorAll('.time-btn').forEach(btn => {
    const filter = btn.dataset.filter;
    btn.classList.toggle('active', filter === activeFilter);
  });
}
