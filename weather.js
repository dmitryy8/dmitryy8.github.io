// weather.js — версия с переводом, 3-часовым hourly forecast и переводом климат.риска
document.addEventListener("DOMContentLoaded", () => {
  // нажать назад
  document.getElementById("backHome").addEventListener("click", () => {
    window.location.href = "index.html";
  });
  // привязка кнопки языка (если есть)
  const langBtn = document.getElementById('lang-toggle');
  if (langBtn) langBtn.addEventListener('click', () => {
    // toggle handled by translate.js
    const ev = new Event('langChanged');
    window.dispatchEvent(ev);
  });

  // если translate.js уже загрузился, он настроит текст, иначе переводится при его загрузке
  // запустим нашу основную логику
  main();
  // если язык меняется — обновим только текстовые подписи (не перезагружаем данные)
  window.addEventListener('langChanged', () => {
    applyPageTranslations();
  });
});

function getLang() {
  return localStorage.getItem('lang') || 'ru';
}
function t(key) {
  const lang = getLang();
  const map = {
    ru: {
      tempNow: "Температура сейчас",
      minMax: "Минимум / Максимум",
      wind: "Ветер (макс)",
      precip: "Осадки (сумма)",
      state: "Состояние",
      adviceTitle: "Совет",
      riskTitle: "Климатический риск",
      hourlyTitle: "Почасовой прогноз (каждые 3 часа)",
      loading: "Загрузка..."
    },
    en: {
      tempNow: "Temperature now",
      minMax: "Min / Max",
      wind: "Wind (max)",
      precip: "Precipitation (sum)",
      state: "Condition",
      adviceTitle: "Advice",
      riskTitle: "Climate risk",
      hourlyTitle: "Hourly forecast (every 3h)",
      loading: "Loading..."
    }
  };
  return (map[lang] && map[lang][key]) ? map[lang][key] : key;
}

function applyPageTranslations() {
  // refresh small UI labels
  const lang = getLang();
  const lt = document.getElementById('lang-toggle');
  if (lt) lt.textContent = (lang === 'ru') ? 'Рус' : 'Eng';
  const pt = document.getElementById('page-title');
  if (pt) pt.textContent = (lang === 'ru') ? 'Прогноз погоды' : 'Weather forecast';
  const at = document.getElementById('adviceTitle');
  if (at) at.textContent = (lang === 'ru') ? 'Совет' : 'Advice';
  const rt = document.getElementById('riskTitle');
  if (rt) rt.textContent = (lang === 'ru') ? 'Климатический риск' : 'Climate risk';
  const bh = document.querySelector('[data-i18n="backHome"]');
  if (bh) bh.textContent = (lang === 'ru') ? '← На главную' : '← Back home';
}
applyPageTranslations(); // initial

