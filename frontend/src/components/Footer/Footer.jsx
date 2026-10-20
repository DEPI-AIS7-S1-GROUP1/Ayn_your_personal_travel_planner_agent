import { useLanguage } from '../../context/LanguageContext.js';
import aynLogo from '../../assets/Ayn_logo.png';
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
            <button
              type="button"
              className="ayn-wordmark ayn-wordmark--footer"
              onClick={() => onNavigate?.('home')}
              aria-label="Ayn Home"
            >
              <img src={aynLogo} alt="Ayn" className="ayn-brand-logo ayn-brand-logo--footer" />
            </button>
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
