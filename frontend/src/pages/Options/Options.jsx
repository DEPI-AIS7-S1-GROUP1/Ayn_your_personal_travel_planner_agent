import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plane, CarTaxiFront, Bus, Check, ArrowRight } from 'lucide-react';
import { TierNotice } from '../../components/TierNotice/TierNotice';
import { PictureCard } from '../../components/PictureCard';
import { Button } from '../../components/Button';
import {
  HotelSkyBackground,
  TransportStreetBackground,
  DescendingTraveler,
  VehicleIllustration,
  CloudPodCushion,
} from '../../components/Illustration';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext.js';
import './Options.css';

export function Options() {
  const { t, tf, money, translate } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHotelId, setSelectedHotelId] = useState(null);
  const [selectedFlightId, setSelectedFlightId] = useState(null);
  const [transportFilter, setTransportFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [justHonked, setJustHonked] = useState(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const journeyRef = useRef(null);

  const origin = new URLSearchParams(window.location.search).get('origin') ||
    sessionStorage.getItem(`ayn_origin_${id}`) || 'Cairo';

  useEffect(() => {
    let mounted = true;
    api.getPlan(id)
      .then((data) => {
        if (!mounted) return;
        setPlan(data);
        setSelectedHotelId(data.selected_hotel_id || (data.options?.hotels?.[0]?.id ?? null));
        setSelectedFlightId(data.selected_flight_id || (data.options?.flights?.[0]?.id ?? 'flt_001'));
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(translate(err.message || 'Failed to load options.'));
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id, translate]);

  // Track scroll descent from sky to road
  useEffect(() => {
    const handleScroll = () => {
      if (!journeyRef.current) return;
      const rect = journeyRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const totalScrollable = rect.height - windowHeight;
      if (totalScrollable <= 0) return;
      const currentScroll = -rect.top;
      const progress = Math.max(0, Math.min(1, currentScroll / totalScrollable));
      setScrollProgress(progress);
      journeyRef.current.style.setProperty('--journey-progress', progress.toFixed(3));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, plan]);

  const handleContinue = async () => {
    setSaving(true);
    try {
      await api.updatePlan(id, {
        selected_hotel_id: selectedHotelId,
        selected_flight_id: selectedFlightId,
      });
      navigate(`/plan/${id}`);
    } catch {
      navigate(`/plan/${id}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectTransport = (itemId) => {
    setJustHonked(itemId);
    setSelectedFlightId(itemId);
    setTimeout(() => {
      setJustHonked(null);
    }, 900);
  };

  if (loading) {
    return (
      <div className="ayn-options-page">
        <div className="ayn-options-page__loading">
          <h2>{t('options.loading')}</h2>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="ayn-options-page">
        <div className="ayn-options-page__error">
          <h2>{t('options.error')}</h2>
          <p>{error || t('options.planNotFound')}</p>
        </div>
      </div>
    );
  }

  const hotels = plan.options?.hotels || [];
  const rawFlights = plan.options?.flights || [];
  const destCity = plan.destination?.city || 'Egypt';

  const defaultTransportBudget = plan.total_budget
    ? Math.round(plan.total_budget * 0.15)
    : 3000;
  const shareOfTransport = (ratio) => Math.round(defaultTransportBudget * ratio);

  // 1. Flights
  const flightsList = rawFlights.length > 0 ? rawFlights.map((f) => ({
    ...f,
    type: 'flight',
    categoryLabel: 'Flight (Air)',
    icon: Plane,
  })) : [
    {
      id: 'flt_egyptair_001',
      type: 'flight',
      categoryLabel: 'Flight (Air)',
      airline: 'EgyptAir Express',
      icon: Plane,
      details: 'Direct domestic flight with 20kg baggage allowance.',
      outbound: {
        from: origin,
        to: destCity,
        departure: `${plan.start_date || '2026-11-10'}T08:30`,
        arrival: `${plan.start_date || '2026-11-10'}T09:45`,
      },
      return: {
        from: destCity,
        to: origin,
        departure: `${plan.end_date || '2026-11-12'}T19:00`,
        arrival: `${plan.end_date || '2026-11-12'}T20:15`,
      },
      price: shareOfTransport(1.0),
    },
  ];

  // 2. Private Rides & Taxis (InDrive & Careem)
  const taxiOptions = [
    {
      id: 'tax_indrive_001',
      type: 'taxi',
      categoryLabel: 'Private Ride / InDrive',
      airline: 'InDrive City-to-City',
      icon: CarTaxiFront,
      details: 'Private AC car, direct door-to-door, fare agreed in advance upfront.',
      outbound: {
        from: origin,
        to: destCity,
        departure: `${plan.start_date || '2026-11-10'}T07:30`,
        arrival: `${plan.start_date || '2026-11-10'}T12:00`,
      },
      return: {
        from: destCity,
        to: origin,
        departure: `${plan.end_date || '2026-11-12'}T16:00`,
        arrival: `${plan.end_date || '2026-11-12'}T20:30`,
      },
      price: shareOfTransport(0.45),
    },
    {
      id: 'tax_careem_001',
      type: 'taxi',
      categoryLabel: 'Private Ride / Careem',
      airline: 'Careem Comfort',
      icon: CarTaxiFront,
      details: 'Top-rated captain, modern spacious sedan, door-to-door luggage assistance.',
      outbound: {
        from: origin,
        to: destCity,
        departure: `${plan.start_date || '2026-11-10'}T08:00`,
        arrival: `${plan.start_date || '2026-11-10'}T12:30`,
      },
      return: {
        from: destCity,
        to: origin,
        departure: `${plan.end_date || '2026-11-12'}T17:00`,
        arrival: `${plan.end_date || '2026-11-12'}T21:30`,
      },
      price: shareOfTransport(0.55),
    },
  ];

  // 3. Intercity Buses (Swvl & Go Bus)
  const busOptions = [
    {
      id: 'bus_swvl_001',
      type: 'bus',
      categoryLabel: 'Intercity Bus / Swvl',
      airline: 'Swvl Travel',
      icon: Bus,
      details: 'High-comfort intercity mini-coach, reserved seating, onboard Wi-Fi, AC.',
      outbound: {
        from: tf('options.busStation', { city: translate(origin) }),
        to: tf('options.busStation', { city: translate(destCity) }),
        departure: `${plan.start_date || '2026-11-10'}T08:00`,
        arrival: `${plan.start_date || '2026-11-10'}T13:30`,
      },
      return: {
        from: tf('options.busStation', { city: translate(destCity) }),
        to: tf('options.busStation', { city: translate(origin) }),
        departure: `${plan.end_date || '2026-11-12'}T17:30`,
        arrival: `${plan.end_date || '2026-11-12'}T23:00`,
      },
      price: shareOfTransport(0.25),
    },
    {
      id: 'bus_gobus_001',
      type: 'bus',
      categoryLabel: 'Coach Bus / Go Bus',
      airline: 'Go Bus Elite Plus',
      icon: Bus,
      details: 'First-class reclining seats, individual media screens, complimentary refreshments.',
      outbound: {
        from: tf('options.busTerminal', { city: translate(origin) }),
        to: tf('options.busTerminal', { city: translate(destCity) }),
        departure: `${plan.start_date || '2026-11-10'}T09:00`,
        arrival: `${plan.start_date || '2026-11-10'}T14:30`,
      },
      return: {
        from: tf('options.busTerminal', { city: translate(destCity) }),
        to: tf('options.busTerminal', { city: translate(origin) }),
        departure: `${plan.end_date || '2026-11-12'}T18:00`,
        arrival: `${plan.end_date || '2026-11-12'}T23:30`,
      },
      price: shareOfTransport(0.35),
    },
  ];

  const allTransport = [...flightsList, ...taxiOptions, ...busOptions];
  const translateRoute = (from, to) =>
    `${translate(from)} → ${translate(to)}`;

  const filteredTransport = allTransport.filter((item) => {
    if (transportFilter === 'all') return true;
    return item.type === transportFilter;
  });

  return (
    <div className="ayn-options-page">
      {/* Header Banner & Live Dynamic Budget Badge */}
      <div className="ayn-options-page__header">
        <div className="ayn-options-page__header-main">
          <h1 className="ayn-options-page__title">{t('options.title')}</h1>
          <p className="ayn-options-page__subtitle">
            {t('options.subtitleFrom')} <strong>{translate(origin)}</strong> {t('trips.to')} <strong>{translate(destCity)}</strong>.{' '}
            {t('options.subtitleCompare')}
          </p>
        </div>
      </div>

      <TierNotice tier={plan.search_context?.tier} scope="options" />

      {/* ===================================================================
          CONTINUOUS JOURNEY: "FROM THE SKY TO THE ROAD" SCROLL WORLD
          =================================================================== */}
      <div className="ayn-options-journey-container" ref={journeyRef}>
        {/* ===============================================================
            1. SKY SECTION: Stays & Hotel Cloud Pods
            =============================================================== */}
        <section className="ayn-journey-sky-section">
          <HotelSkyBackground />

          <div className="ayn-options-hotels-grid">
            {hotels.map((hotel, idx) => (
              <div key={hotel.id} className={`ayn-hotel-cloud-pod ayn-hotel-cloud-pod--${idx + 1}`}>
                <PictureCard
                  name={hotel.name}
                  imageUrl={hotel.image_url}
                  area={hotel.area}
                  stars={hotel.stars}
                  details={hotel.details}
                  totalPrice={hotel.total_price}
                  pricePerNight={hotel.price_per_night}
                  currency={plan.currency}
                  selected={selectedHotelId === hotel.id}
                  onClick={() => setSelectedHotelId(hotel.id)}
                />
                <CloudPodCushion />
              </div>
            ))}
          </div>
        </section>

        {/* ===============================================================
            2. TRANSITION ZONE: Descending Traveler (Parachute to Road)
            =============================================================== */}
        <div className="ayn-journey-transition-zone">
          <div className="ayn-journey-clouds-parting" aria-hidden="true" />
          <DescendingTraveler scrollRatio={scrollProgress} />
        </div>

        {/* ===============================================================
            3. ROAD SECTION: Highway Asphalt & Vehicle Ticket Rows
            =============================================================== */}
        <section className="ayn-journey-road-section">
          <TransportStreetBackground />

          <div className="ayn-options-section__header-row">
            <h2 className="ayn-options-section__title ayn-options-section__title--road">
              <span className="ayn-title-icon">🚗</span>
              {t('options.transportation')}
            </h2>

            <div className="ayn-transport-tabs">
              <button
                type="button"
                className={`ayn-transport-tab ${transportFilter === 'all' ? 'ayn-transport-tab--active' : ''}`}
                onClick={() => setTransportFilter('all')}
              >
                {t('options.all')} ({allTransport.length})
              </button>
              <button
                type="button"
                className={`ayn-transport-tab ${transportFilter === 'flight' ? 'ayn-transport-tab--active' : ''}`}
                onClick={() => setTransportFilter('flight')}
              >
                {t('options.flights')}
              </button>
              <button
                type="button"
                className={`ayn-transport-tab ${transportFilter === 'taxi' ? 'ayn-transport-tab--active' : ''}`}
                onClick={() => setTransportFilter('taxi')}
              >
                {t('options.taxis')}
              </button>
              <button
                type="button"
                className={`ayn-transport-tab ${transportFilter === 'bus' ? 'ayn-transport-tab--active' : ''}`}
                onClick={() => setTransportFilter('bus')}
              >
                {t('options.buses')}
              </button>
            </div>
          </div>

          <div className="ayn-options-vehicles-list">
            {filteredTransport.map((item, idx) => {
              const isSelected = selectedFlightId === item.id;
              const isHonking = justHonked === item.id;

              return (
                <div
                  key={item.id}
                  className={`ayn-vehicle-ticket-row ${isSelected ? 'ayn-vehicle-ticket-row--selected' : ''} ${isHonking ? 'ayn-vehicle-ticket-row--honk' : ''}`}
                  onClick={() => handleSelectTransport(item.id)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  style={{ '--vehicle-stagger': `${idx * 0.08}s` }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectTransport(item.id);
                    }
                  }}
                >
                  {/* Left: Illustrated Egyptian Vehicle with Honk Bubble */}
                  <div className="ayn-vehicle-stage">
                    <VehicleIllustration
                      type={item.type}
                      isSelected={isSelected}
                      hasPassenger={isSelected}
                    />
                    {isHonking && (
                      <span className="ayn-vehicle-honk-bubble" role="status">
                        {item.type === 'taxi' ? 'Beep beep! 🚖' : item.type === 'flight' ? 'Cleared for takeoff! ✈️' : 'All aboard! 🚌'}
                      </span>
                    )}
                  </div>

                  {/* Right: Attached Boarding Pass / Travel Ticket */}
                  <div className="ayn-ticket-stub">
                    <div className="ayn-ticket-left">
                      <div className="ayn-ticket-badge-row">
                        <h4 className="ayn-ticket-title">{item.airline}</h4>
                        {item.categoryLabel && (
                          <span className="ayn-transport-badge">{translate(item.categoryLabel)}</span>
                        )}
                      </div>
                      <span className="ayn-ticket-details">{translate(item.details)}</span>
                    </div>

                    <div className="ayn-ticket-middle">
                      <div className="ayn-ticket-leg">
                        <span className="ayn-ticket-route">
                          {translateRoute(item.outbound?.from, item.outbound?.to)}
                        </span>
                        <span className="ayn-ticket-time">
                          {t('options.outbound')} &bull; {item.outbound?.departure?.split('T')[1]?.slice(0, 5) || t('time.morning')}
                        </span>
                      </div>
                      {item.return && (
                        <div className="ayn-ticket-leg">
                          <span className="ayn-ticket-route">
                            {translateRoute(item.return?.from, item.return?.to)}
                          </span>
                          <span className="ayn-ticket-time">
                            {t('options.return')} &bull; {item.return?.departure?.split('T')[1]?.slice(0, 5) || t('time.evening')}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="ayn-ticket-right">
                      <div className="ayn-ticket-price tabular-nums">
                        {money(item.price, plan.currency)}
                      </div>
                      <Button
                        variant={isSelected ? 'primary' : 'secondary'}
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectTransport(item.id);
                        }}
                      >
                        {isSelected ? (
                          <>
                            <Check size={14} style={{ marginRight: 4 }} />
                            {t('options.selected')}
                          </>
                        ) : (
                          t('options.select')
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Footer Navigation */}
      <div className="ayn-options-page__footer">
        <Button variant="secondary" onClick={() => navigate(`/plan/${id}`)}>
          {t('options.skip')}
        </Button>
        <Button variant="primary" onClick={handleContinue} disabled={saving}>
          {saving ? t('common.saving') : t('options.continue')}
          <ArrowRight size={16} style={{ marginLeft: 8 }} />
        </Button>
      </div>
    </div>
  );
}

export default Options;
