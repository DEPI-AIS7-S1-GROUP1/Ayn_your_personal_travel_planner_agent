import React from 'react';
import { ArchSceneIllustration } from '../Illustration';
import './FeatureArchCard.css';

/**
 * Reusable Feature Arch Card (DESIGN.md 2 & Section 3.6 / Section 4.6)
 *
 * Used for feature cards on landing page:
 * Arch-shaped top (4:3 aspect ratio, 999px 999px 16px 16px radius, 2px text outline),
 * H3 heading, and muted text.
 *
 * @param {string} title
 * @param {string} description
 * @param {'pyramids' | 'nile' | 'redsea' | 'luxor'} sceneType
 * @param {React.ReactNode} [customVisual]
 */
export function FeatureArchCard({
  title,
  description,
  sceneType = 'pyramids',
  customVisual,
  className = ''
}) {
  return (
    <div className={`ayn-feature-arch-card ${className}`}>
      <div className="ayn-feature-arch-card__image-container">
        {customVisual || <ArchSceneIllustration type={sceneType} />}
      </div>
      <h3 className="ayn-feature-arch-card__title">{title}</h3>
      <p className="ayn-feature-arch-card__description">{description}</p>
    </div>
  );
}

export default FeatureArchCard;
