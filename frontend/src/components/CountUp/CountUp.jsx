import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 700;

/**
 * Animates a number from its previous value to `value` (ease-out), e.g. a budget total
 * after the chat changes it. Renders with toLocaleString like the static numbers it replaces.
 * People who prefer reduced motion see the final value at once.
 */
export function CountUp({ value = 0, className = '' }) {
  const target = Number(value) || 0;
  const [shown, setShown] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = target;
    if (from === target || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(target);
      return undefined;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(from + (target - from) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return <span className={`tabular-nums ${className}`}>{shown.toLocaleString()}</span>;
}

export default CountUp;
