import React from 'react';
import { MapPin } from 'lucide-react';
import './Footer.css';

/**
 * Reusable Footer Component
 *
 * @param {(linkKey: string) => void} [onNavigate]
 */
export function Footer({ onNavigate, className = '' }) {
  return (
    <footer className={`ayn-footer-wrapper ${className}`}>
      <div className="ayn-footer">
        <div className="ayn-footer__top">
          {/* Brand & Tagline */}
          <div className="ayn-footer__brand">
            <div className="ayn-wordmark" onClick={() => onNavigate?.('home')} style={{ display: 'inline-flex' }}>
              <span className="ayn-wordmark__pin">
                <MapPin size={20} fill="var(--color-sun)" stroke="var(--color-sun)" />
              </span>
              <span className="ayn-wordmark__en">Ayn</span>
              <span className="ayn-wordmark__ar">أين</span>
            </div>
            <p className="ayn-footer__tagline">
              Just tell us where. We&apos;ll cover the rest.
            </p>
          </div>

          {/* Link columns */}
          <div className="ayn-footer__links-group">
            <div className="ayn-footer__col">
              <span className="ayn-footer__col-title">Explore</span>
              <button type="button" className="ayn-footer__link" onClick={() => onNavigate?.('home')}>
                Home
              </button>
              <button type="button" className="ayn-footer__link" onClick={() => onNavigate?.('about')}>
                About Ayn
              </button>
              <button type="button" className="ayn-footer__link" onClick={() => onNavigate?.('features')}>
                Features
              </button>
            </div>

            <div className="ayn-footer__col">
              <span className="ayn-footer__col-title">Travel</span>
              <button type="button" className="ayn-footer__link" onClick={() => onNavigate?.('destination')}>
                Destination
              </button>
              <button type="button" className="ayn-footer__link" onClick={() => onNavigate?.('survey')}>
                Survey
              </button>
              <button type="button" className="ayn-footer__link" onClick={() => onNavigate?.('trips')}>
                Your trips
              </button>
            </div>

            <div className="ayn-footer__col">
              <span className="ayn-footer__col-title">System</span>
              <button type="button" className="ayn-footer__link" onClick={() => onNavigate?.('components')}>
                Component Library
              </button>
              <span className="ayn-footer__link" style={{ cursor: 'default' }}>
                Egypt MVP v4.1
              </span>
            </div>
          </div>
        </div>

        <div className="ayn-footer__bottom">
          <p className="ayn-footer__copyright">
            &copy; 2026 Ayn. Built for authentic Egyptian travel experiences.
          </p>
          <p className="ayn-footer__credit">
            Cairo &bull; Alexandria &bull; Luxor &bull; Aswan &bull; Sharm El Sheikh &bull; Hurghada &bull; Dahab
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
