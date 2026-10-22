/**
 * Shimmering placeholders shown while data loads, shaped like the content that is coming
 * (a plan's day cards, a grid of trip cards), so the page does not jump when it arrives.
 */
export function Skeleton({ width = '100%', height = 16, radius, className = '' }) {
  return (
    <div
      className={`ayn-skeleton ${className}`}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

export function PlanSkeleton({ label }) {
  return (
    <div className="ayn-skeleton-plan" role="status" aria-live="polite">
      <span className="ayn-visually-hidden">{label}</span>
      <Skeleton width="45%" height={36} />
      <Skeleton width="30%" height={18} />
      <div className="ayn-skeleton-plan__grid">
        <div className="ayn-skeleton-plan__col">
          {[0, 1, 2].map((i) => (
            <div key={i} className="ayn-skeleton-card">
              <Skeleton width="35%" height={20} />
              <Skeleton height={14} />
              <Skeleton width="80%" height={14} />
              <Skeleton width="60%" height={14} />
            </div>
          ))}
        </div>
        <div className="ayn-skeleton-plan__col">
          <div className="ayn-skeleton-card"><Skeleton height={180} /></div>
          <div className="ayn-skeleton-card"><Skeleton height={24} /><Skeleton height={14} /></div>
        </div>
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 3, label }) {
  return (
    <div className="ayn-skeleton-grid" role="status" aria-live="polite">
      <span className="ayn-visually-hidden">{label}</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="ayn-skeleton-card">
          <Skeleton width="55%" height={22} />
          <Skeleton width="40%" height={14} />
          <Skeleton height={14} />
          <Skeleton width="70%" height={14} />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
