import { create } from 'zustand';
import { matchApi } from '../api';
import { saveOfflineMatch, flushOfflineQueue, getPendingCount } from '../utils/offlineQueue';
import { generateClientId } from '../utils/cricket';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

const socket = io('/', { 
  path: '/socket.io',
  transports: ['websocket', 'polling'], // Allow fallback but prioritize websocket
  reconnection: true,
  reconnectionAttempts: 10,
});

socket.on('connect', () => {
  console.log('✅ Socket connected:', socket.id);
  // Re-join the active match if we were listening to one
  const currentMatchId = useMatchStore.getState().activeMatch?._id;
  if (currentMatchId) {
    console.log('🔄 Re-joining match room:', currentMatchId);
    socket.emit('join_match', currentMatchId);
  }
});
socket.on('connect_error', (err) => console.error('❌ Socket connection error:', err.message));
socket.on('disconnect', (reason) => console.log('🔌 Socket disconnected:', reason));

// ── Global Socket Listeners ──────────────────────────
socket.on('match_updated', (updatedMatch) => {
  console.log('📬 Match update received:', updatedMatch._id);
  useMatchStore.setState((state) => {
    // 1. Detect if a new ball was added for ANY match (active or in list)
    let lastAction = state.lastAction;
    
    // Find previous match in state (ensure both sides are strings for robust comparison)
    const oldMatch = (state.activeMatch?._id?.toString() === updatedMatch._id?.toString()) 
      ? state.activeMatch 
      : state.matches.find(m => m._id?.toString() === updatedMatch._id?.toString());

    if (oldMatch) {
      const oldInn = oldMatch.innings[oldMatch.currentInnings];
      const newInn = updatedMatch.innings[updatedMatch.currentInnings];
      
      if (newInn && oldInn && newInn.balls.length > oldInn.balls.length) {
        const lastBall = newInn.balls[newInn.balls.length - 1];
        lastAction = {
          type: lastBall.wicket?.isWicket ? 'wicket' : 'run',
          value: lastBall.runs,
          extras: lastBall.extras?.type,
          matchId: updatedMatch._id?.toString(),
          timestamp: Date.now()
        };
      }
    }

    // 2. Update active match (using toString for reliability)
    let activeMatch = state.activeMatch;
    if (activeMatch && activeMatch._id?.toString() === updatedMatch._id?.toString()) {
      activeMatch = updatedMatch;
    }

    // 3. Update in matches list
    const exists = state.matches.some((m) => m._id?.toString() === updatedMatch._id?.toString());
    const matches = exists 
      ? state.matches.map((m) => m._id?.toString() === updatedMatch._id?.toString() ? updatedMatch : m)
      : [updatedMatch, ...state.matches];

    return { activeMatch, matches, lastAction };
  });
});

// Update the list of live matches globally (for Home page)
socket.on('match_list_updated', (updatedMatch) => {
  useMatchStore.setState((state) => {
    const exists = state.matches.some((m) => m._id === updatedMatch._id);
    const matches = exists 
      ? state.matches.map((m) => m._id === updatedMatch._id ? updatedMatch : m)
      : [updatedMatch, ...state.matches];
    return { matches };
  });
});

