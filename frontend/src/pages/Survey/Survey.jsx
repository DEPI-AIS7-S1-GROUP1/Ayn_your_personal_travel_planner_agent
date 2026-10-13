import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from '../../components/Button';
import api from '../../services/api';
import './Survey.css';

const PERSONALITY_OPTIONS = [
  { value: 'calm', label: 'Calm' },
  { value: 'adventurous', label: 'Adventurous' },
  { value: 'foodie', label: 'Foodie' },
  { value: 'landmark-loving', label: 'Landmark lover' },
  { value: 'history-loving', label: 'History lover' },
  { value: 'style-loving', label: 'Style lover' },
  { value: 'exploring', label: 'Explorer' }
];

const HOBBY_OPTIONS = [
  { value: 'museums', label: 'Museums' },
  { value: 'photography', label: 'Photography' },
  { value: 'beaches', label: 'Beaches' },
  { value: 'diving', label: 'Diving' },
  { value: 'hiking', label: 'Hiking' },
  { value: 'local-markets', label: 'Local markets' },
  { value: 'cooking', label: 'Cooking' },
  { value: 'art', label: 'Art' }
];

const DIETARY_OPTIONS = [
  { value: 'halal', label: 'Halal' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten-free', label: 'Gluten-free' },
  { value: 'dairy-free', label: 'Dairy-free' },
  { value: 'nut-free', label: 'Nut-free' }
];

export function Survey() {
  const navigate = useNavigate();

  const [personality, setPersonality] = useState(['foodie', 'history-loving']);
  const [hobbies, setHobbies] = useState(['museums', 'photography', 'local-markets']);
  const [dietary, setDietary] = useState(['halal']);
  const [foodLikes, setFoodLikes] = useState('koshari, seafood, grilled meat');
  const [foodDislikes, setFoodDislikes] = useState('very spicy food');
  const [likedLastTrip, setLikedLastTrip] = useState('Small group tours and walking old neighbourhoods.');
  const [dislikedLastTrip, setDislikedLastTrip] = useState('Long bus rides.');
  const [isSaving, setIsSaving] = useState(false);

  const toggleItem = (list, setList, item, max = Infinity) => {
    if (list.includes(item)) {
      setList(list.filter((x) => x !== item));
    } else {
      if (list.length < max) {
        setList([...list, item]);
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const payload = {
      personality,
      hobbies,
      dietary_limits: dietary,
      food_likes: foodLikes.split(',').map((s) => s.trim()).filter(Boolean),
      food_dislikes: foodDislikes.split(',').map((s) => s.trim()).filter(Boolean),
      liked_last_trip: likedLastTrip,
      disliked_last_trip: dislikedLastTrip
    };

    try {
      await api.updateProfile(payload);
      navigate('/destination');
    } catch (err) {
      console.warn('Could not save profile via API:', err);
      navigate('/destination');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="ayn-survey-page">
      <h1 className="ayn-survey-page__title">Travel Survey & Profile</h1>
      <p className="ayn-survey-page__desc">
        Help Ayn understand who you are so every day in Egypt matches your taste and pace.
      </p>

      <form className="ayn-survey-page__form" onSubmit={handleSave}>
        {/* Personality */}
        <div>
          <h3 className="ayn-survey-page__section-title">
            Travel Style (Pick 1 to 3)
          </h3>
          <div className="ayn-chips-grid">
            {PERSONALITY_OPTIONS.map((opt) => {
              const selected = personality.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`ayn-chip-button ${selected ? 'ayn-chip-button--selected' : ''}`}
                  onClick={() => toggleItem(personality, setPersonality, opt.value, 3)}
                >
                  {selected && <Check size={16} />}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Hobbies */}
        <div>
          <h3 className="ayn-survey-page__section-title">
            Interests & Hobbies
          </h3>
          <div className="ayn-chips-grid">
            {HOBBY_OPTIONS.map((opt) => {
              const selected = hobbies.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`ayn-chip-button ${selected ? 'ayn-chip-button--selected' : ''}`}
                  onClick={() => toggleItem(hobbies, setHobbies, opt.value)}
                >
                  {selected && <Check size={16} />}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dietary limits */}
        <div>
          <h3 className="ayn-survey-page__section-title">
            Dietary limits
          </h3>
          <div className="ayn-chips-grid">
            {DIETARY_OPTIONS.map((opt) => {
              const selected = dietary.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`ayn-chip-button ${selected ? 'ayn-chip-button--selected' : ''}`}
                  onClick={() => toggleItem(dietary, setDietary, opt.value)}
                >
                  {selected && <Check size={16} />}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Food likes / dislikes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="ayn-dest-page__label">
            Food likes (comma-separated)
          </label>
          <input
            type="text"
            className="ayn-dest-page__input"
            value={foodLikes}
            onChange={(e) => setFoodLikes(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="ayn-dest-page__label">
            Food dislikes (comma-separated)
          </label>
          <input
            type="text"
            className="ayn-dest-page__input"
            value={foodDislikes}
            onChange={(e) => setFoodDislikes(e.target.value)}
          />
        </div>

        {/* Last trip feedback */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="ayn-dest-page__label">
            What did you like on your last trip?
          </label>
          <textarea
            className="ayn-survey-textarea"
            value={likedLastTrip}
            onChange={(e) => setLikedLastTrip(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="ayn-dest-page__label">
            What did you dislike on your last trip?
          </label>
          <textarea
            className="ayn-survey-textarea"
            value={dislikedLastTrip}
            onChange={(e) => setDislikedLastTrip(e.target.value)}
          />
        </div>

        <Button variant="primary" type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save and continue to Destination'}
        </Button>
      </form>
    </div>
  );
}

export default Survey;
