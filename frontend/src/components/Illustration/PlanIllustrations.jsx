import { useState, useId } from 'react';
import { BedDouble, Utensils, Compass, CarTaxiFront, Plane, Sparkles, Sun, Moon, Sunrise } from 'lucide-react';
import './PlanIllustrations.css';

/**
 * 1. DayPassportStamp
 * Authentic hand-stamped Egyptian passport badge for each day of the journey.
 */
export function DayPassportStamp({ dayNumber = 1, isArabic = false, className = '' }) {
  const rotationDegrees = ((dayNumber * 7) % 11) - 5; // Deterministic subtle angle: -5deg to +5deg

  // Distinct landmark motif per day
  const renderMotif = () => {
    const cycle = (dayNumber - 1) % 5;
    if (cycle === 0) {
      // Day 1: Giza Pyramids
      return (
        <svg viewBox="0 0 44 26" className="ayn-stamp-motif-svg" aria-hidden="true">
          <polygon points="14,24 2,24 8,10" fill="currentColor" opacity="0.8" />
          <polygon points="26,24 14,24 20,4" fill="currentColor" />
          <polygon points="38,24 28,24 33,12" fill="currentColor" opacity="0.75" />
          <circle cx="34" cy="6" r="3" fill="currentColor" opacity="0.6" />
        </svg>
      );
    } else if (cycle === 1) {
      // Day 2: Nile Felucca Sailboat
      return (
        <svg viewBox="0 0 44 26" className="ayn-stamp-motif-svg" aria-hidden="true">
          <path d="M6,22 Q22,25 38,22 Q34,26 10,26 Z" fill="currentColor" />
          <path d="M20,20 L20,4 L32,20 Z" fill="currentColor" opacity="0.9" />
          <path d="M19,20 L19,8 L10,20 Z" fill="currentColor" opacity="0.6" />
        </svg>
      );
    } else if (cycle === 2) {
      // Day 3: Karnak / Luxor Temple Columns
      return (
        <svg viewBox="0 0 44 26" className="ayn-stamp-motif-svg" aria-hidden="true">
          <rect x="7" y="6" width="30" height="4" rx="1.5" fill="currentColor" />
          <rect x="11" y="10" width="4" height="13" rx="1" fill="currentColor" opacity="0.85" />
          <rect x="20" y="10" width="4" height="13" rx="1" fill="currentColor" opacity="0.85" />
          <rect x="29" y="10" width="4" height="13" rx="1" fill="currentColor" opacity="0.85" />
          <rect x="5" y="23" width="34" height="3" rx="1" fill="currentColor" />
        </svg>
      );
    } else if (cycle === 3) {
      // Day 4: Alexandria Pharos Lighthouse
      return (
        <svg viewBox="0 0 44 26" className="ayn-stamp-motif-svg" aria-hidden="true">
          <path d="M18,24 L20,8 L24,8 L26,24 Z" fill="currentColor" />
          <rect x="19" y="4" width="6" height="4" rx="1" fill="currentColor" opacity="0.85" />
          <path d="M14,6 L10,3 M30,6 L34,3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M8,24 Q22,27 36,24" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      );
    } else {
      // Day 5+: Desert Oasis Palm & Sun
      return (
        <svg viewBox="0 0 44 26" className="ayn-stamp-motif-svg" aria-hidden="true">
          <circle cx="12" cy="7" r="3.5" fill="currentColor" opacity="0.75" />
          <path d="M22,24 Q23,16 26,10" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M26,10 Q18,6 14,11 M26,10 Q28,4 34,7 M26,10 Q34,12 36,17 M26,10 Q22,7 19,4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M10,24 Q22,26 34,24" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      );
    }
  };

  return (
    <div
      className={`ayn-day-passport-stamp ${className}`}
      style={{ '--stamp-angle': `${rotationDegrees}deg` }}
      aria-label={`Passport stamp Day ${dayNumber}`}
    >
      <div className="ayn-day-passport-stamp__inner">
        <span className="ayn-day-passport-stamp__country">EGYPT &bull; مصر</span>
        <div className="ayn-day-passport-stamp__center">
          {renderMotif()}
          <span className="ayn-day-passport-stamp__day">
            {isArabic ? `يوم ${dayNumber}` : `DAY ${dayNumber}`}
          </span>
        </div>
        <span className="ayn-day-passport-stamp__official">AYN JOURNEY &bull; 2026</span>
      </div>
    </div>
  );
}

/**
 * 2. TimeOfDaySkyMotif
 * Morning, Afternoon, and Evening atmospheric blocks with curved sun/moon arc.
 */
export function TimeOfDaySkyMotif({ slot = 'morning', label = '', className = '' }) {
  const normSlot = slot?.toLowerCase() || 'morning';

  if (normSlot === 'morning') {
    return (
      <div className={`ayn-slot-sky ayn-slot-sky--morning ${className}`}>
        <svg className="ayn-slot-sky__arc" viewBox="0 0 120 40" fill="none" aria-hidden="true">
          <path d="M 10 35 Q 60 5 110 35" stroke="rgba(245, 166, 35, 0.4)" strokeWidth="1.5" strokeDasharray="3 3" />
          {/* Sun at early arc */}
          <g className="ayn-slot-sky__celestial ayn-slot-sky__celestial--morning">
            <circle cx="32" cy="19" r="6" fill="#F5A623" />
            <circle cx="32" cy="19" r="10" stroke="#F5A623" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
          </g>
        </svg>
        <div className="ayn-slot-sky__content">
          <Sunrise size={17} className="ayn-slot-sky__icon ayn-slot-sky__icon--morning" />
          <span className="ayn-slot-sky__label">{label || 'Morning'}</span>
        </div>
      </div>
    );
  }

  if (normSlot === 'afternoon') {
    return (
      <div className={`ayn-slot-sky ayn-slot-sky--afternoon ${className}`}>
        <svg className="ayn-slot-sky__arc" viewBox="0 0 120 40" fill="none" aria-hidden="true">
          <path d="M 10 35 Q 60 5 110 35" stroke="rgba(31, 95, 139, 0.35)" strokeWidth="1.5" strokeDasharray="3 3" />
          {/* Sun at apex of arc */}
          <g className="ayn-slot-sky__celestial ayn-slot-sky__celestial--afternoon">
            <circle cx="60" cy="9" r="7" fill="#E69500" />
            <circle cx="60" cy="9" r="12" stroke="#E69500" strokeWidth="1.2" strokeDasharray="2 3" opacity="0.7" />
          </g>
        </svg>
        <div className="ayn-slot-sky__content">
          <Sun size={17} className="ayn-slot-sky__icon ayn-slot-sky__icon--afternoon" />
          <span className="ayn-slot-sky__label">{label || 'Afternoon'}</span>
        </div>
      </div>
    );
  }

  // Evening
  return (
    <div className={`ayn-slot-sky ayn-slot-sky--evening ${className}`}>
      <svg className="ayn-slot-sky__arc" viewBox="0 0 120 40" fill="none" aria-hidden="true">
        <path d="M 10 35 Q 60 5 110 35" stroke="rgba(112, 70, 160, 0.3)" strokeWidth="1.5" strokeDasharray="3 3" />
        {/* Crescent moon descending */}
        <g className="ayn-slot-sky__celestial ayn-slot-sky__celestial--evening">
          <path d="M 88 16 A 6 6 0 0 0 94 22 A 7 7 0 1 1 88 16 Z" fill="#F8F3D4" />
          {/* Twinkling stars */}
          <circle cx="45" cy="14" r="1.2" fill="#FAF6EE" opacity="0.8" />
          <circle cx="65" cy="10" r="1" fill="#FAF6EE" opacity="0.6" />
          <circle cx="104" cy="22" r="1.4" fill="#FAF6EE" opacity="0.9" />
        </g>
      </svg>
      <div className="ayn-slot-sky__content">
        <Moon size={17} className="ayn-slot-sky__icon ayn-slot-sky__icon--evening" />
        <span className="ayn-slot-sky__label">{label || 'Evening'}</span>
      </div>
    </div>
  );
}

/**
 * 3. ActivityCategoryBadge
 * Tactile illustrated badges for activities.
 */
export function ActivityCategoryBadge({ category = 'activities', className = '' }) {
  const norm = category?.toLowerCase() || 'activities';

  switch (norm) {
    case 'hotel':
      return (
        <div className={`ayn-act-badge ayn-act-badge--hotel ${className}`} title="Accommodation / Hotel">
          <BedDouble size={18} strokeWidth={2} />
        </div>
      );
    case 'food':
      return (
        <div className={`ayn-act-badge ayn-act-badge--food ${className}`} title="Dining / Authentic Egyptian Food">
          <Utensils size={18} strokeWidth={2} />
        </div>
      );
    case 'transport':
      return (
        <div className={`ayn-act-badge ayn-act-badge--transport ${className}`} title="Transport / Local Ride">
          <CarTaxiFront size={18} strokeWidth={2} />
        </div>
      );
    case 'flight':
      return (
        <div className={`ayn-act-badge ayn-act-badge--flight ${className}`} title="Flight / Air Travel">
          <Plane size={18} strokeWidth={2} />
        </div>
      );
    case 'sightseeing':
    case 'activities':
    default:
      return (
        <div className={`ayn-act-badge ayn-act-badge--activities ${className}`} title="Sightseeing / Explorer Activity">
          <Compass size={18} strokeWidth={2} />
        </div>
      );
  }
}

/**
 * 4. DayMiniMap
 * Compact organic mini-route explorer map showing the day's stops and highlighting the hovered activity.
 */
export function DayMiniMap({ activities = [], dayNumber = 1, highlightedId = null, onSelectActivity, className = '' }) {
  if (!activities || activities.length === 0) return null;

  // Calculate waypoint coordinates along a picturesque S-curve route
  const waypoints = activities.map((act, idx) => {
    const total = activities.length;
    const progress = total > 1 ? idx / (total - 1) : 0.5;
    // Curved trajectory across 300x120 viewBox
    const x = 36 + progress * 228;
    const y = 60 + Math.sin(progress * Math.PI * 1.5) * 32;
    return {
      id: act.id,
      title: act.title || `Stop ${idx + 1}`,
      category: act.category,
      x: Math.round(x),
      y: Math.round(y),
      index: idx + 1,
    };
  });

  // Construct smooth SVG path through waypoints
  const pathD = waypoints.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = waypoints[i - 1];
    const cpx = (prev.x + pt.x) / 2;
    return `${acc} Q ${cpx} ${prev.y}, ${pt.x} ${pt.y}`;
  }, '');

  return (
    <div className={`ayn-day-mini-map ${className}`} aria-label={`Day ${dayNumber} route overview`}>
      <div className="ayn-day-mini-map__header">
        <span className="ayn-day-mini-map__title">
          <Compass size={13} className="ayn-day-mini-map__compass" />
          DAY {dayNumber} ROUTE MAP
        </span>
        <span className="ayn-day-mini-map__stops-count">{activities.length} stops</span>
      </div>

      <div className="ayn-day-mini-map__canvas-wrap">
        <svg viewBox="0 0 300 120" className="ayn-day-mini-map__svg" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id={`miniMapGrad-${dayNumber}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF9EE" />
              <stop offset="100%" stopColor="#F5ECE0" />
            </linearGradient>
            <filter id={`miniMapShadow-${dayNumber}`} x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#2B2118" floodOpacity="0.1" />
            </filter>
          </defs>

          {/* Organic terrain blob */}
          <path
            d="M 12,30 C 40,8 180,4 286,22 C 298,48 290,102 270,112 C 190,118 70,114 18,100 C 6,70 2,46 12,30 Z"
            fill={`url(#miniMapGrad-${dayNumber})`}
            stroke="rgba(43, 33, 24, 0.12)"
            strokeWidth="1.5"
            filter={`url(#miniMapShadow-${dayNumber})`}
          />

          {/* Soft background Nile stream */}
          <path
            d="M 50,4 C 65,35 140,40 180,85 C 200,105 210,116 230,120"
            fill="none"
            stroke="rgba(31, 95, 139, 0.22)"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Connected journey trail */}
          {waypoints.length > 1 && (
            <>
              <path
                d={pathD}
                fill="none"
                stroke="var(--color-terracotta, #B5472F)"
                strokeWidth="2.5"
                strokeDasharray="4 4"
                className="ayn-day-mini-map__trail-dashed"
              />
              <path
                d={pathD}
                fill="none"
                stroke="rgba(245, 166, 35, 0.3)"
                strokeWidth="6"
                strokeLinecap="round"
              />
            </>
          )}

          {/* Waypoints */}
          {waypoints.map((pt) => {
            const isHovered = highlightedId === pt.id;
            return (
              <g
                key={pt.id}
                className={`ayn-mini-waypoint ${isHovered ? 'ayn-mini-waypoint--active' : ''}`}
                transform={`translate(${pt.x}, ${pt.y})`}
                onClick={() => onSelectActivity?.(pt.id)}
                style={{ cursor: 'pointer' }}
              >
                {/* Active pulse ring */}
                {isHovered && (
                  <circle r="14" fill="none" stroke="#F5A623" strokeWidth="2" className="ayn-mini-waypoint__ring" />
                )}
                {/* Pin shadow */}
                <ellipse cx="0" cy="6" rx="6" ry="2.5" fill="rgba(43, 33, 24, 0.18)" />
                {/* Pin core */}
                <circle
                  r="7.5"
                  fill={isHovered ? '#B5472F' : '#1F5F8B'}
                  stroke="#FFF"
                  strokeWidth="2"
                  className="ayn-mini-waypoint__core"
                />
                {/* Stop number */}
                <text
                  x="0"
                  y="3"
                  textAnchor="middle"
                  fill="#FFF"
                  fontSize="8"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  {pt.index}
                </text>

                {/* Popover label when active */}
                {isHovered && (
                  <g transform="translate(0, -16)">
                    <rect
                      x="-50"
                      y="-16"
                      width="100"
                      height="16"
                      rx="8"
                      fill="#2B2118"
                      opacity="0.92"
                    />
                    <text
                      x="0"
                      y="-5"
                      textAnchor="middle"
                      fill="#FFF"
                      fontSize="8.5"
                      fontWeight="600"
                      fontFamily="sans-serif"
                    >
                      {pt.title.length > 16 ? `${pt.title.slice(0, 15)}…` : pt.title}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/**
 * 5. WalkingTravelerTrail
 * Side journey navigation showing all days as stops with a walking traveler figure tracking current view.
 */
export function WalkingTravelerTrail({ days = [], activeDayIndex = 0, onSelectDay, className = '' }) {
  if (!days || days.length === 0) return null;

  return (
    <nav className={`ayn-walking-trail ${className}`} aria-label="Itinerary day roadmap">
      <div className="ayn-walking-trail__track" aria-hidden="true">
        <div
          className="ayn-walking-trail__walker"
          style={{
            transform: `translateY(${activeDayIndex * 64}px)`,
          }}
        >
          <div className="ayn-walking-trail__walker-figure">
            {/* Miniature walking explorer with backpack */}
            <svg viewBox="0 0 32 38" className="ayn-walker-svg">
              {/* Backpack */}
              <rect x="5" y="12" width="7" height="12" rx="3" fill="#B5472F" />
              {/* Torso */}
              <rect x="11" y="11" width="10" height="14" rx="4" fill="#1F5F8B" />
              {/* Head & Hat */}
              <circle cx="16" cy="7" r="5" fill="#E8B896" />
              <path d="M9,7 Q16,3 23,7" stroke="#F5A623" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <ellipse cx="16" cy="5" rx="7" ry="2" fill="#F5A623" />
              {/* Walking legs with animation */}
              <line x1="13" y1="24" x2="10" y2="34" stroke="#2B2118" strokeWidth="2.5" strokeLinecap="round" className="ayn-walker-leg-l" />
              <line x1="18" y1="24" x2="21" y2="34" stroke="#2B2118" strokeWidth="2.5" strokeLinecap="round" className="ayn-walker-leg-r" />
            </svg>
            <span className="ayn-walking-trail__walker-bubble">
              Day {activeDayIndex + 1}
            </span>
          </div>
        </div>
      </div>

      <div className="ayn-walking-trail__stops">
        {days.map((day, idx) => {
          const isActive = idx === activeDayIndex;
          return (
            <button
              key={day.day || idx}
              type="button"
              className={`ayn-walking-trail__stop-btn ${isActive ? 'ayn-walking-trail__stop-btn--active' : ''}`}
              onClick={() => onSelectDay?.(idx)}
              aria-current={isActive ? 'step' : undefined}
            >
              <span className="ayn-walking-trail__stop-dot">
                {idx + 1}
              </span>
              <span className="ayn-walking-trail__stop-name">
                Day {idx + 1}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * 6. CelebratoryConfetti
 * Egyptian celebration confetti particles (Gold, Turquoise, Papyrus, Terracotta) that flutter once.
 */
export function CelebratoryConfetti({ className = '' }) {
  const particles = Array.from({ length: 28 }).map((_, i) => ({
    id: i,
    left: `${(i * 3.6) + (i % 3) * 2}%`,
    delay: `${(i * 0.08).toFixed(2)}s`,
    duration: `${(2.2 + (i % 4) * 0.4).toFixed(2)}s`,
    colorClass: ['gold', 'turquoise', 'terracotta', 'papyrus'][i % 4],
    rotation: `${(i * 45) % 360}deg`,
    size: 7 + (i % 6),
  }));

  return (
    <div className={`ayn-celebratory-confetti ${className}`} aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className={`ayn-confetti-particle ayn-confetti-particle--${p.colorClass}`}
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            width: `${p.size}px`,
            height: `${p.size * 1.5}px`,
            transform: `rotate(${p.rotation})`,
          }}
        />
      ))}
    </div>
  );
}
