import { useEffect, useState } from 'react';
import { useMatchStore } from '../store';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';

export default function LiveActionOverlay() {
  const { lastAction, clearAction } = useMatchStore();
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [display, setDisplay] = useState(null);

  // Don't show animations on the scorer's page
  const isScorer = location.pathname.includes('/score');

  useEffect(() => {
    if (lastAction) {
      if (isScorer) {
        clearAction(); // Just clear it for the next one
        return;
      }
      
      const { type, value, extras, matchId } = lastAction;
      let title = '';
      let color = 'var(--clr-primary)';

      if (type === 'wicket') {
        title = 'W!';
        color = 'var(--clr-red)';
      } else if (value === 6) {
        title = '6!';
        color = 'var(--clr-primary)';
      } else if (value === 4) {
        title = '4!';
        color = 'var(--clr-green)';
      } else if (extras && extras !== 'none') {
        title = extras.toUpperCase();
        color = 'var(--clr-yellow)';
      } else {
        title = `+${value}`;
        color = 'var(--clr-accent)';
      }

      setDisplay({ title, color });
      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(clearAction, 500); // Clear from store after fade out
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [lastAction, clearAction]);

  if (!visible || !display) return null;

  return createPortal(
    <div className="live-action-portal" key={lastAction.timestamp}>
      <div className="action-content" style={{ '--action-color': display.color }}>
        <h1 className="action-text">{display.title}</h1>
      </div>
    </div>,
    document.body
  );
}
