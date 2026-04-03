import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { playerApi } from '../api';
import PlayerAvatar from '../components/PlayerAvatar';
import { ArrowLeft, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

function StatBox({ label, value, sub, color }) {
  return (
    <div className="card-flat" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '1.6rem', fontWeight: 900, fontFamily: 'Outfit, sans-serif', color: color || 'var(--clr-text)' }}>
        {value ?? '-'}
      </div>
      <div style={{ fontSize: '.72rem', color: 'var(--clr-muted)', fontWeight: 600, marginTop: '.1rem' }}>{label}</div>
      {sub && <div style={{ fontSize: '.68rem', color: 'var(--clr-muted)' }}>{sub}</div>}
    </div>
  );
}

export default function PlayerProfile() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [editing, setEditing] = useState(false);
  const [name, setName]       = useState('');

  useEffect(() => {
    playerApi.get(id).then(({ data }) => {
      setPlayer(data.data);
      setName(data.data.name);
    }).catch(() => toast.error('Player not found'));
  }, [id]);

  const handleSave = async () => {
    try {
      const { data } = await playerApi.update(id, { name });
      setPlayer(data.data);
      setEditing(false);
      toast.success('Name updated');
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this player?')) return;
    await playerApi.delete(id);
    navigate('/players');
  };

  if (!player) return <div className="page"><div className="spinner" /></div>;

  return (
    <div className="page fade-up">
      <button className="btn btn-ghost btn-sm mb-2" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Back
      </button>

      {/* Profile header */}
      <div className="card mb-3" style={{
        background: 'linear-gradient(135deg, #0d1827, #0b0f1a)',
        borderColor: 'var(--clr-accent)',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <PlayerAvatar name={player.name} size={72} />
        </div>
        {editing ? (
          <div className="flex gap-1" style={{ justifyContent: 'center' }}>
            <input value={name} onChange={(e) => setName(e.target.value)}
              style={{ maxWidth: 200, textAlign: 'center', fontWeight: 700, fontSize: '1rem' }} />
            <button className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>✕</button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{player.name}</div>
            <div className="text-muted" style={{ fontSize: '.83rem', marginTop: '.2rem' }}>{player.matches} matches played</div>
            <button className="btn btn-ghost btn-sm mt-1" onClick={() => setEditing(true)} style={{ fontSize: '.78rem' }}>
              ✏️ Edit name
            </button>
          </div>
        )}
      </div>

      {/* Batting */}
      <h3 className="mb-2" style={{ color: 'var(--clr-accent)' }}>🏏 Batting</h3>
      <div className="grid-3 mb-3">
        <StatBox label="Runs"     value={player.runs}           color="var(--clr-accent)" />
        <StatBox label="Avg"      value={player.battingAverage} color="var(--clr-text)" />
        <StatBox label="SR"       value={player.strikeRate}     color="var(--clr-yellow)" />
        <StatBox label="High"     value={player.highScore}      color="var(--clr-primary)" />
        <StatBox label="4s"       value={player.fours}          color="var(--clr-green)" />
        <StatBox label="6s"       value={player.sixes}          color="var(--clr-primary)" />
      </div>

      {/* Bowling */}
      <h3 className="mb-2" style={{ color: 'var(--clr-red)' }}>🎾 Bowling</h3>
      <div className="grid-3 mb-3">
        <StatBox label="Wickets"  value={player.wickets}         color="var(--clr-red)" />
        <StatBox label="Economy"  value={player.economy}         color="var(--clr-text)" />
        <StatBox label="Bowl Avg" value={player.bowlingAverage}  color="var(--clr-muted)" />
        <StatBox label="Overs"    value={`${Math.floor((player.ballsBowled||0)/6)}.${(player.ballsBowled||0)%6}`} />
        <StatBox label="Runs Con" value={player.runsConceded} />
        <StatBox label="Maidens"  value={player.maidens} />
      </div>

      {/* Fielding */}
      <h3 className="mb-2" style={{ color: 'var(--clr-green)' }}>🧤 Fielding</h3>
      <div className="grid-2 mb-3">
        <StatBox label="Catches"  value={player.catches}  color="var(--clr-green)" />
        <StatBox label="Run Outs" value={player.runOuts}  color="var(--clr-yellow)" />
      </div>

      <button className="btn btn-danger btn-block btn-sm" onClick={handleDelete}>
        <Trash2 size={14} /> Delete Player
      </button>
    </div>
  );
}
