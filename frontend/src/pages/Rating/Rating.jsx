import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Check } from 'lucide-react';
import { SegmentedChoice } from '../../components/SegmentedChoice';
import { Button } from '../../components/Button';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext.js';
import './Rating.css';

const SCORE_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' }
];

export function Rating() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, translate } = useLanguage();

  const [score, setScore] = useState('5');
  const [liked, setLiked] = useState([]);
  const [likedInput, setLikedInput] = useState('');
  const [disliked, setDisliked] = useState([]);
  const [dislikedInput, setDislikedInput] = useState('');
  const [comment, setComment] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleAddLiked = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = likedInput.trim();
      if (val && !liked.includes(val) && liked.length < 10) {
        setLiked([...liked, val]);
        setLikedInput('');
      }
    }
  };

  const handleRemoveLiked = (tag) => {
    setLiked(liked.filter((t) => t !== tag));
  };

  const handleAddDisliked = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = dislikedInput.trim();
      if (val && !disliked.includes(val) && disliked.length < 10) {
        setDisliked([...disliked, val]);
        setDislikedInput('');
      }
    }
  };

  const handleRemoveDisliked = (tag) => {
    setDisliked(disliked.filter((t) => t !== tag));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await api.createRating({
        plan_id: id,
        score: parseInt(score, 10),
        liked,
        disliked,
        comment: comment.trim()
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/trips');
      }, 1500);
    } catch (err) {
      setError(translate(err.message || 'Failed to submit rating.'));
      setSubmitting(false);
    }
  };

  return (
    <div className="ayn-rating-page">
      <div className="ayn-rating-card">
        <h1 className="ayn-rating-card__title">{t('rating.title')}</h1>
        <p className="ayn-rating-card__subtitle">
          {t('rating.description')}
        </p>

        {success ? (
          <div className="ayn-rating-card__success">
            <Check size={32} color="var(--color-green)" />
            <h3>{t('rating.thankYou')}</h3>
            <p>{t('rating.returning')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="ayn-rating-form">
            {/* Score Selector */}
            <div className="ayn-rating-field">
              <label className="ayn-rating-label">{t('rating.overall')}</label>
              <SegmentedChoice
                options={SCORE_OPTIONS}
                value={score}
                onChange={setScore}
              />
              <span className="ayn-rating-hint">{t('rating.scale')}</span>
            </div>

            {/* What you liked */}
            <div className="ayn-rating-field">
              <label className="ayn-rating-label">
                {t('rating.liked')} <span className="ayn-rating-counter">({liked.length}/10)</span>
              </label>
              <div className="ayn-chips-wrap">
                {liked.map((item) => (
                  <span key={item} className="ayn-tag-chip">
                    {item}
                    <button
                      type="button"
                      className="ayn-tag-chip__remove"
                      onClick={() => handleRemoveLiked(item)}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                className="ayn-rating-input"
                placeholder={t('rating.likedPlaceholder')}
                value={likedInput}
                onChange={(e) => setLikedInput(e.target.value)}
                onKeyDown={handleAddLiked}
                disabled={liked.length >= 10}
              />
            </div>

            {/* What could be improved */}
            <div className="ayn-rating-field">
              <label className="ayn-rating-label">
                {t('rating.improved')} <span className="ayn-rating-counter">({disliked.length}/10)</span>
              </label>
              <div className="ayn-chips-wrap">
                {disliked.map((item) => (
                  <span key={item} className="ayn-tag-chip">
                    {item}
                    <button
                      type="button"
                      className="ayn-tag-chip__remove"
                      onClick={() => handleRemoveDisliked(item)}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                className="ayn-rating-input"
                placeholder={t('rating.improvedPlaceholder')}
                value={dislikedInput}
                onChange={(e) => setDislikedInput(e.target.value)}
                onKeyDown={handleAddDisliked}
                disabled={disliked.length >= 10}
              />
            </div>

            {/* Comment */}
            <div className="ayn-rating-field">
              <label className="ayn-rating-label">{t('rating.notes')}</label>
              <textarea
                className="ayn-rating-textarea"
                rows={3}
                placeholder={t('rating.notesPlaceholder')}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            {error && <p className="ayn-rating-error">{error}</p>}

            <div className="ayn-rating-actions">
              <Button variant="secondary" type="button" onClick={() => navigate('/trips')}>
                {t('options.skip')}
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? t('rating.submitting') : t('rating.submit')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default Rating;
