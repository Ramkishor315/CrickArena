import { useEffect, useState } from 'react';
import { useTeamStore } from '../store';
import { teamApi } from '../api';
import PlayerAvatar from '../components/PlayerAvatar';
import { Shield, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Teams() {
  const { teams, fetchTeams, loading } = useTeamStore();
  const [showForm, setShowForm] = useState(false);
  const [name, setName]         = useState('');
  const [color, setColor]       = useState('#f97316');
  const [short, setShort]       = useState('');

  useEffect(() => { fetchTeams(); }, []);

  const handleCreate = async () => {
    if (!name.trim()) return toast.error('Team name required');
    try {
      await teamApi.create({ name: name.trim(), shortName: short.trim().slice(0,4).toUpperCase(), color });
      setName(''); setShort(''); setShowForm(false);
      fetchTeams();
      toast.success('Team created!');
    } catch { toast.error('Failed to create team'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this team?')) return;
    await teamApi.delete(id);
    fetchTeams();
  };

  return (
    <div className="page fade-up">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          <Shield size={22} style={{ color: 'var(--clr-primary)' }} />
          <h1>Teams</h1>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} /> New Team
        </button>
      </div>

      {showForm && (
        <div className="card mb-3" style={{ borderColor: 'var(--clr-primary)' }}>
          <h3 className="mb-2">Create Team</h3>
          <div className="form-group">
            <label className="form-label">Team Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Street Warriors" />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Short (3-4 chars)</label>
              <input value={short} onChange={(e) => setShort(e.target.value)} placeholder="e.g. SW" maxLength={4} />
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                style={{ height: '42px', cursor: 'pointer' }} />
            </div>
          </div>
          <div className="flex gap-1">
            <button className="btn btn-primary" onClick={handleCreate} style={{ flex: 1 }}>Create</button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {loading && <div className="spinner" />}

      {!loading && teams.length === 0 && (
        <div className="card-flat text-center" style={{ padding: '3rem' }}>
          <div style={{ fontSize: '3rem' }}>🛡️</div>
          <p className="text-muted mt-1">No teams yet — create one!</p>
        </div>
      )}

      {teams.map((team) => (
        <div key={team._id} className="card mb-2">
          <div className="flex items-center gap-2">
            <div style={{
              width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
              background: `${team.color}22`, border: `2.5px solid ${team.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: team.color, fontWeight: 900, fontSize: '1rem', fontFamily: 'Outfit, sans-serif',
            }}>
              {team.shortName || team.name?.slice(0,2).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{team.name}</div>
              <div className="text-muted" style={{ fontSize: '.8rem' }}>
                {team.matchesPlayed} played · {team.matchesWon} won
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(team._id)}>
              <Trash2 size={14} />
            </button>
          </div>

          {/* Players list */}
          {team.players?.length > 0 && (
            <div className="flex gap-1 mt-2" style={{ flexWrap: 'wrap', paddingLeft: '3.5rem' }}>
              {team.players.map((p) => (
                <div key={p._id || p} className="flex items-center gap-1" style={{
                  background: 'var(--clr-surface2)', borderRadius: '20px',
                  padding: '.15rem .55rem', fontSize: '.78rem', fontWeight: 500,
                }}>
                  <PlayerAvatar name={p.name || '?'} size={18} />
                  {p.name || 'Player'}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
