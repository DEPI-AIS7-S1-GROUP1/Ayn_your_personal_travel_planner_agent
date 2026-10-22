import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.js';
import './Illustration.css';

const VARIANT_MESSAGES_EN = {
  camera: ['Say cheese! 📸', 'Smile for the Nile! 📸', 'Say cheese! ✨'],
  selfie: ['Say cheese! 📸', 'Selfie with the Sphinx! 🤳', 'Say cheese! ✨'],
  hat: ['Yalla bina! 🐪', 'Pyramids time! 🏛️', 'Yalla bina! 🎒'],
  backpack: ['Yalla bina! 🎒', "Let's go! ✈️", 'Yalla bina! 🐪'],
  map: ['Found a hidden gem! 🗺️', 'Yalla bina! 🐪', 'Follow the map! 📜'],
  suitcase: ['All packed, yalla! 🧳', 'Ready for Egypt! ✨', 'Yalla bina! 🐪'],
};

const VARIANT_MESSAGES_AR = {
  camera: ['قول تشيز! 📸', 'ابتسم للنيل! 📸', 'قول تشيز! ✨'],
  selfie: ['قول تشيز! 📸', 'سيلفي مع أبو الهول! 🤳', 'قول تشيز! ✨'],
  hat: ['يلا بينا! 🐪', 'على الأهرامات! 🏛️', 'يلا بينا! 🎒'],
  backpack: ['يلا بينا! 🎒', 'جاهزين للسفر! ✈️', 'يلا بينا! 🐪'],
  map: ['لقيت مكان تحفة! 🗺️', 'يلا بينا! 🐪', 'امشوا ورا الخريطة! 📜'],
  suitcase: ['جهزنا الشنط، يلا بينا! 🧳', 'مستعدين لمصر! ✨', 'يلا بينا! 🐪'],
};

const CHEERFUL_MESSAGES_EN = [
  'Yalla bina! 🐪',
  'Say cheese! 📸',
  'Pyramids time! 🏛️',
  "Let's go! ✈️",
  'Smile for the Nile! ⛵',
  'Yalla bina! 🎒'
];

const CHEERFUL_MESSAGES_AR = [
  'يلا بينا! 🐪',
  'قول تشيز! 📸',
  'على الأهرامات! 🏛️',
  'جاهزين! ✈️',
  'ابتسم للنيل! ⛵',
  'يلا بينا! 🎒'
];

/**
 * Reusable Interactive Person Illustration (DESIGN.md 3.6 & Motion Design)
 *
 * Detailed layered vector character with breathing, blinking, interactive speech bubble,
 * and responsive personality.
 *
 * @param {'hat' | 'backpack' | 'camera' | 'map' | 'suitcase' | 'selfie'} [variant='hat']
 * @param {boolean} [animated=true] - Enables idle breathing & blinking
 * @param {boolean} [interactive=true] - Allows clicking to jump & pop speech bubble
 * @param {string} [bubbleText] - Custom speech bubble message
 * @param {number} [width=56] - Width in px
 * @param {number} [height=86] - Height in px
 * @param {string} [className='']
 */
