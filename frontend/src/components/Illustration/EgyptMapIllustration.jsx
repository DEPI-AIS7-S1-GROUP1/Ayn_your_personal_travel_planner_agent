import { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext.js';
import './Illustration.css';

/**
 * Organic Interactive Egypt Map (Part 1 - Refined Specification)
 *
 * Requirements Met:
 * 1. Layout & Shape:
 *    - No rectangular card around the map.
 *    - Accurate simplified silhouette inside soft organic sea water blobs (not rectangles).
 *    - Form panel with organic radii and soft shadow.
 *    - Subtle flowing River Nile ribbon from Aswan to Cairo, fanning into Delta.
 *
 * 2. No Permanent Text Labels:
 *    - Clean and label-free at rest. No name chips or tiny text cluttering the map.
 *    - Each destination is an illustrated landmark icon in an accessible button.
 *    - City name appears ONLY as a hand-drawn-style tooltip on hover (desktop), on tap (mobile),
 *      or on keyboard focus. Min 14px font, in Arabic when AR mode.
 *    - Every pin is a real <button> with aria-label, visible focus ring, and min 44px tap target.
 *
 * 3. Accurate Placement:
 *    - Alexandria sailboat sits in Mediterranean water off the coast.
 *    - Red Sea fish / divers / turtles sit in the Red Sea / Gulf of Aqaba waters.
 *    - Nile felucca sits in River Nile water.
 *    - Pyramids, temple columns, oasis palms, waterwheel sit firmly on sand land.
 *
 * 4. Selection & Ephemeral Route:
 *    - Selected pin gets pulsing ring and spring bounce.
 *    - No permanent route line between cities at rest.
 *    - When origin or destination changes (and both are within Egypt), an ephemeral curved route
 *      draws itself once with a tiny traveling plane, then smoothly fades out and unmounts after ~2.5s.
 *
 * 5. Subtle Ambient Life:
 *    - Sea waves gently undulating, Mediterranean sailboat bobbing, Red Sea cruiser,
 *      desert camel trekking across dunes, soaring falcons, and vintage compass rose.
 *    - Calmed down and subtle to avoid distraction.
 *
 * 6. Responsive & Geographically-Locked RTL:
 *    - Mobile: map above form, 44px tap targets, 16px tooltip font.
 *    - RTL: page layout mirrors, but map artwork maintains direction: ltr so Egypt never flips.
 *    - Full support for prefers-reduced-motion.
 */

const CITIES = [
  {
    id: 'Cairo',
    nameEn: 'Cairo',
    nameAr: 'القاهرة',
    taglineEn: 'Pyramids of Giza & Nile Capital',
    taglineAr: 'أهرامات الجيزة وعاصمة النيل',
    x: 420,
    y: 235,
    type: 'pyramids',
    isLand: true,
  },
  {
    id: 'Alexandria',
    nameEn: 'Alexandria',
    nameAr: 'الإسكندرية',
    taglineEn: 'Pearl of the Mediterranean',
    taglineAr: 'عروس البحر الأبيض المتوسط',
    x: 370,
    y: 105,
    type: 'sailboat',
    isWater: true,
  },
  {
    id: 'Luxor',
    nameEn: 'Luxor',
    nameAr: 'الأقصر',
    taglineEn: 'Valley of the Kings & Temples',
    taglineAr: 'وادي الملوك وعاصمة الآثار',
    x: 502,
    y: 435,
    type: 'temple',
    isLand: true,
  },
  {
    id: 'Aswan',
    nameEn: 'Aswan',
    nameAr: 'أسوان',
    taglineEn: 'Nile Feluccas & Nubian Sun',
    taglineAr: 'فلوكات النيل وسحر النوبة',
    x: 495,
    y: 515,
    type: 'felucca',
    isWater: true,
  },
  {
    id: 'Hurghada',
    nameEn: 'Hurghada',
    nameAr: 'الغردقة',
    taglineEn: 'Coral Reefs & Island Diving',
    taglineAr: 'الشعاب المرجانية وجزر البحر الأحمر',
    x: 578,
    y: 360,
    type: 'fish',
    isWater: true,
  },
  {
    id: 'Sharm El Sheikh',
    nameEn: 'Sharm El Sheikh',
    nameAr: 'شرم الشيخ',
    taglineEn: 'Ras Muhammad & Deep Sea Reefs',
    taglineAr: 'رأس محمد وغوص الأعماق',
    x: 580,
    y: 332,
    type: 'diver',
    isWater: true,
  },
  {
    id: 'Dahab',
    nameEn: 'Dahab',
    nameAr: 'دهب',
    taglineEn: 'Blue Hole & Golden Serenity',
    taglineAr: 'البلو هول وسحر الهدوء',
    x: 608,
    y: 275,
    type: 'turtle',
    isWater: true,
  },
  {
    id: 'Siwa Oasis',
    nameEn: 'Siwa',
    nameAr: 'سيوة',
    taglineEn: 'Salt Lakes & Date Palm Oasis',
    taglineAr: 'بحيرات الملح وواحة النخيل',
    x: 170,
    y: 240,
    type: 'palm',
    isLand: true,
  },
  {
    id: 'Faiyum',
    nameEn: 'Faiyum',
    nameAr: 'الفيوم',
    taglineEn: 'Historic Waterwheels & Waterfalls',
    taglineAr: 'السواقي وشلالات وادي الريان',
    x: 415,
    y: 280,
    type: 'waterwheel',
    isLand: true,
  },
];

const ORIGIN_COORDS = {
  'Cairo': { x: 420, y: 235 },
  'Giza': { x: 415, y: 242 },
  'Alexandria': { x: 370, y: 130 },
  'Hurghada': { x: 578, y: 360 },
  'Hurghada (Red Sea)': { x: 578, y: 360 },
  'Sharm El Sheikh': { x: 580, y: 332 },
  'Sharm El Sheikh (South Sinai)': { x: 580, y: 332 },
  'Luxor': { x: 502, y: 435 },
  'Aswan': { x: 495, y: 515 },
  'Dahab': { x: 608, y: 275 },
  'Siwa Oasis': { x: 170, y: 240 },
  'Faiyum': { x: 415, y: 280 },
  'Beni Suef': { x: 445, y: 300 },
  'Minya': { x: 450, y: 335 },
  'Asyut': { x: 465, y: 375 },
  'Sohag': { x: 480, y: 405 },
  'Qena': { x: 515, y: 425 },
  'Port Said': { x: 495, y: 135 },
  'Ismailia': { x: 490, y: 185 },
  'Suez': { x: 490, y: 225 },
  'North Sinai (Arish)': { x: 580, y: 145 },
  'Matrouh (North Coast)': { x: 240, y: 135 },
  'Beheira (Damanhur)': { x: 400, y: 155 },
  'Damietta': { x: 475, y: 125 },
};

function LandmarkIcon({ type }) {
  switch (type) {
    case 'pyramids':
      return (
        <svg viewBox="0 0 24 24" className="ayn-pin-svg" aria-hidden="true">
          <polygon points="12,4 21,19 3,19" fill="#F5A623" stroke="#2B2118" strokeWidth="1.2" strokeLinejoin="round" />
          <polygon points="12,4 21,19 16,19" fill="#D98A16" />
          <polygon points="4,11 9,3 15,11" fill="#F5A623" stroke="#2B2118" strokeWidth="0.8" strokeLinejoin="round" />
        </svg>
      );
    case 'sailboat':
      return (
        <svg viewBox="0 0 24 24" className="ayn-pin-svg" aria-hidden="true">
          <path d="M4,17 L20,17 L17,21 L7,21 Z" fill="#B5472F" stroke="#2B2118" strokeWidth="1" strokeLinejoin="round" />
          <path d="M11,16 L11,3 L20,15 Z" fill="#FFFFFF" stroke="#2B2118" strokeWidth="1" strokeLinejoin="round" />
          <line x1="11" y1="16" x2="6" y2="16" stroke="#1F5F8B" strokeWidth="1" />
        </svg>
      );
    case 'temple':
      return (
        <svg viewBox="0 0 24 24" className="ayn-pin-svg" aria-hidden="true">
          <rect x="5" y="8" width="4.5" height="12" rx="1" fill="#B5472F" stroke="#2B2118" strokeWidth="0.9" />
          <rect x="3.5" y="4" width="7.5" height="4" rx="0.8" fill="#F5A623" stroke="#2B2118" strokeWidth="0.9" />
          <rect x="14.5" y="8" width="4.5" height="12" rx="1" fill="#B5472F" stroke="#2B2118" strokeWidth="0.9" />
          <rect x="13" y="4" width="7.5" height="4" rx="0.8" fill="#F5A623" stroke="#2B2118" strokeWidth="0.9" />
        </svg>
      );
    case 'felucca':
      return (
        <svg viewBox="0 0 24 24" className="ayn-pin-svg" aria-hidden="true">
          <path d="M4,16 L20,16 L17,20 L7,20 Z" fill="#7A4D2E" stroke="#2B2118" strokeWidth="1" strokeLinejoin="round" />
          <path d="M12,15 L12,2 L21,14 Z" fill="#FFFFFF" stroke="#2B2118" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      );
    case 'fish':
      return (
        <svg viewBox="0 0 24 24" className="ayn-pin-svg" aria-hidden="true">
          <path d="M5,12 C5,6 15,6 19,12 C15,18 5,18 5,12 Z" fill="#147A82" stroke="#2B2118" strokeWidth="1" />
          <polygon points="17,12 23,7.5 23,16.5" fill="#F5A623" stroke="#2B2118" strokeWidth="0.9" strokeLinejoin="round" />
          <circle cx="10" cy="10.5" r="1.4" fill="#FFFFFF" />
          <circle cx="10" cy="10.5" r="0.7" fill="#2B2118" />
        </svg>
      );
    case 'diver':
      return (
        <svg viewBox="0 0 24 24" className="ayn-pin-svg" aria-hidden="true">
          <circle cx="15" cy="8" r="3.2" fill="#FAF5EC" stroke="#2B2118" strokeWidth="0.9" />
          <path d="M14,9 L18,9" stroke="#1F5F8B" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M13,11 L8,15 L4,17" stroke="#B5472F" strokeWidth="2.4" strokeLinecap="round" />
          <rect x="9" y="10" width="3.2" height="6" rx="1" fill="#F5A623" stroke="#2B2118" strokeWidth="0.7" />
          <circle cx="18" cy="4" r="1.2" fill="#147A82" opacity="0.8" />
          <circle cx="20" cy="2" r="1.5" fill="#147A82" opacity="0.6" />
        </svg>
      );
    case 'turtle':
      return (
        <svg viewBox="0 0 24 24" className="ayn-pin-svg" aria-hidden="true">
          <ellipse cx="12" cy="12" rx="6.5" ry="7.5" fill="#2E7D52" stroke="#2B2118" strokeWidth="1" />
          <circle cx="12" cy="4" r="2.6" fill="#2E7D52" stroke="#2B2118" strokeWidth="0.9" />
          <path d="M6,7 L3,4 M18,7 L21,4 M6,17 L3,20 M18,17 L21,20" stroke="#2E7D52" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3" fill="#58A87B" />
        </svg>
      );
    case 'palm':
      return (
        <svg viewBox="0 0 24 24" className="ayn-pin-svg" aria-hidden="true">
          <path d="M11,21 Q12,13 14,8" stroke="#7A4D2E" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M14,8 Q6,4 3,10" stroke="#2D7D46" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M14,8 Q20,4 22,10" stroke="#2D7D46" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M14,8 Q14,-1 11,-2" stroke="#2D7D46" strokeWidth="2" strokeLinecap="round" fill="none" />
          <circle cx="13" cy="9" r="1.5" fill="#F5A623" />
        </svg>
      );
    case 'waterwheel':
    default:
      return (
        <svg viewBox="0 0 24 24" className="ayn-pin-svg" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" fill="none" stroke="#6B4226" strokeWidth="2.2" />
          <line x1="3.5" y1="12" x2="20.5" y2="12" stroke="#6B4226" strokeWidth="1.4" />
          <line x1="12" y1="3.5" x2="12" y2="20.5" stroke="#6B4226" strokeWidth="1.4" />
          <line x1="6" y1="6" x2="18" y2="18" stroke="#6B4226" strokeWidth="1.4" />
          <line x1="6" y1="18" x2="18" y2="6" stroke="#6B4226" strokeWidth="1.4" />
          <circle cx="12" cy="12" r="2.8" fill="#F5A623" />
        </svg>
      );
  }
}

export function EgyptMapIllustration({
  className = '',
  originCity = 'Cairo',
  selectedCity = 'Sharm El Sheikh',
  onSelectCity,
}) {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  // Ephemeral flight route animation state: draws once, then gently fades out after ~2.4s
  const [showRoute, setShowRoute] = useState(false);
  const [routeFading, setRouteFading] = useState(false);

  const originCoord = ORIGIN_COORDS[originCity];
  const destCityObj = CITIES.find((c) => c.id === selectedCity) || CITIES[0];
  const destCoord = { x: destCityObj.x, y: destCityObj.y };
  const isDomesticRoute = originCoord && (originCoord.x !== destCoord.x || originCoord.y !== destCoord.y);

  // Calculate gentle curved flight route
  let routePath = '';
  if (isDomesticRoute) {
    const midX = (originCoord.x + destCoord.x) / 2;
    const midY = (originCoord.y + destCoord.y) / 2;
    const dx = destCoord.x - originCoord.x;
    const dy = destCoord.y - originCoord.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const arcHeight = Math.max(35, Math.min(70, dist * 0.28));
    const ctrlX = midX - (dy / (dist || 1)) * (arcHeight * 0.35);
    const ctrlY = midY - arcHeight;
    routePath = `M ${originCoord.x} ${originCoord.y} Q ${ctrlX} ${ctrlY} ${destCoord.x} ${destCoord.y}`;
  }

  // Trigger single-play ephemeral route whenever selection changes
  useEffect(() => {
    if (!isDomesticRoute) {
      setShowRoute(false);
      setRouteFading(false);
      return;
    }

    setShowRoute(true);
    setRouteFading(false);

    const fadeTimer = setTimeout(() => {
      setRouteFading(true);
    }, 2200);

    const unmountTimer = setTimeout(() => {
      setShowRoute(false);
      setRouteFading(false);
    }, 2800);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, [originCity, selectedCity, isDomesticRoute]);

  return (
    <div className={`ayn-egypt-world ${className}`} style={{ direction: 'ltr' }}>
      {/* 1. Underlying Organic Vector Map SVG */}
      <svg
        className="ayn-egypt-world__svg"
        viewBox="0 0 760 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          {/* Mediterranean Sea Soft Watercolor Gradient */}
          <linearGradient id="ayn-med-sea" x1="50" y1="10" x2="680" y2="150" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#C6E8F6" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#D9F1FA" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#EBF6FC" stopOpacity="0.5" />
          </linearGradient>

          {/* Red Sea & Gulfs Soft Watercolor Gradient */}
          <linearGradient id="ayn-red-sea" x1="500" y1="200" x2="720" y2="540" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#BAE6EE" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#D2F0F5" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#EBF8FA" stopOpacity="0.5" />
          </linearGradient>

          {/* Warm Sand Landmass Gradient */}
          <linearGradient id="ayn-land-grad" x1="100" y1="150" x2="660" y2="550" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFBF2" />
            <stop offset="65%" stopColor="#FAF2E4" />
            <stop offset="100%" stopColor="#F5E8D3" />
          </linearGradient>

          {/* Lush Green Delta Gradient */}
          <linearGradient id="ayn-delta-grad" x1="370" y1="125" x2="480" y2="235" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#C8EACA" />
            <stop offset="100%" stopColor="#E4F5E6" />
          </linearGradient>

          {/* Soft Organic Drop Shadow for Land */}
          <filter id="ayn-soft-shadow" x="-8%" y="-8%" width="116%" height="116%">
            <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#2B2118" floodOpacity="0.08" />
          </filter>
        </defs>

        {/* ========================================================
            ORGANIC SURROUNDING SEA SHAPES (Irregular Blobs)
            ======================================================== */}

        {/* Mediterranean Sea Irregular Organic Blob (North) */}
        <path
          className="ayn-organic-sea ayn-organic-sea--med"
          d="M 30,150
             C 10,80 70,20 170,15
             C 280,8 410,25 510,15
             C 620,5 720,40 740,110
             C 755,160 700,185 640,170
             C 580,155 520,160 480,145
             C 430,125 360,130 300,140
             C 210,150 100,140 30,150 Z"
          fill="url(#ayn-med-sea)"
        />

        {/* Gentle Mediterranean Wave Ripples */}
        <g className="ayn-map-waves ayn-map-waves--med">
          <path d="M 90,55 Q 125,48 160,55 T 230,55" stroke="#1F5F8B" strokeWidth="1.8" strokeLinecap="round" opacity="0.32" fill="none" />
          <path d="M 280,75 Q 315,68 350,75 T 420,75" stroke="#1F5F8B" strokeWidth="1.8" strokeLinecap="round" opacity="0.32" fill="none" />
          <path d="M 480,45 Q 515,38 550,45 T 620,45" stroke="#1F5F8B" strokeWidth="1.8" strokeLinecap="round" opacity="0.32" fill="none" />
        </g>

        {/* Red Sea & Gulfs of Suez and Aqaba Irregular Organic Blob (East) */}
        <path
          className="ayn-organic-sea ayn-organic-sea--red"
          d="M 485,225
             C 502,255 520,290 545,320
             C 555,332 570,345 580,360
             C 610,405 645,465 695,530
             C 730,570 755,540 750,470
             C 745,390 730,280 720,210
             C 715,180 670,180 625,200
             C 610,230 598,265 588,290
             C 576,270 560,245 540,225
             C 525,205 500,205 485,225 Z"
          fill="url(#ayn-red-sea)"
        />

        {/* Red Sea Gentle Wave Ripples */}
        <g className="ayn-map-waves ayn-map-waves--red">
          <path d="M 630,380 Q 650,372 670,380" stroke="#147A82" strokeWidth="1.8" strokeLinecap="round" opacity="0.35" fill="none" />
          <path d="M 670,455 Q 690,447 710,455" stroke="#147A82" strokeWidth="1.8" strokeLinecap="round" opacity="0.35" fill="none" />
        </g>

        {/* ========================================================
            ACCURATE SIMPLIFIED EGYPT SILHOUETTE
            ======================================================== */}

        {/* Egypt Mainland */}
        <path
          className="ayn-egypt-landmass"
          d="M 60,145
             C 140,135 220,140 310,135
             C 350,130 400,145 470,140
             C 490,140 500,165 488,225
             C 502,255 520,290 545,335
             C 575,390 615,450 680,555
             L 60,555
             Z"
          fill="url(#ayn-land-grad)"
          stroke="#D4BE9E"
          strokeWidth="2.5"
          strokeLinejoin="round"
          filter="url(#ayn-soft-shadow)"
        />

        {/* Sinai Peninsula (Triangular land between Gulf of Suez & Aqaba) */}
        <path
          className="ayn-egypt-sinai"
          d="M 495,140
             C 535,145 575,140 610,140
             C 610,175 600,225 590,265
             C 580,290 575,310 570,318
             C 560,295 540,260 520,230
             C 505,195 495,160 495,140 Z"
          fill="#FAF3E6"
          stroke="#D4BE9E"
          strokeWidth="2.2"
          strokeLinejoin="round"
          filter="url(#ayn-soft-shadow)"
        />

        {/* Lush Green Delta Fan */}
        <path
          className="ayn-delta-fan"
          d="M 370,130
             Q 430,118 480,138
             L 440,235 Z"
          fill="url(#ayn-delta-grad)"
          stroke="#B8DCBC"
          strokeWidth="1.2"
        />

        {/* ========================================================
            SUBTLE ANIMATED FLOWING RIVER NILE RIBBON
            ======================================================== */}

        {/* Nile Ribbon from Aswan up to Cairo */}
        <path
          className="ayn-map-nile-river"
          d="M 495,555
             C 495,530 502,495 495,475
             C 485,455 515,445 502,435
             C 470,425 455,405 450,375
             C 445,345 432,315 428,285
             C 425,260 435,245 440,235"
          stroke="#1F5F8B"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Rosetta & Damietta Branches into Mediterranean */}
        <path
          className="ayn-map-nile-branch"
          d="M 440,235 C 415,190 385,158 370,130"
          stroke="#1F5F8B"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          className="ayn-map-nile-branch"
          d="M 440,235 C 465,190 478,162 480,138"
          stroke="#1F5F8B"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* ========================================================
            SUBTLE AMBIENT LIFE (Calm, low-key, non-distracting)
            ======================================================== */}

        {/* Desert Dunes in Western Desert */}
        <g stroke="#E4D2B8" strokeWidth="2.2" strokeLinecap="round" fill="none">
          <path d="M 110,330 Q 150,312 190,330" />
          <path d="M 200,370 Q 240,352 280,370" />
          <path d="M 130,430 Q 170,410 210,430" />
        </g>

        {/* Subtle Trekking Camel */}
        <g className="ayn-map-camel">
          <path d="M-7,2 Q-4,-4 0,-1 Q4,-7 7,-1 L9,3 L7,6 L-7,6 Z" fill="#D4A76A" stroke="#2B2118" strokeWidth="0.8" />
          <path d="M7,0 Q11,-3 13,-5 Q15,-7 16,-4 L14,-2 L9,3" fill="#D4A76A" stroke="#2B2118" strokeWidth="0.8" />
          <line x1="-5" y1="6" x2="-5" y2="12" stroke="#2B2118" strokeWidth="1.1" strokeLinecap="round" />
          <line x1="-2" y1="6" x2="-1" y2="11" stroke="#2B2118" strokeWidth="1.1" strokeLinecap="round" />
          <line x1="4" y1="6" x2="5" y2="12" stroke="#2B2118" strokeWidth="1.1" strokeLinecap="round" />
          <line x1="7" y1="6" x2="8" y2="11" stroke="#2B2118" strokeWidth="1.1" strokeLinecap="round" />
          <rect x="0" y="0" width="4.5" height="3.5" rx="1" fill="#B5472F" />
        </g>

        {/* Distant Soaring Falcons */}
        <g className="ayn-map-birds ayn-map-birds--1">
          <path d="M 0,0 Q 2.5,-2.5 5,0 Q 7.5,-2.5 10,0" stroke="#7A5232" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </g>

        {/* Mediterranean Sailing Cutter (Cruising offshore) */}
        <g className="ayn-map-ship ayn-map-ship--med">
          <path d="M-12,3 L12,3 L15,0 L-14,0 Z" fill="#FFFFFF" stroke="#2B2118" strokeWidth="0.9" strokeLinejoin="round" />
          <path d="M-11,3 L11,3 L9,5.5 L-9,5.5 Z" fill="#1F5F8B" />
          <rect x="-5" y="-4" width="10" height="4" rx="1" fill="#FAF6EE" stroke="#2B2118" strokeWidth="0.7" />
          <rect x="-1" y="-7" width="2.5" height="3" fill="#F5A623" />
        </g>

        {/* Red Sea Passenger Cruiser */}
        <g className="ayn-map-ship ayn-map-ship--redsea">
          <path d="M-14,5 L16,5 L20,0 L-16,0 Z" fill="#FFFFFF" stroke="#2B2118" strokeWidth="0.9" strokeLinejoin="round" />
          <path d="M-13,5 L15,5 L12,7.5 L-11,7.5 Z" fill="#147A82" />
          <rect x="-7" y="-5" width="15" height="5" rx="1.2" fill="#FAF6EE" stroke="#2B2118" strokeWidth="0.7" />
          <rect x="-3" y="-8.5" width="3.5" height="3.5" fill="#B5472F" />
        </g>

        {/* Vintage Nautical Compass Rose (Western Desert) */}
        <g className="ayn-map-compass" transform="translate(95, 505)">
          <circle cx="0" cy="0" r="24" fill="#FAF6EE" stroke="#D8C5A8" strokeWidth="1.4" />
          <circle cx="0" cy="0" r="20" fill="none" stroke="#2B2118" strokeWidth="0.8" strokeDasharray="2 2" />
          <polygon points="0,-18 3.5,-4 18,0 3.5,4 0,18 -3.5,4 -18,0 -3.5,-4" fill="#FAF6EE" stroke="#2B2118" strokeWidth="0.9" />
          <polygon points="0,-18 3.5,-4 0,0" fill="#B5472F" />
          <polygon points="0,-18 -3.5,-4 0,0" fill="#2B2118" />
          <text x="0" y="-21" textAnchor="middle" fontSize="9" fontWeight="800" fill="#B5472F">N</text>
        </g>

        {/* ========================================================
            EPHEMERAL FLIGHT ROUTE (Plays once, then fades out)
            ======================================================== */}
        {showRoute && (
          <g key={`${originCity}-${selectedCity}`} className={`ayn-map-ephemeral-route ${routeFading ? 'ayn-map-route--fading' : ''}`}>
            {/* Background path glow */}
            <path
              d={routePath}
              fill="none"
              stroke="#F5A623"
              strokeWidth="4.5"
              strokeLinecap="round"
              opacity="0.3"
            />
            {/* Animated single-draw dashed arc */}
            <path
              d={routePath}
              fill="none"
              stroke="#B5472F"
              strokeWidth="2.5"
              strokeDasharray="6 6"
              strokeLinecap="round"
              className="ayn-map-route-draw-once"
            />
            {/* Origin marker dot */}
            <circle cx={originCoord.x} cy={originCoord.y} r="4.5" fill="#B5472F" stroke="#FFFFFF" strokeWidth="1.8" />

            {/* Traveling Airplane gliding once to destination */}
            <g className="ayn-map-traveler-plane">
              <path
                d="M-7,-1 L3,-5 L2,-2 L9,0 L2,2 L3,5 L-7,1 L-4,0 Z"
                fill="#B5472F"
                stroke="#FFFFFF"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <circle cx="2" cy="0" r="0.9" fill="#F5A623" />
              <animateMotion
                path={routePath}
                dur="1.8s"
                repeatCount="1"
                fill="freeze"
                rotate="auto"
              />
            </g>
          </g>
        )}
      </svg>

      {/* 2. Real Accessible Interactive HTML Buttons Layer */}
      <div className="ayn-egypt-world__pins-layer">
        {CITIES.map((c) => {
          const isSelected = selectedCity === c.id;
          const label = isAr ? c.nameAr : c.nameEn;
          const tagline = isAr ? c.taglineAr : c.taglineEn;

          return (
            <button
              key={c.id}
              type="button"
              className={`ayn-map-pin-btn ${isSelected ? 'ayn-map-pin-btn--selected' : ''}`}
              style={{
                left: `${(c.x / 760) * 100}%`,
                top: `${(c.y / 600) * 100}%`,
              }}
              onClick={() => onSelectCity && onSelectCity(c.id)}
              aria-label={`${label} - ${tagline}`}
            >
              {/* Pulsing concentric selection waves */}
              {isSelected && (
                <>
                  <span className="ayn-map-pin-btn__pulse" aria-hidden="true" />
                  <span className="ayn-map-pin-btn__pulse-outer" aria-hidden="true" />
                </>
              )}

              {/* Landmark Shield */}
              <span className="ayn-map-pin-btn__shield">
                <LandmarkIcon type={c.type} />
              </span>

              {/* Hand-drawn style Tooltip (Appears ONLY on hover / focus / tap) */}
              <span className="ayn-map-pin-btn__tooltip" role="tooltip">
                <span className="ayn-map-pin-btn__tooltip-title">{label}</span>
                <span className="ayn-map-pin-btn__tooltip-tagline">{tagline}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default EgyptMapIllustration;
