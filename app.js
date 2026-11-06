const LAT = 39.172;
const LNG = -9.362;
const LISBON_IPMA_CODE = "LSB";
const HYDROGRAPHIC_ZERO_OFFSET = 2.08;

// --- BILINGUAL TRANSLATION DICTIONARY & LOCALSTORAGE ---
const translations = {
  PT: {
    appTitle: "Praias de Portugal",
    coastalConditions: "Condições Costeiras",
    humidity: "Humidade",
    uvIndex: "Índice UV",
    peak: "Pico",
    now: "Agora",
    airTemp: "Temp. Ar",
    wind: "Vento",
    gusts: "Rajadas",
    seaTemp: "Temp. Água",
    seaSub: "Superfície do Mar",
    surfSwell: "Vaga / Surf",
    period: "Período",
    past3d: "Últ. 3d",
    past1d: "Ontem",
    today: "Hoje",
    next3d: "Próx. 3d",
    next7d: "Próx. 7d",
    chart1Title: "Atmosfera e Vento",
    chart2Title: "Marés e Vaga",
    ipmaTitle: "Aviso Meteorológico Oficial IPMA",
    details: "Detalhes ›",
    close: "Fechar",
    uvLevels: { low: "Baixo", mod: "Moderado", high: "Elevado", vhigh: "Muito Elevado", extreme: "Extremo" },
    weather: { clear: "Céu Limpo", partlyCloudy: "Parcialmente Nublado", overcast: "Encoberto", foggy: "Névoa/Aviso", drizzle: "Chuvisco", rain: "Chuva", showers: "Aguaceiros", thunderstorm: "Trovoada", fair: "Bom Tempo" },
    legend: { airTemp: "Temp Ar (°C)", windSpd: "Vento (km/h)", gusts: "Rajadas (km/h)", waterTemp: "Temp Água (°C)", surfHeight: "Altura Vaga (m)", tide: "Maré (m ZH)" }
  },
  EN: {
    appTitle: "Praias de Portugal",
    coastalConditions: "Coastal Conditions",
    humidity: "Humidity",
    uvIndex: "UV Index",
    peak: "Peak",
    now: "Now",
    airTemp: "Air Temp",
    wind: "Wind",
    gusts: "Gusts",
    seaTemp: "Sea Temp",
    seaSub: "Surface Water",
    surfSwell: "Surf Swell",
    period: "Period",
    past3d: "Past 3d",
    past1d: "Past 1d",
    today: "Today",
    next3d: "Next 3d",
    next7d: "Next 7d",
    chart1Title: "Atmospheric & Wind",
    chart2Title: "Marine & Surf",
    ipmaTitle: "Official IPMA Advisory",
    details: "Details ›",
    close: "Close",
    uvLevels: { low: "Low", mod: "Moderate", high: "High", vhigh: "Very High", extreme: "Extreme" },
    weather: { clear: "Clear", partlyCloudy: "Partly Cloudy", overcast: "Overcast", foggy: "Foggy", drizzle: "Drizzle", rain: "Rain", showers: "Showers", thunderstorm: "Thunderstorm", fair: "Fair" },
    legend: { airTemp: "Air Temp (°C)", windSpd: "Wind Spd (km/h)", gusts: "Gusts (km/h)", waterTemp: "Water Temp (°C)", surfHeight: "Surf Height (m)", tide: "Tide (m ZH)" }
  }
};

let currentLang = localStorage.getItem('appLanguage') || 'PT';

let weatherData = null;
let marineData = null;
let processedSeaTemps = [];
let currentFilter = 'today';
let chart1Instance = null;
let chart2Instance = null;
let activeAlertMessage = "";

function toggleLanguage() {
  currentLang = currentLang === 'PT' ? 'EN' : 'PT';
  localStorage.setItem('appLanguage', currentLang);
  applyLanguageUI();
  if (weatherData) {
    updateCurrentMetrics();
    renderCharts();
  }
}

