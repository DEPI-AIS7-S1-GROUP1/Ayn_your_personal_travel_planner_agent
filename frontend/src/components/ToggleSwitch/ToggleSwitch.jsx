import React from 'react';
import './ToggleSwitch.css';

/**
 * Reusable Toggle Switch Component (DESIGN.md 5.5)
 * 56 x 32px track, 2px outline, thumb 22px white.
 * Label before and after ("Not yet" and "Yes, take me to Ayn").
 * Space / Enter toggles.
 *
 * @param {boolean} checked - Switch state
 * @param {(checked: boolean) => void} onChange - Callback on state change
 * @param {string} [labelBefore="Not yet"]
 * @param {string} [labelAfter="Yes, take me to Ayn"]
 * @param {boolean} [disabled=false]
 */
export function ToggleSwitch({
  checked = false,
  onChange,
  labelBefore = 'Not yet',
  labelAfter = 'Yes, take me to Ayn',
  disabled = false,
  className = '',
  id = 'ayn-toggle'
}) {
  const handleToggle = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <div className={`ayn-toggle-wrapper ${className}`}>
      {labelBefore && (
        <span
          className={`ayn-toggle-label ${!checked ? 'ayn-toggle-label--active' : ''}`}
          onClick={handleToggle}
        >
          {labelBefore}
        </span>
      )}

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`ayn-toggle-track ${checked ? 'ayn-toggle-track--checked' : ''}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
      >
        <span className="ayn-toggle-thumb" />
      </button>

      {labelAfter && (
        <span
          className={`ayn-toggle-label ${checked ? 'ayn-toggle-label--active' : ''}`}
          onClick={handleToggle}
        >
          {labelAfter}
        </span>
      )}
    </div>
  );
}

export default ToggleSwitch;
