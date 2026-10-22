import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.js';
import './Illustration.css';

const THOUGHTS_EN = [
  'Pyramids or Red Sea? 🗺️',
  'Sunset felucca in Aswan? ⛵',
  'Dahab diving or Luxor temples? 🏛️',
  "Authentic Koshari with extra da'ah! 🍲",
  'Let’s plan something unforgettable! ✨',
];

const THOUGHTS_AR = [
  'الأهرامات ولا البحر الأحمر؟ 🗺️',
  'فلوكة في غروب أسوان؟ ⛵',
  'غوص في دهب ولا معابد الأقصر؟ 🏛️',
  'كشري أصيل بالدقة والصلصة! 🍲',
  'يلا نخطط لأحلى رحلة في مصر! ✨',
];

/**
 * Thinking Traveler holding an unfolded Egypt map with interactive thought bubble.
 */
export function ThinkingTraveler({ className = '', onIdeaClick }) {
  const { language } = useLanguage();
  const [thoughtIndex, setThoughtIndex] = useState(0);
  const [bouncing, setBouncing] = useState(false);

  const thoughts = language === 'ar' ? THOUGHTS_AR : THOUGHTS_EN;
  const currentThought = thoughts[thoughtIndex];

  const handleNextThought = () => {
    setBouncing(true);
    setThoughtIndex((prev) => (prev + 1) % thoughts.length);
    setTimeout(() => setBouncing(false), 500);
    if (onIdeaClick) onIdeaClick(thoughts[(thoughtIndex + 1) % thoughts.length]);
  };

  return (
    <div
      className={`ayn-thinking-traveler ${bouncing ? 'ayn-thinking-traveler--bounce' : ''} ${className}`}
      onClick={handleNextThought}
      role="button"
      tabIndex={0}
      title={language === 'ar' ? 'انقر لتغيير الفكرة!' : 'Click to explore thoughts!'}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleNextThought();
        }
      }}
    >
      {/* 1. Floating Thought Bubble */}
      <div className="ayn-thought-bubble">
        <span className="ayn-thought-bubble__text">{currentThought}</span>
        <div className="ayn-thought-bubble__dots" aria-hidden="true">
          <span className="ayn-thought-bubble__dot ayn-thought-bubble__dot--1" />
          <span className="ayn-thought-bubble__dot ayn-thought-bubble__dot--2" />
          <span className="ayn-thought-bubble__dot ayn-thought-bubble__dot--3" />
        </div>
      </div>

      {/* 2. Vector Character: Thinking + Holding Map */}
      <svg
        className="ayn-thinking-traveler__svg"
        viewBox="0 0 110 140"
        width="110"
        height="140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Soft shadow */}
        <ellipse cx="55" cy="134" rx="28" ry="5" fill="#2B2118" opacity="0.14" />

        {/* Legs with rolled up explorer khakis */}
        <path d="M44 95 L44 125 L38 127" stroke="#3A2C21" strokeWidth="6" strokeLinecap="round" />
        <path d="M66 95 L66 125 L72 127" stroke="#3A2C21" strokeWidth="6" strokeLinecap="round" />
        {/* Explorer Boots */}
        <rect x="33" y="123" width="13" height="7" rx="3.5" fill="#B5472F" />
        <rect x="64" y="123" width="13" height="7" rx="3.5" fill="#B5472F" />

        {/* Body / Explorer vest over sky blue tee */}
        <rect x="39" y="56" width="32" height="42" rx="10" fill="#1F5F8B" />
        {/* Vest open */}
        <path d="M39 56 L47 98 L39 98 Z" fill="#E9D8A6" opacity="0.8" />
        <path d="M71 56 L63 98 L71 98 Z" fill="#E9D8A6" opacity="0.8" />

        {/* Left Hand holding open Egypt Map */}
        <g className="ayn-thinking-char__map-arm">
          <path d="M42 66 C28 72 24 82 28 92" stroke="#1F5F8B" strokeWidth="5.5" strokeLinecap="round" fill="none" />
          {/* Folded Map of Egypt */}
          <g transform="translate(10, 80) rotate(-12)">
            {/* Map Paper */}
            <rect x="0" y="0" width="30" height="24" rx="3" fill="#FFFDF8" stroke="#2B2118" strokeWidth="1.2" />
            {/* Fold line */}
            <line x1="15" y1="0" x2="15" y2="24" stroke="#D8C8B0" strokeWidth="0.8" strokeDasharray="2,2" />
            {/* Blue Nile curve on the map */}
            <path d="M12 2 C16 8 10 14 14 22" stroke="#1F5F8B" strokeWidth="1.4" strokeLinecap="round" fill="none" />
            {/* Tiny golden pyramid on the map */}
            <polygon points="17,6 21,12 13,12" fill="#F5A623" />
          </g>
          {/* Hand holding map corner */}
          <circle cx="28" cy="91" r="3.5" fill="#D49A6A" />
        </g>

        {/* Right Arm: Classic Chin-Tapping "Thinking" Posture */}
        <g className="ayn-thinking-char__chin-arm">
          {/* Upper arm down, forearm up to chin */}
          <path d="M68 66 C78 74 76 82 72 82 C68 82 62 60 56 46" stroke="#1F5F8B" strokeWidth="5" strokeLinecap="round" fill="none" />
          {/* Hand cupping chin */}
          <circle cx="56" cy="45" r="4" fill="#D49A6A" />
          {/* Tapping finger */}
          <path d="M54 44 L52 40" stroke="#D49A6A" strokeWidth="2.5" strokeLinecap="round" />
        </g>

        {/* Head & Thoughtful Face */}
        <g className="ayn-thinking-char__head">
          <circle cx="55" cy="36" r="14" fill="#D49A6A" />
          {/* Curly hair bangs */}
          <circle cx="45" cy="27" r="6" fill="#4A3423" />
          <circle cx="53" cy="24" r="7" fill="#4A3423" />
          <circle cx="63" cy="26" r="6.5" fill="#4A3423" />
          {/* Explorer Hat */}
          <ellipse cx="55" cy="24" rx="20" ry="5" fill="#B5472F" />
          <path d="M43 24 C43 14 67 14 67 24 Z" fill="#B5472F" />
          <rect x="44" y="21" width="22" height="3" fill="#F5A623" />

          {/* Eyes looking up and sideways in contemplation */}
          <circle cx="50" cy="34" r="1.8" fill="#2B2118" />
          <circle cx="59" cy="34" r="1.8" fill="#2B2118" />
          {/* Spark in eyes */}
          <circle cx="49.5" cy="33.5" r="0.6" fill="#FFFFFF" />
          <circle cx="58.5" cy="33.5" r="0.6" fill="#FFFFFF" />

          {/* Curious raised eyebrow */}
          <path d="M47 30 Q50 28 53 30" stroke="#2B2118" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <path d="M57 29 Q60 27 63 29" stroke="#2B2118" strokeWidth="1.2" strokeLinecap="round" fill="none" />

          {/* Cute thoughtful mouth (slight sideways smile) */}
          <path d="M52 40 Q56 42 60 39" stroke="#2B2118" strokeWidth="1.3" strokeLinecap="round" fill="none" />
        </g>
      </svg>
    </div>
  );
}

export default ThinkingTraveler;