export function PersonIllustration({
  variant = 'hat',
  animated = true,
  interactive = true,
  bubbleText,
  width = 56,
  height = 86,
  className = '',
  ...props
}) {
  const { language } = useLanguage();
  const [bubble, setBubble] = useState(null);
  const [isJumping, setIsJumping] = useState(false);

  const handleClick = () => {
    if (!interactive) return;
    setIsJumping(true);

    const pool = (language === 'ar' ? VARIANT_MESSAGES_AR : VARIANT_MESSAGES_EN)[variant]
      || (language === 'ar' ? CHEERFUL_MESSAGES_AR : CHEERFUL_MESSAGES_EN);
    const chosen = bubbleText || pool[Math.floor(Math.random() * pool.length)];
    setBubble(chosen);

    setTimeout(() => setIsJumping(false), 550);
    setTimeout(() => setBubble(null), 2500);
  };

  return (
    <div
      className={`ayn-person-wrap ${animated ? 'ayn-person-wrap--animated' : ''} ${interactive ? 'ayn-person-wrap--interactive' : ''} ${isJumping ? 'ayn-person-wrap--jumping' : ''} ${className}`}
      style={{ width: `${width}px`, height: `${height}px` }}
      onClick={handleClick}
      role={interactive ? 'button' : 'img'}
      tabIndex={interactive ? 0 : -1}
      onKeyDown={(e) => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`Traveler illustration: ${variant}`}
      {...props}
    >
      {/* Interactive Speech Bubble */}
      {bubble && (
        <div className="ayn-person-bubble" role="status" aria-live="polite">
          {bubble}
          <div className="ayn-person-bubble__tip" />
        </div>
      )}

      {/* SVG Character */}
      <svg
        className={`ayn-illustration ayn-illustration--person ayn-illustration--person-${variant}`}
        viewBox="0 0 56 86"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="shadow-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2B2118" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#2B2118" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Ground Shadow (squashes on breath/jump) */}
        <ellipse className="ayn-char__shadow" cx="28" cy="82" rx="18" ry="4" fill="url(#shadow-grad)" />

        {/* 2. Character Variants */}
        {variant === 'backpack' && <BackpackFigure />}
        {variant === 'camera' && <CameraFigure />}
        {variant === 'map' && <MapFigure />}
        {variant === 'suitcase' && <SuitcaseFigure />}
        {variant === 'selfie' && <SelfieFigure />}
        {variant === 'hat' && <HatFigure />}
      </svg>
    </div>
  );
}

/* ==========================================================================
   Character Variant Components (Layered SVG groups for independent motion)
   ========================================================================== */

function HatFigure() {
  return (
    <g className="ayn-char__body-group">
      {/* Legs & Shoes */}
      <g className="ayn-char__legs">
        <rect x="20" y="56" width="6.5" height="23" rx="3.2" fill="#2B2118" />
        <rect x="29.5" y="56" width="6.5" height="23" rx="3.2" fill="#2B2118" />
        {/* Desert hiking shoes */}
        <path d="M17 76 C17 74 21 74 27 75 L27 80 L18 80 C16.5 80 17 77 17 76 Z" fill="#7A5232" />
        <path d="M28 76 C28 74 32 74 38 75 L38 80 L29 80 C27.5 80 28 77 28 76 Z" fill="#7A5232" />
      </g>

      {/* Torso & Terracotta Explorer Jacket */}
      <g className="ayn-char__torso">
        <rect x="16" y="28" width="24" height="29" rx="7" fill="#B5472F" />
        {/* Jacket center seam & collar */}
        <line x1="28" y1="33" x2="28" y2="57" stroke="#2B2118" strokeWidth="1.5" />
        <path d="M22 28 L28 35 L34 28" fill="#F5EFE6" stroke="#2B2118" strokeWidth="1.2" />
        {/* Explorer pockets with gold buttons */}
        <rect x="18" y="38" width="8" height="7" rx="2" fill="#993822" />
        <circle cx="22" cy="40" r="1" fill="#F5A623" />
        <rect x="30" y="38" width="8" height="7" rx="2" fill="#993822" />
        <circle cx="34" cy="40" r="1" fill="#F5A623" />
      </g>

      {/* Waving Arm */}
      <g className="ayn-char__arm-wave">
        <path d="M40 33 C45 35 48 27 47 22 C46 20 44 20 43 22 C42 25 40 30 38 33 Z" fill="#B5472F" />
        <circle cx="47" cy="20" r="3" fill="#D49A6A" />
      </g>

      {/* Head & Sun Hat */}
      <g className="ayn-char__head">
        {/* Head */}
        <circle cx="28" cy="18" r="9" fill="#D49A6A" />
        {/* Eyes (Blinking) */}
        <g className="ayn-char__eyes">
          <circle cx="25" cy="18" r="1.3" fill="#2B2118" />
          <circle cx="31" cy="18" r="1.3" fill="#2B2118" />
        </g>
        {/* Friendly smile */}
        <path d="M26 21.5 Q28 23.5 30 21.5" stroke="#2B2118" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        {/* Sun Hat */}
        <ellipse cx="28" cy="14" rx="17" ry="4.5" fill="#F5A623" stroke="#2B2118" strokeWidth="1.2" />
        <path d="M20 14 C20 8 23 6 28 6 C33 6 36 8 36 14 Z" fill="#F5A623" stroke="#2B2118" strokeWidth="1.2" />
        <rect x="20" y="12" width="16" height="2" fill="#B5472F" />
      </g>
    </g>
  );
}

