/** Format overs: legalBalls -> "3.4" style */
export function formatOvers(balls) {
  const full = Math.floor(balls / 6);
  const rem  = balls % 6;
  return rem === 0 ? `${full}.0` : `${full}.${rem}`;
}

/** Required run rate */
export function rrr(target, runsScored, ballsLeft) {
  const needed = target - runsScored;
  if (ballsLeft <= 0) return 0;
  return ((needed / ballsLeft) * 6).toFixed(2);
}

/** Current run rate */
export function crr(runs, balls) {
  if (!balls) return 0;
  return ((runs / balls) * 6).toFixed(2);
}

/** Get or generate a persistent device-local client ID */
export function getDeviceId() {
  let id = localStorage.getItem('crickarena_device_id');
  if (!id) {
    id = `ck-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('crickarena_device_id', id);
  }
  return id;
}

/** Legacy alias for backward compatibility */
export const generateClientId = getDeviceId;

/** Check if current device is the owner (scorer) of a match */
export function isMatchOwner(match) {
  if (!match || !match.clientId) return false;
  return match.clientId === getDeviceId();
}

/** Summarise balls in current over for dot display */
export function getOverSummary(balls, currentOver) {
  return balls
    .filter((b) => b.over === currentOver)
    .map((b) => {
      if (b.wicket?.isWicket) return { label: 'W', type: 'W' };
      if (b.extras?.type === 'wide')   return { label: 'Wd', type: 'Wd' };
      if (b.extras?.type === 'noBall') return { label: 'Nb', type: 'Nb' };
      const total = (b.runs || 0) + (b.extras?.runs || 0);
      return { label: String(total), type: total === 4 ? '4' : total === 6 ? '6' : 'run' };
    });
}

/** Team short name fallback */
export function short(team) {
  return team?.shortName || team?.name?.slice(0, 3).toUpperCase() || '???';
}

/** Color for avatar based on name */
const COLORS = ['#f97316','#38bdf8','#22c55e','#a855f7','#ec4899','#facc15','#14b8a6'];
export function avatarColor(name = '') {
  const idx = name.charCodeAt(0) % COLORS.length;
  return COLORS[idx];
}

/** Ordinal: 1 -> "1st", etc */
export function ordinal(n) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
