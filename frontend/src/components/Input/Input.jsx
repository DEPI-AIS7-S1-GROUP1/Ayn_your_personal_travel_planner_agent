import React, { useState, useId } from 'react';
import './Input.css';

/**
 * Ayn Input Component (DESIGN.md 4.2)
 *
 * Supports text, number, date, select, textarea, and password (with text show/hide).
 *
 * @param {'text' | 'number' | 'date' | 'select' | 'textarea' | 'password' | 'email'} as - Type of input control
 * @param {string} label - Input label displayed above control (14/20, weight 600)
 * @param {string} [helperText] - Optional helper text (12/16 muted)
 * @param {string} [error] - Error message displayed below control
 * @param {boolean} [formatThousands] - Format numbers with thousands separators on blur (e.g. total budget)
 * @param {Array<{value: string | number, label: string}>} [options] - Options for select input
 */
export function Input({
  as = 'text',
  label,
  helperText,
  error,
  id,
  className = '',
  disabled = false,
  formatThousands = false,
  value,
  onChange,
  onBlur,
  onFocus,
  options = [],
  children,
  ...props
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [showPassword, setShowPassword] = useState(false);
  const [displayValue, setDisplayValue] = useState(value ?? '');

  // Keep internal state aligned if value prop changes
  React.useEffect(() => {
    if (value !== undefined) {
      if (formatThousands && typeof value === 'number') {
        setDisplayValue(value.toLocaleString());
      } else {
        setDisplayValue(value);
      }
    }
  }, [value, formatThousands]);

  const handleFocus = (e) => {
    if (formatThousands && value !== undefined) {
      // Show raw number on focus for clean editing
      setDisplayValue(value);
    }
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    if (formatThousands && value !== undefined && !isNaN(Number(value))) {
      // Format with thousands separator on blur
      setDisplayValue(Number(value).toLocaleString());
    }
    onBlur?.(e);
  };

  const handleChange = (e) => {
    setDisplayValue(e.target.value);
    onChange?.(e);
  };

  const isPassword = as === 'password';
  const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : as;

  return (
    <div className={`ayn-input-field ${error ? 'ayn-input-field--error' : ''} ${className}`}>
      {label && (
        <div className="ayn-input-field__label-row">
          <label htmlFor={inputId} className="ayn-input-field__label">
            {label}
          </label>
        </div>
      )}

      <div className="ayn-input-field__control-wrapper">
        {as === 'textarea' ? (
          <textarea
            id={inputId}
            className="ayn-input-control"
            disabled={disabled}
            value={value !== undefined ? value : displayValue}
            onChange={handleChange}
            onFocus={onFocus}
            onBlur={onBlur}
            {...props}
          />
        ) : as === 'select' ? (
          <select
            id={inputId}
            className="ayn-input-control"
            disabled={disabled}
            value={value}
            onChange={onChange}
            onFocus={onFocus}
            onBlur={onBlur}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
            {children}
          </select>
        ) : (
          <input
            id={inputId}
            type={effectiveType}
            className={`ayn-input-control ${formatThousands ? 'tabular-nums' : ''}`}
            disabled={disabled}
            value={formatThousands ? displayValue : (value !== undefined ? value : displayValue)}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />
        )}

        {isPassword && !disabled && (
          <button
            type="button"
            className="ayn-input-field__toggle-btn"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        )}
      </div>

      {error ? (
        <span className="ayn-input-field__error" role="alert">
          {error}
        </span>
      ) : helperText ? (
        <span className="ayn-input-field__helper">{helperText}</span>
      ) : null}
    </div>
  );
}

export default Input;
