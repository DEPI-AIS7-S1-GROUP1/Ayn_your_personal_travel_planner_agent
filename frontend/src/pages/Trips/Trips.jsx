import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CardGridSkeleton } from '../../components/Skeleton/Skeleton';
import { Button } from '../../components/Button';
import { PersonIllustration } from '../../components/Illustration';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext.js';
import './Trips.css';

function formatTripDate(dateString, language) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return Number.isNaN(date.getTime())
    ? dateString
    : date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
}

export function Trips() {
  const navigate = useNavigate();
  const { language, t, tf, tn, money, translate } = useLanguage();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    api.getTrips()
      .then((data) => {
        if (!mounted) return;
        setTrips(data.trips || []);
      })
      .catch((err) => {
        if (mounted) {
          setError(translate(err.message || 'Failed to load trips.'));
          setTrips([]);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="ayn-trips-page">
        <h1 className="ayn-trips-page__title">{t('trips.title')}</h1>
        <CardGridSkeleton count={3} label={t('trips.loading')} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="ayn-trips-page">
        <h1 className="ayn-trips-page__title">{t('trips.title')}</h1>
        <div className="ayn-placeholder-screen">
          <p style={{ color: 'var(--color-error)', fontWeight: 600 }}>{error}</p>
          <Button variant="primary" onClick={() => navigate('/destination')}>
            {t('navbar.planTrip')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="ayn-trips-page">
      <div className="ayn-trips-page__header">
        <h1 className="ayn-trips-page__title">{t('trips.title')}</h1>
        <Button variant="primary" onClick={() => navigate('/destination')}>
          {t('trips.planNew')}
        </Button>
      </div>

      {trips.length === 0 ? (
        <div className="ayn-trips-empty">
          <PersonIllustration variant="backpack" />
          <h2 className="ayn-trips-empty__title">{t('trips.emptyTitle')}</h2>
          <p className="ayn-trips-empty__desc">
            {t('trips.emptyDescription')}
          </p>
          <Button variant="primary" onClick={() => navigate('/destination')}>
            {t('trips.planFirst')}
          </Button>
        </div>
      ) : (
        <div className="ayn-trips-page__grid">
          {trips.map((trip) => (
            <div
              key={trip.trip_id}
              className="ayn-trip-card"
              onClick={() => navigate(`/plan/${trip.plan_id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/plan/${trip.plan_id}`)}
            >
              <h3 className="ayn-trip-card__city">{translate(trip.destination.city)}</h3>
              <p className="ayn-trip-card__country">{translate(trip.destination.country)}</p>

              <div className="ayn-trip-card__meta">
                <span>{tf('trips.dateRange', { from: formatTripDate(trip.start_date, language), to: formatTripDate(trip.end_date, language) })}</span>
                <span>{tn('count.travelers', trip.travelers)}</span>
                <span className="ayn-trip-card__budget">
                  {money(trip.total_budget, trip.currency)}
                </span>
              </div>

              <div className="ayn-trip-card__footer">
                <span className={`ayn-trip-card__status ayn-trip-card__status--${trip.status}`}>
                  {t(`trip.status.${trip.status}`, trip.status)}
                </span>

                <div className="ayn-trip-card__rating-line">
                  {trip.rated && <span className="ayn-trip-card__rated-label">{t('trips.rated')}</span>}
                  {trip.status === 'confirmed' && !trip.rated && (
                    <Button
                      variant="text"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/plan/${trip.plan_id}/rate`);
                      }}
                    >
                      {t('trips.rateThis')}
                    </Button>
                  )}
                </div>

                <Button
                  variant="text"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/plan/${trip.plan_id}`);
                  }}
                >
                  {t('trips.viewDetails')} {language === 'ar' ? '←' : '→'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Trips;
