import { useState } from 'react';
import { BedDouble, Utensils, Compass, CarTaxiFront, Plane } from 'lucide-react';
import { Button } from '../Button';
import { Input } from '../Input';
import { SegmentedChoice } from '../SegmentedChoice';
import './DayTimelineCard.css';
import { useLanguage } from '../../context/LanguageContext.js';

const CATEGORY_ICONS = {
  hotel: BedDouble,
  food: Utensils,
  activities: Compass,
  transport: CarTaxiFront,
  flight: Plane
};

const CATEGORY_OPTIONS = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'food', label: 'Food' },
  { value: 'activities', label: 'Activities' },
  { value: 'transport', label: 'Transport' }
];

const SLOT_OPTIONS = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' }
];

const SLOTS_ORDER = ['morning', 'afternoon', 'evening'];

function formatCost(cost, category, currency = 'EGP', t, money) {
  const num = Number(cost) || 0;
  if (num === 0) {
    if (category === 'hotel') return null;
    return t('common.free');
  }
  return money(num, currency);
}

/**
 * Ayn Day Timeline Card Component (DESIGN.md 4.9)
 *
 * One day of itinerary with slots (MORNING, AFTERNOON, EVENING - never clock times).
 * Supports viewing and inline editing of activities.
 *
 * @param {number | string} dayNumber - Day number, e.g. 1
 * @param {string} [date] - Formatted date string, e.g. "Tue 10 Nov 2026"
 * @param {string} [currency='EGP'] - Currency symbol/code
 * @param {Array<{ id: string|number, slot: 'morning'|'afternoon'|'evening', category: string, title: string, description: string, estimated_cost: number }>} activities
 * @param {boolean} [editMode=false] - Whether editing mode is active
 * @param {(activity: object) => void} [onAddActivity] - Handler to add an activity
 * @param {(activityId: string|number, updated: object) => void} [onUpdateActivity] - Handler to update an activity
 * @param {(activityId: string|number) => void} [onRemoveActivity] - Handler to remove an activity
 */
