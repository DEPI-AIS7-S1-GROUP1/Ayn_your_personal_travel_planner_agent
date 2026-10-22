import { useState, useEffect } from 'react';
import { Button } from '../Button';
import { CountUp } from '../CountUp/CountUp';
import { useLanguage } from '../../context/LanguageContext.js';
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
  const { t, tf, money, currencyLabel, language } = useLanguage();
  const [draftSplit, setDraftSplit] = useState(budgetSplit);

  useEffect(() => {
    // Keep draft values aligned when the plan is replaced externally.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        <div className="ayn-budget-card__title-group">
          <div className="ayn-budget-jar-icon" aria-hidden="true">
            <svg viewBox="0 0 28 28" className="ayn-jar-svg">
              <ellipse cx="14" cy="5" rx="7" ry="2" fill="#B5472F" />
              <path d="M7,5 C7,10 4,14 5,21 C6,25 22,25 23,21 C24,14 21,10 21,5 Z" fill="#D97A53" stroke="#B5472F" strokeWidth="1.2" />
              <circle cx="14" cy="15" r="3.5" fill="#F5A623" stroke="#FFF" strokeWidth="0.8" />
              <text x="14" y="17" textAnchor="middle" fill="#2B2118" fontSize="5.5" fontWeight="900">£</text>
            </svg>
          </div>
          <h3 className="ayn-budget-card__title">{t('budget.title')}</h3>
        </div>
        <span className="ayn-budget-card__total tabular-nums">
          {/* The amount comes first in Arabic: "1,500 دولار". */}
          {language === 'ar'
            ? <><CountUp value={totalBudget} /> {currencyLabel(currency)}</>
            : <>{currency} <CountUp value={totalBudget} /></>}
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
        {CATEGORIES.map(({ key }) => {
          const label = t(`budget.${key}`);
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
                        {money(allocatedAmount, currency)}
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
                  {tf('budget.plannedOf', {
                    planned: plannedAmount.toLocaleString('en-US'),
                    allocated: allocatedAmount.toLocaleString('en-US'),
                  })}
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
            {remaining === 0 && t('budget.balanced')}
            {remaining > 0 && tf('budget.leftAmount', { amount: remaining.toLocaleString('en-US') })}
            {remaining < 0 && tf('budget.overByAmount', { amount: Math.abs(remaining).toLocaleString('en-US') })}
          </div>

          <div className="ayn-budget-card__actions">
            {onCancel && (
              <Button variant="secondary" onClick={onCancel}>
                {t('common.cancel')}
              </Button>
            )}
            <Button
              variant="primary"
              disabled={!isValid}
              onClick={handleSave}
            >
              {t('common.save')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BudgetStackedBar;
