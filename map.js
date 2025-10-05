document.addEventListener("DOMContentLoaded", () => {
  const dateInput = document.getElementById("map-date");
  const getWeatherBtn = document.getElementById("get-map-weather");
  const errorDiv = document.getElementById("error");
  const backBtn = document.getElementById("back-choose");

  const today = new Date();
  const weekEnd = new Date();
  weekEnd.setDate(today.getDate() + 6);
  dateInput.min = today.toISOString().split("T")[0];
  dateInput.max = weekEnd.toISOString().split("T")[0];
  dateInput.value = today.toISOString().split("T")[0];

  const map = L.map("map").setView([51.505, 0], 3);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
  }).addTo(map);

  let marker = null;
  let selectedCoords = null;

  map.on("click", (e) => {
    selectedCoords = e.latlng;
    if (marker) marker.setLatLng(e.latlng);
    else marker = L.marker(e.latlng).addTo(map);
  });

  getWeatherBtn.addEventListener("click", () => {
    errorDiv.textContent = "";
    if (!selectedCoords) {
      errorDiv.textContent = "Выберите точку на карте!";
      return;
    }
    const selectedDate = dateInput.value;
    if (!selectedDate) {
      errorDiv.textContent = "Выберите дату!";
      return;
    }
    sessionStorage.setItem("lat", selectedCoords.lat);
    sessionStorage.setItem("lon", selectedCoords.lng);
    sessionStorage.setItem("date", selectedDate);

    // очищаем city чтобы приоритет был у маркера
    sessionStorage.removeItem("city");

    window.location.href = "weather.html";
  });

  backBtn.addEventListener("click", () => {
    window.location.href = "choose.html";
  });
});

