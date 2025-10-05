// weather.js
// Скрипт страницы погоды с советом от ИИ

// --- Загрузка данных о погоде (пример) ---
async function loadWeather() {
  const city = localStorage.getItem("selectedCity") || "Неизвестно";
  const weatherData = await fetchWeather(city);
  if (!weatherData) {
    document.getElementById("weatherResult").innerHTML = `<p>Ошибка получения прогноза 😢</p>`;
    return;
  }

  renderWeather(weatherData, city);
}

// --- Получение данных погоды ---
async function fetchWeather(city) {
  try {
    const response = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
    if (!response.ok) throw new Error("Ошибка API");
    const data = await response.json();
    return data;
  } catch (e) {
    console.error(e);
    return null;
  }
}

// --- Отображение прогноза ---
function renderWeather(data, city) {
  const current = data.current_condition?.[0];
  const weather = data.weather?.[0];
  const tempC = current?.temp_C;
  const feelsLike = current?.FeelsLikeC;
  const humidity = current?.humidity;
  const wind = current?.windspeedKmph;
  const description = current?.weatherDesc?.[0]?.value || "Нет данных";

  // Подбираем смайлик
  const emoji = getWeatherEmoji(description);
  // Определяем категорию для совета
  const category = getWeatherCategory(description);
  // Выбираем случайный совет
  const advice = getRandomAdvice(category);

  document.getElementById("weatherResult").innerHTML = `
    <h2>${emoji} Прогноз погоды — ${city}</h2>
    <p><b>Температура:</b> ${tempC}°C (ощущается как ${feelsLike}°C)</p>
    <p><b>Влажность:</b> ${humidity}% 💧</p>
    <p><b>Ветер:</b> ${wind} км/ч 🌬️</p>
    <p><b>Состояние:</b> ${description}</p>
    <hr>
    <p><b>Совет от ИИ 🤖:</b> ${advice}</p>
  `;
}

// --- Смайлики по погоде ---
function getWeatherEmoji(desc) {
  desc = desc.toLowerCase();
  if (desc.includes("rain") || desc.includes("дожд")) return "🌧️";
  if (desc.includes("snow") || desc.includes("снег")) return "❄️";
  if (desc.includes("clear") || desc.includes("ясно")) return "☀️";
  if (desc.includes("cloud") || desc.includes("облач")) return "☁️";
  if (desc.includes("wind") || desc.includes("ветер")) return "🌬️";
  if (desc.includes("fog") || desc.includes("туман")) return "🌫️";
  if (desc.includes("storm") || desc.includes("гроза")) return "⛈️";
  if (desc.includes("drizzle") || desc.includes("морось")) return "🌦️";
  if (desc.includes("hail") || desc.includes("град")) return "🌨️";
  return "🌍";
}

// --- Категория погоды ---
function getWeatherCategory(desc) {
  desc = desc.toLowerCase();
  if (desc.includes("rain") || desc.includes("дожд")) return "rain";
  if (desc.includes("snow") || desc.includes("снег")) return "snow";
  if (desc.includes("clear") || desc.includes("ясно")) return "clear";
  if (desc.includes("cloud") || desc.includes("облач")) return "cloudy";
  if (desc.includes("wind") || desc.includes("ветер")) return "windy";
  if (desc.includes("fog") || desc.includes("туман")) return "fog";
  if (desc.includes("storm") || desc.includes("гроза")) return "thunderstorm";
  if (desc.includes("drizzle") || desc.includes("морось")) return "drizzle";
  if (desc.includes("hail") || desc.includes("град")) return "hail";
  if (desc.includes("cold") || desc.includes("мороз")) return "cold";
  if (desc.includes("hot") || desc.includes("жар")) return "hot";
  return "clear";
}

// --- Выбор случайного совета ---
function getRandomAdvice(category) {
  const advices = ADVICES[category] || ADVICES.clear;
  const randomIndex = Math.floor(Math.random() * advices.length);
  return advices[randomIndex];
}

// --- Запуск ---
document.addEventListener("DOMContentLoaded", loadWeather);
