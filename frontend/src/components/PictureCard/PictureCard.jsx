import React, { useState } from 'react';
import { Star, Check } from 'lucide-react';
import './PictureCard.css';

/**
 * Ayn Picture Card Component (DESIGN.md 4.6 - Hotels)
 *
 * The whole card acts as one interactive button.
 *
 * @param {string} name - Hotel name
 * @param {string} [imageUrl] - URL to hotel image (real photo). Falls back to flat border block if missing or fails.
 * @param {string} area - Area/location description
 * @param {number} [stars=0] - Star rating (1 to 5)
 * @param {string} [details] - Short hotel description (max 2 lines)
 * @param {string | number} totalPrice - Total price for stay (e.g. "EGP 12,000")
 * @param {string | number} [pricePerNight] - Price per night (e.g. "EGP 3,000 / night")
 * @param {boolean} [selected=false] - Selected hotel state
 * @param {boolean} [disabled=false] - Disabled state
 * @param {() => void} [onClick] - Selection handler
 */
export function PictureCard({
  name,
  imageUrl,
  area,
  stars = 0,
  details,
  totalPrice,
  pricePerNight,
  selected = false,
  disabled = false,
  onClick,
  className = '',
  ...props
}) {
  const [imageFailed, setImageFailed] = useState(false);

  const starCount = Math.max(0, Math.min(5, Math.round(stars || 0)));

  return (
    <button
      type="button"
      className={`ayn-picture-card ${selected ? 'ayn-picture-card--selected' : ''} ${disabled ? 'ayn-picture-card--disabled' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      {...props}
    >
      <div className="ayn-picture-card__image-container">
        {imageUrl && !imageFailed ? (
          <img
            src={imageUrl}
            alt={name}
            className="ayn-picture-card__image"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="ayn-picture-card__placeholder" aria-hidden="true" />
        )}
      </div>

      <div className="ayn-picture-card__body">
        <div className="ayn-picture-card__header">
          <h3 className="ayn-picture-card__title">{name}</h3>
          {selected && (
            <span className="ayn-picture-card__selected-badge">
              <Check size={16} strokeWidth={2} />
              <span>Selected</span>
            </span>
          )}
        </div>

        <div className="ayn-picture-card__meta">
          {area && <span>{area}</span>}
          {starCount > 0 && (
            <span className="ayn-picture-card__stars" aria-label={`${starCount} out of 5 stars`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  strokeWidth={1.5}
                  className={`ayn-picture-card__star ${i < starCount ? 'ayn-picture-card__star--filled' : ''}`}
                />
              ))}
            </span>
          )}
        </div>

        {details && <p className="ayn-picture-card__details">{details}</p>}

        <div className="ayn-picture-card__price-row">
          <span className="ayn-picture-card__price-total tabular-nums">
            {typeof totalPrice === 'number' ? `EGP ${totalPrice.toLocaleString()}` : totalPrice}
          </span>
          {pricePerNight && (
            <span className="ayn-picture-card__price-night tabular-nums">
              {typeof pricePerNight === 'number' ? `EGP ${pricePerNight.toLocaleString()} / night` : pricePerNight}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default PictureCard;