function applyLanguageUI() {
  const t = translations[currentLang];
  document.getElementById('lang-pt').classList.toggle('active', currentLang === 'PT');
  document.getElementById('lang-en').classList.toggle('active', currentLang === 'EN');

  document.getElementById('app-title').textContent = t.appTitle;
  document.getElementById('main-weather-sub').textContent = t.coastalConditions;
  document.getElementById('lbl-uv-index').textContent = t.uvIndex;
  document.getElementById('lbl-card-air').textContent = t.airTemp;
  document.getElementById('lbl-card-wind').textContent = t.wind;
  document.getElementById('lbl-card-sea').textContent = t.seaTemp;
  document.getElementById('lbl-card-sea-sub').textContent = t.seaSub;
  document.getElementById('lbl-card-surf').textContent = t.surfSwell;

  document.getElementById('btn-past3d').textContent = t.past3d;
  document.getElementById('btn-past1d').textContent = t.past1d;
  document.getElementById('btn-today').textContent = t.today;
  document.getElementById('btn-next3d').textContent = t.next3d;
  document.getElementById('btn-next7d').textContent = t.next7d;

  document.getElementById('title-chart1').textContent = t.chart1Title;
  document.getElementById('title-chart2').textContent = t.chart2Title;
  document.getElementById('modal-alert-title').textContent = t.ipmaTitle;
  document.getElementById('alert-details-link').textContent = t.details;
  document.getElementById('modal-close-btn').textContent = t.close;
}

// Astronomical Moon Phase Calculation
function getMoonPhaseIcon(date) {
  const synodic = 29.53058770576;
  const knownNewMoon = new Date('2000-01-06T18:14:00Z').getTime();
  const diffDays = (date.getTime() - knownNewMoon) / (1000 * 60 * 60 * 24);
  const phase = (diffDays % synodic + synodic) % synodic;

  if (phase < 1.84 || phase >= 27.69) return '🌑';
  if (phase < 5.53) return '🌒';
  if (phase < 9.22) return '🌓';
  if (phase < 12.91) return '🌔';
  if (phase < 16.61) return '🌕';
  if (phase < 20.30) return '🌖';
  if (phase < 24.00) return '🌗';
  return '🌘';
}

// Decodes WMO weather code taking into consideration day vs. night and moon phase
function decodeWMO(code, isDay = 1, dateObj = new Date()) {
  const moonIcon = `<span class="moon-icon">${getMoonPhaseIcon(dateObj)}</span>`;
  const w = translations[currentLang].weather;
  
  if (code === 0) return { icon: isDay ? '☀️' : moonIcon, text: w.clear };
  if (code === 1 || code === 2) return { icon: isDay ? '🌤️' : moonIcon, text: w.partlyCloudy };
  if (code === 3) return { icon: '☁️', text: w.overcast };
  if (code >= 45 && code <= 48) return { icon: '🌫️', text: w.foggy };
  if (code >= 51 && code <= 55) return { icon: '🌦️', text: w.drizzle };
  if (code >= 61 && code <= 65) return { icon: '🌧️', text: w.rain };
  if (code >= 80 && code <= 82) return { icon: '🌦️', text: w.showers };
  if (code >= 95) return { icon: '🌩️', text: w.thunderstorm };
  return { icon: isDay ? '🌤️' : moonIcon, text: w.fair };
}

function getUVBadge(uv) {
  const lvl = translations[currentLang].uvLevels;
  if (uv <= 2) return { text: lvl.low, bg: '#38b000', color: '#fff' };
  if (uv <= 5) return { text: lvl.mod, bg: '#ffb703', color: '#000' };
  if (uv <= 7) return { text: lvl.high, bg: '#fb8500', color: '#fff' };
  if (uv <= 10) return { text: lvl.vhigh, bg: '#d00000', color: '#fff' };
  return { text: lvl.extreme, bg: '#9d4edd', color: '#fff' };
}

function setCompass(degrees) {
  const arrow = document.getElementById('compass-arrow');
  if (arrow) arrow.style.transform = `rotate(${degrees}deg)`;
}

async function loadData() {
  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code,uv_index,is_day&daily=temperature_2m_max,temperature_2m_min,uv_index_max,wind_gusts_10m_max&timezone=auto&past_days=3&forecast_days=8`;
    const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${LAT}&longitude=${LNG}&hourly=wave_height,wave_period,sea_surface_temperature,sea_level_height_msl&timezone=auto&past_days=3&forecast_days=8`;

    const [wRes, mRes] = await Promise.all([fetch(weatherUrl), fetch(marineUrl)]);
    weatherData = await wRes.json();
    marineData = await mRes.json();

    processWaterTemperatures();
    updateCurrentMetrics();
    fetchIPMAAlerts();
    renderCharts();
  } catch (err) {
    console.error("Error fetching marine/weather data:", err);
  }
}

