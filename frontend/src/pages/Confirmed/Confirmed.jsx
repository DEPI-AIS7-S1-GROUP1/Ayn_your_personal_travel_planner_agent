import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Download,
  Calendar,
  Star,
  BedDouble,
  Plane,
  Utensils,
  Compass,
  CarTaxiFront,
  MapPin,
  Users,
  Coins,
} from 'lucide-react';
import { Button } from '../../components/Button';
import api from '../../services/api';
import './Confirmed.css';

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

function getSlotLabel(slot) {
  switch (slot?.toLowerCase()) {
    case 'morning':
      return 'Morning (صباحاً)';
    case 'afternoon':
      return 'Afternoon (ظهراً)';
    case 'evening':
      return 'Evening (مساءً)';
    default:
      return slot || 'Daytime';
  }
}

function getCategoryIcon(cat) {
  switch (cat?.toLowerCase()) {
    case 'hotel':
      return <BedDouble size={15} />;
    case 'food':
      return <Utensils size={15} />;
    case 'transport':
      return <CarTaxiFront size={15} />;
    case 'flight':
      return <Plane size={15} />;
    default:
      return <Compass size={15} />;
  }
}

export function Confirmed() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const origin =
    new URLSearchParams(window.location.search).get('origin') ||
    sessionStorage.getItem(`ayn_origin_${id}`) ||
    'Cairo';

  useEffect(() => {
    let mounted = true;
    api.getPlan(id)
      .then((data) => {
        if (!mounted) return;
        setPlan(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || 'Failed to load plan.');
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  const handleExportICS = () => {
    if (!plan) return;

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Ayn Personal Travel Planner//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    plan.itinerary?.forEach((day) => {
      day.activities?.forEach((act, actIdx) => {
        const dtDate = day.date ? day.date.replace(/-/g, '') : '20261110';
        const uid = `ayn_${day.day}_${actIdx}_${act.id || 'act'}@ayn.travel`;
        lines.push(
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `SUMMARY:${act.title || 'Activity'} - Ayn Egypt Trip`,
          `DESCRIPTION:${act.description || ''} (Time: ${act.time_slot || 'day'}, Cost: ${plan.currency} ${act.estimated_cost || 0})`,
          `LOCATION:${plan.destination?.city || 'Egypt'}`,
          `DTSTART;VALUE=DATE:${dtDate}`,
          `DTEND;VALUE=DATE:${dtDate}`,
          'END:VEVENT'
        );
      });
    });

    lines.push('END:VCALENDAR');
    const icsContent = lines.join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `trip_${plan.destination?.city?.toLowerCase() || 'egypt'}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveToPhone = () => {
    // Triggers browser print dialog formatted for saving complete itinerary as PDF
    window.print();
  };

  if (loading) {
    return (
      <div className="ayn-confirmed-page">
        <div className="ayn-confirmed-card">
          <h2>Loading confirmation...</h2>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="ayn-confirmed-page">
        <div className="ayn-confirmed-card">
          <h2>Plan not found</h2>
          <p>{error}</p>
          <Button variant="primary" onClick={() => navigate('/trips')}>
            Back to trips
          </Button>
        </div>
      </div>
    );
  }

  const destCity = plan.destination?.city || 'Egypt';
  const selectedHotel =
    plan.options?.hotels?.find((h) => h.id === plan.selected_hotel_id) ||
    plan.options?.hotels?.[0];
  const selectedFlight =
    plan.options?.flights?.find((f) => f.id === plan.selected_flight_id) ||
    plan.options?.flights?.[0];

  return (
    <div className="ayn-confirmed-page">
      {/* Sky Hero */}
      <div className="ayn-confirmed-hero">
        <div className="ayn-confirmed-hero__icon">
          <CheckCircle2 size={48} strokeWidth={2} color="var(--color-green)" />
        </div>
        <h1 className="ayn-confirmed-hero__title">Your trip is confirmed!</h1>
        <p className="ayn-confirmed-hero__subtitle">
          {destCity}, Egypt &bull; {formatDisplayDate(plan.start_date || plan.itinerary?.[0]?.date)} to{' '}
          {formatDisplayDate(plan.end_date || plan.itinerary?.[plan.itinerary.length - 1]?.date)}
        </p>
        <div className="ayn-confirmed-trip-pills">
          <span className="ayn-pill"><MapPin size={14} /> {destCity}</span>
          <span className="ayn-pill"><Calendar size={14} /> {plan.itinerary?.length || 0} Days</span>
          <span className="ayn-pill"><Users size={14} /> {plan.travelers || 2} Travelers</span>
          <span className="ayn-pill">
            <Coins size={14} /> {plan.currency} {Number(plan.total_budget || 0).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="ayn-confirmed-content">
        {/* Card: Take it with you */}
        <div className="ayn-confirmed-card ayn-confirmed-download-card">
          <h2 className="ayn-confirmed-card__title">Take it with you</h2>
          <p className="ayn-confirmed-card__desc">
            Download your confirmed schedule to access offline or sync activities to your calendar.
          </p>
          <div className="ayn-confirmed-card__actions">
            <Button variant="primary" onClick={handleSaveToPhone}>
              <Download size={16} style={{ marginRight: 8 }} />
              Save to phone (PDF)
            </Button>
            <Button variant="secondary" onClick={handleExportICS}>
              <Calendar size={16} style={{ marginRight: 8 }} />
              Add to calendar (.ics)
            </Button>
          </div>
        </div>

        {/* Selected Hotel & Travel Box */}
        {(selectedHotel || selectedFlight) && (
          <div className="ayn-confirmed-booking-box">
            <h3 className="ayn-confirmed-booking-box__title">
              Accommodations & Travel Details
            </h3>
            <div className="ayn-confirmed-booking-grid">
              {selectedHotel && (
                <div className="ayn-booking-item">
                  <div className="ayn-booking-item__icon"><BedDouble size={22} /></div>
                  <div className="ayn-booking-item__content">
                    <div className="ayn-booking-item__type">Hotel Stay</div>
                    <div className="ayn-booking-item__name">{selectedHotel.name}</div>
                    <div className="ayn-booking-item__sub">
                      {selectedHotel.area || destCity} &bull; {selectedHotel.stars || 4} Stars
                    </div>
                    <div className="ayn-booking-item__price">
                      {plan.currency} {Number(selectedHotel.total_price || 0).toLocaleString()} total
                    </div>
                  </div>
                </div>
              )}
              {selectedFlight && (
                <div className="ayn-booking-item">
                  <div className="ayn-booking-item__icon"><Plane size={22} /></div>
                  <div className="ayn-booking-item__content">
                    <div className="ayn-booking-item__type">Transportation</div>
                    <div className="ayn-booking-item__name">
                      {selectedFlight.airline || 'EgyptAir / Intercity Transport'}
                    </div>
                    <div className="ayn-booking-item__sub">
                      Departure from {selectedFlight.outbound?.from || origin} to {destCity}
                    </div>
                    <div className="ayn-booking-item__price">
                      {plan.currency} {Number(selectedFlight.price || 0).toLocaleString()} total
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Confirmed Day-by-Day Itinerary Schedule */}
        <div className="ayn-confirmed-itinerary">
          <div className="ayn-confirmed-itinerary__header">
            <h2 className="ayn-confirmed-itinerary__title">
              Confirmed Day-by-Day Schedule
            </h2>
            <p className="ayn-confirmed-itinerary__desc">
              Your complete itinerary with activities, time slots, and costs.
            </p>
          </div>

          <div className="ayn-confirmed-days-list">
            {plan.itinerary?.map((day) => (
              <div key={day.day} className="ayn-confirmed-day-card">
                <div className="ayn-confirmed-day-header">
                  <div className="ayn-confirmed-day-meta">
                    <span className="ayn-confirmed-day-badge">Day {day.day}</span>
                    <span className="ayn-confirmed-day-date">{formatDisplayDate(day.date)}</span>
                  </div>
                  {day.theme && (
                    <div className="ayn-confirmed-day-theme">{day.theme}</div>
                  )}
                </div>

                <div className="ayn-confirmed-activities-list">
                  {day.activities?.map((act, actIdx) => (
                    <div key={act.id || actIdx} className="ayn-confirmed-act-item">
                      <div className="ayn-confirmed-act-top">
                        <span className="ayn-confirmed-act-slot-pill">
                          {getCategoryIcon(act.category)}
                          <span>{getSlotLabel(act.time_slot)}</span>
                        </span>
                        {Number(act.estimated_cost) > 0 ? (
                          <span className="ayn-confirmed-act-cost">
                            {plan.currency} {Number(act.estimated_cost).toLocaleString()}
                          </span>
                        ) : (
                          <span className="ayn-confirmed-act-cost--free">Included / Free</span>
                        )}
                      </div>
                      <div className="ayn-confirmed-act-body">
                        <h4 className="ayn-confirmed-act-title">{act.title}</h4>
                        {act.description && (
                          <p className="ayn-confirmed-act-desc">{act.description}</p>
                        )}
                        {act.booking_required && (
                          <span className="ayn-confirmed-act-tag">Advance Booking Recommended</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card: After your trip */}
        <div className="ayn-confirmed-card ayn-confirmed-rate-card">
          <h2 className="ayn-confirmed-card__title">After your trip</h2>
          <p className="ayn-confirmed-card__desc">
            Help Ayn improve future recommendations by telling us what you loved and what could be better.
          </p>
          <div className="ayn-confirmed-card__actions">
            <Button variant="secondary" onClick={() => navigate(`/plan/${id}/rate`)}>
              <Star size={16} style={{ marginRight: 8 }} />
              Rate your trip
            </Button>
          </div>
        </div>

        <div className="ayn-confirmed-footer-link">
          <Link to="/trips" className="ayn-confirmed-link">
            View all your trips &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Confirmed;
