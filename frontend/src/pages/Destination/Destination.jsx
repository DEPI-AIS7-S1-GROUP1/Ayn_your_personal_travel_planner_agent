import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { GeneratingScreen } from '../../components/GeneratingScreen/GeneratingScreen';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext.js';
import './Destination.css';

const EGYPT_ORIGIN_GOVERNORATES = [
  {
    group: 'Delta & Lower Egypt (الدلتا ومصر السفلى)',
    options: [
      { value: 'Gharbia (Tanta)', label: 'Gharbia / Tanta (الغربية - طنطا)' },
      { value: 'Dakahlia (Mansoura)', label: 'Dakahlia / Mansoura (الدقهلية - المنصورة)' },
      { value: 'Sharqia (Zagazig)', label: 'Sharqia / Zagazig (الشرقية - الزقازيق)' },
      { value: 'Qalyubia (Banha)', label: 'Qalyubia / Banha (القليوبية - بنها)' },
      { value: 'Menofia (Shibin El Kom)', label: 'Menofia / Shibin El Kom (المنوفية - شبين الكوم)' },
      { value: 'Kafr El Sheikh', label: 'Kafr El Sheikh (كفر الشيخ)' },
      { value: 'Beheira (Damanhur)', label: 'Beheira / Damanhur (البحيرة - دمنهور)' },
      { value: 'Damietta', label: 'Damietta (دمياط)' },
    ],
  },
  {
    group: 'Greater Cairo & Canal (القاهرة الكبرى ومدن القناة)',
    options: [
      { value: 'Cairo', label: 'Cairo (القاهرة - CAI)' },
      { value: 'Giza', label: 'Giza (الجيزة - SPX)' },
      { value: 'Port Said', label: 'Port Said (بورسعيد)' },
      { value: 'Ismailia', label: 'Ismailia (الإسماعيلية)' },
      { value: 'Suez', label: 'Suez (السويس)' },
    ],
  },
  {
    group: 'Alexandria & North Coast (الإسكندرية والساحل الشمالي)',
    options: [
      { value: 'Alexandria', label: 'Alexandria (الإسكندرية - HBE)' },
      { value: 'Matrouh (North Coast)', label: 'Matrouh / North Coast (مطروح والساحل الشمالي)' },
    ],
  },
  {
    group: 'Red Sea & Sinai (البحر الأحمر وسيناء)',
    options: [
      { value: 'Hurghada (Red Sea)', label: 'Hurghada / Red Sea (الغردقة والبحر الأحمر)' },
      { value: 'Sharm El Sheikh (South Sinai)', label: 'Sharm El Sheikh / South Sinai (شرم الشيخ)' },
      { value: 'North Sinai (Arish)', label: 'North Sinai / Arish (شمال سيناء - العريش)' },
    ],
  },
  {
    group: 'Upper Egypt & Valley (الصعيد والوادي الجديد)',
    options: [
      { value: 'Faiyum', label: 'Faiyum (الفيوم)' },
      { value: 'Beni Suef', label: 'Beni Suef (بني سويف)' },
      { value: 'Minya', label: 'Minya (المنيا)' },
      { value: 'Asyut', label: 'Asyut (أسيوط)' },
      { value: 'Sohag', label: 'Sohag (سوهاج)' },
      { value: 'Qena', label: 'Qena (قنا)' },
      { value: 'Luxor', label: 'Luxor (الأقصر - LXR)' },
      { value: 'Aswan', label: 'Aswan (أسوان - ASW)' },
      { value: 'New Valley (Kharga)', label: 'New Valley / Kharga (الوادي الجديد - الخارجة)' },
    ],
  },
  {
    group: 'International (خارج مصر)',
    options: [
      { value: 'International Airport Arrival', label: 'Arriving from International Airport (خارج مصر)' },
    ],
  },
];

const EGYPT_CITIES = [
  'Sharm El Sheikh',
  'Cairo',
  'Luxor',
  'Aswan',
  'Hurghada',
  'Dahab',
  'Alexandria',
  'Marsa Alam',
  'Siwa Oasis',
  'El Gouna',
  'Faiyum',
  'Marsa Matrouh',
];

const MAX_TRIP_DAYS = 14; // contract §3.3

