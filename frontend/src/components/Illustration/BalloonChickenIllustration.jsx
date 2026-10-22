import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.js';

/**
 * Balloon Chicken / Chick Illustration
 * A playful little chick holding onto a colorful balloon string,
 * ascending from the bottom of the screen and disappearing into the sky!
 */
export function BalloonChickenIllustration() {
  const { language } = useLanguage();
  const [chirp, setChirp] = useState(false);

  const handleClick = (e) => {
    e.stopPropagation();
    setChirp(true);
    setTimeout(() => setChirp(false), 2000);
  };

  return (
    <div
      className="ayn-balloon-chicken-wrapper"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      title={language === 'ar' ? 'كتكوت طاير بالبلونة! 🎈' : 'A flying chick with a balloon! 🎈'}
    >
      {/* Chirp pop bubble */}
      {chirp && (
        <div className="ayn-balloon-chick-chirp">
          {language === 'ar' ? 'كتاكيتو! 🐥✨' : 'Cluck cluck! 🐥✨'}
        </div>
      )}

      <svg
        viewBox="0 0 100 180"
        width="90"
        height="162"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="balloon-shine" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#FFAA85" />
            <stop offset="40%" stopColor="#E65A40" />
            <stop offset="100%" stopColor="#B53A25" />
          </radialGradient>
          <radialGradient id="chick-body" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#FFF275" />
            <stop offset="70%" stopColor="#F5D020" />
            <stop offset="100%" stopColor="#E5A812" />
          </radialGradient>
        </defs>

        {/* 1. Large Vibrant Balloon */}
        <g className="ayn-chick-balloon">
          {/* Balloon string knot */}
          <polygon points="46,80 54,80 50,86" fill="#B53A25" />
          {/* Balloon Oval */}
          <ellipse cx="50" cy="44" rx="34" ry="40" fill="url(#balloon-shine)" stroke="#2B2118" strokeWidth="1.8" />
          {/* Glossy specular highlight */}
          <ellipse cx="40" cy="28" rx="8" ry="14" fill="#FFFFFF" opacity="0.45" transform="rotate(-20 40 28)" />
          <ellipse cx="33" cy="20" rx="3" ry="5" fill="#FFFFFF" opacity="0.6" />
        </g>

        {/* 2. Curved Balloon String */}
        <path
          className="ayn-chick-string"
          d="M50 86 Q46 100 52 116"
          stroke="#2B2118"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />

        {/* 3. The Chick / Chicken */}
        <g className="ayn-flying-chick" transform="translate(52, 116)">
          {/* Little Little Feet dangling in air */}
          <path d="M-6 26 L-8 34 M-8 34 L-12 37 M-8 34 L-4 37" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" />
          <path d="M6 26 L8 34 M8 34 L4 37 M8 34 L12 37" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" />

          {/* Plump Chick Body */}
          <ellipse cx="0" cy="14" rx="16" ry="17" fill="url(#chick-body)" stroke="#2B2118" strokeWidth="1.8" />

          {/* Left Wing Holding String */}
          <g transform="translate(-8, 3) rotate(-35)">
            <ellipse cx="0" cy="0" rx="4" ry="8" fill="#F5D020" stroke="#2B2118" strokeWidth="1.5" />
            {/* Wing hand holding string */}
            <circle cx="0" cy="-6" r="2.5" fill="#F5A623" />
          </g>

          {/* Right Wing waving happily */}
          <g className="ayn-chick-wing-wave" transform="translate(12, 12)">
            <ellipse cx="0" cy="0" rx="4" ry="8" fill="#F5D020" stroke="#2B2118" strokeWidth="1.5" transform="rotate(35)" />
          </g>

          {/* Little Chick Head */}
          <circle cx="0" cy="0" r="13" fill="url(#chick-body)" stroke="#2B2118" strokeWidth="1.8" />

          {/* Red Rooster Comb / Tuft of feathers */}
          <path d="M-4 -12 C-6 -18 -2 -19 0 -13 C2 -19 6 -17 3 -12 Z" fill="#E65A40" stroke="#2B2118" strokeWidth="1.2" />

          {/* Cute Big Eyes */}
          <ellipse cx="-4" cy="-2" rx="2.5" ry="3.5" fill="#2B2118" />
          <circle cx="-5" cy="-3.5" r="1.2" fill="#FFFFFF" />
          <ellipse cx="4" cy="-2" rx="2.5" ry="3.5" fill="#2B2118" />
          <circle cx="3" cy="-3.5" r="1.2" fill="#FFFFFF" />

          {/* Rosy Cheeks */}
          <circle cx="-8" cy="3" r="2.5" fill="#FFAA85" opacity="0.6" />
          <circle cx="8" cy="3" r="2.5" fill="#FFAA85" opacity="0.6" />

          {/* Open Joyful Beak */}
          <polygon points="-3,2 3,2 0,7" fill="#F5A623" stroke="#2B2118" strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  );
}

export default BalloonChickenIllustration;
