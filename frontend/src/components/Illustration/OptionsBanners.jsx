/**
 * Immersive Background Scenery & Vehicle Components for Options Page (Part 2)
 *
 * 1. HotelSkyBackground: Wide sky backdrop with drifting clouds, hot air balloon & crossing airplane
 * 2. LuxorHotAirBalloon: Colorful illustrated hot air balloon gently swaying in the Luxor sky
 * 3. DescendingTraveler: Traveler figure with parachute / balloon basket descending from sky to road on scroll
 * 4. VehicleIllustration: Dedicated vector vehicles (Airliner Jet, Yellow/Black Cairo Taxi, Swvl Intercity Coach)
 * 5. CloudPodCushion: Soft organic cloud shape sitting beneath hotel cards
 * 6. TransportStreetBackground: Wide Egyptian street backdrop with asphalt road & moving lane dashes
 */

export function LuxorHotAirBalloon({ className = '' }) {
  return (
    <div className={`ayn-hot-air-balloon ${className}`} aria-hidden="true">
      <svg viewBox="0 0 70 95" width="60" height="82" fill="none">
        {/* Balloon Envelope with vibrant Egyptian stripes */}
        <path
          d="M35 5 C15 5 2 22 2 42 C2 58 18 72 30 80 L40 80 C52 72 68 58 68 42 C68 22 55 5 35 5 Z"
          fill="#F5A623"
          stroke="#2B2118"
          strokeWidth="1.8"
        />
        {/* Colorful Vertical Panels */}
        <path d="M22 10 C14 22 14 62 26 78 L32 79 C22 65 22 25 30 8 Z" fill="#B5472F" opacity="0.9" />
        <path d="M48 10 C56 22 56 62 44 78 L38 79 C48 65 48 25 40 8 Z" fill="#147A82" opacity="0.9" />
        <path d="M35 5 C30 20 30 65 35 80 C40 65 40 20 35 5 Z" fill="#1F5F8B" opacity="0.85" />
        {/* Rigging Ropes */}
        <line x1="28" y1="80" x2="31" y2="88" stroke="#2B2118" strokeWidth="1.2" />
        <line x1="42" y1="80" x2="39" y2="88" stroke="#2B2118" strokeWidth="1.2" />
        <line x1="35" y1="80" x2="35" y2="88" stroke="#2B2118" strokeWidth="1" />
        {/* Woven Wicker Basket */}
        <rect x="29" y="88" width="12" height="7" rx="1.5" fill="#7A4D2E" stroke="#2B2118" strokeWidth="1.2" />
        {/* Mini traveler waving in basket */}
        <circle cx="35" cy="86" r="2.5" fill="#F4E8D7" stroke="#2B2118" strokeWidth="0.8" />
      </svg>
    </div>
  );
}