/** yyyy-mm-dd for a date `days` after `from` (local time, like the date inputs). */
function isoDay(from, days) {
  // A 'yyyy-mm-dd' string would parse as UTC midnight; read it as local midnight instead.
  const d = typeof from === 'string' ? new Date(`${from}T00:00:00`) : new Date(from);
  d.setDate(d.getDate() + days);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function Destination() {
  const navigate = useNavigate();
  const { t, translate, language } = useLanguage();

  const today = isoDay(new Date(), 0);
  const [originCity, setOriginCity] = useState('Cairo');
  const [city, setCity] = useState('Sharm El Sheikh');
  // Defaults three weeks ahead, so the form never opens on a date the backend rejects as past.
  const [startDate, setStartDate] = useState(() => isoDay(new Date(), 21));
  const [endDate, setEndDate] = useState(() => isoDay(new Date(), 23));
  const [budget, setBudget] = useState('');
  // No preselected currency: the contract says the user must choose it.
  const [currency, setCurrency] = useState('');
  const [travelers, setTravelers] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' }); // the progress card replaces the form
    setIsSubmitting(true);
    setError(null);

    const tripPayload = {
      destination: { city, country: 'Egypt' },
      start_date: startDate,
      end_date: endDate,
      total_budget: parseInt(budget, 10),
      currency,
      travelers: parseInt(travelers, 10) || 2,
      // The plan is written in the language the user is reading the site in.
      language,
    };

    try {
      const result = await api.createTrip(tripPayload);
      const planId = result.plan?.id || result.trip_id;
      sessionStorage.setItem(`ayn_origin_${planId}`, originCity);
      // Per DESIGN.md §5.2 item 5: flow proceeds to Options screen
      navigate(`/plan/${planId}/options?origin=${encodeURIComponent(originCity)}`);
    } catch (err) {
      if (err.code === 'PROFILE_REQUIRED' || err.status === 409) {
        // Contract §4: Survey must be completed before planning a trip
        navigate('/survey');
        return;
      }
      setError(translate(err.message || 'Failed to create trip.'));
      setIsSubmitting(false);
    }
  };

  if (isSubmitting || error) {
    return (
      <div className="ayn-dest-page">
        <GeneratingScreen
          error={error}
          onRetry={() => {
            setError(null);
            handleSubmit();
          }}
          onCancel={() => {
            setError(null);
            setIsSubmitting(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="ayn-dest-page">
      <h1 className="ayn-dest-page__title">{t('destination.title')}</h1>
      <p className="ayn-dest-page__desc">
        {t('destination.description')}
      </p>

      <form className="ayn-dest-page__form" onSubmit={handleSubmit}>
        <div className="ayn-dest-page__row">
          <div className="ayn-dest-page__field">
            <label className="ayn-dest-page__label" htmlFor="dest-origin">
              {t('destination.from')}
            </label>
            <select
              id="dest-origin"
              className="ayn-dest-page__select"
              value={originCity}
              onChange={(e) => setOriginCity(e.target.value)}
            >
              {EGYPT_ORIGIN_GOVERNORATES.map((grp) => (
                <optgroup key={grp.group} label={translate(grp.group)}>
                  {grp.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {translate(opt.label)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="ayn-dest-page__field">
            <label className="ayn-dest-page__label" htmlFor="dest-city">
              {t('destination.destination')}
            </label>
            <select
              id="dest-city"
              className="ayn-dest-page__select"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              {EGYPT_CITIES.map((c) => (
                <option key={c} value={c}>
                  {translate(c)}, {t('destination.egypt')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="ayn-dest-page__row">
          <div className="ayn-dest-page__field">
            <label className="ayn-dest-page__label" htmlFor="dest-start-date">
              {t('destination.startDate')}
            </label>
            <input
              id="dest-start-date"
              type="date"
              className="ayn-dest-page__input"
              value={startDate}
              min={today}
              onChange={(e) => {
                const next = e.target.value;
                setStartDate(next);
                // Keep the end date valid: not before the start, not past the 14-day limit.
                if (next && (endDate < next || endDate > isoDay(next, MAX_TRIP_DAYS - 1))) {
                  setEndDate(next);
                }
              }}
              required
            />
          </div>

          <div className="ayn-dest-page__field">
            <label className="ayn-dest-page__label" htmlFor="dest-end-date">
              {t('destination.endDate')}
            </label>
            <input
              id="dest-end-date"
              type="date"
              className="ayn-dest-page__input"
              value={endDate}
              min={startDate || today}
              max={startDate ? isoDay(startDate, MAX_TRIP_DAYS - 1) : undefined}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="ayn-dest-page__row">
          <div className="ayn-dest-page__field">
            <label className="ayn-dest-page__label" htmlFor="dest-budget">
              {t('destination.totalBudget')}
            </label>
            <input
              id="dest-budget"
              type="number"
              className="ayn-dest-page__input"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              required
              min={1}
              step={1}
              inputMode="numeric"
            />
          </div>

          <div className="ayn-dest-page__field">
            <label className="ayn-dest-page__label" htmlFor="dest-currency">
              {t('destination.currency')}
            </label>
            <select
              id="dest-currency"
              className="ayn-dest-page__select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              required
            >
              <option value="" disabled>{t('destination.selectCurrency')}</option>
              <option value="EGP">EGP ({t('currency.egp')})</option>
              <option value="USD">USD ({t('currency.usd')})</option>
              <option value="EUR">EUR ({t('currency.eur')})</option>
              <option value="GBP">GBP ({t('currency.gbp')})</option>
              <option value="SAR">SAR ({t('currency.sar')})</option>
              <option value="AED">AED ({t('currency.aed')})</option>
            </select>
          </div>
        </div>

        <div className="ayn-dest-page__field">
          <label className="ayn-dest-page__label" htmlFor="dest-travelers">
            {t('destination.travelers')}
          </label>
          <input
            id="dest-travelers"
            type="number"
            className="ayn-dest-page__input"
            value={travelers}
            onChange={(e) => setTravelers(e.target.value)}
            min={1}
            max={10}
            required
          />
          <p className="ayn-dest-page__note">
            {t('destination.travelersNote')}
          </p>
        </div>

        {error && (
          <p style={{ color: 'var(--color-error)', margin: 0, fontSize: '13px' }}>
            {error}
          </p>
        )}

        <Button variant="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('generating.title') : t('destination.generate')}
        </Button>
      </form>
    </div>
  );
}

export default Destination;
