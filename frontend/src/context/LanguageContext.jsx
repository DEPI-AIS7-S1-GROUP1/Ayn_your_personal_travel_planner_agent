import { useEffect, useMemo, useState } from 'react';
import en from '../lang/en.json';
import ar from '../lang/ar.json';
import { LanguageContext } from './LanguageContext';

const LANGUAGE_STORAGE_KEY = 'ayn_lang';
const dictionaries = { en, ar };

function getInitialLanguage() {
  try {
    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return storedLanguage === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(getInitialLanguage);

  useEffect(() => {
    const isArabic = language === 'ar';
    document.documentElement.lang = language;
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr';

    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Language preference remains available for the current session.
    }
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: (key) => dictionaries[language][key] ?? dictionaries.en[key] ?? key,
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
