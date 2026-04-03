import { Link } from 'react-router-dom';
import { short } from '../utils/cricket';
import { Trophy, Clock } from 'lucide-react';

import { getDeviceId } from '../utils/cricket';

/**
 * Compact match card for history list.
 */
export default function MatchCard({ match }) {
  const home    = match?.teams?.home;
  const away    = match?.teams?.away;
  const inn1    = match?.innings?.[0];
  const inn2    = match?.innings?.[1];
  const status  = match?.status;

  const statusBadge = {
    live:          <span className="badge badge-red pulse">🔴 LIVE</span>,
    completed:     <span className="badge badge-green">✅ Done</span>,
    setup:         <span className="badge badge-muted">Setup</span>,
    'innings-break': <span className="badge badge-accent">Break</span>,
    abandoned:     <span className="badge badge-muted">Abandoned</span>,
  }[status] || <span className="badge badge-muted">{status}</span>;

  const deviceId = getDeviceId();
  const isOwner  = match.clientId === deviceId;
  const linkTo   = isOwner && (status === 'live' || status === 'innings-break') 
    ? `/match/${match._id}/score` 
    : `/match/${match._id}`;

  return (
    <Link to={linkTo}>
      <div className="card" style={{ marginBottom: '.75rem' }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <span className="badge badge-muted" style={{ fontSize: '.7rem' }}>{match.format}</span>
            <span className="badge badge-muted" style={{ fontSize: '.7rem' }}>{match.maxOvers} ov</span>
          </div>
          {statusBadge}
        </div>

        {/* Teams row */}
        <div className="flex items-center justify-between mt-1">
          <div>
            <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{home?.name || 'Team A'}</div>
            {inn1 && (
              <div style={{ fontSize: '.85rem', color: 'var(--clr-accent)', fontWeight: 600 }}>
                {inn1.totalRuns}/{inn1.totalWickets}
                <span className="text-muted" style={{ marginLeft: '.3rem', fontWeight: 400 }}>
                  ({inn1.totalOvers} ov)
                </span>
              </div>
            )}
          </div>
          <div style={{ color: 'var(--clr-muted)', fontWeight: 700, fontSize: '.9rem' }}>vs</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{away?.name || 'Team B'}</div>
            {inn2 && (
              <div style={{ fontSize: '.85rem', color: 'var(--clr-accent)', fontWeight: 600 }}>
                {inn2.totalRuns}/{inn2.totalWickets}
                <span className="text-muted" style={{ marginLeft: '.3rem', fontWeight: 400 }}>
                  ({inn2.totalOvers} ov)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Result */}
        {match.result?.description && (
          <div className="mt-1" style={{ fontSize: '.8rem', color: 'var(--clr-yellow)', fontWeight: 600 }}>
            <Trophy size={12} style={{ marginRight: '.3rem' }} />
            {match.result.description}
          </div>
        )}

        <div className="flex items-center gap-1 mt-1">
          <Clock size={12} style={{ color: 'var(--clr-muted)' }} />
          <span className="text-muted">{new Date(match.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </Link>
  );
}
