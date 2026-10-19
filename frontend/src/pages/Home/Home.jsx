import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { ToggleSwitch } from '../../components/ToggleSwitch';
import { FeatureArchCard } from '../../components/FeatureArchCard';
import { useLanguage } from '../../context/LanguageContext.js';
import {
  PersonIllustration,
  CloudIllustration,
} from '../../components/Illustration';
import './Home.css';

const HERO_SLIDES = [
  {
    id: 'luxor',
    name: 'Temples of Luxor',
    renderBg: () => (
      <svg className="ayn-home__hero-bg" viewBox="0 0 1440 440" preserveAspectRatio="xMidYMid slice" fill="none">
        <rect width="1440" height="440" fill="#E8D9C0" />
        <circle cx="280" cy="180" r="110" fill="#F5A623" />
        {/* Massive Luxor Columns background */}
        <g fill="#B5472F">
          <rect x="580" y="80" width="110" height="360" rx="6" />
          <rect x="560" y="65" width="150" height="20" rx="4" />

          <rect x="760" y="80" width="110" height="360" rx="6" />
          <rect x="740" y="65" width="150" height="20" rx="4" />

          <rect x="940" y="80" width="110" height="360" rx="6" />
          <rect x="920" y="65" width="150" height="20" rx="4" />

          <rect x="1120" y="80" width="110" height="360" rx="6" />
          <rect x="1100" y="65" width="150" height="20" rx="4" />

          <rect x="1300" y="80" width="110" height="360" rx="6" />
          <rect x="1280" y="65" width="150" height="20" rx="4" />
        </g>
      </svg>
    )
  },
  {
    id: 'pyramids',
    name: 'Giza Pyramids',
    renderBg: () => (
      <svg className="ayn-home__hero-bg" viewBox="0 0 1440 440" preserveAspectRatio="xMidYMid slice" fill="none">
        <rect width="1440" height="440" fill="#F5EFE6" />
        <circle cx="340" cy="150" r="90" fill="#F5A623" />
        <polygon points="540,440 820,130 1100,440" fill="#B5472F" />
        <polygon points="980,440 1200,190 1420,440" fill="#993822" />
        <path d="M0 380 Q360 350 720 390 T1440 370 V440 H0 Z" fill="#D6C4A6" />
      </svg>
    )
  },
  {
    id: 'nile',
    name: 'Nile at Aswan',
    renderBg: () => (
      <svg className="ayn-home__hero-bg" viewBox="0 0 1440 440" preserveAspectRatio="xMidYMid slice" fill="none">
        <rect width="1440" height="440" fill="#CFE3E8" />
        <circle cx="280" cy="140" r="70" fill="#F5A623" />
        <rect y="260" width="1440" height="180" fill="#1F5F8B" />
        <polygon points="920,140 920,270 1060,270" fill="#FFFFFF" />
        <path d="M880 270 L1080 270 L1050 295 L910 295 Z" fill="#FFFFFF" />
      </svg>
    )
  },
  {
    id: 'redsea',
    name: 'Red Sea Coast',
    renderBg: () => (
      <svg className="ayn-home__hero-bg" viewBox="0 0 1440 440" preserveAspectRatio="xMidYMid slice" fill="none">
        <rect width="1440" height="440" fill="#F5EFE6" />
        <circle cx="320" cy="160" r="80" fill="#F5A623" />
        <polygon points="560,300 860,140 1160,300" fill="#7A5232" />
        <polygon points="980,300 1240,170 1440,300" fill="#5C3B20" />
        <rect y="300" width="1440" height="140" fill="#2A7B9B" />
        <path d="M0 340 Q180 325 360 340 T720 340 T1080 340 T1440 340" stroke="#CFE3E8" strokeWidth="4" fill="none" />
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

  // Auto-advance hero slider every 4s, pauses on hover, respects prefers-reduced-motion
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || isPaused) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 4000);

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
      {/* 1. HERO SLIDER */}
      <section
        className="ayn-home__hero"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        aria-roledescription="carousel"
        aria-label={t('home.destinations')}
      >
        {HERO_SLIDES.map((slide, idx) => (
          <div
            key={slide.id}
            className={`ayn-home__hero-slide ${idx === currentSlide ? 'ayn-home__hero-slide--active' : ''}`}
            aria-hidden={idx !== currentSlide}
          >
            {slide.renderBg()}
          </div>
        ))}

        <div className="ayn-home__hero-content-wrap">
          {/* White Card on the Left */}
          <div className="ayn-home__hero-card">
            <h1 className="ayn-home__hero-title">
              {t('home.heroTitle')}<br />{t('home.heroKnows')}
            </h1>
            <p className="ayn-home__hero-subtitle">
              {t('home.heroSubtitle')}
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('/destination')}
            >
              {t('home.startPlanning')}
            </Button>
          </div>
        </div>

        {/* Caption pill at bottom right */}
        <div className="ayn-home__hero-caption">
          {translate(HERO_SLIDES[currentSlide].name)}
        </div>
      </section>

      {/* 2. FEATURES (WHAT AYN DOES - 4 CARDS) */}
      <section className="ayn-home__features-section" id="features">
        <div className="ayn-home__features-container">
          <h2 className="ayn-home__features-title">{t('home.featuresTitle')}</h2>

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
      </section>

      {/* 3. ABOUT AYN */}
      <section className="ayn-home__about-section" id="about">
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

          <div className="ayn-home__about-figures" aria-hidden="true">
            <PersonIllustration variant="hat" />
            <PersonIllustration variant="backpack" />
            <PersonIllustration variant="camera" />
          </div>
        </div>
      </section>

      {/* 4. CALL TO ACTION BAND */}
      <section className="ayn-home__cta-band">
        {/* Background Clouds */}
        <div className="ayn-home__cta-clouds" aria-hidden="true">
          <div className="ayn-home__cloud--top-left">
            <CloudIllustration width={140} />
          </div>
          <div className="ayn-home__cloud--top-right">
            <CloudIllustration width={150} />
          </div>
          <div className="ayn-home__cloud--bottom-center">
            <CloudIllustration width={130} />
          </div>
        </div>

        {/* Foreground People */}
        <div className="ayn-home__cta-figures" aria-hidden="true">
          <div className="ayn-home__person--bottom-left">
            <PersonIllustration variant="hat" />
            <PersonIllustration variant="backpack" />
          </div>
          <div className="ayn-home__person--bottom-right">
            <PersonIllustration variant="camera" />
          </div>
        </div>

        {/* Content */}
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
            >
              {t('home.startSurvey')}
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

export default Home;
