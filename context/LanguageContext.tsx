import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, translate, getDishDisplayName } from '@/utils/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  getDishName: (dish: { name?: string; name_ta?: string | null } | string | undefined | null) => string;
}

const LANGUAGE_STORAGE_KEY = 'user_language';

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: async () => {},
  t: (key: string, params?: Record<string, string | number>) => translate(key, 'en', params),
  getDishName: (dish) => getDishDisplayName(dish, 'en'),
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const loadStoredLanguage = async () => {
      try {
        const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (stored === 'en' || stored === 'ta') {
          setLanguageState(stored as Language);
        }
      } catch (err) {
        console.error('Error loading language preference:', err);
      }
    };
    loadStoredLanguage();
  }, []);

  const setLanguage = async (lang: Language) => {
    try {
      setLanguageState(lang);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (err) {
      console.error('Error saving language preference:', err);
    }
  };

  const t = (key: string, params?: Record<string, string | number>) => {
    return translate(key, language, params);
  };

  const getDishName = (dish: { name?: string; name_ta?: string | null } | string | undefined | null) => {
    return getDishDisplayName(dish, language);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, getDishName }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