function processWaterTemperatures() {
  if (!marineData || !marineData.hourly) return;
  const rawTemps = marineData.hourly.sea_surface_temperature || [];
  processedSeaTemps = new Array(rawTemps.length);

  let lastValid = 18.5;
  for (let i = 0; i < rawTemps.length; i++) {
    if (rawTemps[i] !== null && rawTemps[i] !== undefined && rawTemps[i] > 0) {
      lastValid = rawTemps[i];
    }
    processedSeaTemps[i] = lastValid;
  }
  for (let i = rawTemps.length - 1; i >= 0; i--) {
    if (rawTemps[i] !== null && rawTemps[i] !== undefined && rawTemps[i] > 0) {
      lastValid = rawTemps[i];
    }
    if (processedSeaTemps[i] === 18.5) {
      processedSeaTemps[i] = lastValid;
    }
  }
}

// Fetches official warnings directly from IPMA Open Data API
async function fetchIPMAAlerts() {
  try {
    const ipmaUrl = 'https://api.ipma.pt/open-data/forecast/warnings/warnings_www.json';
    const res = await fetch(ipmaUrl);
    const warnings = await res.json();

    // Filter active warnings for District of Lisbon (LSB)
    const activeLisbonWarnings = warnings.filter(w => 
      w.idAreaAviso === LISBON_IPMA_CODE && 
      w.awarenessLevelID !== 'green'
    );

    const banner = document.getElementById('alert-banner');
    const bannerText = document.getElementById('alert-banner-text');

    if (activeLisbonWarnings.length === 0) {
      banner.classList.remove('visible');
      return;
    }

    let highestLevel = 'yellow';
    if (activeLisbonWarnings.some(w => w.awarenessLevelID === 'red')) highestLevel = 'red';
    else if (activeLisbonWarnings.some(w => w.awarenessLevelID === 'orange')) highestLevel = 'orange';

    const summaryTitles = activeLisbonWarnings.map(w => {
      const type = w.awarenessTypeName || w.title || 'Aviso';
      const level = w.awarenessLevelID ? w.awarenessLevelID.toUpperCase() : '';
      return `${type} (${level})`;
    });

    bannerText.textContent = `⚠️ IPMA Warning: ${summaryTitles.join(' | ')}`;
    banner.className = 'alert-banner visible ' + highestLevel;

    const details = activeLisbonWarnings.map(w => {
      const start = w.startTime ? new Date(w.startTime).toLocaleString(currentLang === 'PT' ? 'pt-PT' : 'en-GB') : '';
      const end = w.endTime ? new Date(w.endTime).toLocaleString(currentLang === 'PT' ? 'pt-PT' : 'en-GB') : '';
      const text = w.text || w.awarenessTypeName || 'Aviso Meteorológico IPMA';
      return `• OFFICIAL IPMA ALERT (${w.awarenessLevelID?.toUpperCase()}): ${text}\n  Valid: ${start} to ${end}`;
    });

    activeAlertMessage = details.join('\n\n');

  } catch (err) {
    console.warn("Could not retrieve IPMA alerts:", err);
  }
}

function openAlertModal() {
  document.getElementById('modal-alert-body').textContent = activeAlertMessage;
  document.getElementById('alert-modal').classList.add('visible');
}

function closeAlertModal() {
  document.getElementById('alert-modal').classList.remove('visible');
}