async function main() {
  applyPageTranslations();
  const weatherResult = document.getElementById("weatherResult");
  const adviceCard = document.getElementById("adviceCard");
  const adviceText = document.getElementById("adviceText");
  const riskCard = document.getElementById("riskCard");
  const riskContent = document.getElementById("riskContent");
  const hourlyCard = document.getElementById("hourlyCard");
  const hourlyWrap = document.getElementById("hourlyWrap");

  weatherResult.innerHTML = `<span class="loading">${t('loading')}</span>`;
  adviceCard.style.display = "none";
  riskCard.style.display = "none";
  hourlyCard.style.display = "none";

  // Читаем sessionStorage (как у тебя сохраняется)
  let city = sessionStorage.getItem("city");
  let lat = sessionStorage.getItem("lat");
  let lon = sessionStorage.getItem("lon");
  let dateStr = sessionStorage.getItem("date"); // YYYY-MM-DD

  if (!city && (!lat || !lon)) {
    // fallback try localStorage.selectedCity
    if (localStorage.getItem('selectedCity')) city = localStorage.getItem('selectedCity');
  }

  if (!city && (!lat || !lon)) {
    weatherResult.innerHTML = `<div><h2>${(getLang()==='ru')?'Нет данных':'No data'}</h2>
      <p class="muted">${(getLang()==='ru')?'Выберите город через форму или точку на карте.' : 'Select a city via form or choose a point on the map.'}</p></div>`;
    return;
  }

  try {
    // coords
    let coords = null;
    if (lat && lon) {
      coords = { latitude: parseFloat(lat), longitude: parseFloat(lon) };
    } else {
      coords = await geocodeCity(city);
      if (!coords) throw new Error((getLang()==='ru')?'Не удалось определить координаты':'Could not determine coordinates');
      lat = coords.latitude; lon = coords.longitude;
    }

    // Запросим hourly + daily + current — Open-Meteo
    const weatherData = await fetchWeatherWithHourly(coords.latitude, coords.longitude);
    if (!weatherData) throw new Error((getLang()==='ru')?'Ошибка при запросе погоды':'Weather fetch error');

    // Рендер главного блока
    renderMainWeather(weatherData, city);

    // Совет
    const weatherCode = weatherData.current_weather && weatherData.current_weather.weathercode;
    const condition = interpretWeather(weatherCode);
    const category = getWeatherCategory(condition);
    const advice = getRandomAdvice(category);
    adviceText.textContent = advice;
    adviceCard.style.display = "block";

    // Климатический риск — используем dateStr если есть (иначе сегодня)
    const riskDate = dateStr || new Date().toISOString().slice(0,10);
    const probs = computeDemoProbabilities(coords.latitude, coords.longitude, riskDate);

    // Переводы для меток риска
    const labels = getLang() === 'ru' ? {point:'Точка', date:'Дата', hot:'hot', cold:'cold', windy:'windy', humid:'humid', uncomfortable:'uncomfortable'} :
      {point:'Point', date:'Date', hot:'hot', cold:'cold', windy:'windy', humid:'humid', uncomfortable:'uncomfortable'};

    riskContent.innerHTML = `
      <table class="risk-table">
        <tr><td class="label">${labels.point}:</td><td>${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}</td></tr>
        <tr><td class="label">${labels.date}:</td><td>${riskDate}</td></tr>
        <tr><td class="label">${labels.hot}:</td><td>${Math.round(probs.hot*100)}%</td></tr>
        <tr><td class="label">${labels.cold}:</td><td>${Math.round(probs.cold*100)}%</td></tr>
        <tr><td class="label">${labels.windy}:</td><td>${Math.round(probs.windy*100)}%</td></tr>
        <tr><td class="label">${labels.humid}:</td><td>${Math.round(probs.humid*100)}%</td></tr>
        <tr><td class="label">${labels.uncomfortable}:</td><td>${Math.round(probs.uncomfortable*100)}%</td></tr>
      </table>
    `;
    riskCard.style.display = "block";

    // Почасовой прогноз: отфильтруем hourly по dateStr (или сегодня) и покажем каждые 3 часа (00,03,06...)
    const selectedDate = dateStr || new Date().toISOString().slice(0,10);
    const hourlyHtml = build3HourlyTable(weatherData, selectedDate);
    if (hourlyHtml) {
      hourlyWrap.innerHTML = hourlyHtml;
      hourlyCard.style.display = "block";
    } else {
      hourlyWrap.innerHTML = (getLang()==='ru')?'<div>Нет почасовых данных на выбранную дату.</div>':'<div>No hourly data for selected date.</div>';
      hourlyCard.style.display = "block";
    }

    // apply any UI translations
    applyPageTranslations();

  } catch (err) {
    console.error(err);
    weatherResult.innerHTML = `<div><h2>${(getLang()==='ru')?'Ошибка':'Error'}</h2>
      <p class="muted">${err.message || ''}</p>
      <p class="muted">${(getLang()==='ru')?'Убедитесь, что вы пришли с choose → form/map и что sessionStorage содержит city или lat/lon.' : 'Make sure you came from choose → form/map and sessionStorage contains city or lat/lon.'}</p>
      <pre class="debug" style="color:#fff;background:rgba(0,0,0,0.14);padding:8px;border-radius:6px;max-height:140px;overflow:auto">${JSON.stringify(copySessionStorage(), null, 2)}</pre>
    </div>`;
  }
}

/* ---------------- helpers ---------------- */

function copySessionStorage(){
  try {
    const out={};
    for (let i=0;i<sessionStorage.length;i++){ const k=sessionStorage.key(i); out[k]=sessionStorage.getItem(k); }
    return out;
  } catch(e){ return {error:"no access"} }
}

async function geocodeCity(city){
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ru&format=json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const r = json.results && json.results[0];
    if (!r) return null;
    return { latitude: r.latitude, longitude: r.longitude };
  } catch(e){
    console.error('geocode error', e);
    return null;
  }
}

// запрос с hourly
async function fetchWeatherWithHourly(lat, lon){
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
      + `&hourly=temperature_2m,relativehumidity_2m,windspeed_10m,weathercode`
      + `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode`
      + `&current_weather=true&timezone=auto&forecast_days=5`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Open-Meteo status '+res.status);
    return await res.json();
  } catch(e){
    console.error('fetchWeatherWithHourly error', e);
    return null;
  }
}

function renderMainWeather(data, city){
  const current = data.current_weather;
  const daily = data.daily;
  const out = document.getElementById('weatherResult');
  if (!current || !daily) {
    out.innerHTML = `<p>${(getLang()==='ru')?'Нет данных для этого города.':'No data for this city.'}</p>`;
    return;
  }
  const min = daily.temperature_2m_min[0];
  const max = daily.temperature_2m_max[0];
  const wind = daily.windspeed_10m_max[0];
  const precip = daily.precipitation_sum[0];
  const temp = current.temperature;
  const cond = interpretWeather(current.weathercode);

  out.innerHTML = `
    <div style="text-align:left">
      <h2 style="margin:0">${city}</h2>
      <p><b>${t('tempNow')}:</b> ${temp}°C</p>
      <p><b>${t('minMax')}:</b> ${min}°C / ${max}°C</p>
      <p><b>${t('wind')}:</b> ${wind} км/ч</p>
      <p><b>${t('precip')}:</b> ${precip} мм</p>
      <p><b>${t('state')}:</b> ${cond}</p>
    </div>
  `;
}

