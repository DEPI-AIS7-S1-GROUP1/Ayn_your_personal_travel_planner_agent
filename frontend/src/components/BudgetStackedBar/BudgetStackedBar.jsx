import React, { useState, useEffect } from 'react';
import { Button } from '../Button';
import './BudgetStackedBar.css';

const CATEGORIES = [
  { key: 'hotel', label: 'Hotel' },
  { key: 'food', label: 'Food' },
  { key: 'activities', label: 'Activities' },
  { key: 'transport', label: 'Transport' }
];

/**
 * Ayn Budget Stacked Bar Component (DESIGN.md 4.8)
 *
 * Shows total_budget split across hotel, food, activities, transport.
 * Supports viewing (with planned vs allocated) and inline editing.
 *
 * @param {number} totalBudget - Total budget amount
 * @param {string} [currency='EGP'] - Currency code
 * @param {{ hotel: number, food: number, activities: number, transport: number }} budgetSplit - Allocated amounts
 * @param {{ hotel?: number, food?: number, activities?: number, transport?: number }} [planned] - Sum of estimated costs
 * @param {boolean} [editMode=false] - Whether edit mode is active
 * @param {(newSplit: object) => void} [onSave] - Callback when saving valid budget edits
 * @param {() => void} [onCancel] - Callback when cancelling edits
 */
export function BudgetStackedBar({
  totalBudget = 0,
  currency = 'EGP',
  budgetSplit = { hotel: 0, food: 0, activities: 0, transport: 0 },
  planned = {},
  editMode = false,
  onSave,
  onCancel,
  className = ''
}) {
  const [draftSplit, setDraftSplit] = useState(budgetSplit);

  useEffect(() => {
    setDraftSplit(budgetSplit);
  }, [budgetSplit]);

  const activeSplit = editMode ? draftSplit : budgetSplit;
  const currentSum = Object.values(activeSplit).reduce((acc, val) => acc + (Number(val) || 0), 0);
  const remaining = totalBudget - currentSum;
  const isValid = remaining === 0;

  const handleInputChange = (categoryKey, rawValue) => {
    const val = rawValue === '' ? 0 : Math.max(0, parseInt(rawValue, 10) || 0);
    setDraftSplit((prev) => ({
      ...prev,
      [categoryKey]: val
    }));
  };

  const handleSave = () => {
    if (isValid && onSave) {
      onSave(draftSplit);
    }
  };

  return (
    <div className={`ayn-budget-card ${className}`}>
      <div className="ayn-budget-card__header">
        <h3 className="ayn-budget-card__title">Budget</h3>
        <span className="ayn-budget-card__total tabular-nums">
          {currency} {totalBudget.toLocaleString()}
        </span>
      </div>

      {/* Proportional Stacked Bar */}
      <div className="ayn-budget-bar" role="meter" aria-valuenow={currentSum} aria-valuemax={totalBudget}>
        {CATEGORIES.map(({ key }) => {
          const amount = Number(activeSplit[key]) || 0;
          const percentage = totalBudget > 0 ? (amount / totalBudget) * 100 : 0;
          if (percentage <= 0) return null;
          return (
            <div
              key={key}
              className={`ayn-budget-bar__segment ayn-budget-bar__segment--${key}`}
              style={{ width: `${percentage}%` }}
              title={`${key}: ${currency} ${amount.toLocaleString()} (${percentage.toFixed(0)}%)`}
            />
          );
        })}
      </div>

      {/* Legend & Category rows */}
      <div className="ayn-budget-legend">
        {CATEGORIES.map(({ key, label }) => {
          const allocatedAmount = Number(activeSplit[key]) || 0;
          const percentage = totalBudget > 0 ? ((allocatedAmount / totalBudget) * 100).toFixed(0) : 0;
          const plannedAmount = planned[key];

          return (
            <div key={key} className="ayn-budget-legend__row">
              <div className="ayn-budget-legend__main">
                <div className="ayn-budget-legend__left">
                  <span className={`ayn-budget-legend__swatch ayn-budget-legend__swatch--${key}`} />
                  <span className="ayn-budget-legend__name">{label}</span>
                </div>

                <div className="ayn-budget-legend__right">
                  {editMode ? (
                    <input
                      type="number"
                      min="0"
                      className="ayn-budget-legend__input tabular-nums"
                      value={draftSplit[key] ?? 0}
                      onChange={(e) => handleInputChange(key, e.target.value)}
                      aria-label={`${label} amount`}
                    />
                  ) : (
                    <>
                      <span className="ayn-budget-legend__amount tabular-nums">
                        {currency} {allocatedAmount.toLocaleString()}
                      </span>
                      <span className="ayn-budget-legend__percent tabular-nums">
                        ({percentage}%)
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Planned vs allocated recommended line */}
              {plannedAmount !== undefined && (
                <div className="ayn-budget-legend__sub tabular-nums">
                  Planned {plannedAmount.toLocaleString()} of {allocatedAmount.toLocaleString()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit mode footer with Remaining feedback */}
      {editMode && (
        <div className="ayn-budget-card__edit-footer">
          <div
            className={`ayn-budget-card__remaining tabular-nums ${
              isValid ? 'ayn-budget-card__remaining--valid' : 'ayn-budget-card__remaining--invalid'
            }`}
          >
            {remaining === 0 && 'Budget balanced (0 left to assign)'}
            {remaining > 0 && `${remaining.toLocaleString()} left to assign`}
            {remaining < 0 && `Over by ${Math.abs(remaining).toLocaleString()}`}
          </div>

          <div className="ayn-budget-card__actions">
            {onCancel && (
              <Button variant="secondary" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button
              variant="primary"
              disabled={!isValid}
              onClick={handleSave}
            >
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BudgetStackedBar;
