import { useEffect } from 'react';
import { useMatchStore } from '../store';
import MatchCard from '../components/MatchCard';
import { Clock } from 'lucide-react';

export default function History() {
  const { matches, fetchMatches, loading } = useMatchStore();

  useEffect(() => { fetchMatches(); }, []);

  return (
    <div className="page fade-up">
      <div className="flex items-center gap-1 mb-3">
        <Clock size={22} style={{ color: 'var(--clr-primary)' }} />
        <h1>Match History</h1>
      </div>

      {loading && <div className="spinner" />}

      {!loading && matches.length === 0 && (
        <div className="card-flat text-center" style={{ padding: '3rem' }}>
          <div style={{ fontSize: '3.5rem' }}>📋</div>
          <h3 className="mt-2">No matches yet</h3>
          <p className="text-muted mt-1">Start a new match to see it here</p>
        </div>
      )}

      {matches.map((m) => <MatchCard key={m._id} match={m} />)}
    </div>
  );
}
