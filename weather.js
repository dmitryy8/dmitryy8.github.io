// weather.js — универсальный, читает sessionStorage(city/lat/lon/date) и показывает:
//  - прогноз (Open-Meteo)
//  - совет (из ADVICES)
//  - климатический риск (детерминированный демо)

// Safety: всё в одном модуле, с подробной обработкой ошибок и отладкой.
document.addEventListener("DOMContentLoaded", () => {
  // кнопка назад
  document.getElementById("backButton").addEventListener("click", () => {
    window.location.href = "index.html";
  });
  main();
});

async function main() {
  const weatherResult = document.getElementById("weatherResult");
  const riskCard = document.getElementById("riskCard");
  const riskContent = document.getElementById("riskContent");
  const adviceCard = document.getElementById("adviceCard");
  const adviceText = document.getElementById("adviceText");

  weatherResult.innerHTML = `<span class="loading">Загрузка...</span>`;
  riskCard.style.display = "none";
  adviceCard.style.display = "none";

  // Debug: покажи sessionStorage в консоли (попросили не спрашивать, но лог полезен)
  try {
    console.info("sessionStorage:", JSON.stringify(sessionStorage));
  } catch (e) { console.warn("Нельзя прочитать sessionStorage", e); }

  // Читаем те же ключи, что и твои form.js / map.js
  let city = sessionStorage.getItem("city");
  const latStr = sessionStorage.getItem("lat");
  const lonStr = sessionStorage.getItem("lon");
  const dateStr = sessionStorage.getItem("date");

  // fallback на localStorage.selectedCity (если у тебя где-то так сохранено)
  if (!city && localStorage.getItem("selectedCity")) {
    city = localStorage.getItem("selectedCity");
  }

  // Если нет координат и нет города — запасной fallback, но пользователь увидит подсказку
  let lat = latStr ? parseFloat(latStr) : null;
  let lon = lonStr ? parseFloat(lonStr) : null;

  if (!city && (!lat || !lon)) {
    // Невозможно продолжать без локации — покажем понятную подсказку
    weatherResult.innerHTML = `
      <div>
        <h2>Нет данных для показа</h2>
        <p>На предыдущей странице не были переданы город или координаты.</p>
        <p>Пожалуйста: вернитесь на страницу выбора и введите город или выберите точку на карте.</p>
      </div>
    `;
    return;
  }

  try {
    // Получаем координаты: если есть — используем, иначе геокодим город
    let coords = null;
    if (lat && lon) {
      coords = { latitude: lat, longitude: lon };
    } else {
      coords = await geocodeCity(city);
      if (!coords) throw new Error("Не удалось найти координаты для города: " + city);
      lat = coords.latitude;
      lon = coords.longitude;
    }

    // Запрашиваем Open-Meteo
    const weatherData = await fetchWeather(coords.latitude, coords.longitude);
    if (!weatherData) throw new Error("Ошибка получения данных погоды");

    // Рендерим прогноз
    renderWeatherInline(weatherData, city);

    // Совет от ADVICES
    const weatherCode = weatherData.current_weather && weatherData.current_weather.weathercode;
    const condition = interpretWeather(weatherCode);
    const category = getWeatherCategory(condition);
    const advice = getRandomAdvice(category);
    adviceText.textContent = advice;
    adviceCard.style.display = "block";

    // Климатический риск (детерминированный, воспроизводимый)
    const riskDate = dateStr || new Date().toISOString().slice(0,10);
    const probs = computeDemoProbabilities(coords.latitude, coords.longitude, riskDate);
    riskContent.innerHTML = `
      <table class="risk-table">
        <tr><td class="label">Точка:</td><td>${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}</td></tr>
        <tr><td class="label">Дата:</td><td>${riskDate}</td></tr>
        <tr><td class="label">hot:</td><td>${Math.round(probs.hot*100)}%</td></tr>
        <tr><td class="label">cold:</td><td>${Math.round(probs.cold*100)}%</td></tr>
        <tr><td class="label">windy:</td><td>${Math.round(probs.windy*100)}%</td></tr>
        <tr><td class="label">humid:</td><td>${Math.round(probs.humid*100)}%</td></tr>
        <tr><td class="label">uncomfortable:</td><td>${Math.round(probs.uncomfortable*100)}%</td></tr>
      </table>
    `;
    riskCard.style.display = "block";

  } catch (err) {
    console.error("main error:", err);
    weatherResult.innerHTML = `
      <div>
        <h2>Ошибка</h2>
        <p>Не удалось загрузить прогноз.</p>
        <p class="muted">${err.message || ""}</p>
        <p class="muted">Убедитесь, что вы пришли на страницу через choose → form/map и что sessionStorage содержит city или lat/lon.</p>
        <pre class="debug">sessionStorage: ${JSON.stringify(copySessionStorage(), null, 2)}</pre>
      </div>
    `;
  }
}

/* ---------- helper functions ---------- */

function copySessionStorage() {
  try {
    const out = {};
    for (let i=0;i<sessionStorage.length;i++){
      const k = sessionStorage.key(i);
      out[k] = sessionStorage.getItem(k);
    }
    return out;
  } catch(e) { return {error: "no access to sessionStorage"} }
}

async function geocodeCity(city) {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ru&format=json`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("geocode non-ok", res.status);
      return null;
    }
    const json = await res.json();
    const r = json.results && json.results[0];
    if (!r) return null;
    return { latitude: r.latitude, longitude: r.longitude };
  } catch (e) {
    console.error("geocode error", e);
    return null;
  }
}

async function fetchWeather(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode&current_weather=true&timezone=auto&forecast_days=5`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("weather fetch not ok", res.status);
      throw new Error("Open-Meteo responded with status " + res.status);
    }
    return await res.json();
  } catch (e) {
    console.error("fetchWeather error", e);
    return null;
  }
}

function renderWeatherInline(data, city) {
  const current = data.current_weather;
  const daily = data.daily;
  const out = document.getElementById("weatherResult");
  if (!current || !daily) {
    out.innerHTML = `<p>Нет данных о погоде для ${city}.</p>`;
    return;
  }
  const todayIndex = 0;
  const minT = daily.temperature_2m_min[todayIndex];
  const maxT = daily.temperature_2m_max[todayIndex];
  const wind = daily.windspeed_10m_max[todayIndex];
  const precip = daily.precipitation_sum[todayIndex];
  const tempNow = current.temperature;
  const condition = interpretWeather(current.weathercode);

  out.innerHTML = `
    <div style="text-align:left;">
      <h2 style="margin-top:0">${city}</h2>
      <p><b>Температура сейчас:</b> ${tempNow}°C</p>
      <p><b>Минимум:</b> ${minT}°C  |  <b>Максимум:</b> ${maxT}°C</p>
      <p><b>Ветер (макс):</b> ${wind} км/ч</p>
      <p><b>Осадки (сумма):</b> ${precip} мм</p>
      <p><b>Состояние:</b> ${condition}</p>
    </div>
  `;
}

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
  if (s.includes("ливень")) return "rain";
  return "clear";
}

function getRandomAdvice(category) {
  if (typeof ADVICES === "undefined") return "Совет недоступен.";
  const arr = ADVICES[category] || ADVICES.clear || [];
  if (!arr.length) return "Совет отсутствует.";
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ------------- климатический риск (демо) ------------- */

// детерминированный хеш 0..1 (FNV-1a variant)
function deterministicHash(...parts) {
  const s = parts.join("|");
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h % 100000) / 100000;
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
