/**
 * Chart.js manager for atmospheric and marine visualizations.
 */

import { getTranslations } from '../i18n.js';
import { decodeWMO } from '../utils/meteorology.js';
import { TIME_FILTERS, BEACH_CONFIG } from '../config.js';

let chart1Instance = null;
let chart2Instance = null;
let lastStripData = null;

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
  if (!tooltipEl) return;

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
      const colors = tooltip.labelColors[i] || { borderColor: '#48cae4' };
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

export function hideTooltip() {
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
  if (!container) return;
  container.innerHTML = '';

  chart.data.datasets.forEach((dataset, i) => {
    const item = document.createElement('div');
    const isVisible = chart.isDatasetVisible(i);
    item.className = `legend-item ${isVisible ? 'active' : ''}`;

    const box = document.createElement('div');
    box.className = 'legend-checkbox';
    box.style.borderColor = dataset.borderColor;
    box.style.backgroundColor = isVisible ? dataset.borderColor : 'transparent';

    const label = document.createElement('span');
    label.textContent = dataset.label;

    item.appendChild(box);
    item.appendChild(label);

    item.onclick = () => {
      const nextVisible = !chart.isDatasetVisible(i);
      chart.setDatasetVisibility(i, nextVisible);
      chart.update();

      item.classList.toggle('active', nextVisible);
      box.style.backgroundColor = nextVisible ? dataset.borderColor : 'transparent';
    };

    container.appendChild(item);
  });
}

export function alignWeatherStripPadding() {
  const strip = document.getElementById('weather-icon-strip');
  if (!strip || !chart1Instance || !chart1Instance.chartArea) return;

  const chartArea = chart1Instance.chartArea;
  const chartWidth = chart1Instance.width;

  strip.style.paddingLeft = `${chartArea.left}px`;
  strip.style.paddingRight = `${chartWidth - chartArea.right}px`;
}

function updateWeatherStrip(stepIndices, dates, codes, isDayList, windDirs, currentFilter, lang) {
  const strip = document.getElementById('weather-icon-strip');
  if (!strip) return;
  strip.innerHTML = '';

  alignWeatherStripPadding();

  const isMultiDay = [TIME_FILTERS.PAST_3D, TIME_FILTERS.NEXT_3D, TIME_FILTERS.NEXT_7D].includes(currentFilter);

  stepIndices.forEach((dataIndex) => {
    const d = new Date(dates[dataIndex]);
    const timeLabel = isMultiDay ? `${d.getDate()}/${d.getMonth() + 1}` : `${d.getHours()}h`;
    const isDayVal = isMultiDay ? 1 : isDayList[dataIndex];
    const info = decodeWMO(codes[dataIndex], isDayVal, d, lang);
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

/**
 * Initializes or updates both charts smoothly in place.
 */
export function updateCharts({
  times,
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
}) {
  const l = getTranslations(lang).legend;
  const isMultiDay = [TIME_FILTERS.PAST_3D, TIME_FILTERS.NEXT_3D, TIME_FILTERS.NEXT_7D].includes(currentFilter);

  const timeLabels = times.map(t => {
    const d = new Date(t);
    return isMultiDay
      ? `${d.getHours()}:00 (${d.getDate()}/${d.getMonth() + 1})`
      : `${d.getHours()}:00`;
  });

  // Chart 1: Atmospheric & Wind
  const chart1Canvas = document.getElementById('chart1');
  if (chart1Canvas) {
    if (!chart1Instance) {
      chart1Instance = new Chart(chart1Canvas, {
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
                maxTicksLimit: isMultiDay ? 8 : 12
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
        plugins: [
          verticalCrosshairPlugin,
          {
            id: 'stripAlignPlugin',
            afterLayout: () => alignWeatherStripPadding()
          }
        ]
      });
    } else {
      chart1Instance.data.labels = timeLabels;
      chart1Instance.data.datasets[0].label = l.airTemp;
      chart1Instance.data.datasets[0].data = airTemps;
      chart1Instance.data.datasets[1].label = l.windSpd;
      chart1Instance.data.datasets[1].data = windSpeeds;
      chart1Instance.data.datasets[2].label = l.gusts;
      chart1Instance.data.datasets[2].data = windGusts;
      chart1Instance.options.scales.x.ticks.maxTicksLimit = isMultiDay ? 8 : 12;
      chart1Instance.update();
    }
    renderCustomLegend(chart1Instance, 'legend-chart1');
  }

  // Chart 2: Marine & Surf
  const chart2Canvas = document.getElementById('chart2');
  if (chart2Canvas) {
    if (!chart2Instance) {
      chart2Instance = new Chart(chart2Canvas, {
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
                maxTicksLimit: isMultiDay ? 8 : 12
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
    } else {
      chart2Instance.data.labels = timeLabels;
      chart2Instance.data.datasets[0].label = l.waterTemp;
      chart2Instance.data.datasets[0].data = seaTemps;
      chart2Instance.data.datasets[1].label = l.surfHeight;
      chart2Instance.data.datasets[1].data = waveHeights;
      chart2Instance.data.datasets[2].label = l.tide;
      chart2Instance.data.datasets[2].data = tides;
      chart2Instance.options.scales.x.ticks.maxTicksLimit = isMultiDay ? 8 : 12;
      chart2Instance.update();
    }
    renderCustomLegend(chart2Instance, 'legend-chart2');
  }

  // Populate Weather Strip Icons and Wind Arrows
  const totalPoints = times.length;
  const step = isMultiDay ? Math.floor(totalPoints / 7) : Math.floor(totalPoints / 8);
  const stepIndices = [];
  for (let i = 0; i < totalPoints; i += Math.max(1, step)) {
    stepIndices.push(i);
  }

  lastStripData = { stepIndices, times, weatherCodes, isDayList, windDirections, currentFilter, lang };
  updateWeatherStrip(stepIndices, times, weatherCodes, isDayList, windDirections, currentFilter, lang);
}

// Window resize listener to keep weather strip aligned across screen rotate/resize
window.addEventListener('resize', () => {
  alignWeatherStripPadding();
});
