import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { teamApi, playerApi } from '../api';
import { useMatchStore } from '../store';
import toast from 'react-hot-toast';
import { Plus, Trash2, ChevronRight, ChevronLeft, Check } from 'lucide-react';

const FORMATS = [
  { label: 'T20', value: 'T20', overs: 20 },
  { label: '10 Overs', value: '10-overs', overs: 10 },
  { label: '6 Overs', value: '6-overs', overs: 6 },
  { label: '5 Overs', value: '5-overs', overs: 5 },
  { label: 'Custom', value: 'custom', overs: null },
];

const STEP_LABELS = ['Format', 'Team Names', 'Player Names', 'Start'];

export default function NewMatch() {
  const navigate   = useNavigate();
  const { createMatch, startMatch } = useMatchStore();
  const [step, setStep]     = useState(0);
  const [busy, setBusy]     = useState(false);

  // Step 0 — format
  const [format, setFormat]     = useState(FORMATS[2]);
  const [customOvers, setCustomOvers] = useState(6);
  const [venue, setVenue]           = useState('Local Ground');

  // Step 1 — teams
  const [teams, setTeams]       = useState([]);
  const [homeTeam, setHomeTeam] = useState(null);
  const [awayTeam, setAwayTeam] = useState(null);
  const [homeTeamName, setHomeTeamName] = useState('');
  const [awayTeamName, setAwayTeamName] = useState('');

  // Step 2 — players
  const [homeTmpName, setHomeTmpName] = useState('');
  const [awayTmpName, setAwayTmpName] = useState('');
  const [homePlayers, setHomePlayers] = useState([]);
  const [awayPlayers, setAwayPlayers] = useState([]);
  const [bulkMode, setBulkMode]         = useState(false);
  const [bulkText, setBulkText]         = useState({ home: '', away: '' });

  // Step 3 — toss & start
  const [tossWinner, setTossWinner] = useState('home');
  const [elected, setElected]       = useState('bat');
  const [createdMatch, setCreatedMatch] = useState(null);

  useEffect(() => {
    teamApi.list().then(({ data }) => setTeams(data.data)).catch(() => {});
  }, []);

  // ── Team creation ──
  const handleCreateTeam = async (side) => {
    const name = side === 'home' ? homeTeamName : awayTeamName;
    if (!name.trim()) return;
    try {
      const color = side === 'home' ? '#38bdf8' : '#f97316';
      const { data } = await teamApi.create({ name: name.trim(), color });
      setTeams((prev) => [...prev, data.data]);
      
      // Auto-select the newly created team
      if (side === 'home') {
        setHomeTeam(data.data);
      } else {
        setAwayTeam(data.data);
      }
      toast.success(`Team "${data.data.name}" created & selected`);
    } catch { toast.error('Failed to create team'); }
  };

  // ── Next / submit ──
  const handleNext = async () => {
    if (step === 0) {
      if (!format) return toast.error('Choose a format');
      setStep(1);
    } else if (step === 1) {
      if (!homeTeamName.trim() || !awayTeamName.trim()) return toast.error('Enter both team names');
      if (homeTeamName.trim().toLowerCase() === awayTeamName.trim().toLowerCase()) return toast.error('Teams must be different');
      
      setBusy(true);
      try {
        // Find or create teams
        const getTeam = async (name, side) => {
          const existing = teams.find(t => t.name.toLowerCase() === name.trim().toLowerCase());
          if (existing) return existing;
          const { data } = await teamApi.create({ name: name.trim(), color: side === 'home' ? '#38bdf8' : '#f97316' });
          return data.data;
        };
        const [t1, t2] = await Promise.all([getTeam(homeTeamName, 'home'), getTeam(awayTeamName, 'away')]);
        setHomeTeam(t1);
        setAwayTeam(t2);
        
        // Pre-fill existing players if team was found
        if (t1.players?.length > 0 && homePlayers.length === 0) {
           const names = t1.players.map(p => typeof p === 'object' ? p.name : p);
           setHomePlayers(names);
        }
        if (t2.players?.length > 0 && awayPlayers.length === 0) {
           const names = t2.players.map(p => typeof p === 'object' ? p.name : p);
           setAwayPlayers(names);
        }

        setStep(2);
      } catch (e) {
        toast.error('Failed to setup teams');
      } finally {
        setBusy(false);
      }
    } else if (step === 2) {
      if (homePlayers.length === 0 || awayPlayers.length === 0) {
        return toast.error('Add at least one player for each team');
      }
      
      setBusy(true);
      try {
        const [p1, p2] = await Promise.all([
          playerApi.createBatch(homePlayers),
          playerApi.createBatch(awayPlayers)
        ]);

        setHomePlayers(p1.data.data);
        setAwayPlayers(p2.data.data);
        setStep(3);
      } catch (e) {
        console.error('❌ Player creation error:', e.response?.data || e.message);
        toast.error('Failed to create players');
      } finally {
        setBusy(false);
      }
    } else if (step === 3) {
      setBusy(true);
      const overs = format.value === 'custom' ? Number(customOvers) : format.overs;
      const match = await createMatch({
        format: format.value,
        maxOvers: overs,
        venue,
        homeTeamId: homeTeam._id,
        awayTeamId: awayTeam._id,
        homePlayers: homePlayers.map((p) => p._id),
        awayPlayers: awayPlayers.map((p) => p._id),
      });
      if (!match || match.offline) {
        setBusy(false);
        navigate('/');
        return;
      }
      setCreatedMatch(match);
      // Determine batting / bowling team for first innings
      const battingTeamId  = tossWinner === 'home' ? (elected === 'bat' ? homeTeam._id : awayTeam._id) : (elected === 'bat' ? awayTeam._id : homeTeam._id);
      const bowlingTeamId  = battingTeamId === homeTeam._id ? awayTeam._id : homeTeam._id;
      await startMatch(match._id, { battingTeamId, bowlingTeamId });
      setBusy(false);
      navigate(`/match/${match._id}/score`);
    }
  };

  const maxOvers = format.value === 'custom' ? Number(customOvers) : format.overs;

  return (
    <div className="page fade-up">
      <h1 className="mb-1">New Match</h1>
      <p className="text-muted mb-3">Set up a match in under 30 seconds</p>

      {/* Step indicator */}
      <div className="step-indicator">
        {STEP_LABELS.map((label, i) => (
          <div key={i} className={`step-dot ${i === step ? 'active' : i < step ? 'done' : ''}`} title={label} />
        ))}
        <span className="text-muted" style={{ fontSize: '.8rem', marginLeft: '.5rem' }}>
          {STEP_LABELS[step]}
        </span>
      </div>

      {/* ── Step 0: Format ── */}
      {step === 0 && (
        <div>
          <div className="grid-2 mb-2">
            {FORMATS.map((f) => (
              <button key={f.value} onClick={() => setFormat(f)}
                className="card" style={{
                  border: `2px solid ${format.value === f.value ? 'var(--clr-primary)' : 'var(--clr-border)'}`,
                  background: format.value === f.value ? 'rgba(249,115,22,.1)' : 'var(--clr-card)',
                  textAlign: 'center', cursor: 'pointer', padding: '1rem',
                }}>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: format.value === f.value ? 'var(--clr-primary)' : 'var(--clr-text)' }}>
                  {f.label}
                </div>
                {f.overs && <div className="text-muted" style={{ fontSize: '.8rem' }}>{f.overs} overs</div>}
              </button>
            ))}
          </div>

          {format.value === 'custom' && (
            <div className="form-group">
              <label className="form-label">Overs per side</label>
              <input type="number" min="1" max="50" value={customOvers}
                onChange={(e) => setCustomOvers(e.target.value)} />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Venue (optional)</label>
            <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Backyard, Street 4..." />
          </div>
        </div>
      )}

      {/* ── Step 1: Teams ── */}
      {step === 1 && (
        <div className="grid-1 gap-2">
          <div className="form-group mb-2">
            <h3 className="mb-1" style={{ color: 'var(--clr-primary)' }}>🏠 First Team Name</h3>
            <input 
              placeholder="Enter the first team name" 
              value={homeTeamName}
              onChange={(e) => setHomeTeamName(e.target.value)}
              style={{ fontSize: '1.1rem', padding: '.8rem' }}
            />
            {homeTeamName.length > 0 && teams.find(t => t.name.toLowerCase().includes(homeTeamName.toLowerCase())) && (
              <div style={{ fontSize: '.8rem', color: 'var(--clr-green)', marginTop: '.3rem' }}>
                💡 Matches existing team
              </div>
            )}
          </div>
          
          <div className="form-group">
            <h3 className="mb-1" style={{ color: 'var(--clr-accent)' }}>✈️ Second Team Name</h3>
            <input 
              placeholder="Enter the second team name" 
              value={awayTeamName}
              onChange={(e) => setAwayTeamName(e.target.value)}
              style={{ fontSize: '1.1rem', padding: '.8rem' }}
            />
             {awayTeamName.length > 0 && teams.find(t => t.name.toLowerCase().includes(awayTeamName.toLowerCase())) && (
              <div style={{ fontSize: '.8rem', color: 'var(--clr-green)', marginTop: '.3rem' }}>
                💡 Matches existing team
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Step 2: Players ── */}
      {step === 2 && (
        <div>
          <div className="flex justify-between items-center mb-1">
            <p className="text-muted" style={{ fontSize: '.8rem' }}>Add up to 11 players per team</p>
            <span className="bulk-toggle" onClick={() => setBulkMode(!bulkMode)}>
              {bulkMode ? '✨ Back to Modern' : '📝 Use Bulk Mode'}
            </span>
          </div>

          {bulkMode ? (
            <div className="grid-1 gap-2">
              <div className="form-group">
                <h3 className="mb-1" style={{ color: 'var(--clr-primary)' }}>🏏 {homeTeam?.name}</h3>
                <textarea 
                  placeholder="Enter names separated by commas..." 
                  value={bulkText.home}
                  onChange={(e) => setBulkText({ ...bulkText, home: e.target.value })}
                  rows={4}
                  onBlur={() => {
                    const names = bulkText.home.split(/[,|\n]/).map(n => n.trim()).filter(n => n.length > 0);
                    if (names.length) setHomePlayers(names);
                  }}
                />
              </div>
              <div className="form-group">
                <h3 className="mb-1" style={{ color: 'var(--clr-accent)' }}>🏏 {awayTeam?.name}</h3>
                <textarea 
                  placeholder="Enter names separated by commas..." 
                  value={bulkText.away}
                  onChange={(e) => setBulkText({ ...bulkText, away: e.target.value })}
                  rows={4}
                  onBlur={() => {
                    const names = bulkText.away.split(/[,|\n]/).map(n => n.trim()).filter(n => n.length > 0);
                    if (names.length) setAwayPlayers(names);
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="player-entry-grid">
              {/* Home Team */}
              <div className="player-entry-column">
                <div className="team-header">
                  <div className="team-dot" style={{ background: 'var(--clr-primary)' }} />
                  <h3 style={{ color: 'var(--clr-primary)' }}>{homeTeam?.name}</h3>
                </div>
                
                <div className="player-input-wrap">
                  <input 
                    placeholder="Player name..." 
                    value={homeTmpName}
                    onChange={(e) => setHomeTmpName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && homeTmpName.trim()) {
                        setHomePlayers([...homePlayers, homeTmpName.trim()]);
                        setHomeTmpName('');
                      }
                    }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={() => {
                    if (homeTmpName.trim()) {
                      setHomePlayers([...homePlayers, homeTmpName.trim()]);
                      setHomeTmpName('');
                    }
                  }}>Add</button>
                </div>

                <div className="player-list">
                  {homePlayers.map((p, i) => (
                    <div key={i} className="player-pill">
                      <span>{p}</span>
                      <div className="remove-btn" onClick={() => setHomePlayers(homePlayers.filter((_, idx) => idx !== i))}>
                        <Trash2 size={14} />
                      </div>
                    </div>
                  ))}
                  {homePlayers.length === 0 && <div className="text-muted text-center" style={{ padding: '2rem 0' }}>No players added</div>}
                </div>
              </div>

              {/* Away Team */}
              <div className="player-entry-column">
                <div className="team-header">
                  <div className="team-dot" style={{ background: 'var(--clr-accent)' }} />
                  <h3 style={{ color: 'var(--clr-accent)' }}>{awayTeam?.name}</h3>
                </div>

                <div className="player-input-wrap">
                  <input 
                    placeholder="Player name..." 
                    value={awayTmpName}
                    onChange={(e) => setAwayTmpName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && awayTmpName.trim()) {
                        setAwayPlayers([...awayPlayers, awayTmpName.trim()]);
                        setAwayTmpName('');
                      }
                    }}
                  />
                  <button className="btn btn-primary btn-sm" style={{ background: 'var(--clr-accent)' }} onClick={() => {
                    if (awayTmpName.trim()) {
                      setAwayPlayers([...awayPlayers, awayTmpName.trim()]);
                      setAwayTmpName('');
                    }
                  }}>Add</button>
                </div>

                <div className="player-list">
                  {awayPlayers.map((p, i) => (
                    <div key={i} className="player-pill">
                      <span>{p}</span>
                      <div className="remove-btn" onClick={() => setAwayPlayers(awayPlayers.filter((_, idx) => idx !== i))}>
                        <Trash2 size={14} />
                      </div>
                    </div>
                  ))}
                  {awayPlayers.length === 0 && <div className="text-muted text-center" style={{ padding: '2rem 0' }}>No players added</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Toss & Start ── */}
      {step === 3 && (
        <div>
          <div className="card mb-3" style={{ background: 'rgba(249,115,22,.05)', borderColor: 'var(--clr-primary)' }}>
            <h3 className="mb-2">🪙 Toss</h3>
            <div className="form-group">
              <label className="form-label">Toss won by</label>
              <div className="flex gap-1">
                {[{ v: 'home', label: homeTeam?.name }, { v: 'away', label: awayTeam?.name }].map(({ v, label }) => (
                  <button key={v} onClick={() => setTossWinner(v)}
                    className={`btn btn-sm ${tossWinner === v ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }}>
                    {tossWinner === v && <Check size={12} />} {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Elected to</label>
              <div className="flex gap-1">
                {[{ v: 'bat', label: '🏏 Bat' }, { v: 'bowl', label: '🎾 Bowl' }].map(({ v, label }) => (
                  <button key={v} onClick={() => setElected(v)}
                    className={`btn btn-sm ${elected === v ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }}>
                    {elected === v && <Check size={12} />} {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="card-flat" style={{ fontSize: '.88rem', color: 'var(--clr-muted)' }}>
            <div>📋 Format: <strong style={{ color: 'var(--clr-text)' }}>{format.label} ({maxOvers} overs)</strong></div>
            <div className="mt-1">🏟️ Venue: <strong style={{ color: 'var(--clr-text)' }}>{venue}</strong></div>
            <div className="mt-1">🏠 First: <strong style={{ color: 'var(--clr-text)' }}>{homeTeam?.name}</strong></div>
            <div className="mt-1">✈️ Second: <strong style={{ color: 'var(--clr-text)' }}>{awayTeam?.name}</strong></div>
          </div>
        </div>
      )}

      {/* Nav buttons */}
      <div className="flex gap-1 mt-3">
        {step > 0 && (
          <button className="btn btn-ghost" onClick={() => setStep((s) => s - 1)} style={{ flex: 1 }}>
            <ChevronLeft size={18} /> Back
          </button>
        )}
        <button className="btn btn-primary" onClick={handleNext} disabled={busy}
          style={{ flex: 2 }}>
          {busy ? 'Starting...' : step === 3 ? '🏏 Start Match' : (<>Next <ChevronRight size={18} /></>)}
        </button>
      </div>
    </div>
  );
}
