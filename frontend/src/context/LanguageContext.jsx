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
  'Careem Comfort': 'كريم كومفورت',
  'Kareem Comfort': 'كريم كومفورت',
  'InDrive City-to-City': 'إن درايف بين المدن',
  'Flight (Air)': 'رحلة جوية',
  'Private Ride / InDrive': 'رحلة خاصة / إن درايف',
  'Private Ride / Careem': 'رحلة خاصة / كريم',
  'Private Ride / Kareem': 'رحلة خاصة / كريم',
  'Intercity Bus / Swvl': 'حافلة بين المدن / سويفل',
  'Coach Bus / Go Bus': 'حافلة سياحية / جو باص',
  'Direct domestic flight with 20kg baggage allowance.': 'رحلة جوية داخلية مباشرة مع أمتعة بوزن 20 كجم.',
  'Private AC car, direct door-to-door, fare agreed in advance upfront.': 'سيارة خاصة مكيفة من الباب إلى الباب، مع الاتفاق على الأجرة مسبقًا.',
  'Top-rated captain, modern spacious sedan, door-to-door luggage assistance.': 'سائق بتقييم مرتفع، وسيارة سيدان حديثة وواسعة مع مساعدة في نقل الأمتعة من الباب إلى الباب.',
  'High-comfort intercity mini-coach, reserved seating, onboard Wi-Fi, AC.': 'حافلة صغيرة مريحة بين المدن، بمقاعد محجوزة وواي فاي وتكييف.',
  'First-class reclining seats, individual media screens, complimentary refreshments.': 'مقاعد من الدرجة الأولى قابلة للإمالة، وشاشات فردية ومشروبات مجانية.'
};
const currencyTranslations = {
  EGP: 'ج.م',
  USD: '$',
  EUR: '€',
  GBP: '£',
  SAR: 'ر.س',
  AED: 'د.إ'
};

