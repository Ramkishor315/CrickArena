import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMatchStore } from '../store';
import OverHistory from '../components/OverHistory';
import { crr, rrr, short } from '../utils/cricket';
import { CheckCircle, RotateCcw, User, ArrowLeftRight, LogOut, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const BALLS = [
  { label: '0', runs: 0, cls: 'run-0' },
  { label: '1', runs: 1, cls: 'run-1' },
  { label: '2', runs: 2, cls: 'run-2' },
  { label: '3', runs: 3, cls: 'run-3' },
  { label: '4', runs: 4, cls: 'run-4' },
  { label: '6', runs: 6, cls: 'run-6' },
  { label: 'W',  runs: 0, cls: 'wicket',  wicket: true },
  { label: 'Wd', runs: 0, cls: 'wide',    extra: 'wide' },
  { label: 'Nb', runs: 0, cls: 'noball',  extra: 'noBall' },
];

export default function Scoring() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { activeMatch, fetchMatch, addBall, undoBall, switchInnings, completeMatch, loading, listenToMatch, unlistenFromMatch } = useMatchStore();
  
  // Scorer authentication
  const isOwner = useMemo(() => {
    if (!activeMatch) return true; // optimistic during load
    const deviceId = localStorage.getItem('crickarena_device_id');
    return activeMatch.clientId === deviceId;
  }, [activeMatch]);

  useEffect(() => {
    if (!loading && activeMatch && !isOwner) {
      toast.error('Only the Scorer can modify this match');
      navigate(`/match/${id}`);
    }
  }, [activeMatch, isOwner, loading, navigate, id]);
  
  const [activeStriker, setActiveStriker] = useState(null);
  const [activeNonStriker, setActiveNonStriker] = useState(null);
  const [activeBowler, setActiveBowler] = useState(null);

  const [lastBall, setLastBall] = useState(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  
  // Wicket Details State
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketDetails, setWicketDetails] = useState({ 
    kind: 'bowled', 
    fielder: null, 
    outBatterId: null,
    pendingEvent: null 
  });

  // 1. ALL HOOKS MUST CALL UNCONDITIONALLY AT THE TOP
  useEffect(() => { 
    fetchMatch(id);
    listenToMatch(id);
    return () => unlistenFromMatch();
  }, [id]);

  useEffect(() => {
    if (!activeMatch) return;
    const inn = activeMatch.innings?.[activeMatch.currentInnings || 0];
    if (inn) {
      setActiveStriker(inn.currentStriker ? (typeof inn.currentStriker === 'object' ? inn.currentStriker._id : inn.currentStriker) : null);
      setActiveNonStriker(inn.currentNonStriker ? (typeof inn.currentNonStriker === 'object' ? inn.currentNonStriker._id : inn.currentNonStriker) : null);
      setActiveBowler(inn.currentBowler ? (typeof inn.currentBowler === 'object' ? inn.currentBowler._id : inn.currentBowler) : null);
    }
  }, [activeMatch]);

  const outPlayerIds = useMemo(() => {
    const ids = new Set();
    const inn = activeMatch?.innings?.[activeMatch?.currentInnings || 0];
    if (inn && inn.balls) {
      inn.balls.forEach(b => {
        if (b.wicket?.isWicket && b.wicket.batter) {
          ids.add(typeof b.wicket.batter === 'object' ? b.wicket.batter._id : b.wicket.batter);
        }
      });
    }
    return ids;
  }, [activeMatch]);

  // 2. NOW IT IS SAFE TO RETURN EARLY
  if (loading || !activeMatch) return <div className="page"><div className="spinner" /></div>;

  const match = activeMatch;
  if (match.status === 'completed') {
    return (
      <div className="page fade-up text-center" style={{ paddingTop: '4rem' }}>
        <div style={{ fontSize: '4rem' }}>🏆</div>
        <h2 className="mt-2">Match Completed!</h2>
        <p className="text-muted mt-1">{match.result?.description}</p>
        <button className="btn btn-primary mt-3" onClick={() => navigate(`/match/${id}`)}>
          View Scorecard
        </button>
      </div>
    );
  }

  const inningIdx = match.currentInnings || 0;
  const innings   = match.innings?.[inningIdx];
  if (!innings) return <div className="page"><p className="text-muted">No active innings</p></div>;

  const runs      = innings.totalRuns || 0;
  const wickets   = innings.totalWickets || 0;
  const balls     = innings.balls || [];
  const maxOvers  = match.maxOvers || 6;
  
  const getPlayerName = (id, list) => {
    if (!id) return 'Unknown';
    const compareId = id?.toString();
    const p = list?.find(x => (x?._id?.toString() || x?.toString()) === compareId);
    return p ? p.name : 'Unknown';
  };

  // Wait for teams to be populated properly (if populated, it will be an object, not string ID)
  if (!match.teams.home?.name || (match.players.home?.length > 0 && typeof match.players.home[0] !== 'object')) {
     // Still fetching the fully populated version from the API
     return <div className="page"><div className="spinner" /></div>;
  }

  // Determine Squad & max wickets safely using populated data
  const isHomeBatting = (innings.battingTeam?._id?.toString() || innings.battingTeam?.toString()) === match.teams.home._id?.toString();
  const battingPlayers = isHomeBatting ? (match.players?.home || []) : (match.players?.away || []);
  const bowlingPlayers = isHomeBatting ? (match.players?.away || []) : (match.players?.home || []);
  
  const squadSize = battingPlayers.length || 11;
  const maxWickets = squadSize > 1 ? squadSize - 1 : 10;

  const legalBalls = balls.filter(
    (b) => !b.extras?.type || b.extras.type === 'none' || b.extras.type === 'bye' || b.extras.type === 'legBye'
  ).length;
  const currentOver = Math.floor(legalBalls / 6);
  const ballInOver  = legalBalls % 6;

  const target = inningIdx === 1 ? (match.innings[0]?.totalRuns || 0) + 1 : null;
  const isInningsOver = wickets >= maxWickets || legalBalls >= maxOvers * 6 || (target !== null && runs >= target);

  // Determine missing role for modal
  let missingRole = null;
  if (!isInningsOver && !confirmEnd) {
    if (!activeStriker) missingRole = 'striker';
    else if (!activeNonStriker) missingRole = 'nonStriker';
    else if (!activeBowler) missingRole = 'bowler';
  }

  const handleManualSwap = () => {
    setActiveStriker(activeNonStriker);
    setActiveNonStriker(activeStriker);
  };

  const handleBall = async (btn) => {
    const isLegal = !btn.extra || btn.extra === 'bye' || btn.extra === 'legBye';
    const willBeEndOfOver = isLegal && (ballInOver + 1 === 6);

    let nextStriker = activeStriker;
    let nextNonStriker = activeNonStriker;
    let nextBowler = activeBowler;

    if (btn.runs === 1 || btn.runs === 3 || btn.runs === 5) {
      nextStriker = activeNonStriker;
      nextNonStriker = activeStriker;
    }

    if (willBeEndOfOver) {
      const temp = nextStriker;
      nextStriker = nextNonStriker;
      nextNonStriker = temp;
      nextBowler = null;
    }

    const event = {
      over: currentOver,
      ball: ballInOver + 1,
      runs: btn.runs,
      extras: btn.extra ? { type: btn.extra, runs: btn.extra === 'wide' || btn.extra === 'noBall' ? 1 : 0 } : { type: 'none', runs: 0 },
      batterId: activeStriker,
      bowlerId: activeBowler,
      nonStrikerId: activeNonStriker,
      nextStriker,
      nextNonStriker,
      nextBowler
    };

    if (btn.wicket) {
      setWicketDetails({
        kind: 'bowled',
        fielder: null,
        outBatterId: activeStriker,
        pendingEvent: event
      });
      setShowWicketModal(true);
      return;
    }

    setLastBall(btn.label);
    setActiveStriker(nextStriker);
    setActiveNonStriker(nextNonStriker);
    setActiveBowler(nextBowler);

    await addBall(id, event);
    setTimeout(() => setLastBall(null), 800);
  };

  const handleWicketSubmit = async () => {
    const { kind, fielder, outBatterId, pendingEvent } = wicketDetails;
    
    const finalEvent = {
      ...pendingEvent,
      wicket: { isWicket: true, batter: outBatterId, kind, fielder },
      // Use toString() for safe comparison
      nextStriker: outBatterId?.toString() === activeStriker?.toString() ? null : pendingEvent.nextStriker,
      nextNonStriker: outBatterId?.toString() === activeNonStriker?.toString() ? null : pendingEvent.nextNonStriker,
    };

    setLastBall('W');
    setShowWicketModal(false);
    
    // Update local state for next batter prompt
    if (outBatterId?.toString() === activeStriker?.toString()) setActiveStriker(null);
    else if (outBatterId?.toString() === activeNonStriker?.toString()) setActiveNonStriker(null);

    await addBall(id, finalEvent);
    setTimeout(() => setLastBall(null), 800);
  };

  const handleRetire = async (playerId) => {
    if (!playerId) return;
    if (!window.confirm('Mark this player as Retired? (This will NOT count as a wicket)')) return;

    const event = {
      over: currentOver,
      ball: ballInOver, // Does not count as a delivery
      runs: 0,
      extras: { type: 'none', runs: 0 },
      wicket: { isWicket: true, batter: playerId, kind: 'retired' },
      batterId: playerId,
      bowlerId: activeBowler,
      nonStrikerId: playerId === activeStriker ? activeNonStriker : activeStriker,
      // Clear the retired player's position
      nextStriker: playerId === activeStriker ? null : activeStriker,
      nextNonStriker: playerId === activeNonStriker ? null : activeNonStriker,
      nextBowler: activeBowler
    };

    if (playerId === activeStriker) setActiveStriker(null);
    else setActiveNonStriker(null);

    await addBall(id, event);
    toast.success('Player retired');
  };

  const handleInningsEnd = async () => {
    if (inningIdx === 0) {
      setActiveStriker(null);
      setActiveNonStriker(null);
      setActiveBowler(null);
      await switchInnings(id, {
        battingTeamId: match.teams.away._id || match.teams.away,
        bowlingTeamId: match.teams.home._id || match.teams.home,
      });
      toast.success('2nd innings started!');
    } else {
      const inn1Runs = match.innings[0]?.totalRuns || 0;
      const inn2Runs = innings.totalRuns;
      let winnerId, margin, description;
      if (inn2Runs > inn1Runs) {
        winnerId = innings.battingTeam?._id || innings.battingTeam;
        margin = `${maxWickets - wickets} wicket${maxWickets - wickets !== 1 ? 's' : ''}`;
        description = `Batting Team won by ${margin}`;
      } else if (inn1Runs > inn2Runs) {
        winnerId = innings.bowlingTeam?._id || innings.bowlingTeam;
        margin = `${inn1Runs - inn2Runs} runs`;
        description = `Bowling Team won by ${margin}`;
      } else {
        description = 'Match tied!';
      }
      await completeMatch(id, { winnerId, margin, description });
    }
    setConfirmEnd(false);
  };

  if (showWicketModal) {
    const WTYPES = [
      { id: 'bowled', label: 'Bowled', needsFielder: false },
      { id: 'caught', label: 'Caught', needsFielder: true },
      { id: 'lbw', label: 'LBW', needsFielder: false },
      { id: 'runOut', label: 'Run Out', needsFielder: true, canSelectBatter: true },
      { id: 'stumped', label: 'Stumped', needsFielder: true },
      { id: 'hitWicket', label: 'Hit Wicket', needsFielder: false },
    ];

    const currentType = WTYPES.find(t => t.id === wicketDetails.kind);

    return (
      <div className="page fade-up" style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center' }}>
        <div className="card" style={{ borderColor: 'var(--clr-red)' }}>
          <div className="flex items-center gap-1 mb-2">
            <XCircle color="var(--clr-red)" size={24} />
            <h2 style={{ margin: 0 }}>Wicket Details</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem', marginBottom: '1.5rem' }}>
            {WTYPES.map(t => (
              <button 
                key={t.id}
                className={`btn ${wicketDetails.kind === t.id ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '.85rem', padding: '.6rem' }}
                onClick={() => setWicketDetails(prev => ({ 
                  ...prev, 
                  kind: t.id, 
                  outBatterId: prev.outBatterId || activeStriker?.toString() 
                }))}
              >
                {t.label}
              </button>
            ))}
          </div>

          {currentType?.canSelectBatter && (
            <div className="mb-2">
              <label className="text-muted" style={{ fontSize: '.75rem', display: 'block', marginBottom: '.3rem' }}>Who is Out?</label>
              <div className="flex gap-1">
                {[activeStriker, activeNonStriker].filter(Boolean).map(bid => (
                  <button 
                    key={bid?.toString()}
                    className={`btn btn-sm ${wicketDetails.outBatterId?.toString() === bid?.toString() ? 'btn-accent' : 'btn-ghost'}`}
                    style={{ flex: 1 }}
                    onClick={() => setWicketDetails(prev => ({ ...prev, outBatterId: bid?.toString() }))}
                  >
                    {getPlayerName(bid, battingPlayers)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentType?.needsFielder && (
            <div className="mb-2">
              <label className="text-muted" style={{ fontSize: '.75rem', display: 'block', marginBottom: '.3rem' }}>
                {wicketDetails.kind === 'stumped' ? 'Wicket Keeper' : 'Fielder'}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.3rem', maxHeight: '150px', overflowY: 'auto', padding: '.2rem' }}>
                {bowlingPlayers.map(p => (
                  <button 
                    key={p._id}
                    className={`btn btn-xs ${wicketDetails.fielder === p._id ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    onClick={() => setWicketDetails(prev => ({ ...prev, fielder: p._id }))}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-1 mt-2">
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowWicketModal(false)}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleWicketSubmit}>Confirm Wicket</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render Modals ──
  if (missingRole) {
    let options = [];
    let title = '';
    
    if (missingRole === 'striker' || missingRole === 'nonStriker') {
      title = `Select ${missingRole === 'striker' ? 'Striker' : 'Non-Striker'}`;
      options = battingPlayers.filter(p => !outPlayerIds.has(p._id) && p._id !== activeStriker && p._id !== activeNonStriker);
    } else if (missingRole === 'bowler') {
      title = 'Select Bowler';
      const lastOverBalls = balls.filter(b => b.over === currentOver - 1);
      const lastBowlerId = lastOverBalls.length > 0 ? (typeof lastOverBalls[0].bowler === 'object' ? lastOverBalls[0].bowler?._id : lastOverBalls[0].bowler) : null;
      options = bowlingPlayers.filter(p => p._id !== lastBowlerId);
      if (options.length === 0) options = bowlingPlayers; // Fallback
    }

    return (
      <div className="page fade-up" style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center' }}>
        <div className="card text-center" style={{ borderColor: 'var(--clr-primary)' }}>
          <User size={32} style={{ color: 'var(--clr-primary)', marginBottom: '1rem' }} />
          <h2 className="mb-2">{title}</h2>
          {options.length === 0 && <p className="text-muted">No players left to select.</p>}
          <div style={{ display: 'grid', gap: '.5rem', maxHeight: '50vh', overflowY: 'auto' }}>
            {options.map(p => (
              <button key={p._id} className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}
                onClick={() => {
                  if (missingRole === 'striker') setActiveStriker(p._id);
                  if (missingRole === 'nonStriker') setActiveNonStriker(p._id);
                  if (missingRole === 'bowler') setActiveBowler(p._id);
                }}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade-up" style={{ maxWidth: 600, paddingBottom: '7rem' }}>
      <div className="card mb-2" style={{
        background: 'linear-gradient(135deg, #1a0f00, #0b0f1a)',
        borderColor: 'var(--clr-primary)',
      }}>
        <div className="flex items-center justify-between mb-1">
          <span className="badge badge-primary">{inningIdx === 0 ? '1st' : '2nd'} Innings</span>
          <span className="badge badge-red pulse">🔴 LIVE</span>
        </div>
        <div className="score-big">{runs}/{wickets}</div>
        <div className="score-sub">
          {currentOver}.{ballInOver} / {maxOvers} ov
          &nbsp;·&nbsp; CRR: {crr(runs, legalBalls)}
          {target && ` · Need ${target - runs} off ${(maxOvers * 6) - legalBalls}`}
        </div>
      </div>

      {!isInningsOver && !confirmEnd && (
        <div className="card-flat mb-2">
          <div className="flex justify-between items-center mb-1">
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '.9rem', fontWeight: 800, color: 'var(--clr-primary)' }}>
                Batting 🏏
              </div>
              <div style={{ fontSize: '.8rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.3rem' }}>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--clr-text)' }}>👉 {getPlayerName(activeStriker, battingPlayers)}</span>
                  <button className="btn btn-ghost btn-xs" onClick={() => handleRetire(activeStriker)} title="Retired Hurt">
                    <LogOut size={12} style={{ color: 'var(--clr-muted)' }} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                   <span className="text-muted" style={{ paddingLeft: '1.2rem' }}>{getPlayerName(activeNonStriker, battingPlayers)}</span>
                   <button className="btn btn-ghost btn-xs" onClick={() => handleRetire(activeNonStriker)} title="Retired Hurt">
                    <LogOut size={12} style={{ color: 'var(--clr-muted)' }} />
                  </button>
                </div>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={handleManualSwap} title="Swap Strike">
              <ArrowLeftRight size={16} />
            </button>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <div style={{ fontSize: '.9rem', fontWeight: 800, color: 'var(--clr-accent)' }}>
                Bowling 🎾
              </div>
              <div style={{ fontSize: '.8rem', color: 'var(--clr-text)', marginTop: '0.3rem' }}>
                {getPlayerName(activeBowler, bowlingPlayers)}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card-flat mb-2">
        <OverHistory balls={balls} currentOver={currentOver} />
      </div>

      {lastBall && (
        <div style={{
          textAlign: 'center', fontSize: '2.5rem', fontWeight: 900,
          color: lastBall === 'W' ? 'var(--clr-red)' : lastBall === '6' ? 'var(--clr-primary)' : lastBall === '4' ? 'var(--clr-green)' : 'var(--clr-text)',
          animation: 'fadeUp .3s ease',
          marginBottom: '.5rem',
        }}>
          {lastBall === '0' ? '·' : lastBall}
        </div>
      )}

      {!isInningsOver && !confirmEnd && (
        <div className="card mb-2">
          <div className="ball-grid">
            {BALLS.map((btn) => (
              <button key={btn.label} className={`ball-btn ${btn.cls}`}
                onClick={() => handleBall(btn)}>
                {btn.label}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between mt-2">
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--clr-muted)' }}
              onClick={() => {
                if (window.confirm('Undo last ball?')) undoBall(id);
              }}>
              <RotateCcw size={14} style={{ marginRight: '.3rem' }} /> Undo Last
            </button>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--clr-yellow)' }}
              onClick={() => setConfirmEnd(true)}>
              End Innings Early
            </button>
          </div>
        </div>
      )}

      {(isInningsOver || confirmEnd) && (
        <div className="card mb-2" style={{ borderColor: 'var(--clr-yellow)', background: 'rgba(250,204,21,.06)', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>
            {inningIdx === 0 ? '🔄' : '🏆'}
          </div>
          <h3>{inningIdx === 0 ? 'Innings Complete!' : 'Match Over!'}</h3>
          <div className="flex gap-1 mt-2">
            {confirmEnd && !isInningsOver && (
              <button className="btn btn-ghost" onClick={() => setConfirmEnd(false)} style={{ flex: 1 }}>
                Cancel
              </button>
            )}
            <button className="btn btn-primary" onClick={handleInningsEnd} style={{ flex: 2 }}>
              <CheckCircle size={16} />
              {inningIdx === 0 ? 'Start 2nd Innings' : 'Complete Match'}
            </button>
          </div>
        </div>
      )}

      <button className="btn btn-ghost btn-block mt-2" onClick={() => navigate(`/match/${id}`)}>
        View Full Scorecard
      </button>
    </div>
  );
}
