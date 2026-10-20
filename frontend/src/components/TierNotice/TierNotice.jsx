import { Info } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.js';
import './TierNotice.css';

/**
 * Tells the user when part of a plan did not come from the AI (backend saves the generator
 * in plan.search_context.tier: "mock_unverified", or e.g. "groq_unverified+mock_options").
 * Renders nothing for plans the AI wrote in full.
 */
export function TierNotice({ tier, scope = 'plan' }) {
  const { t } = useLanguage();
  if (!tier) return null;

  let message = null;
  if (tier.startsWith('mock')) message = t('plan.mockNotice');
  else if (tier.includes('mock_options') && scope === 'options') message = t('plan.mockOptionsNotice');
  if (!message) return null;

  return (
    <div className="ayn-tier-notice" role="status">
      <Info size={18} aria-hidden="true" className="ayn-tier-notice__icon" />
      <p>{message}</p>
    </div>
  );
}

export default TierNotice;
