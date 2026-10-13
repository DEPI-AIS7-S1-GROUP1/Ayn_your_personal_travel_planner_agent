import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { PersonIllustration } from '../../components/Illustration';
import api from '../../services/api';
import './Trips.css';

export function Trips() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setError(null);
    api.getTrips()
      .then((data) => {
        if (!mounted) return;
        setTrips(data.trips || []);
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || 'Failed to load trips.');
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
        <h1 className="ayn-trips-page__title">Your trips</h1>
        <p>Loading your trips...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ayn-trips-page">
        <h1 className="ayn-trips-page__title">Your trips</h1>
        <div className="ayn-placeholder-screen">
          <p style={{ color: 'var(--color-error)', fontWeight: 600 }}>{error}</p>
          <Button variant="primary" onClick={() => navigate('/destination')}>
            Plan a trip
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="ayn-trips-page">
      <div className="ayn-trips-page__header">
        <h1 className="ayn-trips-page__title">Your trips</h1>
        <Button variant="primary" onClick={() => navigate('/destination')}>
          Plan a new trip
        </Button>
      </div>

      {trips.length === 0 ? (
        <div className="ayn-trips-empty">
          <PersonIllustration variant="backpack" />
          <h2 className="ayn-trips-empty__title">No trips yet</h2>
          <p className="ayn-trips-empty__desc">
            You haven&apos;t started any plans yet. Tell Ayn where you want to go in Egypt!
          </p>
          <Button variant="primary" onClick={() => navigate('/destination')}>
            Plan your first trip
          </Button>
        </div>
      ) : (
        <div className="ayn-trips-page__grid">
          {trips.map((t) => (
            <div
              key={t.trip_id}
              className="ayn-trip-card"
              onClick={() => navigate(`/plan/${t.plan_id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/plan/${t.plan_id}`)}
            >
              <h3 className="ayn-trip-card__city">{t.destination.city}</h3>
              <p className="ayn-trip-card__country">{t.destination.country}</p>

              <div className="ayn-trip-card__meta">
                <span>{t.start_date} to {t.end_date}</span>
                <span>{t.travelers} {t.travelers === 1 ? 'traveler' : 'travelers'}</span>
                <span className="ayn-trip-card__budget">
                  {t.currency} {Number(t.total_budget).toLocaleString()}
                </span>
              </div>

              <div className="ayn-trip-card__footer">
                <span className={`ayn-trip-card__status ayn-trip-card__status--${t.status}`}>
                  {t.status}
                </span>

                <div className="ayn-trip-card__rating-line">
                  {t.rated && <span className="ayn-trip-card__rated-label">Rated</span>}
                  {t.status === 'confirmed' && !t.rated && (
                    <Button
                      variant="text"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/plan/${t.plan_id}/rate`);
                      }}
                    >
                      Rate this trip
                    </Button>
                  )}
                </div>

                <Button
                  variant="text"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/plan/${t.plan_id}`);
                  }}
                >
                  View details &rarr;
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
