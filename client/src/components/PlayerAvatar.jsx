import { avatarColor } from '../utils/cricket';

/** Small circular avatar with player initials */
export default function PlayerAvatar({ name = '', size = 36 }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const color    = avatarColor(name);

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `${color}22`,
      border: `2px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color, fontWeight: 800, fontSize: size * 0.36,
      flexShrink: 0,
    }}>
      {initials || '?'}
    </div>
  );
}