export function DescendingTraveler({ scrollRatio = 0, className = '' }) {
  // Clamp progress between 0 and 1
  const t = Math.max(0, Math.min(1, scrollRatio));
  const hasLanded = t >= 0.85;

  return (
    <div
      className={`ayn-descending-traveler ${hasLanded ? 'ayn-descending-traveler--landed' : ''} ${className}`}
      style={{ '--traveler-fall-progress': t }}
      aria-hidden="true"
    >
      {!hasLanded ? (
        /* Floating down with parachute */
        <div className="ayn-traveler-parachute-rig">
          <svg viewBox="0 0 72 90" width="64" height="80" fill="none">
            {/* Striped Parachute Canopy */}
            <path
              d="M6 34 C6 14 20 2 36 2 C52 2 66 14 66 34 C56 32 46 32 36 34 C26 32 16 32 6 34 Z"
              fill="#F5A623"
              stroke="#2B2118"
              strokeWidth="2"
            />
            <path d="M26 3 C20 12 16 22 16 33 C23 32 30 33 36 34 C30 20 28 8 26 3 Z" fill="#B5472F" />
            <path d="M46 3 C52 12 56 22 56 33 C49 32 42 33 36 34 C42 20 44 8 46 3 Z" fill="#147A82" />
            {/* Shroud Suspension Lines */}
            <line x1="8" y1="34" x2="34" y2="60" stroke="#2B2118" strokeWidth="1.2" />
            <line x1="22" y1="33" x2="35" y2="60" stroke="#2B2118" strokeWidth="1.2" />
            <line x1="50" y1="33" x2="37" y2="60" stroke="#2B2118" strokeWidth="1.2" />
            <line x1="64" y1="34" x2="38" y2="60" stroke="#2B2118" strokeWidth="1.2" />
            {/* Hanging Traveler Figure */}
            <g transform="translate(26, 58)">
              {/* Head with Explorer Hat */}
              <circle cx="10" cy="5" r="4.5" fill="#F4E8D7" stroke="#2B2118" strokeWidth="1.2" />
              <ellipse cx="10" cy="2" rx="7" ry="2" fill="#F5A623" stroke="#2B2118" strokeWidth="1" />
              {/* Torso & Backpack */}
              <rect x="6" y="9" width="8" height="11" rx="2" fill="#1F5F8B" stroke="#2B2118" strokeWidth="1.2" />
              <rect x="2" y="10" width="4" height="8" rx="1.5" fill="#B5472F" />
              {/* Dangling Legs */}
              <line x1="8" y1="20" x2="7" y2="28" stroke="#2B2118" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="12" y1="20" x2="13" y2="28" stroke="#2B2118" strokeWidth="1.8" strokeLinecap="round" />
            </g>
          </svg>
        </div>
      ) : (
        /* Landed traveler standing cheerfully by the roadside */
        <div className="ayn-traveler-landed-figure">
          <svg viewBox="0 0 36 54" width="34" height="50" fill="none">
            {/* Explorer Hat */}
            <ellipse cx="18" cy="9" rx="11" ry="3.5" fill="#F5A623" stroke="#2B2118" strokeWidth="1.2" />
            <path d="M12 9 C12 4 14 2 18 2 C22 2 24 4 24 9 Z" fill="#F5A623" stroke="#2B2118" strokeWidth="1.2" />
            {/* Cheerful Head */}
            <circle cx="18" cy="14" r="5" fill="#F4E8D7" stroke="#2B2118" strokeWidth="1.2" />
            <circle cx="16.5" cy="13.5" r="0.8" fill="#2B2118" />
            <circle cx="19.5" cy="13.5" r="0.8" fill="#2B2118" />
            <path d="M16.5 16 Q18 17.5 19.5 16" stroke="#2B2118" strokeWidth="0.8" fill="none" strokeLinecap="round" />
            {/* Jacket & Backpack */}
            <rect x="12" y="19" width="12" height="14" rx="3" fill="#1F5F8B" stroke="#2B2118" strokeWidth="1.2" />
            <rect x="6" y="20" width="6" height="11" rx="2" fill="#B5472F" stroke="#2B2118" strokeWidth="1" />
            {/* Waving Arm */}
            <path d="M24 21 L30 16 L32 10" stroke="#1F5F8B" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="32" cy="9" r="1.5" fill="#F4E8D7" />
            {/* Legs */}
            <line x1="15" y1="33" x2="15" y2="46" stroke="#2B2118" strokeWidth="2.4" strokeLinecap="round" />
            <line x1="21" y1="33" x2="21" y2="46" stroke="#2B2118" strokeWidth="2.4" strokeLinecap="round" />
            {/* Boots */}
            <ellipse cx="14" cy="46" rx="3" ry="1.5" fill="#7A4D2E" />
            <ellipse cx="22" cy="46" rx="3" ry="1.5" fill="#7A4D2E" />
          </svg>
        </div>
      )}
    </div>
  );
}

