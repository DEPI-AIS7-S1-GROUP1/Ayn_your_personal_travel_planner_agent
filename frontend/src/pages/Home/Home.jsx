import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, MapPin, Compass } from 'lucide-react';
import { Button } from '../../components/Button';
import { ToggleSwitch } from '../../components/ToggleSwitch';
import { FeatureArchCard } from '../../components/FeatureArchCard';
import { useLanguage } from '../../context/LanguageContext.js';
import {
  PersonIllustration,
  WalkingFigure,
  CloudIllustration,
} from '../../components/Illustration';
import './Home.css';

const HERO_SLIDES = [
  {
    id: 'luxor',
    name: 'Temples of Luxor',
    renderSky: () => (
      <svg className="ayn-home__hero-bg" viewBox="0 0 1440 460" preserveAspectRatio="xMidYMid slice" fill="none">
        <rect width="1440" height="460" fill="#E8D9C0" />
        {/* Glowing Sun with radiant halo */}
        <circle cx="280" cy="180" r="110" fill="#F5A623" />
        <circle cx="280" cy="180" r="145" stroke="#F5A623" strokeWidth="2" opacity="0.3" />
      </svg>
    ),
    renderLandmark: () => (
      <svg className="ayn-home__hero-bg" viewBox="0 0 1440 460" preserveAspectRatio="xMidYMid slice" fill="none">
        {/* Luxor Columns (~60% of original size, ground anchored) */}
        <g fill="#B5472F">
          <rect x="620" y="230" width="66" height="230" rx="4" />
          <rect x="608" y="218" width="90" height="14" rx="3" fill="#F5A623" />

          <rect x="780" y="230" width="66" height="230" rx="4" />
          <rect x="768" y="218" width="90" height="14" rx="3" fill="#F5A623" />

          <rect x="940" y="230" width="66" height="230" rx="4" />
          <rect x="928" y="218" width="90" height="14" rx="3" fill="#F5A623" />

          <rect x="1100" y="230" width="66" height="230" rx="4" />
          <rect x="1088" y="218" width="90" height="14" rx="3" fill="#F5A623" />

          <rect x="1260" y="230" width="66" height="230" rx="4" />
          <rect x="1248" y="218" width="90" height="14" rx="3" fill="#F5A623" />
        </g>
      </svg>
    )
  },
  {
    id: 'pyramids',
    name: 'Giza Pyramids',
    renderSky: () => (
      <svg className="ayn-home__hero-bg" viewBox="0 0 1440 460" preserveAspectRatio="xMidYMid slice" fill="none">
        <rect width="1440" height="460" fill="#F5EFE6" />
        <circle cx="340" cy="150" r="95" fill="#F5A623" />
        <circle cx="340" cy="150" r="130" stroke="#F5A623" strokeWidth="2" opacity="0.3" />
      </svg>
    ),
    renderLandmark: () => (
      <svg className="ayn-home__hero-bg" viewBox="0 0 1440 460" preserveAspectRatio="xMidYMid slice" fill="none">
        <polygon points="540,460 820,130 1100,460" fill="#B5472F" />
        <polygon points="980,460 1200,190 1420,460" fill="#993822" />
        <path d="M0 380 Q360 350 720 390 T1440 370 V460 H0 Z" fill="#D6C4A6" />
      </svg>
    )
  },
  {
    id: 'nile',
    name: 'Nile at Aswan',
    renderSky: () => (
      <svg className="ayn-home__hero-bg" viewBox="0 0 1440 460" preserveAspectRatio="xMidYMid slice" fill="none">
        <rect width="1440" height="460" fill="#CFE3E8" />
        <circle cx="280" cy="140" r="75" fill="#F5A623" />
      </svg>
    ),
    renderLandmark: () => (
      <svg className="ayn-home__hero-bg" viewBox="0 0 1440 460" preserveAspectRatio="xMidYMid slice" fill="none">
        <rect y="270" width="1440" height="190" fill="#147A82" />
        <polygon points="920,130 920,280 1070,280" fill="#FFFFFF" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.12))" />
        <path d="M880 280 L1090 280 L1060 310 L910 310 Z" fill="#B5472F" />
      </svg>
    )
  },
  {
    id: 'redsea',
    name: 'Red Sea Coast',
    renderSky: () => (
      <svg className="ayn-home__hero-bg" viewBox="0 0 1440 460" preserveAspectRatio="xMidYMid slice" fill="none">
        <rect width="1440" height="460" fill="#F4EAD4" />
        <circle cx="320" cy="150" r="85" fill="#F5A623" />
      </svg>
    ),
    renderLandmark: () => (
      <svg className="ayn-home__hero-bg" viewBox="0 0 1440 460" preserveAspectRatio="xMidYMid slice" fill="none">
        <polygon points="560,320 860,140 1160,320" fill="#7A5232" />
        <polygon points="980,320 1240,170 1440,320" fill="#5C3B20" />
        <rect y="310" width="1440" height="150" fill="#0E4D53" />
        <path d="M0 350 Q180 335 360 350 T720 350 T1080 350 T1440 350" stroke="#CFE3E8" strokeWidth="4" fill="none" />
      </svg>
    )
  }
];