function BackpackFigure() {
  return (
    <g className="ayn-char__body-group">
      {/* Heavy Hiker Backpack (Sways gently) */}
      <g className="ayn-char__backpack">
        <rect x="8" y="27" width="10" height="27" rx="4" fill="#147A82" stroke="#2B2118" strokeWidth="1.2" />
        <rect x="7" y="23" width="12" height="6" rx="2" fill="#E76F51" stroke="#2B2118" strokeWidth="1" />
        <line x1="8" y1="36" x2="18" y2="36" stroke="#2B2118" strokeWidth="1.2" />
        {/* Water bottle on side pouch */}
        <rect x="6" y="38" width="3.5" height="9" rx="1.5" fill="#CFE3E8" />
      </g>

      {/* Legs & Hiking Boots */}
      <g className="ayn-char__legs">
        <rect x="20" y="56" width="6.5" height="23" rx="3.2" fill="#2B2118" />
        <rect x="29.5" y="56" width="6.5" height="23" rx="3.2" fill="#2B2118" />
        <rect x="18" y="76" width="9" height="5" rx="2" fill="#1F5F8B" />
        <rect x="29" y="76" width="9" height="5" rx="2" fill="#1F5F8B" />
      </g>

      {/* Torso & Blue/Teal Jacket */}
      <g className="ayn-char__torso">
        <rect x="16" y="28" width="24" height="29" rx="7" fill="#1F5F8B" />
        {/* Backpack harness straps across chest */}
        <line x1="19" y1="30" x2="23" y2="54" stroke="#147A82" strokeWidth="2.5" />
        <line x1="33" y1="30" x2="29" y2="54" stroke="#147A82" strokeWidth="2.5" />
        <rect x="23" y="38" width="6" height="3" rx="1" fill="#F5A623" />
      </g>

      {/* Head with Beanie & Hair */}
      <g className="ayn-char__head">
        <circle cx="28" cy="18" r="9" fill="#D49A6A" />
        {/* Hair bangs */}
        <path d="M19 16 C20 12 24 10 28 10 C32 10 36 12 37 16 C35 14 31 13 28 13 C24 13 21 14 19 16 Z" fill="#2B2118" />
        {/* Beanie */}
        <path d="M20 14 C20 8 23 5 28 5 C33 5 36 8 36 14 Z" fill="#E76F51" stroke="#2B2118" strokeWidth="1.2" />
        <circle cx="28" cy="4" r="2.5" fill="#F5A623" />
        {/* Eyes (Blinking) */}
        <g className="ayn-char__eyes">
          <circle cx="25" cy="18" r="1.3" fill="#2B2118" />
          <circle cx="31" cy="18" r="1.3" fill="#2B2118" />
        </g>
        <path d="M26 21.5 Q28 23.5 30 21.5" stroke="#2B2118" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      </g>
    </g>
  );
}

function CameraFigure() {
  return (
    <g className="ayn-char__body-group">
      {/* Legs */}
      <g className="ayn-char__legs">
        <rect x="20" y="56" width="6.5" height="23" rx="3.2" fill="#2B2118" />
        <rect x="29.5" y="56" width="6.5" height="23" rx="3.2" fill="#2B2118" />
        <rect x="18" y="76" width="9" height="5" rx="2" fill="#7A5232" />
        <rect x="29" y="76" width="9" height="5" rx="2" fill="#7A5232" />
      </g>

      {/* Torso & Green Vest */}
      <g className="ayn-char__torso">
        <rect x="16" y="28" width="24" height="29" rx="7" fill="#2F6B4A" />
        {/* Yellow shirt inner */}
        <polygon points="25,28 31,28 28,36" fill="#F5A623" />
      </g>

      {/* Camera with strap and flash twinkle */}
      <g className="ayn-char__camera-prop">
        <path d="M21 28 L31 43" stroke="#2B2118" strokeWidth="1.8" />
        {/* Vintage camera body */}
        <rect x="26" y="38" width="16" height="11" rx="2.5" fill="#2B2118" />
        <circle cx="34" cy="43.5" r="3.5" fill="#CFE3E8" stroke="#FFFFFF" strokeWidth="1" />
        <rect x="36" y="36.5" width="4" height="2" rx="0.5" fill="#B5472F" />
        {/* Camera Flash Star */}
        <path className="ayn-char__camera-flash" d="M34 32 L35.5 35 L38.5 35.5 L36 37.5 L37 40.5 L34 38.5 L31 40.5 L32 37.5 L29.5 35.5 L32.5 35 Z" fill="#F5A623" opacity="0" />
      </g>

      {/* Head with Safari Cap */}
      <g className="ayn-char__head">
        <circle cx="28" cy="18" r="9" fill="#D49A6A" />
        {/* Cap with visor */}
        <path d="M20 14 C20 9 23 7 28 7 C33 7 36 9 36 14 Z" fill="#7A6A5A" stroke="#2B2118" strokeWidth="1.2" />
        <path d="M26 14 L39 14 C39 14 38 17 33 17 L25 17 Z" fill="#7A6A5A" stroke="#2B2118" strokeWidth="1.2" />
        {/* Eyes (Blinking) */}
        <g className="ayn-char__eyes">
          <circle cx="25" cy="18" r="1.3" fill="#2B2118" />
          <circle cx="31" cy="18" r="1.3" fill="#2B2118" />
        </g>
        <path d="M26 21.5 Q28 23.5 30 21.5" stroke="#2B2118" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      </g>
    </g>
  );
}

