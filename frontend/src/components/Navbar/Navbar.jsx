import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '../Button';
import { useLanguage } from '../../context/LanguageContext.js';
import aynLogo from '../../assets/Ayn_logo.png';
import './Navbar.css';

/**
 * Reusable Navbar Component (DESIGN.md §5.1)
 *
 * Logged out:
 *   Left: Logo (wordmark: orange MapPin, "Ayn", "أين").
 *   Center: "Home", "How it works", "About".
 *   Right: "Log in" and primary "Sign up" button.
 *
 * Logged in:
 *   Left: Logo.
 *   Center: "Home", "Plan a trip" (as a button), "Your trips", (in DEV only: "Components").
 *   Right: Avatar menu (42px circle, Sun fill, 2px text outline, user initial)
 *          with dropdown: "My profile", "Log out".
 *
 * "How it works" and "About" scroll to the respective sections on the home page.
 */
export function Navbar({
  user,
  onLogout,
  onOpenLogin,
  onOpenSignup,
  className = ''
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  const navigate = useNavigate();
  const location = useLocation();

  const isLoggedIn = !!user?.loggedIn;
  const scrollToSection = (sectionId) => {
    setMobileNavOpen(false);
    if (location.pathname !== '/') {
      navigate(`/#${sectionId}`);
      // Wait for navigation then scroll
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNavClick = (path) => {
    setMobileNavOpen(false);
    navigate(path);
  };

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'S';
  const handleLanguageChange = (nextLanguage) => setLanguage(nextLanguage);

  return (
    <header className={`ayn-navbar-wrapper ${className}`}>
      <div className="ayn-navbar">
        {/* Left: Wordmark */}
        <button
          type="button"
          className="ayn-wordmark"
          onClick={() => handleNavClick('/')}
          aria-label={t('navbar.homeAriaLabel')}
        >
          <img src={aynLogo} alt="Ayn" className="ayn-brand-logo" />
        </button>

        {/* Center Links */}
        <nav
          className={`ayn-navbar__links ${mobileNavOpen ? 'ayn-navbar__links--mobile-open' : ''}`}
          aria-label={t('navbar.mainNavigation')}
        >
          {/* Home */}
          <button
            type="button"
            className={`ayn-navbar__link ${location.pathname === '/' && !location.hash ? 'ayn-navbar__link--active' : ''}`}
            onClick={() => handleNavClick('/')}
          >
            {t('navbar.home')}
          </button>

          {isLoggedIn ? (
            <>
              {/* Plan a trip as a button */}
              <Button
                variant="primary"
                onClick={() => handleNavClick('/destination')}
                style={{ height: '36px', padding: '0 16px', fontSize: '14px' }}
              >
                {t('navbar.planTrip')}
              </Button>

              {/* Your trips */}
              <button
                type="button"
                className={`ayn-navbar__link ${location.pathname === '/trips' ? 'ayn-navbar__link--active' : ''}`}
                onClick={() => handleNavClick('/trips')}
              >
                {t('navbar.yourTrips')}
              </button>

              {/* Components test page: DEV ONLY */}
            </>
          ) : (
            <>
              {/* How it works -> scrolls to features */}
              <button
                type="button"
                className="ayn-navbar__link"
                onClick={() => scrollToSection('features')}
              >
                {t('navbar.howItWorks')}
              </button>

              {/* About -> scrolls to about */}
              <button
                type="button"
                className="ayn-navbar__link"
                onClick={() => scrollToSection('about')}
              >
                {t('navbar.about')}
              </button>
            </>
          )}
        </nav>

        {/* Right Actions */}
        <div className="ayn-navbar__actions">
          <div className="ayn-language-toggle" role="group" aria-label={t('language.label')}>
            <button
              type="button"
              className={`ayn-language-toggle__option ${language === 'en' ? 'ayn-language-toggle__option--active' : ''}`}
              onClick={() => handleLanguageChange('en')}
              aria-label={t('language.switchToEnglish')}
              aria-pressed={language === 'en'}
            >
              {t('language.english')}
            </button>
            <span className="ayn-language-toggle__divider" aria-hidden="true">|</span>
            <button
              type="button"
              className={`ayn-language-toggle__option ${language === 'ar' ? 'ayn-language-toggle__option--active' : ''}`}
              onClick={() => handleLanguageChange('ar')}
              aria-label={t('language.switchToArabic')}
              aria-pressed={language === 'ar'}
            >
              {t('language.arabic')}
            </button>
          </div>
          {isLoggedIn ? (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="ayn-navbar__avatar-btn"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-expanded={menuOpen}
                aria-label={t('navbar.profileMenu')}
              >
                {initial}
              </button>

              {menuOpen && (
                <div className="ayn-navbar__menu" role="menu">
                  <button
                    type="button"
                    className="ayn-navbar__menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      handleNavClick('/profile');
                    }}
                  >
                    {t('navbar.myProfile')}
                  </button>
                  <button
                    type="button"
                    className="ayn-navbar__menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      handleNavClick('/trips');
                    }}
                  >
                    {t('navbar.yourTrips')}
                  </button>
                  <button
                    type="button"
                    className="ayn-navbar__menu-item ayn-navbar__menu-item--logout"
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout?.();
                    }}
                  >
                    {t('navbar.logOut')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                type="button"
                className="ayn-navbar__link"
                onClick={() => onOpenLogin ? onOpenLogin() : handleNavClick('/login')}
              >
                {t('navbar.logIn')}
              </button>
              <Button
                variant="primary"
                onClick={() => onOpenSignup ? onOpenSignup() : handleNavClick('/signup')}
                style={{ height: '36px', padding: '0 16px', fontSize: '14px' }}
              >
                {t('navbar.signUp')}
              </Button>
            </>
          )}

          {/* Mobile hamburger toggle */}
          <button
            type="button"
            className="ayn-navbar__mobile-toggle"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label={mobileNavOpen ? t('navbar.closeMenu') : t('navbar.openMenu')}
          >
            {mobileNavOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