export const useMatchStore = create((set, get) => ({
  // ── State ────────────────────────────────────────────
  matches:       [],
  activeMatch:   null,
  lastAction:    null, // { type, value, extras, timestamp }
  loading:       false,
  isOnline:      navigator.onLine,
  pendingSync:   0,

  // ── Actions ──────────────────────────────────────────
  clearAction: () => set({ lastAction: null }),

  // ── Connectivity ─────────────────────────────────────
  setOnline: (val) => {
    set({ isOnline: val });
    if (val) get().syncOffline();
  },

  // ── Socket Sync ─────────────────────────────────────
  listenToMatch: (matchId) => {
    if (!matchId) return;
    console.log(`📡 Client wants updates for match: ${matchId}`);
    // No explicit join needed as we use global emits now, 
    // but we could leave a join here if we wanted to revert to rooms later.
    socket.emit('join_match', matchId); 
  },
  unlistenFromMatch: () => {
    // No-op for global listeners
  },

  // ── Load list ─────────────────────────────────────────
  fetchMatches: async () => {
    set({ loading: true });
    try {
      const { data } = await matchApi.list();
      set({ matches: data.data });
    } catch {
      toast.error('Could not load matches');
    } finally {
      set({ loading: false });
    }
  },

  // ── Load single ──────────────────────────────────────
  fetchMatch: async (id) => {
    set({ loading: true });
    try {
      const { data } = await matchApi.get(id);
      set({ activeMatch: data.data });
      // Ensure we are joined to the match room for real-time updates
      get().listenToMatch(id);
    } catch {
      toast.error('Could not load match');
    } finally {
      set({ loading: false });
    }
  },

  // ── Create ────────────────────────────────────────────
  createMatch: async (matchData) => {
    const clientId = generateClientId();
    if (!get().isOnline) {
      // Save locally for later sync
      await saveOfflineMatch({ ...matchData, clientId, status: 'setup' });
      toast('📴 Saved offline — will sync when connected', { icon: '💾' });
      set((s) => ({ pendingSync: s.pendingSync + 1 }));
      return { clientId, offline: true };
    }
    try {
      const { data } = await matchApi.create({ ...matchData, clientId });
      return data.data;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create match');
      return null;
    }
  },

  // ── Start innings ─────────────────────────────────────
  startMatch: async (id, payload) => {
    try {
      const { data } = await matchApi.start(id, payload);
      set({ activeMatch: data.data });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to start');
    }
  },

  // ── Add a ball ────────────────────────────────────────
  addBall: async (id, ball) => {
    if (!get().isOnline) {
      // Optimistic local update (Simplified for now - real undo offline is complex)
      toast.error('Undo is not available while offline');
      return;
    }
    try {
      const { data } = await matchApi.addBall(id, ball);
      set({ activeMatch: data.data });
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || 'Failed to record ball');
    }
  },
  
  undoBall: async (id) => {
    if (!get().isOnline) {
      toast.error('Undo is not available while offline');
      return;
    }
    try {
      const { data } = await matchApi.undo(id);
      set({ activeMatch: data.data });
      toast.success('Ball undone');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to undo');
    }
  },

  // ── Switch innings ────────────────────────────────────
  switchInnings: async (id, payload) => {
    try {
      const { data } = await matchApi.switchInnings(id, payload);
      set({ activeMatch: data.data });
    } catch (e) {
      toast.error('Failed to switch innings');
    }
  },

  // ── Complete match ────────────────────────────────────
  completeMatch: async (id, payload) => {
    try {
      const { data } = await matchApi.complete(id, payload);
      set({ activeMatch: data.data });
      toast.success('🏏 Match completed!');
      return data.data;
    } catch (e) {
      toast.error('Failed to complete match');
    }
  },

  // ── Delete ────────────────────────────────────────────
  deleteMatch: async (id) => {
    try {
      await matchApi.delete(id);
      set((s) => ({ matches: s.matches.filter((m) => m._id !== id) }));
      toast.success('Match deleted');
    } catch {
      toast.error('Failed to delete match');
    }
  },

  // ── Sync offline queue ────────────────────────────────
  syncOffline: async () => {
    const result = await flushOfflineQueue();
    if (result.synced > 0) toast.success(`✅ Synced ${result.synced} match(es)`);
    const pending = await getPendingCount();
    set({ pendingSync: pending });
  },

  initPendingCount: async () => {
    const c = await getPendingCount();
    set({ pendingSync: c });
  },
}));

export const usePlayerStore = create((set) => ({
  players: [],
  loading: false,
  fetchPlayers: async (sort, search) => {
    set({ loading: true });
    try {
      const { data } = await (await import('../api')).playerApi.list(sort, search);
      set({ players: data.data });
    } catch { /* ignore */ } finally {
      set({ loading: false });
    }
  },
}));

export const useTeamStore = create((set) => ({
  teams: [],
  loading: false,
  fetchTeams: async () => {
    set({ loading: true });
    try {
      const { data } = await (await import('../api')).teamApi.list();
      set({ teams: data.data });
    } catch { /* ignore */ } finally {
      set({ loading: false });
    }
  },
}));
