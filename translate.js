// translate.js — простой i18n: переключает RU/EN и пишет в localStorage.lang
const I18N = {
  ru: {
    title: "Выбор способа",
    logo: "Погодный сайт",
    how: "Как хотите узнать погоду?",
    byForm: "Через форму",
    byMap: "Через карту",
    backHome: "← На главную",
    forecastTitle: "Прогноз погоды",
    adviceTitle: "Совет",
    riskTitle: "Климатический риск",
    loading: "Загрузка...",
    btnRus: "Рус",
    btnEng: "Eng"
  },
  en: {
    title: "Choose method",
    logo: "Weather site",
    how: "How do you want to check the weather?",
    byForm: "By Form",
    byMap: "By Map",
    backHome: "← Back home",
    forecastTitle: "Weather forecast",
    adviceTitle: "Advice",
    riskTitle: "Climate risk",
    loading: "Loading...",
    btnRus: "Рус",
    btnEng: "Eng"
  }
};

function applyTranslationsPage() {
  const lang = localStorage.getItem('lang') || 'ru';
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (I18N[lang] && I18N[lang][key]) el.textContent = I18N[lang][key];
  });
  // set lang button text if exists
  const lbtn = document.getElementById('lang-toggle');
  if (lbtn) {
    lbtn.textContent = (lang === 'ru') ? I18N.ru.btnRus : I18N.en.btnEng;
  }
}

// toggle function
function toggleLanguage() {
  const lang = localStorage.getItem('lang') || 'ru';
  const next = (lang === 'ru') ? 'en' : 'ru';
  localStorage.setItem('lang', next);
  applyTranslationsPage();
  // reload small pieces on the page if needed
  // (other scripts can read localStorage.lang)
}

document.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('lang')) localStorage.setItem('lang', 'ru');
  applyTranslationsPage();
  const lbtn = document.getElementById('lang-toggle');
  if (lbtn) lbtn.addEventListener('click', toggleLanguage);
});
