import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle, ArrowLeft, Edit3 } from 'lucide-react';
import { Button } from '../../components/Button';
import { DayTimelineCard } from '../../components/DayTimelineCard';
import { BudgetStackedBar } from '../../components/BudgetStackedBar';
import { ChatPanel } from '../../components/ChatPanel';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext.js';
import './DraftPlan.css';

function formatDisplayDate(dateStr, language) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export function DraftPlan() {
  const { language, t, translate } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isManualEditMode, setIsManualEditMode] = useState(false);

  useEffect(() => {
    let mounted = true;

    api.getPlan(id)
      .then((data) => {
        if (!mounted) return;
        setPlan(data);
        setError(null);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || 'Failed to load plan from server.');
        setPlan(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="ayn-draft-page">
        <div className="ayn-placeholder-screen">
          <h2 className="ayn-placeholder-screen__title">Building your plan...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ayn-draft-page">
        <div className="ayn-placeholder-screen">
          <h2 className="ayn-placeholder-screen__title" style={{ color: 'var(--color-error)' }}>
            Error loading plan
          </h2>
          <p className="ayn-placeholder-screen__desc">{error}</p>
          <Button variant="primary" onClick={() => navigate('/trips')}>
            Back to trips
          </Button>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="ayn-draft-page">
        <div className="ayn-placeholder-screen">
          <h2 className="ayn-placeholder-screen__title">Plan not found</h2>
          <Button variant="primary" onClick={() => navigate('/trips')}>
            Back to trips
          </Button>
        </div>
      </div>
    );
  }

  // Calculate planned sums for budget legend
  const plannedSums = { hotel: 0, food: 0, activities: 0, transport: 0 };
  plan.itinerary?.forEach((day) => {
    day.activities?.forEach((act) => {
      const cat = act.category || 'activities';
      if (plannedSums[cat] !== undefined) {
        plannedSums[cat] += Number(act.estimated_cost) || 0;
      }
    });
  });

  const handlePlanUpdatedByChat = (updatedPlan, updatedTrip) => {
    setPlan((prev) => ({
      ...prev,
      ...updatedPlan,
      total_budget: updatedTrip?.total_budget || updatedPlan.total_budget || prev.total_budget
    }));
  };

  const handleBudgetSaved = async (newSplit) => {
    try {
      const updated = await api.updatePlan(plan.id, { budget_split: newSplit });
      setPlan(updated);
      setIsManualEditMode(false);
    } catch (err) {
      alert(err.message || 'Failed to update budget');
    }
  };

  const handleConfirmPlan = async () => {
    try {
      const confirmed = await api.confirmPlan(plan.id);
      setPlan(confirmed);
      navigate(`/plan/${plan.id}/confirmed`);
    } catch (err) {
      alert(err.message || 'Failed to confirm plan');
    }
  };

  const handleCancelPlan = async () => {
    if (!window.confirm('Are you sure you want to cancel this plan?')) return;
    try {
      const cancelled = await api.cancelPlan(plan.id);
      setPlan(cancelled);
    } catch (err) {
      alert(err.message || 'Failed to cancel plan');
    }
  };

  const handleUpdateActivity = (dayIndex, actId, updatedAct) => {
    const newItinerary = [...plan.itinerary];
    const day = { ...newItinerary[dayIndex] };
    day.activities = day.activities.map((a) => (a.id === actId ? { ...a, ...updatedAct } : a));
    newItinerary[dayIndex] = day;

    api.updatePlan(plan.id, { itinerary: newItinerary })
      .then((res) => setPlan(res))
      .catch((err) => alert(err.message || 'Failed to update activity'));
  };

  const handleRemoveActivity = (dayIndex, actId) => {
    const newItinerary = [...plan.itinerary];
    const day = { ...newItinerary[dayIndex] };
    day.activities = day.activities.filter((a) => a.id !== actId);
    newItinerary[dayIndex] = day;

    api.updatePlan(plan.id, { itinerary: newItinerary })
      .then((res) => setPlan(res))
      .catch((err) => alert(err.message || 'Failed to remove activity'));
  };

  const handleAddActivity = (dayIndex, newAct) => {
    const newItinerary = [...plan.itinerary];
    const day = { ...newItinerary[dayIndex] };
    day.activities = [...day.activities, newAct];
    newItinerary[dayIndex] = day;

    api.updatePlan(plan.id, { itinerary: newItinerary })
      .then((res) => setPlan(res))
      .catch((err) => alert(err.message || 'Failed to add activity'));
  };

  const isDraft = plan.status === 'draft';
  const isConfirmed = plan.status === 'confirmed';

  return (
    <div className="ayn-draft-page">
      {/* Back button */}
      <div>
        <Button variant="text" onClick={() => navigate('/trips')}>
          <ArrowLeft size={16} style={{ marginRight: 6 }} />
          {t('draft.backToTrips')}
        </Button>
      </div>

      {/* Page Header */}
      <div className="ayn-draft-page__header">
        <div className="ayn-draft-page__header-info">
          <h1 className="ayn-draft-page__title">
            {t('draft.tripTo')} {translate(plan.destination?.city || t('destination.egypt'))}
          </h1>
          <div className="ayn-draft-page__meta">
            <span>
              {formatDisplayDate(plan.start_date, language)} – {formatDisplayDate(plan.end_date, language)}
            </span>
            <span>•</span>
            <span>{plan.travelers} {plan.travelers === 1 ? t('trip.traveler') : t('trip.travelers')}</span>
            <span>•</span>
            {/* Status indicator (DESIGN §4.10) */}
            <span className={`ayn-draft-page__status ayn-draft-page__status--${plan.status}`}>
              {isConfirmed && <CheckCircle2 size={16} />}
              {isDraft && <Clock size={16} />}
              {plan.status === 'cancelled' && <XCircle size={16} />}
              {t(`trip.status.${plan.status}`, plan.status)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="ayn-draft-page__actions">
          {isDraft && (
            <>
              <Button
                variant="secondary"
                onClick={() => navigate(`/plan/${plan.id}/options`)}
              >
                {t('draft.staysFlights')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsManualEditMode(!isManualEditMode)}
              >
                <Edit3 size={16} style={{ marginRight: 6 }} />
                {isManualEditMode ? t('draft.doneEditing') : t('draft.editPlan')}
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmPlan}
              >
                {t('draft.confirmTrip')}
              </Button>
              <Button
                variant="secondary"
                style={{ color: 'var(--color-error)' }}
                onClick={handleCancelPlan}
              >
                {t('draft.cancelTrip')}
              </Button>
            </>
          )}

          {isConfirmed && (
            <>
              <Button
                variant="primary"
                onClick={() => navigate(`/plan/${plan.id}/confirmed`)}
              >
                {t('draft.confirmationExport')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate(`/plan/${plan.id}/rate`)}
              >
                {t('draft.rateTrip')}
              </Button>
              <Button
                variant="secondary"
                style={{ color: 'var(--color-error)' }}
                onClick={handleCancelPlan}
              >
                {t('draft.cancelTrip')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Confirmed Banner if plan is confirmed */}
      {isConfirmed && (
        <div className="ayn-draft-page__confirmed-banner">
          <div>
            <h3 className="ayn-draft-page__confirmed-title">{t('draft.confirmedTitle')}</h3>
            <p className="ayn-draft-page__confirmed-desc">
              {t('draft.confirmedDescription')} {translate(plan.destination?.city)}!
            </p>
          </div>
        </div>
      )}

      {/* Main Two-Column Grid (DESIGN.md §5.2 item 6) */}
      <div className="ayn-draft-page__grid">
        {/* Left Column: Day timeline cards */}
        <div className="ayn-draft-page__left">
          <div className="ayn-draft-page__itinerary-header">
            <h2 className="ayn-draft-page__itinerary-title">{t('draft.itinerary')}</h2>
          </div>
          <p className="ayn-draft-page__itinerary-note">
            {t('draft.pricesForTravelers')}
          </p>

          {plan.itinerary?.map((day, idx) => (
            <DayTimelineCard
              key={day.day || idx}
              dayNumber={day.day}
              date={formatDisplayDate(day.date, language)}
              currency={plan.currency}
              activities={day.activities || []}
              editMode={isManualEditMode}
              onUpdateActivity={(actId, updated) => handleUpdateActivity(idx, actId, updated)}
              onRemoveActivity={(actId) => handleRemoveActivity(idx, actId)}
              onAddActivity={(newAct) => handleAddActivity(idx, newAct)}
            />
          ))}
        </div>

        {/* Right Column: Chat panel on top, budget stacked bar below */}
        <div className="ayn-draft-page__right">
          {/* Chat Panel (draft plans only) */}
          {isDraft && (
            <ChatPanel
              planId={plan.id}
              planStatus={plan.status}
              onPlanUpdated={handlePlanUpdatedByChat}
            />
          )}

          {/* Budget Stacked Bar */}
          <BudgetStackedBar
            totalBudget={plan.total_budget}
            currency={plan.currency}
            budgetSplit={plan.budget_split || { hotel: 0, food: 0, activities: 0, transport: 0 }}
            planned={plannedSums}
            editMode={isManualEditMode}
            onSave={handleBudgetSaved}
            onCancel={() => setIsManualEditMode(false)}
          />
        </div>
      </div>
    </div>
  );
}

export default DraftPlan;