const activityTranslations = {
  // Hotel check-in & check-out
  'Hotel Check-in': 'تسجيل الوصول إلى الفندق',
  'Hotel check-in': 'تسجيل الوصول إلى الفندق',
  'Arrival and Hotel Check-in': 'الوصول وتسجيل الدخول إلى الفندق',
  'Arrive and check into the hotel.': 'الوصول وتسجيل الدخول إلى الفندق.',
  'Arrive and check into the hotel': 'الوصول وتسجيل الدخول إلى الفندق',
  'Drop the bags, freshen up and settle in.': 'اترك الأمتعة وانتعش واستقر في الغرفة.',
  'Drop the bags, freshen up and settle in': 'اترك الأمتعة وانتعش واستقر في الغرفة',
  'Hotel Check-out': 'تسجيل المغادرة من الفندق',
  'Hotel check-out': 'تسجيل المغادرة من الفندق',
  'Departure and Hotel Check-out': 'المغادرة وتسجيل الخروج من الفندق',
  'Check out and prepare for departure.': 'تسجيل المغادرة والاستعداد للسفر.',
  'Check out and prepare for departure': 'تسجيل المغادرة والاستعداد للسفر',
  'Leave bags with reception until departure.': 'اترك الأمتعة عند الاستقبال حتى موعد المغادرة.',
  'Leave bags with reception until departure': 'اترك الأمتعة عند الاستقبال حتى موعد المغادرة',
  'Airport Transfer': 'الانتقال إلى المطار',
  'Airport transfer': 'الانتقال إلى المطار',
  'Airport transfer to the hotel': 'الانتقال من المطار إلى الفندق',
  'Transfer to the airport': 'الانتقال إلى المطار',

  // Meals & Dining
  'Breakfast at Hotel': 'إفطار في الفندق',
  'Breakfast at hotel': 'إفطار في الفندق',
  'Buffet breakfast at the hotel.': 'بوفيه إفطار في الفندق.',
  'Buffet breakfast at the hotel': 'بوفيه إفطار في الفندق',
  'Final breakfast before departure.': 'إفطار أخير قبل المغادرة.',
  'Final breakfast before departure': 'إفطار أخير قبل المغادرة',
  'Lunch at Local Restaurant': 'غداء في مطعم محلي',
  'Lunch at local restaurant': 'غداء في مطعم محلي',
  'Traditional Egyptian Lunch': 'غداء مصري تقليدي',
  'Enjoy traditional Egyptian cuisine.': 'استمتع بالمأكولات المصرية التقليدية.',
  'Enjoy traditional Egyptian cuisine': 'استمتع بالمأكولات المصرية التقليدية',
  'Dinner at Seafood Grill': 'عشاء في مطعم مأكولات بحرية مشوية',
  'Dinner at seafood grill': 'عشاء في مطعم مأكولات بحرية مشوية',
  'Fresh seafood dinner by the beach.': 'عشاء مأكولات بحرية طازجة على الشاطئ.',
  'Fresh seafood dinner by the beach': 'عشاء مأكولات بحرية طازجة على الشاطئ',
  'Gluten-Free Dinner': 'عشاء خالٍ من الغلوتين',
  'Enjoy a vegetarian, gluten-free meal at a local Mediterranean restaurant.': 'استمتع بوجبة نباتية خالية من الغلوتين في مطعم متوسطي محلي.',
  'Enjoy a vegetarian, gluten-free meal at a local Mediterranean restaurant': 'استمتع بوجبة نباتية خالية من الغلوتين في مطعم متوسطي محلي.',
  'Egyptian Cooking Class': 'درس طبخ مصري',
  'A mid-day meal at a popular local spot.': 'وجبة منتصف اليوم في مكان محلي مشهور.',
  'Evening meal at a recommended restaurant.': 'وجبة مسائية في مطعم موصى به.',
  'A last relaxed meal before heading home.': 'وجبة هادئة أخيرة قبل العودة إلى المنزل.',

  // Diving & Water Activities
  'Scuba Diving': 'الغوص',
  'Scuba Diving Intro': 'مقدمة في الغوص',
  'Intro Scuba Diving': 'مقدمة في الغوص',
  'Begin diving course in the Red Sea.': 'بدء دورة الغوص في البحر الأحمر.',
  'Begin diving course in the Red Sea': 'بدء دورة الغوص في البحر الأحمر',
  'Advanced Diving Trip': 'رحلة غوص متقدمة',
  'Explore coral reefs with a guide.': 'استكشاف الشعاب المرجانية مع مرشد.',
  'Explore coral reefs with a guide': 'استكشاف الشعاب المرجانية مع مرشد',
  'Snorkeling Trip': 'رحلة غوص سطحي',
  'Beach Day': 'يوم على الشاطئ',

  // Sightseeing & Tours
  'Desert Safari Adventure': 'مغامرة سفاري في الصحراء',
  'Quad biking through the Eastern Desert hills for photography enthusiasts.': 'ركوب الدراجات الرباعية بين تلال الصحراء الشرقية لمحبي التصوير.',
  'Nile River Cruise': 'رحلة نيلية',
  'Sunset Felucca Ride': 'رحلة فلوكة عند الغروب',
  'Local Market Visit': 'زيارة السوق المحلي',
  'Hot Air Balloon Ride': 'رحلة بالمنطاد الهوائي',
  'Walking Tour': 'جولة سيرًا على الأقدام',
  'Free Time': 'وقت حر',
  'Downtown Exploration': 'استكشاف وسط المدينة',
  'Stroll around Tamr Henna square and take photos of the architecture.': 'تنزه حول ميدان تمر حنة والتقط صورًا للعمارة.',
  'Stroll around Tamr Henna square and take photos of the architecture': 'تنزه حول ميدان تمر حنة والتقط صورًا للعمارة',
  'An easy evening stroll to explore the area.': 'تمشية مسائية هادئة لاستكشاف المنطقة.',
  'Arrive in your resort and check into your resort.': 'الوصول إلى المنتجع وتسجيل الدخول إليه.',
  'Arrive in your resort and check in': 'الوصول إلى المنتجع وتسجيل الدخول',
  'Arrive in your resort': 'الوصول إلى المنتجع'
};


