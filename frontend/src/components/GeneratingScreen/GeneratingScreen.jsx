import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '../Button';
import { PersonIllustration, CloudIllustration, BalloonChickenIllustration } from '../Illustration';
import { useLanguage } from '../../context/LanguageContext.js';
import './GeneratingScreen.css';

const STEPS = ['generating.step.profile', 'generating.step.search', 'generating.step.days', 'generating.step.budget'];
const STEP_MS = 6000;

const FUN_FACTS_EN = [
  'The Great Pyramid was the tallest man-made structure on Earth for over 3,800 years! 🏛️',
  'The Nile river stretches 6,650 km, cradling Egyptian civilization for millennia. ⛵',
  'Sunset from a traditional wooden Felucca in Aswan is pure Egyptian magic. ✨',
  'Alexandria once housed the greatest library and tallest lighthouse of the ancient world. 📜',
  'Always try authentic Egyptian Koshari with extra da\'ah and crispy fried onions! 🍲',
  'Khan el-Khalili in Cairo has been a bustling bazaar for over 600 years. ☕'
];

const FUN_FACTS_AR = [
  'ظل الهرم الأكبر أطول بناء من صنع الإنسان على وجه الأرض لأكثر من 3800 عام! 🏛️',
  'نهر النيل يمتد لأكثر من 6650 كم، مهداً للحضارة المصرية عبر آلاف السنين. ⛵',
  'مشاهدة غروب الشمس من فلوكة خشبية في أسوان تجربة مصرية ساحرة. ✨',
  'الإسكندرية ضمت أعظم مكتبة وأطول منارة في العالم القديم. 📜',
  'لا تفوّت طبق الكشري المصري الأصيل مع الدقة والصلصة والبصل المقرمش! 🍲',
  'خان الخليلي في القاهرة ينبض بالحياة والتجارة منذ أكثر من 600 عام. ☕'
];

/**
 * Enhanced Generating Screen with Animated Nile Cruise & Traveler Paper Note
 */