export function DayTimelineCard({
  dayNumber = 1,
  date,
  currency = 'EGP',
  activities = [],
  editMode = false,
  onAddActivity,
  onUpdateActivity,
  onRemoveActivity,
  className = ''
}) {
  const { t, money, translate } = useLanguage();
  const [editingId, setEditingId] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    slot: 'morning',
    category: 'activities',
    estimated_cost: 0
  });

  // Calculate day total
  const dayTotal = activities.reduce((sum, act) => sum + (Number(act.estimated_cost) || 0), 0);

  const startEdit = (activity) => {
    setIsAddingNew(false);
    setEditingId(activity.id);
    setFormData({
      title: activity.title || '',
      description: activity.description || '',
      slot: activity.slot || activity.time_slot || 'morning',
      category: activity.category || 'activities',
      estimated_cost: activity.estimated_cost || 0
    });
  };

  const startAddNew = () => {
    setEditingId(null);
    setIsAddingNew(true);
    setFormData({
      title: '',
      description: '',
      slot: 'morning',
      category: 'activities',
      estimated_cost: 0
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAddingNew(false);
  };

  const saveEdit = () => {
    if (editingId && onUpdateActivity) {
      onUpdateActivity(editingId, {
        ...formData,
        estimated_cost: Number(formData.estimated_cost) || 0
      });
    } else if (isAddingNew && onAddActivity) {
      onAddActivity({
        ...formData,
        id: Date.now().toString(),
        estimated_cost: Number(formData.estimated_cost) || 0
      });
    }
    cancelEdit();
  };

  // Group activities by slot in standard order
  const slotGroups = SLOTS_ORDER.map((slotKey) => {
    const slotActivities = activities.filter(
      (act) => (act.slot || act.time_slot)?.toLowerCase() === slotKey
    );
    return {
      key: slotKey,
      label: t(`time.${slotKey}`),
      activities: slotActivities
    };
  }).filter((group) => group.activities.length > 0 || (isAddingNew && formData.slot === group.key));

  return (
    <div className={`ayn-day-card ${className}`}>
      {/* Header */}
      <div className="ayn-day-card__header">
        <div className="ayn-day-card__title-group">
          <h3 className="ayn-day-card__title">{t('trip.day')} {dayNumber}</h3>
          {date && <span className="ayn-day-card__date">{date}</span>}
        </div>
        <span className="ayn-day-card__day-total tabular-nums">
          {money(dayTotal, currency)}
        </span>
      </div>

      {/* Timeline slots */}
      <div className="ayn-day-card__timeline">
        {slotGroups.length === 0 && !isAddingNew ? (
          <div className="ayn-day-card__date">{t('trip.noActivities')}</div>
        ) : (
          slotGroups.map((group) => (
            <div key={group.key} className="ayn-day-card__slot-group">
              <span className="ayn-day-card__slot-dot" />
              <div className="ayn-day-card__slot-label">{group.label}</div>

              <div className="ayn-day-card__activities">
                {group.activities.map((activity) => {
                  const Icon = CATEGORY_ICONS[activity.category] || Compass;
                  const isCurrentlyEditing = editingId === activity.id;
                  const costFormatted = formatCost(activity.estimated_cost, activity.category, currency, t, money);

                  return (
                    <div key={activity.id} className="ayn-activity-row-wrapper">
                      {isCurrentlyEditing ? (
                        <div className="ayn-activity-edit-form">
                          <Input
                            label={t('activity.title')}
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          />
                          <Input
                            as="textarea"
                            label={t('activity.description')}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          />
                          <div className="ayn-activity-edit-form__row">
                            <SegmentedChoice
                              label={t('activity.timeSlot')}
                              options={SLOT_OPTIONS}
                              value={formData.slot}
                              onChange={(val) => setFormData({ ...formData, slot: val })}
                            />
                            <Input
                              as="select"
                              label={t('activity.category')}
                              value={formData.category}
                              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                              options={CATEGORY_OPTIONS}
                            />
                          </div>
                          <Input
                            as="number"
                            label={t('activity.cost')}
                            value={formData.estimated_cost}
                            onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                          />
                          <div className="ayn-activity-edit-form__actions">
                            <Button variant="secondary" onClick={cancelEdit}>
                              {t('common.cancel')}
                            </Button>
                            <Button variant="primary" onClick={saveEdit}>
                              {t('common.save')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="ayn-activity-row">
                          <div className="ayn-activity-row__icon-wrap">
                            <Icon size={20} strokeWidth={1.5} />
                          </div>

                          <div className="ayn-activity-row__main">
                            <div className="ayn-activity-row__header">
                              <h4 className="ayn-activity-row__title">{translate(activity.title)}</h4>
                              {costFormatted && (
                                <span className="ayn-activity-row__cost tabular-nums">
                                  {costFormatted}
                                </span>
                              )}
                            </div>

                            {activity.description && (
                              <p className="ayn-activity-row__desc">{translate(activity.description)}</p>
                            )}

                            {editMode && (
                              <div className="ayn-activity-row__actions">
                                <Button
                                  variant="text"
                                  onClick={() => startEdit(activity)}
                                >
                                  {t('common.edit')}
                                </Button>
                                <Button
                                  variant="text"
                                  destructive
                                  onClick={() => onRemoveActivity?.(activity.id)}
                                >
                                  {t('common.remove')}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* If adding new item targeting this slot group */}
                {isAddingNew && formData.slot === group.key && (
                  <div className="ayn-activity-edit-form">
                    <Input
                      label={t('activity.title')}
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                    <Input
                      as="textarea"
                      label={t('activity.description')}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                    <div className="ayn-activity-edit-form__row">
                      <SegmentedChoice
                        label={t('activity.timeSlot')}
                        options={SLOT_OPTIONS}
                        value={formData.slot}
                        onChange={(val) => setFormData({ ...formData, slot: val })}
                      />
                      <Input
                        as="select"
                        label={t('activity.category')}
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        options={CATEGORY_OPTIONS}
                      />
                    </div>
                    <Input
                      as="number"
                      label={t('activity.cost')}
                      value={formData.estimated_cost}
                      onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                    />
                    <div className="ayn-activity-edit-form__actions">
                      <Button variant="secondary" onClick={cancelEdit}>
                        {t('common.cancel')}
                      </Button>
                      <Button variant="primary" onClick={saveEdit}>
                        {t('common.save')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Mode Add Activity Button */}
      {editMode && !isAddingNew && !editingId && (
        <div className="ayn-day-card__footer">
          <Button variant="secondary" onClick={startAddNew}>
            {t('activity.add')}
          </Button>
        </div>
      )}
    </div>
  );
}

export default DayTimelineCard;
