import { useEffect } from 'react';

// Blocks that fade up as they scroll into view. Listed here (not in each page) so pages
// keep their markup; new pages get the effect by using these classes.
const REVEAL_SELECTOR = [
  '.ayn-home__features-title',
  '.ayn-route-motif',
  '.ayn-home__features-grid > *',
  '.ayn-home__about-text',
  '.ayn-home__about-figures',
  '.ayn-home__cta-content',
  '.ayn-trips-page__grid > *',
  '.ayn-day-card',
  '.ayn-options-section',
  '.ayn-options-hotels-grid > *',
  '.ayn-budget-card',
  '.ayn-chat-panel',
].join(',');

const STAGGER_MS = 80;
const MAX_STAGGER_STEPS = 5;

/**
 * Marks matching elements below the fold as hidden and reveals each one as it enters the
 * viewport. Uses a data attribute (not className) so React re-renders never undo it.
 * Elements already on screen are revealed right away; nothing stays hidden without an observer.
 * Re-scans when the route changes or new content mounts (e.g. a plan finishes loading).
 */
export function useScrollReveal(routeKey) {
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute('data-reveal', 'shown');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );

    const scan = () => {
      // Also re-observe elements still marked hidden: a previous run of this effect (StrictMode
      // runs it twice, a route change runs it again) disconnected the observer that owned them.
      const pending = [...document.querySelectorAll(REVEAL_SELECTOR)].filter(
        (el) => el.getAttribute('data-reveal') !== 'shown',
      );
      pending.forEach((el) => {
        if (el.getAttribute('data-reveal') === 'hidden') {
          observer.observe(el);
          return;
        }
        // Siblings that arrive together appear one after another.
        const index = el.parentElement ? [...el.parentElement.children].indexOf(el) : 0;
        el.style.setProperty('--reveal-delay', `${Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS}ms`);
        el.setAttribute('data-reveal', 'hidden');
        observer.observe(el);
      });
    };

    scan();
    let frame = 0;
    const mutations = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(scan);
    });
    const root = document.querySelector('.ayn-main-content') || document.body;
    mutations.observe(root, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      mutations.disconnect();
      observer.disconnect();
    };
  }, [routeKey]);
}

export default useScrollReveal;
