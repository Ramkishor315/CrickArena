import { getOverSummary } from '../utils/cricket';

/**
 * Displays the current over's ball-by-ball dots.
 * Props: balls (array of all ball events), currentOver (0-indexed)
 */
export default function OverHistory({ balls = [], currentOver = 0 }) {
  const summary = getOverSummary(balls, currentOver);

  const dotClass = (type) => {
    if (type === 'W')  return 'over-dot dot-W';
    if (type === '4')  return 'over-dot dot-4';
    if (type === '6')  return 'over-dot dot-6';
    if (type === 'Wd') return 'over-dot dot-Wd';
    if (type === 'Nb') return 'over-dot dot-Nb';
    return 'over-dot';
  };

  return (
    <div>
      <p className="text-muted" style={{ fontSize: '.75rem', marginBottom: '.4rem', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600 }}>
        Over {currentOver + 1}
      </p>
      <div className="over-dots">
        {summary.length === 0 && (
          <span className="text-muted" style={{ fontSize: '.8rem' }}>No balls yet</span>
        )}
        {summary.map((dot, i) => (
          <div key={i} className={dotClass(dot.type)}>{dot.label}</div>
        ))}
        {/* Empty placeholders for remaining balls */}
        {Array.from({ length: Math.max(0, 6 - summary.filter(d => d.type !== 'Wd' && d.type !== 'Nb').length) }).map((_, i) => (
          <div key={`empty-${i}`} className="over-dot" style={{ opacity: .3 }}>·</div>
        ))}
      </div>
    </div>
  );
}
