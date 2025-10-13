import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './en.json';
import so from './so.json';
import ar from './ar.json';

const resources = { en: { common: en }, so: { common: so }, ar: { common: ar } } as const;

const deviceLang = (Localization.getLocales()[0]?.languageCode ?? 'en') as 'en'|'so'|'ar';

void i18n.use(initReactI18next).init({
  resources,
  lng: ['en','so','ar'].includes(deviceLang) ? deviceLang : 'en',
  fallbackLng: 'en',
  ns: ['common'],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

export default i18n;