function MapFigure() {
  return (
    <g className="ayn-char__body-group">
      {/* Legs & Sandals */}
      <g className="ayn-char__legs">
        <rect x="20" y="56" width="6.5" height="23" rx="3.2" fill="#E9D8A6" />
        <rect x="29.5" y="56" width="6.5" height="23" rx="3.2" fill="#E9D8A6" />
        <rect x="18" y="77" width="9" height="4" rx="1.5" fill="#7A5232" />
        <rect x="29" y="77" width="9" height="4" rx="1.5" fill="#7A5232" />
      </g>

      {/* Torso: Nile Teal Tunic with Nile Belt */}
      <g className="ayn-char__torso">
        <rect x="16" y="28" width="24" height="30" rx="7" fill="#147A82" />
        <rect x="16" y="44" width="24" height="4" fill="#F5A623" />
      </g>

      {/* Unfolded Map (Flutters in breeze) */}
      <g className="ayn-char__map-prop">
        <path
          d="M13 36 L23 39 L33 36 L43 39 L43 54 L33 51 L23 54 L13 51 Z"
          fill="#F5EFE6"
          stroke="#2B2118"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {/* Nile River line on map */}
        <path d="M28 38 Q30 45 28 52" stroke="#1F5F8B" strokeWidth="1.8" fill="none" />
        {/* Red X on map (Pyramids destination!) */}
        <path d="M20 42 L24 46 M24 42 L20 46" stroke="#B5472F" strokeWidth="1.5" strokeLinecap="round" />
        {/* Hands holding the map */}
        <circle cx="14" cy="44" r="2.8" fill="#D49A6A" />
        <circle cx="42" cy="44" r="2.8" fill="#D49A6A" />
      </g>

      {/* Head with Nile Scarf / Hijab */}
      <g className="ayn-char__head">
        <path d="M19 19 C19 11 23 8 28 8 C33 8 37 11 37 19 C37 25 34 29 28 29 C22 29 19 25 19 19 Z" fill="#E76F51" />
        <circle cx="28" cy="18" r="7.5" fill="#D49A6A" />
        {/* Eyes (Blinking) */}
        <g className="ayn-char__eyes">
          <circle cx="25" cy="18" r="1.3" fill="#2B2118" />
          <circle cx="31" cy="18" r="1.3" fill="#2B2118" />
        </g>
        <path d="M26 21.5 Q28 23.5 30 21.5" stroke="#2B2118" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      </g>
    </g>
  );
}

