import { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMatchStore } from '../store';
import { crr, getDeviceId } from '../utils/cricket';
import { Play, Trash2 } from 'lucide-react';

function InningsTable({ innings, label }) {
  if (!innings) return null;
  const balls = innings.balls || [];

  // Build batter stats from ball events
  const batters = {};
  for (const b of balls) {
    const id = b.batter?._id || b.batter;
    const name = b.batter?.name || 'Unknown';
    if (!id) continue;
    if (!batters[id]) batters[id] = { name, runs: 0, balls: 0, fours: 0, sixes: 0, out: false, how: '' };
    batters[id].runs += b.runs || 0;
    const legal = !b.extras?.type || b.extras.type === 'none' || b.extras.type === 'bye' || b.extras.type === 'legBye';
    if (legal) batters[id].balls += 1;
    if (b.runs === 4) batters[id].fours += 1;
    if (b.runs === 6) batters[id].sixes += 1;
    if (b.wicket?.isWicket && (b.wicket.batter?._id || b.wicket.batter) === id) {
      batters[id].out = true;
      batters[id].how = b.wicket.kind || 'out';
    }
  }

  // Build bowler stats
  const bowlers = {};
  for (const b of balls) {
    const id = b.bowler?._id || b.bowler;
    const name = b.bowler?.name || 'Unknown';
    if (!id) continue;
    if (!bowlers[id]) bowlers[id] = { name, balls: 0, runs: 0, wickets: 0 };
    const legal = !b.extras?.type || b.extras.type === 'none' || b.extras.type === 'bye' || b.extras.type === 'legBye';
    if (legal) bowlers[id].balls += 1;
    bowlers[id].runs += (b.runs || 0) + (b.extras?.runs || 0);
    if (b.wicket?.isWicket && !['runOut', 'retired'].includes(b.wicket.kind)) {
      bowlers[id].wickets += 1;
    }
  }

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <h3>{label}</h3>
        <span style={{ fontWeight: 800, color: 'var(--clr-accent)', fontSize: '1.1rem' }}>
          {innings.totalRuns}/{innings.totalWickets} ({innings.totalOvers})
        </span>
      </div>
      <div className="table-wrap mb-2">
        <table>
          <thead>
            <tr><th>Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr>
          </thead>
          <tbody>
            {Object.values(batters).map((b) => (
              <tr key={b.name}>
                <td>
                  <div style={{ fontWeight: 600 }}>{b.name}</div>
                  {b.out && <div style={{ fontSize: '.72rem', color: 'var(--clr-muted)' }}>{b.how}</div>}
                </td>
                <td style={{ fontWeight: 700, color: b.runs >= 50 ? 'var(--clr-yellow)' : 'inherit' }}>{b.runs}{!b.out && '*'}</td>
                <td>{b.balls}</td>
                <td style={{ color: 'var(--clr-green)' }}>{b.fours}</td>
                <td style={{ color: 'var(--clr-primary)' }}>{b.sixes}</td>
                <td className="text-muted">{b.balls ? ((b.runs / b.balls) * 100).toFixed(0) : 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Bowler</th><th>O</th><th>R</th><th>W</th><th>Eco</th></tr>
          </thead>
          <tbody>
            {Object.values(bowlers).map((b) => (
              <tr key={b.name}>
                <td style={{ fontWeight: 600 }}>{b.name}</td>
                <td>{Math.floor(b.balls / 6)}.{b.balls % 6}</td>
                <td>{b.runs}</td>
                <td style={{ fontWeight: 700, color: b.wickets >= 3 ? 'var(--clr-red)' : 'inherit' }}>{b.wickets}</td>
                <td className="text-muted">{crr(b.runs, b.balls)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Scoreboard() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { activeMatch, fetchMatch, deleteMatch, loading, listenToMatch, unlistenFromMatch } = useMatchStore();

  useEffect(() => { 
    fetchMatch(id);
    listenToMatch(id);
    return () => unlistenFromMatch();
  }, [id]);

  const match = activeMatch;
  if (loading || !match) return <div className="page"><div className="spinner" /></div>;

  const deviceId = getDeviceId();
  const isOwner  = match.clientId === deviceId;

  const home  = match.teams?.home;
  const away  = match.teams?.away;
  const inn1  = match.innings?.[0];
  const inn2  = match.innings?.[1];

  const handleDelete = async () => {
    if (!window.confirm('Delete this match?')) return;
    await deleteMatch(id);
    navigate('/history');
  };

  return (
    <div className="page fade-up">
      {/* Header */}
      <div className="card mb-2" style={{
        background: 'linear-gradient(135deg, #0d1a0d, #0b0f1a)',
        borderColor: match.status === 'completed' ? 'var(--clr-green)' : 'var(--clr-border)',
      }}>
        <div className="flex items-center justify-between mb-1">
          <span className="badge badge-muted">{match.format} · {match.maxOvers} ov</span>
          {match.status === 'completed'
            ? <span className="badge badge-green">✅ Completed</span>
            : match.status === 'live'
            ? <span className="badge badge-red pulse">🔴 Live</span>
            : <span className="badge badge-muted">{match.status}</span>}
        </div>

        <div className="flex items-center justify-between mt-1">
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{home?.name}</div>
            {inn1 && <div style={{ color: 'var(--clr-accent)', fontWeight: 700, fontSize: '1.3rem' }}>
              {inn1.totalRuns}/{inn1.totalWickets}
            </div>}
          </div>
          <div style={{ color: 'var(--clr-muted)', fontWeight: 700 }}>vs</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{away?.name}</div>
            {inn2 && <div style={{ color: 'var(--clr-primary)', fontWeight: 700, fontSize: '1.3rem' }}>
              {inn2.totalRuns}/{inn2.totalWickets}
            </div>}
          </div>
        </div>

        {match.result?.description && (
          <div className="mt-2" style={{
            background: 'rgba(250,204,21,.08)', border: '1px solid rgba(250,204,21,.2)',
            borderRadius: '8px', padding: '.6rem .9rem',
            color: 'var(--clr-yellow)', fontWeight: 700, fontSize: '.9rem', textAlign: 'center',
          }}>
            🏆 {match.result.description}
          </div>
        )}

        {isOwner && (
          <div className="flex gap-1 mt-2">
            {match.status === 'live' && (
              <Link to={`/match/${id}/score`} style={{ flex: 2 }}>
                <button className="btn btn-primary btn-block">
                  <Play size={16} /> Resume Scoring
                </button>
              </Link>
            )}
            <button className="btn btn-ghost btn-sm" onClick={handleDelete}>
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Innings scorecards */}
      <InningsTable innings={inn1} label={`${home?.name || 'Team A'} — 1st Innings`} />
      {inn2 && <InningsTable innings={inn2} label={`${away?.name || 'Team B'} — 2nd Innings`} />}

      {/* Venue / date */}
      <div className="card-flat text-center" style={{ fontSize: '.8rem', color: 'var(--clr-muted)' }}>
        🏟️ {match.venue} · {new Date(match.createdAt).toLocaleString()}
      </div>
    </div>
  );
}
