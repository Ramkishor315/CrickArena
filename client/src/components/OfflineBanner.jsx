import { useMatchStore } from '../store';
import { WifiOff, RefreshCw } from 'lucide-react';

export default function OfflineBanner() {
  const { isOnline, pendingSync, syncOffline } = useMatchStore();

  if (isOnline && pendingSync === 0) return null;

  return (
    <div className="offline-banner">
      <WifiOff size={14} />
      {isOnline
        ? `Back online — ${pendingSync} match(es) pending sync`
        : `You're offline — scoring saved locally`}
      {isOnline && pendingSync > 0 && (
        <button
          onClick={syncOffline}
          style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: '6px',
                   padding: '.2rem .6rem', color: '#fff', cursor: 'pointer',
                   display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.8rem' }}>
          <RefreshCw size={12} /> Sync now
        </button>
      )}
    </div>
  );
}
