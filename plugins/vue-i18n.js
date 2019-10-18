import Vue from 'vue'; // eslint-disable-line import/no-extraneous-dependencies
import VueI18n from 'vue-i18n';

import messages, {
  defaultLocale,
  availableLocales,
} from '../locales';

Vue.use(VueI18n);

function getReqAcceptLangauge(req) {
  const accepts = req.acceptsLanguages();
  if (accepts && accepts.find((lang) => lang.toLowerCase().includes('zh'))) {
    return 'zh-Hant'; // hack to prefer zh-Hant
  }
  return req.acceptsLanguages(availableLocales);
}

function getNavigatorLanguage() {
  if (
    navigator.languages
    && navigator.languages.find((lang) => lang.toLowerCase().includes('zh'))
  ) {
    return 'zh-Hant'; // hack to prefer zh-Hant
  }
  let navLang = navigator.language
    || (navigator.languages && navigator.languages[0])
    || defaultLocale;
  // TODO: iterate through navigator.languages to find locale
  navLang = navLang.toLowerCase();
  availableLocales.forEach((key) => {
    if (navLang.includes(key)) {
      navLang = key;
    }
  });
  return navLang;
}

export default ({
  app, req, query,
}) => {
  let locale = defaultLocale;
  if (!process.server) {
    const navLang = getNavigatorLanguage();
    locale = query.language
      || (window.localStorage && window.localStorage.language)
      || navLang
      || defaultLocale;
    if (!availableLocales.includes(locale)) locale = defaultLocale;
  } else if (req) {
    locale = query.language
      || getReqAcceptLangauge(req)
      || defaultLocale;
    if (!availableLocales.includes(locale)) locale = defaultLocale;
  }
  // Set i18n instance on app
  // This way we can use it in middleware and pages asyncData/fetch
  // eslint-disable-next-line no-param-reassign
  app.i18n = new VueI18n({
    locale,
    fallbackLocale: defaultLocale,
    messages,
  });
};