function build3HourlyTable(data, selectedDate){
  if (!data.hourly || !data.hourly.time) return null;
  const times = data.hourly.time; // ISO strings in timezone local
  const temps = data.hourly.temperature_2m;
  const hums = data.hourly.relativehumidity_2m;
  const winds = data.hourly.windspeed_10m;
  const codes = data.hourly.weathercode;

  // collect entries for selectedDate and hours divisible by 3 (0,3,6...)
  const rows = [];
  for (let i=0;i<times.length;i++){
    const t = times[i]; // e.g. "2025-10-05T03:00"
    if (!t.startsWith(selectedDate)) continue;
    const hour = parseInt(t.slice(11,13),10);
    if (hour % 3 !== 0) continue;
    rows.push({
      time: t.slice(11,16),
      temp: temps[i],
      hum: hums[i],
      wind: winds[i],
      code: interpretWeather(codes[i])
    });
  }

  if (rows.length === 0) return null;

  // build table
  const lang = getLang();
  const thTime = (lang==='ru')?'Время':'Time';
  const thTemp = (lang==='ru')?'Темп.':'Temp';
  const thHum = (lang==='ru')?'Влажн.':'Hum';
  const thWind = (lang==='ru')?'Ветер':'Wind';
  const thCond = (lang==='ru')?'Условия':'Condition';

  let html = `<table class="hourly-table"><thead><tr><th>${thTime}</th><th>${thTemp} (°C)</th><th>${thHum} (%)</th><th>${thWind} (km/h)</th><th>${thCond}</th></tr></thead><tbody>`;
  rows.forEach(r => {
    html += `<tr><td>${r.time}</td><td>${Math.round(r.temp)}</td><td>${Math.round(r.hum)}</td><td>${Math.round(r.wind)}</td><td>${r.code}</td></tr>`;
  });
  html += `</tbody></table>`;
  return html;
}

/* --- interpret / category / advice / risk helpers (copied & slightly adapted) --- */

function interpretWeather(code) {
  const map = {
    0: "Ясно", 1: "Преимущественно ясно", 2: "Переменная облачность", 3: "Пасмурно",
    45: "Туман", 48: "Изморозь", 51: "Лёгкий дождь", 53: "Дождь", 55: "Сильный дождь",
    61: "Слабый дождь", 63: "Умеренный дождь", 65: "Ливень",
    71: "Снегопад", 73: "Сильный снег", 75: "Метель",
    95: "Гроза", 99: "Гроза с градом"
  };
  return map[code] || "Неизвестно";
}

function getWeatherCategory(desc) {
  const s = (desc || "").toLowerCase();
  if (s.includes("дожд")) return "rain";
  if (s.includes("снег")) return "snow";
  if (s.includes("гроза")) return "thunderstorm";
  if (s.includes("пасмур") || s.includes("облач")) return "cloudy";
  if (s.includes("туман")) return "fog";
  if (s.includes("ясно")) return "clear";
  return "clear";
}

function getRandomAdvice(category) {
  if (typeof ADVICES === "undefined") return (getLang()==='ru')? "Совет недоступен." : "Advice unavailable.";
  const arr = ADVICES[category] || ADVICES.clear || [];
  if (!arr.length) return (getLang()==='ru')? "Совет отсутствует." : "No advice.";
  return arr[Math.floor(Math.random()*arr.length)];
}

/* ------------- demo climate risk ------------- */

function deterministicHash(...parts) {
  const s = parts.join("|");
  let h = 2166136261 >>> 0;
  for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h,16777619)>>>0; }
  return (h % 100000)/100000;
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

function computeDemoProbabilities(lat, lon, dateStr) {
  let d = new Date(dateStr);
  if (isNaN(d)) d = new Date();
  const doy = d.getDate() + d.getMonth()*30;
  const base = deterministicHash(Math.round(lat*1000), Math.round(lon*1000), doy);
  const hot = clamp(base*0.8 + (1 - Math.abs(lat)/90)*0.2, 0.01, 0.95);
  const cold = clamp((1-base)*0.7 + (Math.abs(lat)/90)*0.3, 0.01, 0.9);
  const windy = clamp(0.05 + deterministicHash(lat+1, lon-1, doy)*0.6, 0.01, 0.8);
  const humid = clamp(0.1 + deterministicHash(lat+2, lon-2, doy)*0.7, 0.01, 0.85);
  const uncomfortable = clamp(hot*0.6 + humid*0.5 + windy*0.1, 0, 0.99);
  return { hot, cold, windy, humid, uncomfortable };
}