function normalizeText(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function translateTemplate(value, language) {
  if (language !== 'ar') return null;
  const str = value.trim();

  // "Transport to {City} airport." or "Transport to {City} airport"
  const mTransportAirport = str.match(/^Transport to (.+?) airport\.?$/i);
  if (mTransportAirport) {
    const cityName = translateValue(mTransportAirport[1], 'ar');
    return `الانتقال إلى مطار ${cityName}.`;
  }

  // "Private car from {City} airport to the hotel."
  const mCarFromAirport = str.match(/^Private car from (.+?) airport to the hotel\.?$/i);
  if (mCarFromAirport) {
    const cityName = translateValue(mCarFromAirport[1], 'ar');
    return `سيارة خاصة من مطار ${cityName} إلى الفندق.`;
  }

  // "Private car from the hotel to {City} airport."
  const mCarToAirport = str.match(/^Private car from the hotel to (.+?) airport\.?$/i);
  if (mCarToAirport) {
    const cityName = translateValue(mCarToAirport[1], 'ar');
    return `سيارة خاصة من الفندق إلى مطار ${cityName}.`;
  }

  // "Lunch in {City}"
  const mLunchIn = str.match(/^Lunch in (.+)$/i);
  if (mLunchIn) {
    const cityName = translateValue(mLunchIn[1], 'ar');
    return `غداء في ${cityName}`;
  }

  // "Dinner in {City}"
  const mDinnerIn = str.match(/^Dinner in (.+)$/i);
  if (mDinnerIn) {
    const cityName = translateValue(mDinnerIn[1], 'ar');
    return `عشاء في ${cityName}`;
  }

  // "Evening walk in {City}"
  const mEveningWalk = str.match(/^Evening walk in (.+)$/i);
  if (mEveningWalk) {
    const cityName = translateValue(mEveningWalk[1], 'ar');
    return `تمشية مسائية في ${cityName}`;
  }

  // "Morning sightseeing in {City}"
  const mMorningSight = str.match(/^Morning sightseeing in (.+)$/i);
  if (mMorningSight) {
    const cityName = translateValue(mMorningSight[1], 'ar');
    return `جولة صباحية في ${cityName}`;
  }

  // "Morning activity in {City}"
  const mMorningAct = str.match(/^Morning activity in (.+)$/i);
  if (mMorningAct) {
    const cityName = translateValue(mMorningAct[1], 'ar');
    return `نشاط صباحي في ${cityName}`;
  }

  // "Afternoon excursion in {City}"
  const mAfternoon = str.match(/^Afternoon excursion in (.+)$/i);
  if (mAfternoon) {
    const cityName = translateValue(mAfternoon[1], 'ar');
    return `رحلة بعد الظهر في ${cityName}`;
  }

  // "Farewell lunch in {City}"
  const mFarewell = str.match(/^Farewell lunch in (.+)$/i);
  if (mFarewell) {
    const cityName = translateValue(mFarewell[1], 'ar');
    return `غداء الوداع في ${cityName}`;
  }

  // "A last morning exploring highlights of {City}."
  const mLastMorning = str.match(/^A last morning exploring highlights of (.+?)\.?$/i);
  if (mLastMorning) {
    const cityName = translateValue(mLastMorning[1], 'ar');
    return `صباح أخير لاستكشاف أبرز معالم ${cityName}.`;
  }

  // "Explore a top-rated attraction in {City}."
  const mExplore = str.match(/^Explore a top-rated attraction in (.+?)\.?$/i);
  if (mExplore) {
    const cityName = translateValue(mExplore[1], 'ar');
    return `استكشف أحد أبرز المعالم في ${cityName}.`;
  }

  // "Guided tour or free exploration in {City}."
  const mGuided = str.match(/^Guided tour or free exploration in (.+?)\.?$/i);
  if (mGuided) {
    const cityName = translateValue(mGuided[1], 'ar');
    return `جولة مرشدة أو استكشاف حر في ${cityName}.`;
  }

  // "A welcoming first meal at a local restaurant in {City}."
  const mWelcoming = str.match(/^A welcoming first meal at a local restaurant in (.+?)\.?$/i);
  if (mWelcoming) {
    const cityName = translateValue(mWelcoming[1], 'ar');
    return `وجبة ترحيب أولى في مطعم محلي في ${cityName}.`;
  }

  return null;
}


function findFuzzyMatch(dict, value) {
  const norm = normalizeText(value).toLowerCase();
  const withoutDot = norm.replace(/\.$/, '');
  for (const [k, v] of Object.entries(dict)) {
    const kNorm = normalizeText(k).toLowerCase();
    const kWithoutDot = kNorm.replace(/\.$/, '');
    if (kNorm === norm || kWithoutDot === withoutDot) {
      return v;
    }
  }
  return null;
}

function translateValue(value, language) {
  if (!value || typeof value !== 'string') return value;

  if (language === 'en') {
    const allDicts = {
      ...currencyTranslations,
      ...cityTranslations,
      ...countryTranslations,
      ...transportTranslations,
      ...activityTranslations
    };
    const englishMatch = Object.entries(allDicts).find(([, arabic]) => arabic === value)?.[0];
    return englishMatch || value;
  }

  // Arabic lookup
  if (currencyTranslations[value]) return currencyTranslations[value];
  if (cityTranslations[value]) return cityTranslations[value];
  if (transportTranslations[value]) return transportTranslations[value];
  if (activityTranslations[value]) return activityTranslations[value];
  if (countryTranslations[value]) return countryTranslations[value];

  // Try template pattern matching
  const templateMatch = translateTemplate(value, language);
  if (templateMatch) return templateMatch;

  // Try case-insensitive / normalized lookup with or without periods
  const fuzzyActivity = findFuzzyMatch(activityTranslations, value);
  if (fuzzyActivity) return fuzzyActivity;

  const fuzzyTransport = findFuzzyMatch(transportTranslations, value);
  if (fuzzyTransport) return fuzzyTransport;

  const fuzzyCity = findFuzzyMatch(cityTranslations, value);
  if (fuzzyCity) return fuzzyCity;

  const fuzzyCountry = findFuzzyMatch(countryTranslations, value);
  if (fuzzyCountry) return fuzzyCountry;

  if (ar[value]) return ar[value];
  if (ar._ui && ar._ui[value]) return ar._ui[value];

  const directKey = Object.keys(ar).find(
    (candidate) => normalizeText(candidate) === normalizeText(value)
  );
  if (directKey) return ar[directKey];

  if (ar._ui) {
    const normalizedValue = normalizeText(value);
    const source = Object.keys(ar._ui).find(
      (candidate) => normalizeText(candidate) === normalizedValue
    );
    if (source) return ar._ui[source];
  }

  return value;
}

// Arabic currency names, written after the amount: "600 دولار" rather than "$ 600" or "USD 600",
// which read backwards in a right-to-left sentence.
const CURRENCY_AR = { EGP: 'جنيه', USD: 'دولار', EUR: 'يورو', GBP: 'جنيه إسترليني', SAR: 'ريال', AED: 'درهم' };

function formatMoney(amount, currency, language) {
  const number = Number(amount || 0).toLocaleString('en-US');
  if (language === 'ar') return `${number} ${CURRENCY_AR[currency] || currency || ''}`.trim();
  return `${currency || ''} ${number}`.trim();
}

const warnedKeys = new Set();
function warnMissing(key) {
  // Development only: lists the texts that still have no Arabic version.
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  console.warn(`[i18n] No Arabic text for "${key}"`);
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
  }, [language]);

  const value = useMemo(() => {
    const t = (key, fallback = key) => {
      const found = dictionaries[language]?.[key] ?? dictionaries[language]?._ui?.[key];
      if (found === undefined && import.meta.env.DEV && language === 'ar') warnMissing(key);
      return found ?? dictionaries.en?.[key] ?? dictionaries.en?._ui?.[key] ?? fallback;
    };
    // A whole sentence with its values filled in, so each language keeps its own word order:
    // tf('trips.dateRange', { from, to }) -> "من ١١ نوفمبر إلى ١٤ نوفمبر".
    const tf = (key, vars = {}) =>
      String(t(key)).replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
    // A number with its noun: Arabic has six plural forms ("مسافر واحد", "مسافران", "3 مسافرين",
    // "11 مسافرًا"), so "2 travelers" cannot be built as number + word.
    const tn = (key, count) => {
      const rule = new Intl.PluralRules(language === 'ar' ? 'ar' : 'en').select(count);
      const form = dictionaries[language]?.[`${key}.${rule}`] ?? t(`${key}.other`);
      return form.replace('{count}', Number(count).toLocaleString('en-US'));
    };
    return {
      lang: language,
      language,
      setLanguage,
      t,
      tf,
      tn,
      money: (amount, currency) => formatMoney(amount, currency, language),
      currencyLabel: (currency) => (language === 'ar' ? CURRENCY_AR[currency] || currency : currency),
      translate: (value) => translateValue(value, language),
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
