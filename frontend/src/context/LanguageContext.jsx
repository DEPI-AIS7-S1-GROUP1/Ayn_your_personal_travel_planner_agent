import { useEffect, useMemo, useState } from 'react';
import en from '../lang/en.json';
import ar from '../lang/ar.json';
import { LanguageContext } from './LanguageContext';

const LANGUAGE_STORAGE_KEY = 'ayn_lang';
const dictionaries = { en, ar };
const translatedNodes = new WeakMap();
const translatedAttributes = new WeakMap();
const translatedElements = new WeakMap();

function normalizeText(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function getTranslation(value, language) {
  if (language === 'ar') {
    const key = Object.keys(ar._ui).find(
      (candidate) => normalizeText(candidate) === normalizeText(value)
    );
    return ar._ui[key || value];
  }

  const arabicValue = normalizeText(value);
  const key = Object.keys(ar._ui).find(
    (candidate) => normalizeText(ar._ui[candidate]) === arabicValue
  );
  return key || value;
}

function translateValue(value, language) {
  if (!value || language === 'ar') return ar._ui[value] ?? value;
  const normalizedValue = normalizeText(value);
  const source = Object.keys(ar._ui).find(
    (candidate) => normalizeText(ar._ui[candidate]) === normalizedValue
  );
  return source || value;
}

function translateDocument(language) {
  document.querySelectorAll('p, h1, h2, h3, h4, button, option, optgroup').forEach((element) => {
    if (element.closest('.ayn-navbar, .ayn-footer')) return;
    if (element.children.length > 0) return;
    if (!translatedElements.has(element)) translatedElements.set(element, element.textContent);
    const original = translatedElements.get(element);
    const translated = getTranslation(original, language);
    if (translated !== undefined && element.textContent !== translated) {
      element.textContent = translated;
    }
  });

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    if (node.parentElement && !['SCRIPT', 'STYLE'].includes(node.parentElement.tagName)) {
      if (node.parentElement.closest('.ayn-navbar, .ayn-footer')) {
        node = walker.nextNode();
        continue;
      }
      if (!translatedNodes.has(node)) translatedNodes.set(node, node.nodeValue);
      const original = translatedNodes.get(node);
      const trimmed = original.trim();
      const translated = getTranslation(trimmed, language);
      if (translated !== undefined) {
        const leading = original.slice(0, original.indexOf(trimmed));
        const trailing = original.slice(original.indexOf(trimmed) + trimmed.length);
        node.nodeValue = `${leading}${translated}${trailing}`;
      }
    }
    node = walker.nextNode();
  }

  document.querySelectorAll('[placeholder], [title], [aria-label], [label]').forEach((element) => {
    if (element.closest('.ayn-navbar, .ayn-footer')) return;
    ['placeholder', 'title', 'aria-label', 'label'].forEach((attribute) => {
      if (!element.hasAttribute(attribute)) return;
      if (!translatedAttributes.has(element)) translatedAttributes.set(element, {});
      const originals = translatedAttributes.get(element);
      if (originals[attribute] === undefined) originals[attribute] = element.getAttribute(attribute);
      const original = originals[attribute];
      const translated = getTranslation(original, language);
      if (translated !== undefined) element.setAttribute(attribute, translated);
    });
  });
}

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
    document.documentElement.classList.toggle('ayn-arabic', isArabic);

    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Language preference remains available for the current session.
    }

    translateDocument(language);
    const observer = new MutationObserver(() => translateDocument(language));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: (key, fallback = key) =>
      dictionaries[language][key] ??
      dictionaries[language]._ui?.[key] ??
      dictionaries.en[key] ??
      dictionaries.en._ui?.[key] ??
      fallback,
    translate: (value) => translateValue(value, language),
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
