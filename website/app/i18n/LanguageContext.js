'use client';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import translations, { LANGUAGE_OPTIONS } from './translations';

const LanguageContext = createContext(null);

/**
 * LanguageProvider - Wraps the app to provide i18n support.
 * Stores selected language in localStorage for persistence.
 */
export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('vi');

  // Load saved language on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('b2vision_lang');
      if (saved && translations[saved]) {
        setLangState(saved);
      }
    } catch (e) { /* SSR or localStorage unavailable */ }
  }, []);

  const setLang = useCallback((newLang) => {
    if (translations[newLang]) {
      setLangState(newLang);
      try { localStorage.setItem('b2vision_lang', newLang); } catch (e) {}
    }
  }, []);

  // Translation function
  const t = useCallback((key) => {
    return (translations[lang] && translations[lang][key]) || translations.vi[key] || key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, LANGUAGE_OPTIONS }}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * useLanguage - Hook to access translation function and language state.
 * Usage: const { t, lang, setLang } = useLanguage();
 */
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Fallback for components not wrapped in LanguageProvider
    return {
      lang: 'vi',
      setLang: () => {},
      t: (key) => (translations.vi && translations.vi[key]) || key,
      LANGUAGE_OPTIONS,
    };
  }
  return ctx;
}
