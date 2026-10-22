import { useState, useEffect } from 'react';
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
import { PersonIllustration, CelebratoryConfetti } from '../../components/Illustration';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext.js';
import './Confirmed.css';

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

function getSlotLabel(slot, t) {
  switch (slot?.toLowerCase()) {
    case 'morning':
      return t('time.morning');
    case 'afternoon':
      return t('time.afternoon');
    case 'evening':
      return t('time.evening');
    default:
      return slot || t('confirmed.daytime');
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
  const { language, t, tf, tn, money, translate } = useLanguage();
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
          <h2>{t('confirmed.loading')}</h2>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="ayn-confirmed-page">
        <div className="ayn-confirmed-card">
          <h2>{t('confirmed.notFound')}</h2>
          <p>{error}</p>
          <Button variant="primary" onClick={() => navigate('/trips')}>
            {t('draft.backToTrips')}
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
        {/* Celebration Confetti */}
        <CelebratoryConfetti />

        {/* Official Egyptian Passport Entry Stamp with landing animation */}
        <div className="ayn-passport-stamp ayn-passport-stamp--landing" aria-hidden="true">
          <div className="ayn-passport-stamp__inner">
            <span className="ayn-passport-stamp__country">A. R. EGYPT • AYN</span>
            <span className="ayn-passport-stamp__city">{translate(destCity).toUpperCase()}</span>
            <span className="ayn-passport-stamp__type">
              {language === 'ar' ? '★ رحلة مؤكدة ★' : '★ VOYAGE CONFIRMED ★'}
            </span>
            <span className="ayn-passport-stamp__date">
              {formatDisplayDate(plan.start_date || new Date().toISOString(), language)}
            </span>
          </div>
        </div>

        {/* Companion Cheering Traveler */}
        <div className="ayn-confirmed-hero__character" aria-hidden="true">
          <PersonIllustration
            variant="suitcase"
            width={64}
            height={94}
            bubbleText={language === 'ar' ? 'رحلة سعيدة وممتعة! ✈️' : 'Have a magical trip! ✈️'}
          />
        </div>

        <div className="ayn-confirmed-hero__icon">
          <CheckCircle2 size={48} strokeWidth={2} color="var(--color-green)" />
        </div>
        <h1 className="ayn-confirmed-hero__title">{t('confirmed.title')}</h1>
        <p className="ayn-confirmed-hero__subtitle">
          {tf('common.placeInCountry', { city: translate(destCity), country: t('destination.egypt') })} &bull;{' '}
          {tf('trips.dateRange', {
            from: formatDisplayDate(plan.start_date || plan.itinerary?.[0]?.date, language),
            to: formatDisplayDate(plan.end_date || plan.itinerary?.[plan.itinerary.length - 1]?.date, language),
          })}
        </p>
        <div className="ayn-confirmed-trip-pills">
          <span className="ayn-pill"><MapPin size={14} /> {translate(destCity)}</span>
          <span className="ayn-pill"><Calendar size={14} /> {tn('count.days', plan.itinerary?.length || 0)}</span>
          <span className="ayn-pill"><Users size={14} /> {tn('count.travelers', plan.travelers || 2)}</span>
          <span className="ayn-pill">
            <Coins size={14} /> {money(plan.total_budget, plan.currency)}
          </span>
        </div>
      </div>

      <div className="ayn-confirmed-content">
        {/* Card: Take it with you */}
        <div className="ayn-confirmed-card ayn-confirmed-download-card">
          <h2 className="ayn-confirmed-card__title">{t('confirmed.takeWithYou')}</h2>
          <p className="ayn-confirmed-card__desc">
            {t('confirmed.downloadDescription')}
          </p>
          <div className="ayn-confirmed-card__actions">
            <Button variant="primary" onClick={handleSaveToPhone}>
              <Download size={16} style={{ marginInlineEnd: 8 }} />
              {t('confirmed.savePhone')}
            </Button>
            <Button variant="secondary" onClick={handleExportICS}>
              <Calendar size={16} style={{ marginInlineEnd: 8 }} />
              {t('confirmed.addCalendar')}
            </Button>
          </div>
        </div>

        {/* Selected Hotel & Travel Box */}
        {(selectedHotel || selectedFlight) && (
          <div className="ayn-confirmed-booking-box">
            <h3 className="ayn-confirmed-booking-box__title">
              {t('confirmed.travelDetails')}
            </h3>
            <div className="ayn-confirmed-booking-grid">
              {selectedHotel && (
                <div className="ayn-booking-item">
                  <div className="ayn-booking-item__icon"><BedDouble size={22} /></div>
                  <div className="ayn-booking-item__content">
                    <div className="ayn-booking-item__type">{t('confirmed.hotelStay')}</div>
                    <div className="ayn-booking-item__name">{selectedHotel.name}</div>
                    <div className="ayn-booking-item__sub">
                      {translate(selectedHotel.area || destCity)} &bull; {tn('count.stars', selectedHotel.stars || 4)}
                    </div>
                    <div className="ayn-booking-item__price">
                      {tf('confirmed.totalPrice', { amount: money(selectedHotel.total_price, plan.currency) })}
                    </div>
                  </div>
                </div>
              )}
              {selectedFlight && (
                <div className="ayn-booking-item">
                  <div className="ayn-booking-item__icon"><Plane size={22} /></div>
                  <div className="ayn-booking-item__content">
                    <div className="ayn-booking-item__type">{t('confirmed.transportation')}</div>
                    <div className="ayn-booking-item__name">
                      {selectedFlight.airline || 'EgyptAir / Intercity Transport'}
                    </div>
                    <div className="ayn-booking-item__sub">
                      {tf('confirmed.departureRoute', { from: translate(selectedFlight.outbound?.from || origin), to: translate(destCity) })}
                    </div>
                    <div className="ayn-booking-item__price">
                      {tf('confirmed.totalPrice', { amount: money(selectedFlight.price, plan.currency) })}
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
              {t('confirmed.scheduleTitle')}
            </h2>
            <p className="ayn-confirmed-itinerary__desc">
              {t('confirmed.scheduleDescription')}
            </p>
          </div>

          <div className="ayn-confirmed-days-list">
            {plan.itinerary?.map((day) => (
              <div key={day.day} className="ayn-confirmed-day-card">
                <div className="ayn-confirmed-day-header">
                  <div className="ayn-confirmed-day-meta">
                    <span className="ayn-confirmed-day-badge">{t('trip.day')} {day.day}</span>
                    <span className="ayn-confirmed-day-date">{formatDisplayDate(day.date, language)}</span>
                  </div>
                  {day.theme && (
                    <div className="ayn-confirmed-day-theme">{translate(day.theme)}</div>
                  )}
                </div>

                <div className="ayn-confirmed-activities-list">
                  {day.activities?.map((act, actIdx) => (
                    <div key={act.id || actIdx} className="ayn-confirmed-act-item">
                      <div className="ayn-confirmed-act-top">
                        <span className="ayn-confirmed-act-slot-pill">
                          {getCategoryIcon(act.category)}
                          <span>{getSlotLabel(act.time_slot, t)}</span>
                        </span>
                        {Number(act.estimated_cost) > 0 ? (
                          <span className="ayn-confirmed-act-cost">
                            {money(act.estimated_cost, plan.currency)}
                          </span>
                        ) : (
                          <span className="ayn-confirmed-act-cost--free">{t('confirmed.includedFree')}</span>
                        )}
                      </div>
                      <div className="ayn-confirmed-act-body">
                        <h4 className="ayn-confirmed-act-title">{translate(act.title)}</h4>
                        {act.description && (
                          <p className="ayn-confirmed-act-desc">{translate(act.description)}</p>
                        )}
                        {act.booking_required && (
                          <span className="ayn-confirmed-act-tag">{t('confirmed.bookingRecommended')}</span>
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
          <h2 className="ayn-confirmed-card__title">{t('confirmed.afterTrip')}</h2>
          <p className="ayn-confirmed-card__desc">
            {t('confirmed.afterTripDescription')}
          </p>
          <div className="ayn-confirmed-card__actions">
            <Button variant="secondary" onClick={() => navigate(`/plan/${id}/rate`)}>
              <Star size={16} style={{ marginInlineEnd: 8 }} />
              {t('trips.rateThis')}
            </Button>
          </div>
        </div>

        <div className="ayn-confirmed-footer-link">
          <Link to="/trips" className="ayn-confirmed-link">
            {t('trips.viewAll')} {language === 'ar' ? '←' : '→'}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Confirmed;
