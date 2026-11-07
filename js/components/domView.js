/**
 * DOM management: UI rendering, metrics cards, modals, and language application.
 */

import { getTranslations } from '../i18n.js';
import { decodeWMO, getUVBadge } from '../utils/meteorology.js';

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

  // Air Temp
  const currentTemp = Math.round(weatherData.hourly.temperature_2m?.[idx] ?? 0);
  const minTemp = Math.round(weatherData.daily?.temperature_2m_min?.[dailyIdx] ?? currentTemp);
  const maxTemp = Math.round(weatherData.daily?.temperature_2m_max?.[dailyIdx] ?? currentTemp);

  const airTempEl = document.getElementById('air-temp');
  const airMinMaxEl = document.getElementById('air-min-max');
  if (airTempEl) airTempEl.textContent = `${currentTemp}°C`;
  if (airMinMaxEl) airMinMaxEl.textContent = `Min: ${minTemp}° / Max: ${maxTemp}°`;

  // Wind
  const windSpd = Math.round(weatherData.hourly.wind_speed_10m?.[idx] ?? 0);
  const windGust = Math.round(weatherData.hourly.wind_gusts_10m?.[idx] ?? 0);
  const windDir = weatherData.hourly.wind_direction_10m?.[idx] ?? 0;

  const windSpdEl = document.getElementById('wind-speed');
  const windGustEl = document.getElementById('wind-gusts');
  if (windSpdEl) windSpdEl.innerHTML = `${windSpd} <span style="font-size: 0.8rem;">km/h</span>`;
  if (windGustEl) windGustEl.textContent = `${t.gusts}: ${windGust} km/h`;
  setCompass(windDir);

  // Sea Temp & Surf
  const seaTempVal = (processedSeaTemps && processedSeaTemps[idx] !== undefined)
    ? processedSeaTemps[idx].toFixed(1)
    : "18.5";
  const seaTempEl = document.getElementById('sea-temp');
  if (seaTempEl) seaTempEl.textContent = `${seaTempVal}°C`;

  if (marineData?.hourly) {
    const waveH = marineData.hourly.wave_height?.[idx] ?? 1.2;
    const waveP = marineData.hourly.wave_period?.[idx] ?? 8;
    const surfH = document.getElementById('surf-height');
    const surfP = document.getElementById('surf-period');
    if (surfH) surfH.textContent = `${Number(waveH).toFixed(1)} m`;
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

export function setTimeFilterButtons(activeFilter) {
  document.querySelectorAll('.time-btn').forEach(btn => {
    const filter = btn.dataset.filter;
    btn.classList.toggle('active', filter === activeFilter);
  });
}
