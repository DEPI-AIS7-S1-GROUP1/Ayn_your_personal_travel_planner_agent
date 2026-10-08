import React from 'react';
import './Button.css';

/**
 * Ayn Button Component (DESIGN.md 4.1)
 *
 * @param {'primary' | 'secondary' | 'text'} variant - Visual style of the button
 * @param {boolean} destructive - If true, applies error color styling (never filled red)
 * @param {boolean} loading - If true, replaces label with "Working..." and disables
 * @param {boolean} disabled - Disables interaction and lowers opacity to 40%
 * @param {boolean} fullWidth - Expands to 100% width
 * @param {React.ReactNode} children - Button label / content
 * @param {React.ReactNode} [icon] - Optional leading or trailing Lucide icon
 */
export function Button({
  variant = 'primary',
  destructive = false,
  loading = false,
  disabled = false,
  fullWidth = false,
  children,
  icon,
  className = '',
  type = 'button',
  ...props
}) {
  const classes = [
    'ayn-btn',
    `ayn-btn--${variant}`,
    destructive ? 'ayn-btn--destructive' : '',
    fullWidth ? 'ayn-btn--full-width' : '',
    loading ? 'ayn-btn--loading' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span>Working...</span>
      ) : (
        <>
          {icon && <span className="ayn-btn__icon">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}

export default Button;