function SuitcaseFigure() {
  return (
    <g className="ayn-char__body-group">
      {/* Rolling Suitcase on the side */}
      <g className="ayn-char__suitcase-prop">
        <line x1="41" y1="42" x2="49" y2="56" stroke="#2B2118" strokeWidth="1.8" strokeLinecap="round" />
        {/* Suitcase Body */}
        <rect x="44" y="52" width="11" height="22" rx="3" fill="#E76F51" stroke="#2B2118" strokeWidth="1.2" />
        <line x1="44" y1="63" x2="55" y2="63" stroke="#F5A623" strokeWidth="1.5" />
        {/* Wheels */}
        <circle cx="46" cy="76" r="2" fill="#2B2118" />
        <circle cx="53" cy="76" r="2" fill="#2B2118" />
      </g>

      {/* Legs */}
      <g className="ayn-char__legs">
        <rect x="18" y="56" width="6.5" height="23" rx="3.2" fill="#1F5F8B" />
        <rect x="27.5" y="56" width="6.5" height="23" rx="3.2" fill="#1F5F8B" />
        <rect x="16" y="76" width="9" height="5" rx="2" fill="#FFFFFF" stroke="#2B2118" strokeWidth="1" />
        <rect x="27" y="76" width="9" height="5" rx="2" fill="#FFFFFF" stroke="#2B2118" strokeWidth="1" />
      </g>

      {/* Torso: Coral / Sun Sweater */}
      <g className="ayn-char__torso">
        <rect x="15" y="28" width="23" height="29" rx="7" fill="#F5A623" />
        <path d="M22 28 C22 31 25 33 27 33 C29 33 32 31 32 28" stroke="#B5472F" strokeWidth="2" fill="none" />
      </g>

      {/* Arm holding suitcase */}
      <path d="M37 34 C41 38 42 45 42 48" stroke="#F5A623" strokeWidth="5" strokeLinecap="round" fill="none" />
      <circle cx="42" cy="48" r="2.8" fill="#D49A6A" />

      {/* Head with Sunglasses */}
      <g className="ayn-char__head">
        <circle cx="26.5" cy="18" r="9" fill="#D49A6A" />
        {/* Hair with chic topknot */}
        <circle cx="26.5" cy="7" r="4.5" fill="#2B2118" />
        <path d="M18 16 C18 10 22 9 26.5 9 C31 9 35 10 35 16 Z" fill="#2B2118" />
        {/* Cool Sunglasses */}
        <rect x="20" y="16" width="6" height="4.5" rx="1.5" fill="#2B2118" />
        <rect x="27" y="16" width="6" height="4.5" rx="1.5" fill="#2B2118" />
        <line x1="26" y1="18" x2="27" y2="18" stroke="#2B2118" strokeWidth="1.2" />
        <path d="M25 23 Q26.5 24.5 28 23" stroke="#2B2118" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      </g>
    </g>
  );
}

function SelfieFigure() {
  return (
    <g className="ayn-char__body-group">
      {/* Legs */}
      <g className="ayn-char__legs">
        <rect x="20" y="56" width="6.5" height="23" rx="3.2" fill="#2B2118" />
        <rect x="29.5" y="56" width="6.5" height="23" rx="3.2" fill="#2B2118" />
        <rect x="18" y="76" width="9" height="5" rx="2" fill="#E76F51" />
        <rect x="29" y="76" width="9" height="5" rx="2" fill="#E76F51" />
      </g>

      {/* Torso */}
      <g className="ayn-char__torso">
        <rect x="16" y="28" width="24" height="29" rx="7" fill="#CFE3E8" stroke="#1F5F8B" strokeWidth="1.5" />
        {/* Striped shirt pattern */}
        <line x1="16" y1="36" x2="40" y2="36" stroke="#1F5F8B" strokeWidth="1.5" />
        <line x1="16" y1="44" x2="40" y2="44" stroke="#1F5F8B" strokeWidth="1.5" />
      </g>

      {/* Arm holding Phone for Selfie */}
      <g className="ayn-char__selfie-arm">
        <path d="M38 33 C44 26 48 18 49 12" stroke="#CFE3E8" strokeWidth="5" strokeLinecap="round" fill="none" />
        <circle cx="49" cy="11" r="3" fill="#D49A6A" />
        {/* Smartphone */}
        <rect x="46" y="4" width="7" height="12" rx="1.5" fill="#2B2118" transform="rotate(-15 46 4)" />
        {/* Camera lens & flash sparkle */}
        <circle cx="49" cy="7" r="1" fill="#F5A623" />
        <circle className="ayn-char__sparkle" cx="53" cy="3" r="1.5" fill="#F5A623" />
      </g>

      {/* Head looking toward camera */}
      <g className="ayn-char__head">
        <circle cx="28" cy="18" r="9" fill="#D49A6A" />
        {/* Curly hair */}
        <circle cx="21" cy="13" r="4" fill="#7A5232" />
        <circle cx="27" cy="10" r="4.5" fill="#7A5232" />
        <circle cx="33" cy="12" r="4" fill="#7A5232" />
        {/* Wink eye! */}
        <path d="M24 18 Q25.5 16.5 27 18" stroke="#2B2118" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <circle cx="32" cy="18" r="1.3" fill="#2B2118" />
        {/* Big smile */}
        <path d="M26 21 Q28.5 24 31 21" stroke="#2B2118" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      </g>
    </g>
  );
}

