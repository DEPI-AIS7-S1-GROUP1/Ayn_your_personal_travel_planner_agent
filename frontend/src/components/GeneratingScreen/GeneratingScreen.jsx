import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '../Button';
import { useLanguage } from '../../context/LanguageContext.js';
import './GeneratingScreen.css';

// What the agent does, in order (agent/main.py: context → search → planner → checks).
// Steps advance on a timer: the API returns once at the end, so this shows the kind of work
// happening, not real progress. The last step stays active until the plan arrives.
const STEPS = ['generating.step.profile', 'generating.step.search', 'generating.step.days', 'generating.step.budget'];
const STEP_MS = 6000;

/**
 * Generating Screen (DESIGN.md §4.10)
 *
 * Centered card with H2 "Building your plan", a plane crossing a dotted route, and the
 * agent's steps ticking off. On 502: inline message and "Try again" button.
 */
export function GeneratingScreen({ error, onRetry, onCancel }) {
  const { t, translate } = useLanguage();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (error) return undefined;
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), STEP_MS);
    return () => clearInterval(timer);
  }, [error]);

  return (
    <div className="ayn-generating-card" aria-live="polite">
      {!error && (
        <div className="ayn-generating-card__bar">
          <div className="ayn-generating-card__bar-indicator" />
        </div>
      )}

      {!error && (
        <svg className="ayn-generating-card__route" viewBox="0 0 320 90" aria-hidden="true">
          <path className="ayn-generating-card__path" d="M16 74 Q160 -14 304 74" />
          <circle className="ayn-generating-card__pin" cx="16" cy="74" r="5" />
          <circle className="ayn-generating-card__pin ayn-generating-card__pin--end" cx="304" cy="74" r="5" />
          <g className="ayn-generating-card__plane">
            <path d="M-9 -2 L5 -2 L11 0 L5 2 L-9 2 Z M-3 -2 L-7 -9 L-4 -9 L2 -2 Z M-3 2 L-7 9 L-4 9 L2 2 Z M-9 -1 L-12 -5 L-10 -5 L-6 -1 Z M-9 1 L-12 5 L-10 5 L-6 1 Z" />
          </g>
        </svg>
      )}

      <h2 className="ayn-generating-card__title">
        {error ? t('generating.failed') : t('generating.title')}
      </h2>

      <p className="ayn-generating-card__desc">
        {error
          ? translate(error)
          : t('generating.description')}
      </p>

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
        <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center' }}>
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
  );
}

export default GeneratingScreen;
