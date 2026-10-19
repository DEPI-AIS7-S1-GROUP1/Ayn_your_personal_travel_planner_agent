import { Button } from '../Button';
import { useLanguage } from '../../context/LanguageContext.js';
import './GeneratingScreen.css';

/**
 * Generating Screen (DESIGN.md §4.10)
 *
 * Centered card with H2 "Building your plan", one muted line,
 * thin 2px indeterminate line in --color-primary at the top of the card.
 * On 502: inline message and "Try again" button.
 */
export function GeneratingScreen({ error, onRetry, onCancel }) {
  const { t, translate } = useLanguage();
  return (
    <div className="ayn-generating-card">
      {!error && (
        <div className="ayn-generating-card__bar">
          <div className="ayn-generating-card__bar-indicator" />
        </div>
      )}

      <h2 className="ayn-generating-card__title">
        {error ? t('generating.failed') : t('generating.title')}
      </h2>

      <p className="ayn-generating-card__desc">
        {error
          ? translate(error)
          : t('generating.description')}
      </p>

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