/**
 * Animated Walking Figure (DESIGN.md & Motion)
 * Walks across a scene or section with alternating leg swings and body bobbing.
 */
export function WalkingFigure({
  variant = 'backpack',
  speed = 'medium',
  direction = 'ltr',
  className = ''
}) {
  return (
    <div
      className={`ayn-walking-figure ayn-walking-figure--${speed} ayn-walking-figure--${direction} ${className}`}
      aria-hidden="true"
    >
      <PersonIllustration variant={variant} animated={false} interactive={false} width={50} height={78} />
    </div>
  );
}

/**
 * Reusable Cloud Illustration (DESIGN.md 3.6 & Motion)
 * Soft organic rounded multi-tier cloud with subtle drifting float.
 */
export function CloudIllustration({ width = 160, className = '' }) {
  const height = Math.round(width * 0.52);
  return (
    <svg
      className={`ayn-illustration ayn-illustration--cloud ${className}`}
      width={width}
      height={height}
      viewBox="0 0 160 84"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M28 70C15 70 5 60 5 48C5 37 13 28 24 26C27 12 39 2 54 2C67 2 78 10 82 22C87 18 94 16 101 16C115 16 127 27 128 41C138 42 146 50 146 60C146 71 137 70 126 70H28Z"
        fill="#FFFFFF"
        opacity="0.94"
        filter="drop-shadow(0 4px 12px rgba(31, 95, 139, 0.08))"
      />
    </svg>
  );
}

/**
 * Living Egypt Scene Illustrations (Step 3: Parallax, Swaying Palms, Sailing Feluccas, Camel Silhouette)
 * Types: 'pyramids' | 'nile' | 'redsea' | 'luxor'
 */
