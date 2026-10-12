import React, { useState } from 'react';
import { MapPin, Menu, X } from 'lucide-react';
import './Navbar.css';

/**
 * Reusable Navbar Component (DESIGN.md 5.1)
 *
 * Left: Wordmark with orange MapPin, "Ayn" (Bricolage 800 primary), "أين" (Cairo 800 muted).
 * Center: Links "Home", "About", "Features", "Your trips" + "Components". Active link = sky pill.
 * Right: Profile icon (42px, Sun fill, 2px text outline, user initial) with dropdown menu.
 *
 * @param {string} activeLink - Current active tab/route
 * @param {(linkKey: string) => void} onNavigate - Navigation callback
 * @param {object} [user] - Current user data (e.g. { name: 'Sarah', loggedIn: true })
 * @param {() => void} [onLogout]
 */
export function Navbar({
  activeLink = 'home',
  onNavigate,
  user = { name: 'Sarah', loggedIn: true },
  onLogout,
  className = ''
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navLinks = [
    { key: 'home', label: 'Home' },
    { key: 'about', label: 'About' },
    { key: 'features', label: 'Features' },
    { key: 'trips', label: 'Your trips' },
    { key: 'components', label: 'Components' }
  ];

  const handleLinkClick = (key) => {
    onNavigate?.(key);
    setMobileNavOpen(false);
  };

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'S';

  return (
    <header className={`ayn-navbar-wrapper ${className}`}>
      <div className="ayn-navbar">
        {/* Wordmark */}
        <button
          type="button"
          className="ayn-wordmark"
          onClick={() => handleLinkClick('home')}
          aria-label="Ayn Home"
        >
          <span className="ayn-wordmark__pin">
            <MapPin size={22} fill="var(--color-sun)" stroke="var(--color-sun)" />
          </span>
          <span className="ayn-wordmark__en">Ayn</span>
          <span className="ayn-wordmark__ar">أين</span>
        </button>

        {/* Center Links */}
        <nav
          className={`ayn-navbar__links ${mobileNavOpen ? 'ayn-navbar__links--mobile-open' : ''}`}
          aria-label="Main Navigation"
        >
          {navLinks.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`ayn-navbar__link ${activeLink === item.key ? 'ayn-navbar__link--active' : ''}`}
              onClick={() => handleLinkClick(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right side: Profile / Mobile menu */}
        <div className="ayn-navbar__actions">
          {user?.loggedIn ? (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="ayn-navbar__avatar-btn"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-expanded={menuOpen}
                aria-label="User profile menu"
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
                      onNavigate?.('profile');
                    }}
                  >
                    My profile
                  </button>
                  <button
                    type="button"
                    className="ayn-navbar__menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      onNavigate?.('trips');
                    }}
                  >
                    Your trips
                  </button>
                  <button
                    type="button"
                    className="ayn-navbar__menu-item ayn-navbar__menu-item--logout"
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout?.();
                    }}
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="ayn-navbar__link"
              onClick={() => onNavigate?.('login')}
            >
              Log in
            </button>
          )}

          <button
            type="button"
            className="ayn-navbar__mobile-toggle"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileNavOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