export function GeneratingScreen({ error, onRetry, onCancel }) {
  const { t, translate, language } = useLanguage();
  const [step, setStep] = useState(0);
  const [factIndex, setFactIndex] = useState(0);

  useEffect(() => {
    if (error) return undefined;
    const stepTimer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), STEP_MS);
    const factTimer = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % FUN_FACTS_EN.length);
    }, 4500);

    return () => {
      clearInterval(stepTimer);
      clearInterval(factTimer);
    };
  }, [error]);

  const facts = language === 'ar' ? FUN_FACTS_AR : FUN_FACTS_EN;

  return (
    <div className="ayn-generating-container" aria-live="polite">
      {/* 1. Animated Atmospheric Sky with Floating Drifting Clouds & Ascending Balloon Chick */}
      <div className="ayn-generating__sky" aria-hidden="true">
        {/* Clouds spanning top, middle, and bottom across the full screen */}
        <div className="ayn-generating__cloud ayn-generating__cloud--1">
          <CloudIllustration width={180} />
        </div>
        <div className="ayn-generating__cloud ayn-generating__cloud--2">
          <CloudIllustration width={130} />
        </div>
        <div className="ayn-generating__cloud ayn-generating__cloud--3">
          <CloudIllustration width={150} />
        </div>
        <div className="ayn-generating__cloud ayn-generating__cloud--4">
          <CloudIllustration width={110} />
        </div>
        <div className="ayn-generating__cloud ayn-generating__cloud--5">
          <CloudIllustration width={170} />
        </div>
        <div className="ayn-generating__cloud ayn-generating__cloud--6">
          <CloudIllustration width={140} />
        </div>

        {/* Fun Easter Egg: Flying Chick attached to balloon ascending to the sky! */}
        <BalloonChickenIllustration />
      </div>

      {/* 2. Main Generating Card */}
      <div className="ayn-generating-card">
        {/* Organic Progress Bar */}
        {!error && (
          <div className="ayn-generating-card__bar">
            <div className="ayn-generating-card__bar-indicator" />
          </div>
        )}

        {/* Mini Story: Travelers with luggage */}
        {!error && (
          <div className="ayn-generating-card__figures" aria-hidden="true">
            <PersonIllustration variant="suitcase" width={48} height={74} animated={true} interactive={false} />
            <PersonIllustration variant="map" width={48} height={74} animated={true} interactive={false} />
          </div>
        )}

        {/* Illustrated Flight Path over Pyramids */}
        {!error && (
          <div className="ayn-generating-card__route-wrap">
            <svg className="ayn-generating-card__route" viewBox="0 0 340 100" aria-hidden="true">
              <polygon points="120,86 160,42 200,86" fill="#E9D8A6" opacity="0.6" />
              <polygon points="180,86 215,50 250,86" fill="#D6C4A6" opacity="0.5" />
              <circle cx="270" cy="30" r="14" fill="#F5A623" opacity="0.8" />
              <path className="ayn-generating-card__path" d="M16 82 Q170 -10 324 82" />
              <circle className="ayn-generating-card__pin" cx="16" cy="82" r="5" />
              <circle className="ayn-generating-card__pin ayn-generating-card__pin--end" cx="324" cy="82" r="5" />
              <g className="ayn-generating-card__plane">
                <path d="M-9 -2 L5 -2 L11 0 L5 2 L-9 2 Z M-3 -2 L-7 -9 L-4 -9 L2 -2 Z M-3 2 L-7 9 L-4 9 L2 2 Z M-9 -1 L-12 -5 L-10 -5 L-6 -1 Z M-9 1 L-12 5 L-10 5 L-6 1 Z" />
              </g>
            </svg>
          </div>
        )}

        <h2 className="ayn-generating-card__title">
          {error ? t('generating.failed') : t('generating.title')}
        </h2>

        <p className="ayn-generating-card__desc">
          {error ? translate(error) : t('generating.description')}
        </p>

        {/* 3. Handcrafted Traveler's Note on Paper (Not an AI bubble) */}
        {!error && (
          <div className="ayn-traveler-note" aria-label="Travel tip note">
            <div className="ayn-traveler-note__tape" aria-hidden="true" />
            <div className="ayn-traveler-note__header">
              <span className="ayn-traveler-note__pin" aria-hidden="true">📌</span>
              <span className="ayn-traveler-note__label">
                {language === 'ar' ? 'من مفكرة المسافر' : "Traveler's Notebook"}
              </span>
            </div>
            <p className="ayn-traveler-note__text">
              {facts[factIndex]}
            </p>
          </div>
        )}

        {/* 4. Progress Stepper Checklist */}
        {!error && (
          <ol className="ayn-generating-steps">
            {STEPS.map((key, i) => {
              const state = i < step ? 'done' : i === step ? 'active' : 'todo';
              return (
                <li key={key} className={`ayn-generating-steps__item ayn-generating-steps__item--${state}`}>
                  <span className="ayn-generating-steps__mark" aria-hidden="true">
                    {state === 'done' ? <Check size={14} strokeWidth={3} /> : i + 1}
                  </span>
                  {t(key)}
                </li>
              );
            })}
          </ol>
        )}

        {error && (
          <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'center' }}>
            {onRetry && (
              <Button variant="primary" onClick={onRetry}>
                {t('common.tryAgain')}
              </Button>
            )}
            {onCancel && (
              <Button variant="secondary" onClick={onCancel}>
                {t('common.backToForm')}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 5. Moving Nile Cruise Ship on Animated Rolling Waters */}
      {!error && (
        <div className="ayn-generating__nile-wrap" aria-hidden="true">
          <div className="ayn-generating__cruise-ship">
            <svg viewBox="0 0 160 56" width="130" height="46" fill="none">
              {/* Ship Hull */}
              <path d="M12 40 L138 40 L150 26 L8 26 Z" fill="#FFFFFF" stroke="#2B2118" strokeWidth="2.4" strokeLinejoin="round" />
              <path d="M16 40 L134 40 L128 46 L22 46 Z" fill="#1F5F8B" />
              {/* Lower Cabin Windows */}
              <circle cx="36" cy="33" r="2.8" fill="#1F5F8B" />
              <circle cx="56" cy="33" r="2.8" fill="#1F5F8B" />
              <circle cx="76" cy="33" r="2.8" fill="#1F5F8B" />
              <circle cx="96" cy="33" r="2.8" fill="#1F5F8B" />
              <circle cx="116" cy="33" r="2.8" fill="#1F5F8B" />
              {/* Upper Deck Cabin */}
              <rect x="28" y="13" width="94" height="13" rx="2" fill="#FAF6EE" stroke="#2B2118" strokeWidth="1.8" />
              {/* Windows */}
              <rect x="34" y="16" width="8" height="7" rx="1" fill="#147A82" />
              <rect x="48" y="16" width="8" height="7" rx="1" fill="#147A82" />
              <rect x="62" y="16" width="8" height="7" rx="1" fill="#147A82" />
              <rect x="76" y="16" width="8" height="7" rx="1" fill="#147A82" />
              <rect x="90" y="16" width="8" height="7" rx="1" fill="#147A82" />
              <rect x="104" y="16" width="8" height="7" rx="1" fill="#147A82" />
              {/* Smokestack */}
              <rect x="52" y="5" width="14" height="8" fill="#B5472F" stroke="#2B2118" strokeWidth="1.5" />
              {/* Egyptian Flag */}
              <path d="M122 13 L122 3" stroke="#2B2118" strokeWidth="1.4" />
              <rect x="122" y="3" width="11" height="6" fill="#B5472F" />
              <rect x="122" y="5" width="11" height="2" fill="#FFFFFF" />
              <rect x="122" y="7" width="11" height="2" fill="#2B2118" />
            </svg>
          </div>

          {/* Rolling Nile River Waves */}
          <svg className="ayn-generating__waves" viewBox="0 0 1200 36" preserveAspectRatio="none">
            <path
              className="ayn-generating__wave-path ayn-generating__wave-path--back"
              d="M0 16 Q150 4 300 16 T600 16 T900 16 T1200 16 V36 H0 Z"
              fill="rgba(31, 95, 139, 0.22)"
            />
            <path
              className="ayn-generating__wave-path ayn-generating__wave-path--front"
              d="M0 20 Q150 32 300 20 T600 20 T900 20 T1200 20 V36 H0 Z"
              fill="#1F5F8B"
              opacity="0.55"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

export default GeneratingScreen;