function updateCurrentMetrics() {
  if (!weatherData || !weatherData.hourly) return;
  const t = translations[currentLang];

  const now = new Date();
  const currentHourStr = now.toISOString().slice(0, 13) + ":00";
  let idx = weatherData.hourly.time.findIndex(t => t.startsWith(currentHourStr));
  if (idx === -1) idx = 72;

  const isDay = weatherData.hourly.is_day ? weatherData.hourly.is_day[idx] : 1;
  const wCode = weatherData.hourly.weather_code[idx] ?? 0;
  const wInfo = decodeWMO(wCode, isDay, now);
  document.getElementById('main-weather-icon').innerHTML = wInfo.icon;
  document.getElementById('main-weather-text').textContent = wInfo.text;

  // Relative Humidity
  const humidity = weatherData.hourly.relative_humidity_2m ? weatherData.hourly.relative_humidity_2m[idx] : null;
  document.getElementById('main-humidity-val').textContent = humidity !== null ? `💧 ${t.humidity}: ${Math.round(humidity)}%` : '';

  // UV Display: Peak & Current
  const todayMaxUV = weatherData.daily.uv_index_max ? weatherData.daily.uv_index_max[3] : 0;
  const currentUV = weatherData.hourly.uv_index ? weatherData.hourly.uv_index[idx] : 0;

  document.getElementById('uv-index-max-val').textContent = `${todayMaxUV.toFixed(1)} ${t.peak}`;
  document.getElementById('uv-index-now-val').textContent = `${t.now}: ${currentUV.toFixed(1)}`;

  const uvInfo = getUVBadge(todayMaxUV);
  const uvBadge = document.getElementById('uv-badge');
  uvBadge.textContent = uvInfo.text;
  uvBadge.style.backgroundColor = uvInfo.bg;
  uvBadge.style.color = uvInfo.color;

  // Air Temp
  const currentTemp = Math.round(weatherData.hourly.temperature_2m[idx]);
  const minTemp = Math.round(weatherData.daily.temperature_2m_min[3]);
  const maxTemp = Math.round(weatherData.daily.temperature_2m_max[3]);
  document.getElementById('air-temp').textContent = `${currentTemp}°C`;
  document.getElementById('air-min-max').textContent = `Min: ${minTemp}°C / Max: ${maxTemp}°C`;

  // Wind
  const windSpd = Math.round(weatherData.hourly.wind_speed_10m[idx]);
  const windGust = Math.round(weatherData.hourly.wind_gusts_10m[idx]);
  const windDir = weatherData.hourly.wind_direction_10m[idx];
  document.getElementById('wind-speed').innerHTML = `${windSpd} <span style="font-size: 0.8rem;">km/h</span>`;
  document.getElementById('wind-gusts').textContent = `${t.gusts}: ${windGust} km/h`;
  setCompass(windDir);

  // Sea Temp & Surf
  const seaTempVal = processedSeaTemps[idx] ? processedSeaTemps[idx].toFixed(1) : "18.5";
  document.getElementById('sea-temp').textContent = `${seaTempVal}°C`;

  if (marineData && marineData.hourly) {
    const waveH = marineData.hourly.wave_height[idx] || 1.2;
    const waveP = marineData.hourly.wave_period[idx] || 8;
    document.getElementById('surf-height').textContent = `${waveH.toFixed(1)} m`;
    document.getElementById('surf-period').textContent = `${t.period}: ${Math.round(waveP)} s`;
  }
}

function getTimeSliceIndices() {
  if (currentFilter === 'past3d') return { start: 0, end: 72 };
  if (currentFilter === 'past1d') return { start: 48, end: 72 };
  if (currentFilter === 'today') return { start: 72, end: 96 };
  if (currentFilter === 'next3d') return { start: 96, end: 168 };
  if (currentFilter === 'next7d') return { start: 96, end: 264 };
  return { start: 72, end: 96 };
}

function setTimeFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.time-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('onclick').includes(filter));
  });
  renderCharts();
}

function updateWeatherStripAlignment(stepIndices, dates, codes, isDayList, windDirs) {
  const strip = document.getElementById('weather-icon-strip');
  strip.innerHTML = '';
  if (!chart1Instance || !chart1Instance.chartArea) return;

  const chartArea = chart1Instance.chartArea;
  const chartWidth = chart1Instance.width;

  strip.style.paddingLeft = `${chartArea.left}px`;
  strip.style.paddingRight = `${chartWidth - chartArea.right}px`;

  const showMultiDay = ['past3d', 'next3d', 'next7d'].includes(currentFilter);

  stepIndices.forEach((dataIndex) => {
    const d = new Date(dates[dataIndex]);
    const timeLabel = showMultiDay ? `${d.getDate()}/${d.getMonth()+1}` : `${d.getHours()}h`;
    
    const isDayVal = showMultiDay ? 1 : isDayList[dataIndex];
    const info = decodeWMO(codes[dataIndex], isDayVal, d);
    const windDeg = windDirs[dataIndex] ?? 0;

    const item = document.createElement('div');
    item.className = 'weather-strip-item';
    item.style.flex = "1";
    item.innerHTML = `
      <span>${timeLabel}</span>
      <span class="icon">${info.icon}</span>
      <span class="wind-arrow-inline" style="transform: rotate(${windDeg}deg);" title="${windDeg}°">↑</span>
    `;
    strip.appendChild(item);
  });
}

const verticalCrosshairPlugin = {
  id: 'verticalCrosshair',
  afterDraw: (chart) => {
    if (chart.tooltip?._active?.length) {
      const activePoint = chart.tooltip._active[0];
      const ctx = chart.ctx;
      const x = activePoint.element.x;
      const topY = chart.chartArea.top;
      const bottomY = chart.chartArea.bottom;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, topY);
      ctx.lineTo(x, bottomY);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(72, 202, 228, 0.7)';
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.restore();
    }
  }
};

