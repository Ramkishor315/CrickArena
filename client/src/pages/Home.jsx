import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Zap, ChevronRight } from 'lucide-react';
import { useMatchStore } from '../store';
import MatchCard from '../components/MatchCard';

export default function Home() {
  const { matches, fetchMatches, loading } = useMatchStore();

  useEffect(() => { fetchMatches(); }, []);

  const live      = matches.filter((m) => m.status === 'live');
  const recent    = matches.filter((m) => m.status !== 'live').slice(0, 5);

  return (
    <div className="page fade-up">
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1000 0%, #2d1500 50%, #0b0f1a 100%)',
        border: '1.5px solid var(--clr-border)',
        borderRadius: '20px',
        padding: '1.75rem 1.5rem',
        marginBottom: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-20px', right: '-20px',
          fontSize: '8rem', opacity: .07, userSelect: 'none',
        }}>🏏</div>
        <div className="display" style={{ fontSize: '2rem', color: 'var(--clr-text)', lineHeight: 1.1 }}>
          Score Your <span style={{ color: 'var(--clr-primary)' }}>Local</span><br/>Cricket Match
        </div>
        <p className="text-muted mt-1" style={{ fontSize: '.9rem' }}>
          Ball-by-ball scoring for street, backyard &amp; tent cricket
        </p>
        <Link to="/match/new">
          <button className="btn btn-primary btn-lg mt-2" style={{ gap: '.5rem' }}>
            <Plus size={20} /> Start New Match
          </button>
        </Link>
      </div>

      {/* Live matches */}
      {live.length > 0 && (
        <section className="mb-3">
          <div className="flex items-center gap-1 mb-2">
            <Zap size={16} style={{ color: 'var(--clr-red)' }} />
            <h2>Live Now</h2>
          </div>
          {live.map((m) => <MatchCard key={m._id} match={m} />)}
        </section>
      )}

      {/* Quick stats */}
      <div className="grid-3 mb-3">
        {[
          { label: 'Total Matches', value: matches.length },
          { label: 'Live Now',      value: live.length, color: 'var(--clr-red)' },
          { label: 'Completed',     value: matches.filter((m) => m.status === 'completed').length, color: 'var(--clr-green)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card-flat" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: color || 'var(--clr-text)', fontFamily: 'Outfit, sans-serif' }}>{value}</div>
            <div className="text-muted" style={{ fontSize: '.75rem', marginTop: '.2rem' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Recent matches */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2>Recent Matches</h2>
          <Link to="/history" className="flex items-center gap-1" style={{ color: 'var(--clr-primary)', fontSize: '.85rem', fontWeight: 600 }}>
            See all <ChevronRight size={14} />
          </Link>
        </div>
        {loading && <div className="spinner" />}
        {!loading && recent.length === 0 && (
          <div className="card-flat text-center" style={{ padding: '2rem', color: 'var(--clr-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '.5rem' }}>🏏</div>
            <div>No matches yet — start your first game!</div>
          </div>
        )}
        {recent.map((m) => <MatchCard key={m._id} match={m} />)}
      </section>
    </div>
  );
}