export function Home() {
  const navigate = useNavigate();
  const { t, translate } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [ctaToggle, setCtaToggle] = useState(false);

  // Auto-advance hero slider every 4.5s
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || isPaused) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [isPaused]);

  // Handle hash scroll on mount
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.replace('#', '');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, []);

  return (
    <div className="ayn-home">
      {/* ===================================================================
          1. HERO SECTION (Living depth, walking figures, organic card)
          =================================================================== */}
      <section
        className="ayn-home__hero"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        aria-roledescription="carousel"
        aria-label={t('home.destinations')}
      >
        {/* Layer 1: Sky & Sun Background */}
        {HERO_SLIDES.map((slide, idx) => (
          <div
            key={`sky-${slide.id}`}
            className={`ayn-home__hero-slide ayn-home__hero-slide--sky ${idx === currentSlide ? 'ayn-home__hero-slide--active' : ''}`}
            aria-hidden={idx !== currentSlide}
          >
            {slide.renderSky()}
          </div>
        ))}

        {/* Layer 2: Floating background clouds (behind landmarks, card, and walker) */}
        <div className="ayn-home__hero-clouds" aria-hidden="true">
          <div className="ayn-home__cloud--hero-1">
            <CloudIllustration width={180} />
          </div>
          <div className="ayn-home__cloud--hero-2">
            <CloudIllustration width={140} />
          </div>
        </div>

        {/* Layer 3: Architectural Landmarks & Ground (Pillars, Pyramids, Nile felucca) */}
        {HERO_SLIDES.map((slide, idx) => (
          <div
            key={`lm-${slide.id}`}
            className={`ayn-home__hero-slide ayn-home__hero-slide--landmark ${idx === currentSlide ? 'ayn-home__hero-slide--active' : ''}`}
            aria-hidden={idx !== currentSlide}
          >
            {slide.renderLandmark()}
          </div>
        ))}

        {/* Foreground Walking Traveler crossing the Hero dunes */}
        <div className="ayn-home__hero-walker" aria-hidden="true">
          <WalkingFigure variant="backpack" speed="medium" />
        </div>

        <div className="ayn-home__hero-content-wrap">
          {/* Organic Hero Card */}
          <div className="ayn-home__hero-card">
            <h1 className="ayn-home__hero-title">
              <span className="ayn-home__hero-line">{t('home.heroTitle')}</span>
              <span className="ayn-home__hero-line ayn-home__hero-line--accent">{t('home.heroKnows')}</span>
            </h1>

            <p className="ayn-home__hero-subtitle">
              {t('home.heroSubtitle')}
            </p>

            <div className="ayn-home__hero-actions">
              <Button
                variant="primary"
                onClick={() => navigate('/destination')}
                className="ayn-home__hero-cta"
              >
                <Compass size={18} style={{ marginInlineEnd: 6 }} />
                {t('home.startPlanning')}
              </Button>
            </div>
          </div>
        </div>

        {/* Caption pill at bottom right */}
        <div className="ayn-home__hero-caption">
          <MapPin size={14} style={{ marginInlineEnd: 6, color: 'var(--color-terracotta)' }} />
          {translate(HERO_SLIDES[currentSlide].name)}
        </div>

        {/* Organic Flowing Wave Divider to next section */}
        <div className="ayn-home__divider ayn-home__divider--bottom" aria-hidden="true">
          <svg viewBox="0 0 1440 64" fill="none" preserveAspectRatio="none">
            <path
              d="M0,32 C360,72 720,0 1080,48 C1260,68 1380,24 1440,36 L1440,64 L0,64 Z"
              fill="var(--color-bg)"
            />
          </svg>
        </div>
      </section>

      {/* ===================================================================
          2. JOURNEY DOTTED ROUTE & FEATURES SECTION
          =================================================================== */}
      <section className="ayn-home__features-section" id="features">
        {/* Soft Organic Morphing Background Blobs */}
        <div className="ayn-floating-blob ayn-blob--1" aria-hidden="true" />
        <div className="ayn-floating-blob ayn-blob--2" aria-hidden="true" />

        <div className="ayn-home__features-container">
          {/* Dotted Route Line Motif */}
          <div className="ayn-route-motif" aria-hidden="true">
            <svg viewBox="0 0 540 40" fill="none" className="ayn-route-motif__svg">
              <path
                d="M10,24 C140,-4 380,48 530,16"
                stroke="var(--color-terracotta)"
                strokeWidth="2.5"
                strokeDasharray="6 6"
                strokeLinecap="round"
                className="ayn-route-motif__path"
              />
              <circle cx="10" cy="24" r="5" fill="var(--color-terracotta)" />
              <circle cx="530" cy="16" r="5" fill="var(--color-sun)" />
            </svg>
          </div>

          <div className="ayn-home__features-header">
            <h2 className="ayn-home__features-title">{t('home.featuresTitle')}</h2>
            <p className="ayn-home__features-subtitle">
              {t('home.featuresSubtitle') || 'From hidden Alexandria bazaars to serene Red Sea reefs, planned in seconds.'}
            </p>
          </div>

          <div className="ayn-home__features-grid">
            <FeatureArchCard
              title={t('home.feature.personalized.title')}
              description={t('home.feature.personalized.description')}
              sceneType="pyramids"
            />
            <FeatureArchCard
              title={t('home.feature.budget.title')}
              description={t('home.feature.budget.description')}
              sceneType="nile"
            />
            <FeatureArchCard
              title={t('home.feature.chat.title')}
              description={t('home.feature.chat.description')}
              sceneType="redsea"
            />
            <FeatureArchCard
              title={t('home.feature.take.title')}
              description={t('home.feature.take.description')}
              sceneType="luxor"
            />
          </div>
        </div>

        {/* Flowing Dune Divider */}
        <div className="ayn-home__divider" aria-hidden="true">
          <svg viewBox="0 0 1440 60" fill="none" preserveAspectRatio="none">
            <path
              d="M0,20 C420,60 840,0 1260,40 Q1350,50 1440,25 L1440,60 L0,60 Z"
              fill="#F4EAD4"
            />
          </svg>
        </div>
      </section>

      {/* ===================================================================
          3. ABOUT AYN SECTION (Interactive Character Squad)
          =================================================================== */}
      <section className="ayn-home__about-section" id="about">
        <div className="ayn-floating-blob ayn-blob--3" aria-hidden="true" />

        <div className="ayn-home__about-container">
          <div className="ayn-home__about-text">
            <h2 className="ayn-home__about-title">{t('home.aboutTitle')}</h2>
            <p className="ayn-home__about-desc">
              {t('home.aboutDescription')}
            </p>
            <p className="ayn-home__about-desc">
              {t('home.aboutSecond')}
            </p>

          </div>

          {/* Interactive Traveler Squad */}
          <div className="ayn-home__about-figures" aria-label="Interactive Ayn travelers">
            <PersonIllustration variant="hat" width={64} height={96} />
            <PersonIllustration variant="map" width={64} height={96} />
            <PersonIllustration variant="camera" width={64} height={96} />
            <PersonIllustration variant="selfie" width={64} height={96} />
          </div>
        </div>

        {/* Sky-blue wave divider to CTA */}
        <div className="ayn-home__divider" aria-hidden="true">
          <svg viewBox="0 0 1440 64" fill="none" preserveAspectRatio="none">
            <path
              d="M0,25 C300,65 650,5 980,50 C1200,80 1360,15 1440,35 L1440,64 L0,64 Z"
              fill="var(--color-sky)"
            />
          </svg>
        </div>
      </section>

      {/* ===================================================================
          4. CALL TO ACTION BAND (Delight clouds, waving companions)
          =================================================================== */}
      <section className="ayn-home__cta-band">
        {/* Soft Organic Clouds */}
        <div className="ayn-home__cta-clouds" aria-hidden="true">
          <div className="ayn-home__cloud--top-left">
            <CloudIllustration width={150} />
          </div>
          <div className="ayn-home__cloud--top-right">
            <CloudIllustration width={170} />
          </div>
          <div className="ayn-home__cloud--bottom-center">
            <CloudIllustration width={140} />
          </div>
        </div>

        {/* Companion Travelers on sides */}
        <div className="ayn-home__cta-figures" aria-hidden="true">
          <div className="ayn-home__person--bottom-left">
            <PersonIllustration variant="suitcase" width={68} height={100} />
            <PersonIllustration variant="backpack" width={68} height={100} />
          </div>
          <div className="ayn-home__person--bottom-right">
            <PersonIllustration variant="hat" width={68} height={100} />
          </div>
        </div>

        {/* Content Box */}
        <div className="ayn-home__cta-content">
          <h2 className="ayn-home__cta-title">
            {t('home.ctaTitle')}
          </h2>

          <ToggleSwitch
            checked={ctaToggle}
            onChange={setCtaToggle}
            labelBefore={t('home.notYet')}
            labelAfter={t('home.takeMeToAyn')}
          />

          {ctaToggle && (
            <Button
              variant="primary"
              onClick={() => navigate('/survey')}
              className="ayn-home__cta-button"
            >
              <Sparkles size={18} style={{ marginInlineEnd: 6 }} />
              {t('home.startSurvey')}
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

export default Home;