function handleExternalTooltip(context) {
  const tooltipEl = document.getElementById('custom-tooltip');
  const { chart, tooltip } = context;

  if (tooltip.opacity === 0) {
    tooltipEl.classList.remove('visible');
    return;
  }

  if (tooltip.body) {
    const titleLines = tooltip.title || [];
    const bodyLines = tooltip.body.map(b => b.lines);

    let innerHtml = `<div style="font-weight: 700; margin-bottom: 4px; color: var(--accent-blue);">${titleLines[0] || ''}</div>`;
    bodyLines.forEach((body, i) => {
      const colors = tooltip.labelColors[i];
      const style = `background:${colors.borderColor}; width:8px; height:8px; display:inline-block; border-radius:2px; margin-right:6px;`;
      innerHtml += `<div style="display:flex; align-items:center; margin-top:2px;"><span style="${style}"></span>${body}</div>`;
    });

    tooltipEl.innerHTML = innerHtml;
  }

  const rect = chart.canvas.getBoundingClientRect();
  const tooltipWidth = tooltipEl.offsetWidth || 150;
  const tooltipHeight = tooltipEl.offsetHeight || 80;

  let left = rect.left + tooltip.caretX + 12;
  let top = rect.top + tooltip.caretY - (tooltipHeight / 2);

  if (left + tooltipWidth > window.innerWidth - 10) {
    left = rect.left + tooltip.caretX - tooltipWidth - 12;
  }
  if (top + tooltipHeight > window.innerHeight - 10) {
    top = window.innerHeight - tooltipHeight - 10;
  }
  if (top < 10) top = 10;

  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${top}px`;
  tooltipEl.classList.add('visible');
}

function hideTooltip() {
  const tooltipEl = document.getElementById('custom-tooltip');
  if (tooltipEl) {
    tooltipEl.classList.remove('visible');
  }
  if (chart1Instance) {
    chart1Instance.setActiveElements([]);
    chart1Instance.draw();
  }
  if (chart2Instance) {
    chart2Instance.setActiveElements([]);
    chart2Instance.draw();
  }
}

function renderCustomLegend(chart, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  chart.data.datasets.forEach((dataset, i) => {
    const item = document.createElement('div');
    item.className = 'legend-item active';

    const box = document.createElement('div');
    box.className = 'legend-checkbox';
    box.style.borderColor = dataset.borderColor;
    box.style.backgroundColor = dataset.borderColor;

    const label = document.createElement('span');
    label.textContent = dataset.label;

    item.appendChild(box);
    item.appendChild(label);

    item.onclick = () => {
      const isVisible = chart.isDatasetVisible(i);
      chart.setDatasetVisibility(i, !isVisible);
      chart.update();

      item.classList.toggle('active', !isVisible);
      box.style.backgroundColor = !isVisible ? dataset.borderColor : 'transparent';
    };

    container.appendChild(item);
  });
}

function renderCharts() {
  if (!weatherData) return;

  const { start, end } = getTimeSliceIndices();
  const showMultiDayLabels = ['past3d', 'next3d', 'next7d'].includes(currentFilter);
  const l = translations[currentLang].legend;

  const times = weatherData.hourly.time.slice(start, end);
  const airTemps = weatherData.hourly.temperature_2m.slice(start, end);
  const windSpeeds = weatherData.hourly.wind_speed_10m.slice(start, end);
  const windGusts = weatherData.hourly.wind_gusts_10m.slice(start, end);
  const windDirections = weatherData.hourly.wind_direction_10m ? weatherData.hourly.wind_direction_10m.slice(start, end) : Array(end-start).fill(0);
  const weatherCodes = weatherData.hourly.weather_code.slice(start, end);
  const isDayList = weatherData.hourly.is_day ? weatherData.hourly.is_day.slice(start, end) : Array(end-start).fill(1);

  const waveHeights = marineData?.hourly?.wave_height?.slice(start, end) || Array(end-start).fill(1.2);
  const seaTemps = processedSeaTemps.slice(start, end);
  const rawTides = marineData?.hourly?.sea_level_height_msl?.slice(start, end) || Array(end-start).fill(0);
  const tides = rawTides.map(val => parseFloat((val + HYDROGRAPHIC_ZERO_OFFSET).toFixed(2)));

  const timeLabels = times.map(t => {
    const d = new Date(t);
    return showMultiDayLabels 
      ? `${d.getHours()}:00 (${d.getDate()}/${d.getMonth()+1})`
      : `${d.getHours()}:00`;
  });

  if (chart1Instance) chart1Instance.destroy();
  if (chart2Instance) chart2Instance.destroy();

  // Chart 1: Atmospheric & Wind
  chart1Instance = new Chart(document.getElementById('chart1'), {
    type: 'line',
    data: {
      labels: timeLabels,
      datasets: [
        { label: l.airTemp, data: airTemps, borderColor: '#ffb703', tension: 0.3, yAxisID: 'y1' },
        { label: l.windSpd, data: windSpeeds, borderColor: '#00b4d8', tension: 0.3, yAxisID: 'y2' },
        { label: l.gusts, data: windGusts, borderColor: '#f72585', borderDash: [3, 3], tension: 0.3, yAxisID: 'y2' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      events: ['mousemove', 'mouseout', 'touchstart', 'touchmove'],
      interaction: { mode: 'index', intersect: false },
      elements: { point: { radius: 0 } },
      scales: {
        x: { 
          grid: { display: false }, 
          ticks: { 
            color: '#a0aab2', 
            font: { size: 10 },
            maxTicksLimit: showMultiDayLabels ? 8 : 12
          } 
        },
        y1: { 
          type: 'linear', 
          position: 'left', 
          grid: { color: '#2a3a5e' }, 
          ticks: { color: '#ffb703', font: { size: 10 } },
          title: { display: true, text: '°C', color: '#ffb703', font: { size: 10 } }
        },
        y2: { 
          type: 'linear', 
          position: 'right', 
          grid: { display: false }, 
          ticks: { color: '#00b4d8', font: { size: 10 } },
          title: { display: true, text: 'km/h', color: '#00b4d8', font: { size: 10 } }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false, external: handleExternalTooltip }
      }
    },
    plugins: [verticalCrosshairPlugin]
  });

  // Chart 2: Marine & Surf
  chart2Instance = new Chart(document.getElementById('chart2'), {
    type: 'line',
    data: {
      labels: timeLabels,
      datasets: [
        { label: l.waterTemp, data: seaTemps, borderColor: '#4cc9f0', tension: 0.3, yAxisID: 'y1' },
        { label: l.surfHeight, data: waveHeights, borderColor: '#f72585', borderWidth: 2.5, tension: 0.3, yAxisID: 'y2' },
        { label: l.tide, data: tides, borderColor: '#4895ef', borderDash: [2, 2], tension: 0.4, yAxisID: 'y2' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      events: ['mousemove', 'mouseout', 'touchstart', 'touchmove'],
      interaction: { mode: 'index', intersect: false },
      elements: { point: { radius: 0 } },
      scales: {
        x: { 
          grid: { display: false }, 
          ticks: { 
            color: '#a0aab2', 
            font: { size: 10 },
            maxTicksLimit: showMultiDayLabels ? 8 : 12
          } 
        },
        y1: { 
          type: 'linear', 
          position: 'left', 
          grid: { color: '#2a3a5e' }, 
          ticks: { color: '#4cc9f0', font: { size: 10 } },
          title: { display: true, text: '°C', color: '#4cc9f0', font: { size: 10 } }
        },
        y2: { 
          type: 'linear', 
          position: 'right', 
          grid: { display: false }, 
          ticks: { color: '#f72585', font: { size: 10 } },
          title: { display: true, text: 'm', color: '#f72585', font: { size: 10 } }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false, external: handleExternalTooltip }
      }
    },
    plugins: [verticalCrosshairPlugin]
  });

  renderCustomLegend(chart1Instance, 'legend-chart1');
  renderCustomLegend(chart2Instance, 'legend-chart2');

  // Align Weather Strip Icons and Wind Arrows
  const totalPoints = times.length;
  const step = showMultiDayLabels ? Math.floor(totalPoints / 7) : Math.floor(totalPoints / 8);
  const stepIndices = [];
  for (let i = 0; i < totalPoints; i += Math.max(1, step)) {
    stepIndices.push(i);
  }

  setTimeout(() => {
    updateWeatherStripAlignment(stepIndices, times, weatherCodes, isDayList, windDirections);
  }, 50);
}

document.addEventListener('pointerdown', (e) => {
  const isChartTouch = e.target.tagName === 'CANVAS';
  if (!isChartTouch) {
    hideTooltip();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  applyLanguageUI();
  loadData();
});
