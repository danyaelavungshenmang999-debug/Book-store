import { createContext, useContext, useEffect, useState } from 'react';
import { Language, translations } from './translations';

const LANG_KEY = 'bookhaven_lang';

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (typeof translations)[Language];
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      return saved === 'my' ? 'my' : 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      // Ignore storage quota errors
    }
  }, [lang]);

  const setLang = (next: Language) => setLangState(next);
  const toggleLang = () => setLangState((prev) => (prev === 'en' ? 'my' : 'en'));

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang,
        toggleLang,
        t: translations[lang],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      lang: 'en',
      setLang: () => {},
      toggleLang: () => {},
      t: translations.en,
    };
  }
  return ctx;
}
