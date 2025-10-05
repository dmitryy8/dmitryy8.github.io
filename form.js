document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-weather");
  const cityInput = document.getElementById("city");
  const dateInput = document.getElementById("date");
  const errorDiv = document.getElementById("error");
  const backBtn = document.getElementById("back-choose");

  const today = new Date();
  const weekEnd = new Date();
  weekEnd.setDate(today.getDate() + 6);
  dateInput.min = today.toISOString().split("T")[0];
  dateInput.max = weekEnd.toISOString().split("T")[0];
  dateInput.value = today.toISOString().split("T")[0];

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    errorDiv.textContent = "";

    const city = cityInput.value.trim();
    const date = dateInput.value;

    if (!city || !date) {
      errorDiv.textContent = "Введите город и дату!";
      return;
    }

    // сохраняем в sessionStorage для weather.html
    sessionStorage.setItem("city", city);
    sessionStorage.removeItem("lat");
    sessionStorage.removeItem("lon");
    sessionStorage.setItem("date", date);

    window.location.href = "weather.html";
  });

  backBtn.addEventListener("click", () => {
    window.location.href = "choose.html";
  });
});
