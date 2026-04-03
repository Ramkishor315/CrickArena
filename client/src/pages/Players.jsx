import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlayerStore } from '../store';
import PlayerAvatar from '../components/PlayerAvatar';
import { Users, Search } from 'lucide-react';

const SORTS = [
  { label: '🏏 Runs', value: 'runs' },
  { label: '🎾 Wickets', value: 'wickets' },
  { label: '📅 Matches', value: 'matches' },
];

export default function Players() {
  const { players, fetchPlayers, loading } = usePlayerStore();
  const [sort, setSort]       = useState('runs');
  const [search, setSearch]   = useState('');

  useEffect(() => { fetchPlayers(sort, search); }, [sort, search]);

  return (
    <div className="page fade-up">
      <div className="flex items-center gap-1 mb-3">
        <Users size={22} style={{ color: 'var(--clr-primary)' }} />
        <h1>Leaderboard</h1>
      </div>

      {/* Sort tabs */}
      <div className="flex gap-1 mb-2">
        {SORTS.map(({ label, value }) => (
          <button key={value} onClick={() => setSort(value)}
            className={`btn btn-sm ${sort === value ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, fontSize: '.8rem' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-1 mb-2" style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '.8rem', color: 'var(--clr-muted)', pointerEvents: 'none' }} />
        <input placeholder="Search player..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: '2.2rem' }} />
      </div>

      {loading && <div className="spinner" />}

      {/* Leaderboard list */}
      {!loading && players.length === 0 && (
        <div className="card-flat text-center" style={{ padding: '3rem' }}>
          <div style={{ fontSize: '3rem' }}>👤</div>
          <p className="text-muted mt-1">No players found</p>
        </div>
      )}

      {players.map((p, i) => (
        <Link key={p._id} to={`/players/${p._id}`}>
          <div className="card" style={{ marginBottom: '.65rem' }}>
            <div className="flex items-center gap-2">
              {/* Rank */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: i === 0 ? 'rgba(250,204,21,.2)' : i === 1 ? 'rgba(148,163,184,.2)' : i === 2 ? 'rgba(249,115,22,.2)' : 'var(--clr-surface2)',
                color: i === 0 ? 'var(--clr-yellow)' : i === 1 ? '#94a3b8' : i === 2 ? 'var(--clr-primary)' : 'var(--clr-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '.8rem', fontWeight: 800,
              }}>
                {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
              </div>

              <PlayerAvatar name={p.name} size={42} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{p.name}</div>
                <div className="text-muted" style={{ fontSize: '.78rem' }}>{p.matches} matches</div>
              </div>

              {/* Primary stat */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 900, fontSize: '1.3rem', fontFamily: 'Outfit, sans-serif',
                  color: sort === 'wickets' ? 'var(--clr-red)' : 'var(--clr-accent)' }}>
                  {sort === 'runs'    ? p.runs
                  : sort === 'wickets' ? p.wickets
                  : p.matches}
                </div>
                <div className="text-muted" style={{ fontSize: '.72rem' }}>
                  {sort === 'runs' ? `SR: ${p.strikeRate}` : sort === 'wickets' ? `Avg: ${p.bowlingAverage || '-'}` : 'matches'}
                </div>
              </div>
            </div>

            {/* Mini stat row */}
            <div className="flex gap-2 mt-1" style={{ paddingLeft: '3.5rem' }}>
              {[
                { label: 'Runs', value: p.runs, color: 'var(--clr-accent)' },
                { label: 'Wkts', value: p.wickets, color: 'var(--clr-red)' },
                { label: 'SR',   value: p.strikeRate, color: 'var(--clr-muted)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ fontSize: '.78rem' }}>
                  <span style={{ color: 'var(--clr-muted)' }}>{label}: </span>
                  <strong style={{ color }}>{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
