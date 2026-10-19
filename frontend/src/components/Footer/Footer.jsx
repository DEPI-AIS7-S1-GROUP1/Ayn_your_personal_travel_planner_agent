import { MapPin } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.js';
import './Footer.css';

/**
 * Reusable Footer Component
 *
 * @param {(linkKey: string) => void} [onNavigate]
 */
export function Footer({ onNavigate, className = '' }) {
  const { t } = useLanguage();

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
              {t('footer.tagline')}
            </p>
          </div>

          {/* Link columns */}
          <div className="ayn-footer__links-group">
            <div className="ayn-footer__col">
              <span className="ayn-footer__col-title">{t('footer.explore')}</span>
              <button type="button" className="ayn-footer__link" onClick={() => onNavigate?.('home')}>
                {t('navbar.home')}
              </button>
              <button type="button" className="ayn-footer__link" onClick={() => onNavigate?.('about')}>
                {t('footer.aboutAyn')}
              </button>
              <button type="button" className="ayn-footer__link" onClick={() => onNavigate?.('features')}>
                {t('footer.features')}
              </button>
            </div>

            <div className="ayn-footer__col">
              <span className="ayn-footer__col-title">{t('footer.travel')}</span>
              <button type="button" className="ayn-footer__link" onClick={() => onNavigate?.('destination')}>
                {t('footer.destination')}
              </button>
              <button type="button" className="ayn-footer__link" onClick={() => onNavigate?.('survey')}>
                {t('footer.survey')}
              </button>
              <button type="button" className="ayn-footer__link" onClick={() => onNavigate?.('trips')}>
                {t('navbar.yourTrips')}
              </button>
            </div>

            <div className="ayn-footer__col">
              <span className="ayn-footer__col-title">{t('footer.system')}</span>
              <button type="button" className="ayn-footer__link" onClick={() => onNavigate?.('components')}>
                {t('footer.componentLibrary')}
              </button>
              <span className="ayn-footer__link" style={{ cursor: 'default' }}>
                {t('footer.version')}
              </span>
            </div>
          </div>
        </div>

        <div className="ayn-footer__bottom">
          <p className="ayn-footer__copyright">
            {t('footer.copyright')}
          </p>
          <p className="ayn-footer__credit">
            {t('footer.cities')}
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