export function ArchSceneIllustration({ type = 'pyramids', className = '' }) {
  if (type === 'pyramids') {
    return (
      <svg
        className={`ayn-illustration ayn-illustration--arch-scene ayn-scene--pyramids ${className}`}
        viewBox="0 0 200 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="pyr-sky" x1="100" y1="0" x2="100" y2="150" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E9D8A6" />
            <stop offset="100%" stopColor="#F5EFE6" />
          </linearGradient>
        </defs>

        <rect width="200" height="150" fill="url(#pyr-sky)" />

        {/* Pulsing Egyptian Sun */}
        <circle className="ayn-scene__sun" cx="155" cy="42" r="19" fill="#F5A623" />
        <circle className="ayn-scene__sun-halo" cx="155" cy="42" r="25" stroke="#F5A623" strokeWidth="1.5" opacity="0.4" />

        {/* Drifting Clouds */}
        <g className="ayn-scene__cloud-fast">
          <path d="M20 32 Q28 26 36 32 Q44 26 50 32 H20 Z" fill="#FFFFFF" opacity="0.8" />
        </g>
        <g className="ayn-scene__cloud-slow">
          <path d="M100 24 Q108 20 114 24 Q120 20 126 24 H100 Z" fill="#FFFFFF" opacity="0.65" />
        </g>

        {/* Distant small Pyramid */}
        <polygon className="ayn-scene__pyr-back" points="120,130 165,65 190,130" fill="#993822" />
        <polygon points="165,65 190,130 178,130" fill="#7A2D1B" opacity="0.7" />

        {/* Great Pyramid of Giza */}
        <polygon className="ayn-scene__pyr-front" points="20,130 85,38 150,130" fill="#B5472F" />
        <polygon points="85,38 150,130 120,130" fill="#993822" opacity="0.65" />

        {/* Golden Sand Dunes */}
        <path className="ayn-scene__dunes" d="M0 118 Q60 110 120 124 T200 118 V150 H0 Z" fill="#D6C4A6" />

        {/* Walking Camel Silhouette on dune */}
        <g className="ayn-scene__camel" transform="translate(70, 112)">
          {/* Camel Body, Hump & Neck */}
          <ellipse cx="14" cy="7" rx="6" ry="4" fill="#7A5232" />
          <circle cx="13" cy="2" r="3.5" fill="#7A5232" />
          <path d="M17 6 C19 4 21 2 21 0 C22 0 23 2 22 4 L19 8 Z" fill="#7A5232" />
          <ellipse cx="22" cy="0" rx="2" ry="1.2" fill="#7A5232" />
          {/* Walking Legs */}
          <line className="ayn-scene__camel-leg-1" x1="10" y1="10" x2="8" y2="18" stroke="#7A5232" strokeWidth="1.5" strokeLinecap="round" />
          <line className="ayn-scene__camel-leg-2" x1="12" y1="10" x2="14" y2="18" stroke="#7A5232" strokeWidth="1.5" strokeLinecap="round" />
          <line className="ayn-scene__camel-leg-1" x1="17" y1="10" x2="15" y2="18" stroke="#7A5232" strokeWidth="1.5" strokeLinecap="round" />
          <line className="ayn-scene__camel-leg-2" x1="19" y1="10" x2="21" y2="18" stroke="#7A5232" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      </svg>
    );
  }

  if (type === 'nile') {
    return (
      <svg
        className={`ayn-illustration ayn-illustration--arch-scene ayn-scene--nile ${className}`}
        viewBox="0 0 200 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="nile-water-grad" x1="100" y1="70" x2="100" y2="150" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#147A82" />
            <stop offset="100%" stopColor="#1F5F8B" />
          </linearGradient>
        </defs>

        <rect width="200" height="150" fill="#CFE3E8" />

        {/* Morning Sun */}
        <circle className="ayn-scene__sun" cx="45" cy="38" r="15" fill="#F5A623" />

        {/* Distant Aswan hills */}
        <path d="M0 72 Q50 62 100 70 T200 68 V80 H0 Z" fill="#E9D8A6" opacity="0.9" />

        {/* Nile Water */}
        <rect y="70" width="200" height="80" fill="url(#nile-water-grad)" />

        {/* Wave ripples */}
        <g className="ayn-scene__waves">
          <line x1="20" y1="84" x2="55" y2="84" stroke="#CFE3E8" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          <line x1="130" y1="92" x2="175" y2="92" stroke="#CFE3E8" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          <line x1="70" y1="108" x2="120" y2="108" stroke="#CFE3E8" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        </g>

        {/* Swaying Palm Tree on River Bank */}
        <g className="ayn-scene__palm" transform="translate(178, 65)">
          <path d="M0 25 Q-4 10 -2 -5" stroke="#7A5232" strokeWidth="3" strokeLinecap="round" fill="none" />
          {/* Palm Fronds that sway */}
          <g className="ayn-scene__palm-crown">
            <path d="M-2 -5 Q-16 -15 -22 -8" stroke="#2F6B4A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M-2 -5 Q-12 -22 -4 -20" stroke="#2F6B4A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M-2 -5 Q6 -22 14 -16" stroke="#2F6B4A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M-2 -5 Q16 -12 18 -4" stroke="#2F6B4A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </g>
        </g>

        {/* Rocking Felucca Sailboat */}
        <g className="ayn-scene__felucca" transform="translate(90, 68)">
          {/* Tall Triangular Egyptian Sail */}
          <polygon points="18,-35 18,12 52,12" fill="#FCFAF6" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.12))" />
          <line x1="18" y1="-35" x2="18" y2="12" stroke="#7A5232" strokeWidth="1.8" />
          {/* Wooden Hull */}
          <path d="M8 12 L56 12 L48 21 L14 21 Z" fill="#B5472F" stroke="#2B2118" strokeWidth="1.2" />
        </g>
      </svg>
    );
  }

  if (type === 'redsea') {
    return (
      <svg
        className={`ayn-illustration ayn-illustration--arch-scene ayn-scene--redsea ${className}`}
        viewBox="0 0 200 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="redsea-grad" x1="100" y1="76" x2="100" y2="150" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#147A82" />
            <stop offset="100%" stopColor="#0E4D53" />
          </linearGradient>
        </defs>

        <rect width="200" height="150" fill="#F4EAD4" />

        {/* Sinai Mountain Peaks */}
        <polygon points="0,80 75,36 145,80" fill="#7A5232" />
        <polygon points="105,80 155,44 200,80" fill="#5C3B20" />
        <polygon points="75,36 145,80 115,80" fill="#664326" opacity="0.6" />

        {/* Warm Golden Sun */}
        <circle className="ayn-scene__sun" cx="160" cy="30" r="12" fill="#F5A623" />

        {/* Soaring Seagulls / Desert Birds */}
        <g className="ayn-scene__birds">
          <path d="M40 24 Q44 20 48 24 Q52 20 56 24" stroke="#2B2118" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M62 30 Q65 27 68 30 Q71 27 74 30" stroke="#2B2118" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </g>

        {/* Clear Turquoise Water */}
        <rect y="76" width="200" height="74" fill="url(#redsea-grad)" />

        {/* Rolling Waves */}
        <path className="ayn-scene__wave-roll" d="M0 90 Q25 84 50 90 T100 90 T150 90 T200 90" stroke="#CFE3E8" strokeWidth="2.5" fill="none" />
        <path className="ayn-scene__wave-roll ayn-scene__wave-roll--delay" d="M0 114 Q25 108 50 114 T100 114 T150 114 T200 114" stroke="#CFE3E8" strokeWidth="2" fill="none" opacity="0.8" />

        {/* Snorkeling Fish jumping */}
        <g className="ayn-scene__fish" transform="translate(110, 100)">
          <ellipse cx="6" cy="4" rx="5" ry="2.5" fill="#E76F51" />
          <polygon points="10,4 14,1 14,7" fill="#E76F51" />
          <circle cx="3.5" cy="3.5" r="0.7" fill="#FFFFFF" />
        </g>
      </svg>
    );
  }

  // 'luxor' - Ancient Karnak / Luxor Temple Columns
  return (
    <svg
      className={`ayn-illustration ayn-illustration--arch-scene ayn-scene--luxor ${className}`}
      viewBox="0 0 200 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="luxor-sky" x1="100" y1="0" x2="100" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E9D8A6" />
          <stop offset="100%" stopColor="#F5EFE6" />
        </linearGradient>
      </defs>

      <rect width="200" height="150" fill="url(#luxor-sky)" />

      {/* Radiant Sun behind temple */}
      <circle className="ayn-scene__sun" cx="35" cy="42" r="18" fill="#F5A623" />
      <g className="ayn-scene__sun-rays" opacity="0.25">
        <line x1="35" y1="18" x2="35" y2="8" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" />
        <line x1="55" y1="28" x2="62" y2="22" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" />
        <line x1="60" y1="42" x2="70" y2="42" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Atmospheric Shimmering Dust Motes */}
      <g className="ayn-scene__motes">
        <circle cx="75" cy="60" r="1.5" fill="#EE9B00" opacity="0.6" />
        <circle cx="115" cy="80" r="1.2" fill="#EE9B00" opacity="0.5" />
        <circle cx="160" cy="55" r="1.8" fill="#EE9B00" opacity="0.7" />
      </g>

      {/* 4 Grand Columns with Papyrus Capitals */}
      <g fill="#B5472F">
        {/* Column 1 */}
        <rect x="22" y="44" width="22" height="86" rx="3" stroke="#2B2118" strokeWidth="1.2" />
        <rect x="17" y="38" width="32" height="7" rx="2" fill="#F5A623" stroke="#2B2118" strokeWidth="1.2" />
        {/* Column 2 */}
        <rect x="66" y="44" width="22" height="86" rx="3" stroke="#2B2118" strokeWidth="1.2" />
        <rect x="61" y="38" width="32" height="7" rx="2" fill="#F5A623" stroke="#2B2118" strokeWidth="1.2" />
        {/* Column 3 */}
        <rect x="110" y="44" width="22" height="86" rx="3" stroke="#2B2118" strokeWidth="1.2" />
        <rect x="105" y="38" width="32" height="7" rx="2" fill="#F5A623" stroke="#2B2118" strokeWidth="1.2" />
        {/* Column 4 */}
        <rect x="154" y="44" width="22" height="86" rx="3" stroke="#2B2118" strokeWidth="1.2" />
        <rect x="149" y="38" width="32" height="7" rx="2" fill="#F5A623" stroke="#2B2118" strokeWidth="1.2" />
      </g>

      {/* Stone Foundation */}
      <rect y="126" width="200" height="24" fill="#D6C4A6" stroke="#2B2118" strokeWidth="1.2" />
    </svg>
  );
}

export default PersonIllustration;
