import { useEffect, useMemo, useState } from 'react';
import en from '../lang/en.json';
import ar from '../lang/ar.json';
import { LanguageContext } from './LanguageContext';

const LANGUAGE_STORAGE_KEY = 'ayn_lang';
const dictionaries = { en, ar };
const countryTranslations = {
  Egypt: 'مصر',
  'Saudi Arabia': 'المملكة العربية السعودية',
  'United Arab Emirates': 'الإمارات العربية المتحدة',
  'United States': 'الولايات المتحدة',
  'United Kingdom': 'المملكة المتحدة',
  France: 'فرنسا',
  Germany: 'ألمانيا',
  Italy: 'إيطاليا',
  Spain: 'إسبانيا',
  Turkey: 'تركيا',
  Greece: 'اليونان'
};
const cityTranslations = {
  Cairo: 'القاهرة',
  Giza: 'الجيزة',
  Alexandria: 'الإسكندرية',
  'Sharm El Sheikh': 'شرم الشيخ',
  Hurghada: 'الغردقة',
  Luxor: 'الأقصر',
  Aswan: 'أسوان',
  Dahab: 'دهب',
  'Marsa Alam': 'مرسى علم',
  'Siwa Oasis': 'واحة سيوة',
  'El Gouna': 'الجونة',
  Faiyum: 'الفيوم',
  'Marsa Matrouh': 'مرسى مطروح',
  'Port Said': 'بورسعيد',
  Ismailia: 'الإسماعيلية',
  Suez: 'السويس',
  'Beni Suef': 'بني سويف',
  Minya: 'المنيا',
  Asyut: 'أسيوط',
  Sohag: 'سوهاج',
  Qena: 'قنا',
  'New Valley': 'الوادي الجديد',
  'Kafr El Sheikh': 'كفر الشيخ',
  Damietta: 'دمياط',
  Tanta: 'طنطا',
  Mansoura: 'المنصورة',
  Zagazig: 'الزقازيق',
  Banha: 'بنها',
  Damanhur: 'دمنهور',
  Matrouh: 'مطروح',
  Arish: 'العريش'
};
const transportTranslations = {
  'EgyptAir': 'مصر للطيران',
  'Swvl Travel': 'سويفل للسفر',
  'Go Bus Elite Plus': 'جو باص إيليت بلس',
  'Kareem Comfort': 'كريم كومفورت',
  'InDrive City-to-City': 'إن درايف بين المدن',
  'Flight (Air)': 'رحلة جوية',
  'Private Ride / InDrive': 'رحلة خاصة / إن درايف',
  'Private Ride / Kareem': 'رحلة خاصة / كريم',
  'Intercity Bus / Swvl': 'حافلة بين المدن / سويفل',
  'Coach Bus / Go Bus': 'حافلة سياحية / جو باص',
  'Direct domestic flight with 20kg baggage allowance.': 'رحلة جوية داخلية مباشرة مع أمتعة بوزن 20 كجم.',
  'Private AC car, direct door-to-door, fare agreed in advance upfront.': 'سيارة خاصة مكيفة من الباب إلى الباب، مع الاتفاق على الأجرة مسبقًا.',
  'Top-rated captain, modern spacious sedan, door-to-door luggage assistance.': 'سائق بتقييم مرتفع، وسيارة سيدان حديثة وواسعة مع مساعدة في نقل الأمتعة من الباب إلى الباب.',
  'High-comfort intercity mini-coach, reserved seating, onboard Wi-Fi, AC.': 'حافلة صغيرة مريحة بين المدن، بمقاعد محجوزة وواي فاي وتكييف.',
  'First-class reclining seats, individual media screens, complimentary refreshments.': 'مقاعد من الدرجة الأولى قابلة للإمالة، وشاشات فردية ومشروبات مجانية.'
};
const activityTranslations = {
  'Desert Safari Adventure': 'مغامرة سفاري في الصحراء',
  'Quad biking through the Eastern Desert hills for photography enthusiasts.': 'ركوب الدراجات الرباعية بين تلال الصحراء الشرقية لمحبي التصوير.',
  'Nile River Cruise': 'رحلة نيلية',
  'Sunset Felucca Ride': 'رحلة فلوكة عند الغروب',
  'Egyptian Cooking Class': 'درس طبخ مصري',
  'Local Market Visit': 'زيارة السوق المحلي',
  'Traditional Egyptian Lunch': 'غداء مصري تقليدي',
  'Beach Day': 'يوم على الشاطئ',
  'Snorkeling Trip': 'رحلة غوص سطحي',
  'Scuba Diving': 'الغوص',
  'Hot Air Balloon Ride': 'رحلة بالمنطاد الهوائي',
  'Walking Tour': 'جولة سيرًا على الأقدام',
  'Free Time': 'وقت حر',
  'Airport Transfer': 'الانتقال من المطار',
  'Arrival and Hotel Check-in': 'الوصول وتسجيل الدخول إلى الفندق',
  'Departure and Hotel Check-out': 'المغادرة وتسجيل الخروج من الفندق'
  ,'Arrive in your resort and check into your resort.': 'الوصول إلى المنتجع وتسجيل الدخول إليه.',
  'Arrive in your resort': 'الوصول إلى المنتجع',
  'and check into your resort': 'وتسجيل الدخول إلى المنتجع',
  'and check in': 'وتسجيل الدخول',
  'Arrive in your resort and check in': 'الوصول إلى المنتجع وتسجيل الدخول',
  'Downtown Exploration': 'استكشاف وسط المدينة',
  'Stroll around Tamr Henna square and take photos of the architecture.': 'تنزه حول ميدان تمر حنة والتقط صورًا للعمارة.',
  'Stroll around Tamr Henna square and take photos of the architecture': 'تنزه حول ميدان تمر حنة والتقط صورًا للعمارة',
  'Gluten-Free Dinner': 'عشاء خالٍ من الغلوتين',
  'Enjoy a vegetarian, gluten-free meal at a local Mediterranean restaurant.': 'استمتع بوجبة نباتية خالية من الغلوتين في مطعم متوسطي محلي.',
  'Enjoy a vegetarian, gluten-free meal at a local Mediterranean restaurant': 'استمتع بوجبة نباتية خالية من الغلوتين في مطعم متوسطي محلي.'
  ,'Airport transfer to the hotel': 'الانتقال من المطار إلى الفندق',
  'Private car from': 'سيارة خاصة من',
  'airport to the hotel.': 'المطار إلى الفندق.',
  'Hotel check-in': 'تسجيل الوصول إلى الفندق',
  'Drop the bags, freshen up and settle in.': 'اترك الأمتعة وانتعش واستقر في الغرفة.',
  'Evening walk in': 'تمشية مسائية في',
  'Morning sightseeing in': 'جولة صباحية في',
  'A last morning exploring highlights of': 'صباح أخير لاستكشاف أبرز معالم',
  'Hotel check-out': 'تسجيل المغادرة من الفندق',
  'Leave bags with reception until departure.': 'اترك الأمتعة عند الاستقبال حتى موعد المغادرة.',
  'Farewell lunch in': 'غداء الوداع في',
  'A last relaxed meal before heading home.': 'وجبة هادئة أخيرة قبل العودة إلى المنزل.',
  'Transfer to the airport': 'الانتقال إلى المطار',
  'Private car from the hotel to': 'سيارة خاصة من الفندق إلى',
  'Morning activity in': 'نشاط صباحي في',
  'Lunch in': 'غداء في',
  'A welcoming first meal at a local restaurant in': 'وجبة ترحيب أولى في مطعم محلي في',
  'An easy evening stroll to explore the area.': 'تمشية مسائية هادئة لاستكشاف المنطقة.',
  'Explore a top-rated attraction in': 'استكشف أحد أبرز المعالم في',
  'A mid-day meal at a popular local spot.': 'وجبة منتصف اليوم في مكان محلي مشهور.',
  'Afternoon excursion in': 'رحلة بعد الظهر في',
  'Guided tour or free exploration in': 'جولة مرشدة أو استكشاف حر في',
  'Dinner in': 'عشاء في',
  'Evening meal at a recommended restaurant.': 'وجبة مسائية في مطعم موصى به.'
};
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
  if (!value) return value;
  if (language === 'en') {
    const englishDynamicValue = Object.entries({
      ...cityTranslations,
      ...countryTranslations,
      ...transportTranslations,
      ...activityTranslations
    }).find(([, arabic]) => arabic === value)?.[0];
    if (englishDynamicValue) return englishDynamicValue;
    const englishCity = Object.keys(cityTranslations).find(
      (city) => cityTranslations[city] === value
    );
    if (englishCity) return englishCity;
    const englishCountry = Object.keys(countryTranslations).find(
      (country) => countryTranslations[country] === value
    );
    return englishCountry || value;
  }
  if (cityTranslations[value]) return cityTranslations[value];
  if (transportTranslations[value]) return transportTranslations[value];
  if (activityTranslations[value]) return activityTranslations[value];
  const translatedComposite = Object.entries({
    ...cityTranslations,
    ...transportTranslations,
    ...activityTranslations
  }).reduce(
    (result, [english, arabic]) => result.replaceAll(english, arabic),
    value
  );
  if (translatedComposite !== value) return translatedComposite;
  if (countryTranslations[value]) return countryTranslations[value];
  if (ar[value]) return ar[value];
  if (ar._ui[value]) return ar._ui[value];
  const directKey = Object.keys(ar).find(
    (candidate) => normalizeText(candidate) === normalizeText(value)
  );
  if (directKey) return ar[directKey];
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
