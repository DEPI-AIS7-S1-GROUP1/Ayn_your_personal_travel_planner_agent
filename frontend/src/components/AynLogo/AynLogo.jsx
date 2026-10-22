import { useState } from 'react';
import './AynLogo.css';

/**
 * Animated Vector Ayn Logo (DESIGN.md & Visual Upgrade)
 *
 * Combines an organic location pin with the Egyptian "Ayn" eye (أين / عين).
 * Features rich warm sunset gradient, idle breathing, and interactive pupil look/wink.
 *
 * @param {'full' | 'icon' | 'wordmark'} variant
 * @param {number} [size=36] - Height in px
 * @param {boolean} [animated=true]
 * @param {string} [className='']
 */
export function AynLogo({
  variant = 'full',
  size = 36,
  animated = true,
  className = '',
  ...props
}) {
  const [isWinking, setIsWinking] = useState(false);

  const handleMouseEnter = () => {
    if (!animated) return;
    setIsWinking(true);
    setTimeout(() => setIsWinking(false), 900);
  };

  return (
    <span
      className={`ayn-logo ayn-logo--${variant} ${animated ? 'ayn-logo--animated' : ''} ${className}`}
      onMouseEnter={handleMouseEnter}
      style={{ '--logo-height': `${size}px` }}
      aria-label="Ayn - Travel Planner"
      role="img"
      {...props}
    >
      {/* 1. Vector Icon: Eye + Pin */}
      {(variant === 'full' || variant === 'icon') && (
        <svg
          className="ayn-logo__icon-svg"
          viewBox="0 0 44 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="ayn-logo-grad" x1="4" y1="4" x2="40" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#147A82" />
              <stop offset="42%" stopColor="#1F5F8B" />
              <stop offset="78%" stopColor="#F5A623" />
              <stop offset="100%" stopColor="#B5472F" />
            </linearGradient>
            <linearGradient id="ayn-pupil-grad" x1="16" y1="16" x2="28" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2B2118" />
              <stop offset="100%" stopColor="#7A5232" />
            </linearGradient>
            <filter id="ayn-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#F5A623" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Pin Body with Organic Curve */}
          <path
            className="ayn-logo__pin-body"
            d="M22 46C22 46 40 31.5 40 20C40 10.0589 31.9411 2 22 2C12.0589 2 4 10.0589 4 20C4 31.5 22 46 22 46Z"
            fill="url(#ayn-logo-grad)"
            stroke="#2B2118"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Inner Eye / Sclera (White arch) */}
          <ellipse
            className="ayn-logo__sclera"
            cx="22"
            cy="19"
            rx="11"
            ry="7"
            fill="#FCFAF6"
            stroke="#2B2118"
            strokeWidth="1.8"
          />

          {/* Pupil / Iris */}
          <g className={`ayn-logo__eye-group ${isWinking ? 'ayn-logo__eye-group--wink' : ''}`}>
            {/* Iris */}
            <circle
              className="ayn-logo__pupil"
              cx="22"
              cy="19"
              r="4.2"
              fill="url(#ayn-pupil-grad)"
            />
            {/* Highlight spark */}
            <circle cx="23.4" cy="17.4" r="1.3" fill="#FFFFFF" />
            {/* Eye of Horus subtle kohl underline flick */}
            <path
              d="M13 22.5 Q 22 25.5 31 22.5 Q 34 24.5 35 25"
              stroke="#2B2118"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
              opacity="0.85"
            />
          </g>

          {/* Cute sun spark above pin */}
          <circle className="ayn-logo__spark" cx="34" cy="7" r="2.2" fill="#F5A623" />
        </svg>
      )}

      {/* 2. Brand Wordmark Typography */}
      {(variant === 'full' || variant === 'wordmark') && (
        <span className="ayn-logo__text">
          <span className="ayn-logo__brand-en">Ayn</span>
          <span className="ayn-logo__divider" aria-hidden="true">•</span>
          <span className="ayn-logo__brand-ar" lang="ar">أين</span>
        </span>
      )}
    </span>
  );
}


