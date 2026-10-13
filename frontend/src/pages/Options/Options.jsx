import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plane, CarTaxiFront, Bus, Check, ArrowRight } from 'lucide-react';
import { PictureCard } from '../../components/PictureCard';
import { Button } from '../../components/Button';
import api from '../../services/api';
import './Options.css';

export function Options() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHotelId, setSelectedHotelId] = useState(null);
  const [selectedFlightId, setSelectedFlightId] = useState(null);
  const [transportFilter, setTransportFilter] = useState('all');
  const [saving, setSaving] = useState(false);

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
        setError(err.message || 'Failed to load options.');
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  const handleContinue = async () => {
    setSaving(true);
    try {
      await api.updatePlan(id, {
        selected_hotel_id: selectedHotelId,
        selected_flight_id: selectedFlightId,
      });
      navigate(`/plan/${id}`);
    } catch (_err) {
      // Proceed even if update fails
      navigate(`/plan/${id}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="ayn-options-page">
        <div className="ayn-options-page__loading">
          <h2>Loading suggested stays, flights & rides...</h2>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="ayn-options-page">
        <div className="ayn-options-page__error">
          <h2>Could not load options</h2>
          <p>{error || 'Plan not found.'}</p>
          <Button variant="primary" onClick={() => navigate('/trips')}>
            Back to trips
          </Button>
        </div>
      </div>
    );
  }

  const hotels = plan.options?.hotels || [];
  const destCity = plan.destination?.city || 'Egypt';
  const transportBudget = plan.budget_split?.transport || 6000;

  // 1. Flights (Air)
  const flightsList = (plan.options?.flights || []).map((f) => ({
    ...f,
    type: 'air',
    categoryLabel: 'Flight (Air)',
    icon: Plane,
  }));

  // 2. Private Rides & Taxis (InDrive & Kareem)
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
      price: Math.max(1200, Math.round(transportBudget * 0.45)),
    },
    {
      id: 'tax_kareem_001',
      type: 'taxi',
      categoryLabel: 'Private Ride / Kareem',
      airline: 'Kareem Comfort',
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
      price: Math.max(1500, Math.round(transportBudget * 0.55)),
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
        from: `${origin} Station`,
        to: `${destCity} Central`,
        departure: `${plan.start_date || '2026-11-10'}T07:00`,
        arrival: `${plan.start_date || '2026-11-10'}T12:00`,
      },
      return: {
        from: `${destCity} Central`,
        to: `${origin} Station`,
        departure: `${plan.end_date || '2026-11-12'}T15:30`,
        arrival: `${plan.end_date || '2026-11-12'}T20:30`,
      },
      price: Math.max(700, Math.round(transportBudget * 0.28)),
    },
    {
      id: 'bus_gobus_001',
      type: 'bus',
      categoryLabel: 'Coach Bus / Go Bus',
      airline: 'Go Bus Elite Plus',
      icon: Bus,
      details: 'First-class reclining seats, individual media screens, complimentary refreshments.',
      outbound: {
        from: `${origin} Terminal`,
        to: `${destCity} Terminal`,
        departure: `${plan.start_date || '2026-11-10'}T09:00`,
        arrival: `${plan.start_date || '2026-11-10'}T14:30`,
      },
      return: {
        from: `${destCity} Terminal`,
        to: `${origin} Terminal`,
        departure: `${plan.end_date || '2026-11-12'}T18:00`,
        arrival: `${plan.end_date || '2026-11-12'}T23:30`,
      },
      price: Math.max(900, Math.round(transportBudget * 0.35)),
    },
  ];

  const allTransport = [...flightsList, ...taxiOptions, ...busOptions];

  const filteredTransport = allTransport.filter((item) => {
    if (transportFilter === 'all') return true;
    return item.type === transportFilter;
  });

  return (
    <div className="ayn-options-page">
      <div className="ayn-options-page__header">
        <h1 className="ayn-options-page__title">Choose your stay & transportation</h1>
        <p className="ayn-options-page__subtitle">
          Traveling from <strong>{origin}</strong> to <strong>{destCity}</strong>.
          Compare Flights, InDrive, Kareem, and Swvl options for your journey.
          Selected prices adjust your total trip budget automatically.
        </p>
      </div>

      {/* Hotels Section */}
      <section className="ayn-options-section">
        <h2 className="ayn-options-section__title">Suggested stays in {destCity}</h2>
        <div className="ayn-options-hotels-grid">
          {hotels.map((hotel) => (
            <PictureCard
              key={hotel.id}
              name={hotel.name}
              imageUrl={hotel.image_url}
              area={hotel.area}
              stars={hotel.stars}
              details={hotel.details}
              totalPrice={hotel.total_price}
              pricePerNight={hotel.price_per_night}
              selected={selectedHotelId === hotel.id}
              onClick={() => setSelectedHotelId(hotel.id)}
            />
          ))}
        </div>
      </section>

      {/* Transportation Section (Air, InDrive, Kareem, Swvl) */}
      <section className="ayn-options-section">
        <div className="ayn-options-section__header-row">
          <h2 className="ayn-options-section__title">Transportation options</h2>
          <div className="ayn-transport-tabs">
            <button
              type="button"
              className={`ayn-transport-tab ${transportFilter === 'all' ? 'ayn-transport-tab--active' : ''}`}
              onClick={() => setTransportFilter('all')}
            >
              All ({allTransport.length})
            </button>
            <button
              type="button"
              className={`ayn-transport-tab ${transportFilter === 'air' ? 'ayn-transport-tab--active' : ''}`}
              onClick={() => setTransportFilter('air')}
            >
              Flights (Air)
            </button>
            <button
              type="button"
              className={`ayn-transport-tab ${transportFilter === 'taxi' ? 'ayn-transport-tab--active' : ''}`}
              onClick={() => setTransportFilter('taxi')}
            >
              InDrive & Kareem
            </button>
            <button
              type="button"
              className={`ayn-transport-tab ${transportFilter === 'bus' ? 'ayn-transport-tab--active' : ''}`}
              onClick={() => setTransportFilter('bus')}
            >
              Swvl & Buses
            </button>
          </div>
        </div>

        <div className="ayn-options-flights-list">
          {filteredTransport.map((item) => {
            const isSelected = selectedFlightId === item.id;
            const IconComponent = item.icon || Plane;

            return (
              <div
                key={item.id}
                className={`ayn-flight-row ${isSelected ? 'ayn-flight-row--selected' : ''}`}
                onClick={() => setSelectedFlightId(item.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSelectedFlightId(item.id);
                  }
                }}
              >
                <div className="ayn-flight-row__left">
                  <div className={`ayn-flight-row__icon-box ayn-flight-row__icon-box--${item.type}`}>
                    <IconComponent size={20} strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <h4 className="ayn-flight-row__airline">{item.airline}</h4>
                      {item.categoryLabel && (
                        <span className="ayn-transport-badge">{item.categoryLabel}</span>
                      )}
                    </div>
                    <span className="ayn-flight-row__details">{item.details}</span>
                  </div>
                </div>

                <div className="ayn-flight-row__middle">
                  <div className="ayn-flight-row__leg">
                    <span className="ayn-flight-row__route">
                      {item.outbound?.from} &rarr; {item.outbound?.to}
                    </span>
                    <span className="ayn-flight-row__date">
                      Outbound &bull; {item.outbound?.departure?.split('T')[1]?.slice(0, 5) || 'Morning'}
                    </span>
                  </div>
                  {item.return && (
                    <div className="ayn-flight-row__leg">
                      <span className="ayn-flight-row__route">
                        {item.return?.from} &rarr; {item.return?.to}
                      </span>
                      <span className="ayn-flight-row__date">
                        Return &bull; {item.return?.departure?.split('T')[1]?.slice(0, 5) || 'Evening'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="ayn-flight-row__right">
                  <div className="ayn-flight-row__price tabular-nums">
                    {plan.currency} {item.price?.toLocaleString()}
                  </div>
                  <Button
                    variant={isSelected ? 'primary' : 'secondary'}
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFlightId(item.id);
                    }}
                  >
                    {isSelected ? (
                      <>
                        <Check size={14} style={{ marginRight: 4 }} />
                        Selected
                      </>
                    ) : (
                      'Select'
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer Navigation */}
      <div className="ayn-options-page__footer">
        <Button variant="secondary" onClick={() => navigate(`/plan/${id}`)}>
          Skip to itinerary
        </Button>
        <Button variant="primary" onClick={handleContinue} disabled={saving}>
          {saving ? 'Saving...' : 'Continue to Itinerary'}
          <ArrowRight size={16} style={{ marginLeft: 8 }} />
        </Button>
      </div>
    </div>
  );
}

export default Options;
