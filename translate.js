const I18N = {
  ru: {
    welcome: "Погодный сайт",
    intro: "Узнайте прогноз и условия в любой точке мира.",
    checkWeather: "Узнать погоду"
  },
  en: {
    welcome: "Weather site",
    intro: "Get weather and conditions anywhere in the world.",
    checkWeather: "Check Weather"
  }
};

function populateLangSelects() {
  const container = document.getElementById('lang-switch-container');
  if (!container) return;
  if (container.childElementCount === 0) {
    const sel = document.createElement('select');
    sel.id = 'lang-switch';
    const opRu = document.createElement('option'); opRu.value = 'ru'; opRu.textContent = 'Русский';
    const opEn = document.createElement('option'); opEn.value = 'en'; opEn.textContent = 'English';
    sel.append(opRu, opEn);
    sel.value = localStorage.getItem('lang') || 'ru';
    sel.addEventListener('change', (e) => { localStorage.setItem('lang', e.target.value); applyTranslations(); });
    container.appendChild(sel);
  }
}

function applyTranslations() {
  const lang = localStorage.getItem('lang') || 'ru';
  populateLangSelects();
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (I18N[lang] && I18N[lang][key] !== undefined) el.textContent = I18N[lang][key];
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('lang')) localStorage.setItem('lang','ru');
  populateLangSelects();
  applyTranslations();
});
