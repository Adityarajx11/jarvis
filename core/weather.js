// Weather module — Open-Meteo API (free, no key)
const GEO = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST = 'https://api.open-meteo.com/v1/forecast';

async function getWeather(query) {
  // 1. Geocode location
  const geoRes = await fetch(`${GEO}?name=${encodeURIComponent(query)}&count=1&language=en`, { signal: AbortSignal.timeout(6000) });
  const geoData = await geoRes.json();
  if (!geoData.results?.length) return null;
  const { latitude, longitude, name, country } = geoData.results[0];

  // 2. Fetch forecast
  const params = new URLSearchParams({
    latitude, longitude, current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min,weather_code',
    timezone: 'auto', forecast_days: 3
  });
  const fRes = await fetch(`${FORECAST}?${params}`, { signal: AbortSignal.timeout(6000) });
  const f = await fRes.json();

  const WMO = {0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Rime fog',
    51:'Light drizzle',53:'Moderate drizzle',55:'Dense drizzle',61:'Slight rain',63:'Moderate rain',
    65:'Heavy rain',71:'Slight snow',73:'Moderate snow',75:'Heavy snow',80:'Slight showers',
    81:'Moderate showers',82:'Violent showers',95:'Thunderstorm',96:'Thunderstorm w/ hail',99:'Thunderstorm w/ heavy hail'};

  const cur = f.current;
  const daily = f.daily;
  const today = {
    temp: Math.round(cur.temperature_2m),
    humidity: cur.relative_humidity_2m,
    wind: Math.round(cur.wind_speed_10m),
    condition: WMO[cur.weather_code] || 'Unknown'
  };
  const forecast = daily.time.map((d, i) => ({
    date: d,
    high: Math.round(daily.temperature_2m_max[i]),
    low: Math.round(daily.temperature_2m_min[i]),
    condition: WMO[daily.weather_code[i]] || 'Unknown'
  }));

  return { location: `${name}, ${country}`, current: today, forecast };
}

function formatWeather(w) {
  if (!w) return 'Weather unavailable — check your connection.';
  let s = `Right now in ${w.location}: ${w.current.condition} at ${w.current.temp}°C. Humidity's at ${w.current.humidity}%, wind blowing at ${w.current.wind} km/h.`;
  if (w.forecast.length > 1) {
    s += `\n\nComing up: `;
    for (let i = 1; i < w.forecast.length; i++) {
      const f = w.forecast[i];
      const day = new Date(f.date).toLocaleDateString('en', { weekday: 'long' });
      s += `${day} looks ${f.condition.toLowerCase()}, ${f.low}° to ${f.high}°. `;
    }
  }
  return s;
}

module.exports = { getWeather, formatWeather };
