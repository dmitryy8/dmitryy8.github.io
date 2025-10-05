document.addEventListener("DOMContentLoaded", async () => {
  const resultDiv = document.getElementById("result");
  const errorDiv = document.getElementById("error");
  const backBtn = document.getElementById("back-home");
  const riskBtn = document.getElementById("calc-risk");

  // ---------- ВСТАВЛЕН ТВОЙ КЛЮЧ ОТ OPENWEATHER (для локального использования) ----------
  const API_KEY = "7aa62a67da4366a190f41394632dc53a";
  // ------------------------------------------------------------------------------------

  let city = sessionStorage.getItem("city");
  let date = sessionStorage.getItem("date");
  let lat = sessionStorage.getItem("lat");
  let lon = sessionStorage.getItem("lon");

  backBtn && backBtn.addEventListener("click", () => { window.location.href = "index.html"; });

  if (!date) {
    errorDiv.textContent = "Нет выбранной даты. Вернитесь назад и выберите дату.";
    return;
  }

  try {
    let url;
    let usedBy = '';
    if (city && city.length > 0) {
      // используем поиск по городу
      url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&lang=ru&appid=${API_KEY}`;
      usedBy = `город: ${city}`;
    } else if (lat && lon) {
      url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=ru&appid=${API_KEY}`;
      usedBy = `координаты: ${parseFloat(lat).toFixed(4)}, ${parseFloat(lon).toFixed(4)}`;
    } else {
      errorDiv.textContent = "Ошибка: не переданы координаты или город.";
      return;
    }

    const r = await fetch(url);
    const data = await r.json();

    // Debug-friendly error message
    if (!data || (data.cod && data.cod !== "200" && data.cod !== 200)) {
      errorDiv.textContent = `Ошибка получения прогноза: ${data && (data.message || JSON.stringify(data))}`;
      return;
    }

    // Пытаемся взять почасовой прогноз на выбранную дату
    const dayList = (data.list || []).filter(f => f.dt_txt && f.dt_txt.startsWith(date));
    if (!dayList || dayList.length === 0) {
      // попытаемся подсказать диапазон дат в прогнозе
      if (data.list && data.list.length > 0) {
        const first = data.list[0].dt_txt.split(" ")[0];
        const last = data.list[data.list.length - 1].dt_txt.split(" ")[0];
        errorDiv.textContent = `Нет данных на ${date}. Доступный диапазон прогноза: ${first} — ${last}.`;
      } else {
        errorDiv.textContent = `Нет почасовых данных на ${date}.`;
      }
      return;
    }

    const temps = dayList.map(d => d.main.temp);
    const minTemp = Math.round(Math.min(...temps));
    const maxTemp = Math.round(Math.max(...temps));

    let hourlyHtml = '<div class="hourly">';
    dayList.forEach(d => {
      const time = d.dt_txt.split(" ")[1].slice(0,5);
      hourlyHtml += `<div class="h"><div style="font-weight:700">${time}</div><div>${Math.round(d.main.temp)}°C</div><div style="text-transform:capitalize">${d.weather[0].description}</div></div>`;
    });
    hourlyHtml += '</div>';

    const locName = data.city ? `${data.city.name}, ${data.city.country}` : (lat && lon ? `${parseFloat(lat).toFixed(3)},${parseFloat(lon).toFixed(3)}` : usedBy);

    resultDiv.innerHTML = `
      <div class="card">
      <h2 style="margin:0 0 8px 0">${locName}</h2>
      <div><strong>Дата:</strong> ${date} &nbsp; <small class="muted">(данные по ${usedBy})</small></div>
      <div><strong>Минимум:</strong> ${minTemp}°C &nbsp; <strong>Максимум:</strong> ${maxTemp}°C</div>
      <div><strong>Ощущается как:</strong> ${Math.round(dayList[0].main.feels_like)}°C</div>
      <div><strong>Влажность:</strong> ${dayList[0].main.humidity}% &nbsp; <strong>Ветер:</strong> ${Math.round(dayList[0].wind.speed)} м/с</div>
      <h3 style="margin-top:12px">Почасовой прогноз:</h3>
      ${hourlyHtml}
      </div>
    `;

    // сохранение координат на случай, если используем город
    if (!lat && data.city && data.city.coord) {
      sessionStorage.setItem("lat", data.city.coord.lat);
      sessionStorage.setItem("lon", data.city.coord.lon);
    }

    // демо-климатический риск (локально, детерминированный)
    function deterministicHash(...parts) {
      const s = parts.join('|');
      let h = 2166136261 >>> 0;
      for (let i=0;i<s.length;i++){ h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; }
      return (h % 10000)/10000;
    }
    function computeDemoProbabilities(latv, lonv, dateStr) {
      const d = dateStr ? new Date(dateStr) : new Date();
      const doy = d.getDate()+d.getMonth()*30;
      const base = deterministicHash(Math.round(latv*1000), Math.round(lonv*1000), doy);
      const hot = Math.min(0.95, Math.max(0.01, (base*0.8 + (1-Math.abs(latv)/90)*0.2)));
      const cold = Math.min(0.9, Math.max(0.01, ( (1-base)*0.7 + (Math.abs(latv)/90)*0.3 )));
      const windy = Math.min(0.7, 0.05 + deterministicHash(latv+1,lonv-1,doy)*0.6);
      const humid = Math.min(0.85, 0.1 + deterministicHash(latv+2,lonv-2,doy)*0.7);
      const uncomfortable = Math.min(0.99, hot*0.6 + humid*0.5 + windy*0.1);
      return {hot,cold,windy,humid,uncomfortable};
    }

    let latUse = lat ? parseFloat(lat) : (data.city && data.city.coord ? data.city.coord.lat : 0);
    let lonUse = lon ? parseFloat(lon) : (data.city && data.city.coord ? data.city.coord.lon : 0);
    const probs = computeDemoProbabilities(latUse, lonUse, date);

    const riskHtml = `<div class="card" style="margin-top:12px"><h3>Климатический риск (локально, демо)</h3>
      <div>Точка: ${latUse.toFixed(3)}, ${lonUse.toFixed(3)} — Дата: ${date}</div>
      <ul>
        <li><strong>hot</strong>: ${Math.round(probs.hot*100)}%</li>
        <li><strong>cold</strong>: ${Math.round(probs.cold*100)}%</li>
        <li><strong>windy</strong>: ${Math.round(probs.windy*100)}%</li>
        <li><strong>humid</strong>: ${Math.round(probs.humid*100)}%</li>
        <li><strong>uncomfortable</strong>: ${Math.round(probs.uncomfortable*100)}%</li>
      </ul></div>`;

    // добавляем блок риска, кнопку показывает/скрывает
    const riskBlock = document.createElement('div');
    riskBlock.innerHTML = riskHtml;
    riskBlock.style.marginTop = '12px';
    riskBlock.style.display = 'none';
    resultDiv.appendChild(riskBlock);

    riskBtn.addEventListener('click', () => {
      if (riskBlock.style.display === 'none') riskBlock.style.display = 'block';
      else riskBlock.style.display = 'none';
    });

  } catch (err) {
    console.error(err);
    errorDiv.textContent = "Ошибка получения прогноза. Открой консоль (F12) для деталей.";
  }
});
