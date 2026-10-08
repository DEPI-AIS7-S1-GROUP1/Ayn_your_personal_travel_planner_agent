import React, { useRef } from 'react';
import './SegmentedChoice.css';

/**
 * Ayn Segmented Choice Component (DESIGN.md 4.4)
 *
 * One option from 2 to 5 short options. Replaces radios and sliders.
 * Supports keyboard navigation via arrow keys.
 *
 * @param {Array<{value: string | number, label: string}>} options - 2 to 5 options
 * @param {string | number} value - Currently selected value
 * @param {(val: string | number) => void} onChange - Callback when selected value changes
 * @param {string} [label] - Optional field label
 * @param {string} [caption] - Optional helper or rating legend (e.g. "1 = poor, 5 = excellent")
 * @param {boolean} [disabled] - Disables the group
 */
export function SegmentedChoice({
  options = [],
  value,
  onChange,
  label,
  caption,
  disabled = false,
  className = '',
  name
}) {
  const groupRef = useRef(null);

  const handleKeyDown = (e, index) => {
    if (disabled || options.length === 0) return;

    let targetIndex = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      targetIndex = (index + 1) % options.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      targetIndex = (index - 1 + options.length) % options.length;
    }

    if (targetIndex !== -1) {
      const nextOption = options[targetIndex];
      onChange?.(nextOption.value);
      // Move focus to the newly selected button
      const buttons = groupRef.current?.querySelectorAll('button');
      buttons?.[targetIndex]?.focus();
    }
  };

  return (
    <div className={`ayn-segmented-choice ${disabled ? 'ayn-segmented-choice--disabled' : ''} ${className}`}>
      {(label || caption) && (
        <div className="ayn-segmented-choice__label-row">
          {label && <span className="ayn-segmented-choice__label">{label}</span>}
          {caption && <span className="ayn-segmented-choice__caption">{caption}</span>}
        </div>
      )}

      <div
        ref={groupRef}
        className="ayn-segmented-choice__group"
        role="radiogroup"
        aria-label={label || 'Choices'}
      >
        {options.map((option, idx) => {
          const isSelected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              tabIndex={isSelected || (value === undefined && idx === 0) ? 0 : -1}
              className={`ayn-segmented-choice__option ${isSelected ? 'ayn-segmented-choice__option--selected' : ''}`}
              onClick={() => onChange?.(option.value)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SegmentedChoice;