export function VehicleIllustration({ type = 'taxi', isSelected = false, hasPassenger = false }) {
  if (type === 'flight') {
    return (
      <div className={`ayn-vehicle-art ayn-vehicle-art--plane ${isSelected ? 'ayn-vehicle-art--selected' : ''}`}>
        <svg viewBox="0 0 92 44" width="86" height="40" fill="none">
          {/* Jet Fuselage */}
          <path
            d="M8 24 L64 24 C78 24 86 21 89 20 C86 19 78 16 64 16 L8 16 C3 16 0 19 0 20 C0 21 3 24 8 24 Z"
            fill="#FFFFFF"
            stroke="#2B2118"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Airline Blue-Teal Brand Stripe */}
          <rect x="12" y="19" width="64" height="3" fill="#147A82" />
          {/* Passenger Windows */}
          <circle cx="28" cy="18" r="1.5" fill="#2B2118" />
          <circle cx="36" cy="18" r="1.5" fill="#2B2118" />
          <circle cx="44" cy="18" r="1.5" fill="#2B2118" />
          <circle cx="52" cy="18" r="1.5" fill="#2B2118" />
          <circle cx="60" cy="18" r="1.5" fill="#2B2118" />
          {/* Cockpit Window */}
          <polygon points="76,17 84,18 82,20 76,20" fill="#2B2118" />
          {/* Main Wing with engine nacelle */}
          <polygon points="42,20 22,38 34,38 56,20" fill="#1F5F8B" stroke="#2B2118" strokeWidth="1.4" />
          <rect x="30" y="32" width="12" height="4" rx="2" fill="#7A5232" stroke="#2B2118" strokeWidth="1" />
          {/* Tail Fin */}
          <polygon points="14,16 4,4 12,4 22,16" fill="#F5A623" stroke="#2B2118" strokeWidth="1.4" />
          {/* Passenger in window if selected */}
          {hasPassenger && (
            <circle cx="44" cy="18" r="2.2" fill="#B5472F" stroke="#FFFFFF" strokeWidth="0.8" />
          )}
        </svg>
      </div>
    );
  }

  if (type === 'taxi') {
    return (
      <div className={`ayn-vehicle-art ayn-vehicle-art--taxi ${isSelected ? 'ayn-vehicle-art--selected' : ''}`}>
        <svg viewBox="0 0 100 48" width="90" height="42" fill="none">
          {/* Taxi Roof Sign */}
          <rect x="42" y="2" width="16" height="7" rx="2" fill="#F5A623" stroke="#2B2118" strokeWidth="1.4" />
          <text x="50" y="7.5" fontSize="5" fontWeight="900" fill="#2B2118" textAnchor="middle">TAXI</text>

          {/* Cabin Upper Frame */}
          <path d="M24 20 L34 9 L66 9 L76 20 Z" fill="#FFFFFF" stroke="#2B2118" strokeWidth="2" strokeLinejoin="round" />
          {/* Windows */}
          <polygon points="36,11 48,11 48,19 28,19" fill="#D9F0F8" stroke="#2B2118" strokeWidth="1.2" />
          <polygon points="52,11 64,11 72,19 52,19" fill="#D9F0F8" stroke="#2B2118" strokeWidth="1.2" />

          {/* Passenger in rear window if selected */}
          {hasPassenger && (
            <circle cx="42" cy="15" r="3" fill="#B5472F" stroke="#2B2118" strokeWidth="0.8" />
          )}

          {/* Cairo B&W Taxi Lower Body */}
          <rect x="8" y="20" width="84" height="15" rx="4" fill="#2B2118" stroke="#2B2118" strokeWidth="1" />
          <rect x="24" y="20" width="52" height="7" fill="#F5A623" />

          {/* Headlight & Taillight */}
          <circle cx="89" cy="24" r="3" fill="#F5A623" stroke="#2B2118" strokeWidth="0.8" />
          <rect x="8" y="22" width="3.5" height="5" fill="#E63946" />

          {/* Wheels */}
          <g className="ayn-vehicle-wheel" transform="translate(26, 35)">
            <circle cx="0" cy="0" r="7.5" fill="#1C1814" stroke="#D8C8B0" strokeWidth="1.6" />
            <circle cx="0" cy="0" r="3" fill="#F5A623" />
          </g>
          <g className="ayn-vehicle-wheel" transform="translate(74, 35)">
            <circle cx="0" cy="0" r="7.5" fill="#1C1814" stroke="#D8C8B0" strokeWidth="1.6" />
            <circle cx="0" cy="0" r="3" fill="#F5A623" />
          </g>
        </svg>
      </div>
    );
  }

  // Bus (Swvl / Go Bus)
  return (
    <div className={`ayn-vehicle-art ayn-vehicle-art--bus ${isSelected ? 'ayn-vehicle-art--selected' : ''}`}>
      <svg viewBox="0 0 135 52" width="112" height="44" fill="none">
        {/* Bus Body */}
        <rect x="8" y="6" width="118" height="34" rx="6" fill="#B5472F" stroke="#2B2118" strokeWidth="2" />
        <rect x="8" y="26" width="118" height="6" fill="#FFFFFF" />

        {/* Tinted Panoramic Windows */}
        <rect x="105" y="10" width="16" height="14" rx="2" fill="#D4EEF9" stroke="#2B2118" strokeWidth="1.2" />
        <rect x="84" y="10" width="18" height="12" rx="2" fill="#D4EEF9" stroke="#2B2118" strokeWidth="1.2" />
        <rect x="63" y="10" width="18" height="12" rx="2" fill="#D4EEF9" stroke="#2B2118" strokeWidth="1.2" />
        <rect x="42" y="10" width="18" height="12" rx="2" fill="#D4EEF9" stroke="#2B2118" strokeWidth="1.2" />
        <rect x="21" y="10" width="18" height="12" rx="2" fill="#D4EEF9" stroke="#2B2118" strokeWidth="1.2" />

        {/* Passenger in bus window if selected */}
        {hasPassenger && (
          <circle cx="51" cy="16" r="3" fill="#F5A623" stroke="#2B2118" strokeWidth="0.8" />
        )}

        {/* Lights */}
        <circle cx="123" cy="28" r="3" fill="#F5A623" />
        <rect x="8" y="27" width="3" height="6" fill="#E63946" />

        <text x="62" y="24" fontSize="5.5" fontWeight="bold" fill="#FFFFFF" letterSpacing="0.8">SWVL TRAVEL</text>

        {/* Wheels */}
        <g className="ayn-vehicle-wheel" transform="translate(30, 40)">
          <circle cx="0" cy="0" r="8.5" fill="#1C1814" stroke="#D8C8B0" strokeWidth="1.6" />
          <circle cx="0" cy="0" r="3.5" fill="#FFFFFF" />
        </g>
        <g className="ayn-vehicle-wheel" transform="translate(102, 40)">
          <circle cx="0" cy="0" r="8.5" fill="#1C1814" stroke="#D8C8B0" strokeWidth="1.6" />
          <circle cx="0" cy="0" r="3.5" fill="#FFFFFF" />
        </g>
      </svg>
    </div>
  );
}

