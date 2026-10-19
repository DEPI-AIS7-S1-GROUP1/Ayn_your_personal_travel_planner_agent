import { useState, useEffect, useRef } from 'react';
import { Button } from '../Button';
import { PersonIllustration } from '../Illustration';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext.js';
import './ChatPanel.css';

/**
 * ChatPanel Component (DESIGN.md §5.3, contract §4.75)
 *
 * Card titled "Ask Ayn to change it" with a small person illustration.
 * User message: primary blue aligned to end.
 * Ayn message: sky bubble, radius 16px, 4px corner nearest sender, text 14/20.
 *
 * States:
 * - While waiting: "Updating your plan..." and Send disabled.
 * - needs_clarification: show Ayn's question as normal reply, day cards unchanged.
 * - 502: "Ayn couldn’t change the plan. Try again." under input, keeps user text.
 * - 409: hide the panel.
 *
 * @param {string} planId - Current plan ID
 * @param {string} [planStatus='draft'] - Current status of plan
 * @param {(plan: object, trip: object) => void} [onPlanUpdated] - Callback when plan changes
 */
export function ChatPanel({
  planId,
  planStatus = 'draft',
  onPlanUpdated,
  className = ''
}) {
  const { t, translate } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isPlanNonEditable, setIsPlanNonEditable] = useState(planStatus !== 'draft');

  const messagesEndRef = useRef(null);

  // If status changes away from draft (or 409 received), hide panel
  useEffect(() => {
    if (planStatus !== 'draft') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPlanNonEditable(true);
    } else {
      setIsPlanNonEditable(false);
    }
  }, [planStatus]);

  // Initialize with greeting from Ayn
  useEffect(() => {
    if (!planId || planStatus !== 'draft') return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages([
      {
        id: 'init_welcome',
        role: 'assistant',
        content: t('chat.welcome')
      }
    ]);
  }, [planId, planStatus, t]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isUpdating]);

  // On 409 state, panel is completely hidden per DESIGN.md §5.3
  if (isPlanNonEditable) {
    return null;
  }

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isUpdating) return;

    setErrorMessage(null);

    // Append user message immediately
    const userMsg = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: trimmed
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsUpdating(true);

    try {
      const response = await api.chatPlan(planId, {
        conversation_id: conversationId,
        message: trimmed
      });

      if (response.conversation_id) {
        setConversationId(response.conversation_id);
      }

      // Add assistant response
      const assistantMsg = {
        id: response.message?.id || `ast_${Date.now()}`,
        role: 'assistant',
        content: response.message?.content || '',
        action: response.action,
        changes: response.changes || []
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // If updated, notify parent page to update day cards & budget
      if (response.action === 'updated' && response.plan) {
        onPlanUpdated?.(response.plan, response.trip);
      }

      // Clear input only on success
      setInputText('');
    } catch (err) {
      if (err.status === 409 || err.code === 'PLAN_NOT_EDITABLE') {
        // Hide panel on 409
        setIsPlanNonEditable(true);
      } else {
        // On 502 or network error: show message and KEEP user's text
        setErrorMessage(t('chat.updateFailed'));
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={`ayn-chat-panel ${className}`} aria-label={t('chat.title')}>
      {/* Header */}
      <div className="ayn-chat-panel__header">
        <div className="ayn-chat-panel__title-group">
          <h3 className="ayn-chat-panel__title">{t('chat.title')}</h3>
        </div>
        <div className="ayn-chat-panel__figure" aria-hidden="true">
          <PersonIllustration variant="backpack" />
        </div>
      </div>

      {/* Message List */}
      <div className="ayn-chat-panel__messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`ayn-chat-bubble ayn-chat-bubble--${msg.role}`}
          >
            <div className="ayn-chat-bubble__text">{msg.content}</div>
            {msg.changes && msg.changes.length > 0 && (
              <div className="ayn-chat-bubble__changes">
                {msg.changes.map((c, i) => (
                  <div key={i} className="ayn-chat-bubble__change-item">
                    • {translate(c.description)}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Loading state indicator */}
        {isUpdating && (
          <div className="ayn-chat-panel__status">
            {t('chat.updating')}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form className="ayn-chat-panel__form" onSubmit={handleSendMessage}>
        <div className="ayn-chat-panel__input-row">
          <input
            type="text"
            className="ayn-chat-panel__input"
            placeholder={t('chat.placeholder')}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isUpdating}
            maxLength={1000}
            aria-label={t('chat.ariaLabel')}
          />
          <Button
            variant="primary"
            type="submit"
            disabled={isUpdating || !inputText.trim()}
          >
            {t('chat.send')}
          </Button>
        </div>

        {/* 502 error display */}
        {errorMessage && (
          <p className="ayn-chat-panel__error-text" role="alert">
            {errorMessage}
          </p>
        )}
      </form>
    </div>
  );
}

export default ChatPanel;
