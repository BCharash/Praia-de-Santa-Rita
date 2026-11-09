/**
 * Internationalization (i18n) module for Praias de Portugal.
 */

const STORAGE_KEY = 'appLanguage';

export const translations = {
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
    errorLoading: "Erro ao carregar dados meteorológicos. Verifique a sua ligação.",
    settingsTitle: "Definições e Unidades",
    settingsDesc: "Selecione as unidades de exibição para os parâmetros:",
    settingTemp: "Temperatura (Ar e Água)",
    settingWind: "Velocidade do Vento e Rajadas",
    settingWave: "Altura da Vaga / Surf",
    settingTide: "Nível da Maré",
    refUnitsTitle: "Unidades de Referência Fixas",
    refHumidity: "Humidade:",
    refUv: "Índice UV:",
    refPeriod: "Período da Vaga:",
    refDatum: "Zero Hidrográfico:",
    done: "Concluído",
    settingsAria: "Definições de Unidades",
    uvLevels: {
      low: "Baixo",
      mod: "Moderado",
      high: "Elevado",
      vhigh: "Muito Elevado",
      extreme: "Extremo"
    },
    weather: {
      clear: "Céu Limpo",
      partlyCloudy: "Parcialmente Nublado",
      overcast: "Encoberto",
      foggy: "Névoa/Aviso",
      drizzle: "Chuvisco",
      rain: "Chuva",
      showers: "Aguaceiros",
      thunderstorm: "Trovoada",
      fair: "Bom Tempo"
    },
    legend: {
      airTemp: "Temp Ar (°C)",
      windSpd: "Vento (km/h)",
      gusts: "Rajadas (km/h)",
      waterTemp: "Temp Água (°C)",
      surfHeight: "Altura Vaga (m)",
      tide: "Maré (m ZH)"
    }
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
    errorLoading: "Error loading weather data. Please check your connection.",
    settingsTitle: "Settings & Units",
    settingsDesc: "Select display units for coastal and atmospheric parameters:",
    settingTemp: "Temperature (Air & Sea)",
    settingWind: "Wind Speed & Gusts",
    settingWave: "Surf / Wave Height",
    settingTide: "Tide Level",
    refUnitsTitle: "Fixed Reference Units",
    refHumidity: "Humidity:",
    refUv: "UV Index:",
    refPeriod: "Wave Period:",
    refDatum: "Chart Datum:",
    done: "Done",
    settingsAria: "Unit Settings",
    uvLevels: {
      low: "Low",
      mod: "Moderate",
      high: "High",
      vhigh: "Very High",
      extreme: "Extreme"
    },
    weather: {
      clear: "Clear",
      partlyCloudy: "Partly Cloudy",
      overcast: "Overcast",
      foggy: "Foggy",
      drizzle: "Drizzle",
      rain: "Rain",
      showers: "Showers",
      thunderstorm: "Thunderstorm",
      fair: "Fair"
    },
    legend: {
      airTemp: "Air Temp",
      windSpd: "Wind Spd",
      gusts: "Gusts",
      waterTemp: "Water Temp",
      surfHeight: "Surf Height",
      tide: "Tide"
    }
  }
};

let currentLanguage = localStorage.getItem(STORAGE_KEY) || 'PT';

export function getCurrentLanguage() {
  return currentLanguage;
}

export function setCurrentLanguage(lang) {
  if (translations[lang]) {
    currentLanguage = lang;
    localStorage.setItem(STORAGE_KEY, lang);
  }
  return currentLanguage;
}

export function toggleLanguage() {
  const nextLang = currentLanguage === 'PT' ? 'EN' : 'PT';
  return setCurrentLanguage(nextLang);
}

export function getTranslations(lang = currentLanguage) {
  return translations[lang] || translations.PT;
}