export function CloudPodCushion() {
  return (
    <div className="ayn-cloud-pod-cushion" aria-hidden="true">
      <svg viewBox="0 0 340 70" width="100%" height="70" preserveAspectRatio="none" fill="none">
        <path
          d="M20 45 
             C10 25 35 15 55 20 
             C70 5 105 2 130 15 
             C155 -2 195 0 220 14 
             C245 4 280 10 295 25 
             C325 20 335 45 320 60 
             C305 70 35 70 20 45 Z"
          fill="#FFFFFF"
          opacity="0.92"
        />
      </svg>
    </div>
  );
}

export function HotelSkyBackground() {
  return (
    <div className="ayn-hotel-sky-bg" aria-hidden="true">
      {/* Drifting Sky Clouds */}
      <div className="ayn-hotel-sky-clouds">
        <svg className="ayn-hotel-cloud ayn-hotel-cloud--1" viewBox="0 0 140 60" width="130" height="55" fill="none">
          <path d="M20 45 C10 45 2 38 2 28 C2 20 8 13 16 12 C18 5 26 0 36 0 C45 0 52 5 55 12 C58 10 63 8 68 8 C78 8 86 16 87 26 C94 27 100 33 100 40 C100 48 94 45 86 45 H20 Z" fill="#FFFFFF" opacity="0.85" />
        </svg>
        <svg className="ayn-hotel-cloud ayn-hotel-cloud--2" viewBox="0 0 120 50" width="105" height="44" fill="none">
          <path d="M15 38 C8 38 2 32 2 24 C2 17 7 11 14 10 C16 4 23 0 32 0 C40 0 46 4 48 10 C51 8 55 7 60 7 C68 7 75 14 76 22 C82 23 88 28 88 34 C88 41 82 38 75 38 H15 Z" fill="#FFFFFF" opacity="0.75" />
        </svg>
        <svg className="ayn-hotel-cloud ayn-hotel-cloud--3" viewBox="0 0 150 65" width="140" height="60" fill="none">
          <path d="M22 48 C11 48 2 40 2 30 C2 21 9 14 18 13 C20 5 29 0 40 0 C50 0 58 5 61 13 C64 11 70 9 76 9 C87 9 96 17 97 28 C104 29 111 35 111 43 C111 51 104 48 96 48 H22 Z" fill="#FFFFFF" opacity="0.8" />
        </svg>
      </div>

      {/* Swaying Egyptian Palm Trees in the Corners */}
      <svg className="ayn-hotel-palms ayn-hotel-palms--left" viewBox="0 0 80 120" width="80" height="120" fill="none">
        <path d="M24 120 C26 80 34 50 48 24" stroke="#7A5232" strokeWidth="5" strokeLinecap="round" />
        <g className="ayn-hotel-palm-fronds">
          <path d="M48 24 C38 10 22 14 12 28" stroke="#2D7A4D" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M48 24 C48 6 62 4 74 18" stroke="#2D7A4D" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M48 24 C58 18 70 26 78 38" stroke="#2D7A4D" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M48 24 C32 18 22 32 20 44" stroke="#2D7A4D" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M48 24 C48 8 54 6 56 4" stroke="#3FA86B" strokeWidth="3" strokeLinecap="round" />
        </g>
      </svg>

      <svg className="ayn-hotel-palms ayn-hotel-palms--right" viewBox="0 0 80 120" width="80" height="120" fill="none">
        <path d="M44 120 C42 80 34 50 20 24" stroke="#7A5232" strokeWidth="5" strokeLinecap="round" />
        <g className="ayn-hotel-palm-fronds">
          <path d="M20 24 C10 10 -6 14 -16 28" stroke="#2D7A4D" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M20 24 C20 6 34 4 46 18" stroke="#2D7A4D" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M20 24 C30 18 42 26 50 38" stroke="#2D7A4D" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M20 24 C4 18 -6 32 -8 44" stroke="#2D7A4D" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      </svg>

      {/* Floating Hot Air Balloon in Upper Sky */}
      <LuxorHotAirBalloon className="ayn-hotel-balloon-floating" />

      {/* Airplane Gliding Across the Sky */}
      <div className="ayn-hotel-plane-flight">
        <svg className="ayn-hotel-plane-svg" viewBox="0 0 60 32" width="60" height="32" fill="none">
          <path d="M2 16 Q-12 14 -24 16" stroke="#FFFFFF" strokeWidth="2.5" strokeDasharray="4,4" opacity="0.85" />
          <path d="M12 16 L42 16 C50 16 55 14 57 13 C55 12 50 10 42 10 L12 10 C8 10 6 12 6 13 C6 14 8 16 12 16 Z" fill="#1F5F8B" />
          <polygon points="46,11 51,12 46,13" fill="#FFFFFF" />
          <polygon points="30,13 18,1 25,1 38,13" fill="#147A82" />
          <polygon points="30,13 18,25 25,25 38,13" fill="#0D5A60" />
          <polygon points="10,10 3,2 8,2 14,10" fill="#F5A623" />
        </svg>
      </div>
    </div>
  );
}

export function TransportStreetBackground() {
  return (
    <div className="ayn-transport-street-bg" aria-hidden="true">
      {/* City Skyline Silhouette behind road */}
      <svg className="ayn-street-skyline" viewBox="0 0 1000 36" preserveAspectRatio="none" fill="none">
        <path
          d="M0 36 L0 26 L40 26 L40 18 L60 18 L60 26 L120 26 L140 12 L160 26 L220 26 L230 8 L240 26 L340 26 L360 16 L380 26 L480 26 L500 6 L510 6 L520 26 L620 26 L640 15 L660 26 L780 26 L790 10 L800 26 L900 26 L920 18 L940 26 L1000 26 L1000 36 Z"
          fill="#D6C4AD"
          opacity="0.35"
        />
      </svg>

      {/* Asphalt Egyptian Road Strip */}
      <div className="ayn-street-road-surface">
        {/* Yellow-Black Curb */}
        <div className="ayn-street-curb-line" />
        {/* Dashed White Road Lanes */}
        <div className="ayn-street-dashed-lane" />
      </div>
    </div>
  );
}

export const HotelSkyBanner = HotelSkyBackground;
export const TransportStreetBanner = TransportStreetBackground;
