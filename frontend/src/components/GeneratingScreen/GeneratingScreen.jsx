import React from 'react';
import { Button } from '../Button';
import './GeneratingScreen.css';

/**
 * Generating Screen (DESIGN.md §4.10)
 *
 * Centered card with H2 "Building your plan", one muted line,
 * thin 2px indeterminate line in --color-primary at the top of the card.
 * On 502: inline message and "Try again" button.
 */
export function GeneratingScreen({ error, onRetry, onCancel }) {
  return (
    <div className="ayn-generating-card">
      {!error && (
        <div className="ayn-generating-card__bar">
          <div className="ayn-generating-card__bar-indicator" />
        </div>
      )}

      <h2 className="ayn-generating-card__title">
        {error ? 'Generation Failed' : 'Building your plan'}
      </h2>

      <p className="ayn-generating-card__desc">
        {error
          ? error
          : 'Ayn is tailoring activities, balancing your budget, and finding hotels and flights.'}
      </p>

      {error && (
        <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center' }}>
          {onRetry && (
            <Button variant="primary" onClick={onRetry}>
              Try again
            </Button>
          )}
          {onCancel && (
            <Button variant="secondary" onClick={onCancel}>
              Back to form
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default GeneratingScreen;
