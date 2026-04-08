import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: BASE,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Matches ──────────────────────────────────────────────────────────────────
export const matchApi = {
  list:         (page = 1, limit = 20) => api.get(`/matches?page=${page}&limit=${limit}`),
  get:          (id)                   => api.get(`/matches/${id}`),
  create:       (data)                 => api.post('/matches', data),
  start:        (id, data)             => api.patch(`/matches/${id}/start`, data),
  addBall:      (id, ball)             => api.patch(`/matches/${id}/ball`, ball),
  undo:         (id)                   => api.post(`/matches/${id}/undo`),
  switchInnings:(id, data)             => api.patch(`/matches/${id}/innings-break`, data),
  complete:     (id, data)             => api.patch(`/matches/${id}/complete`, data),
  delete:       (id)                   => api.delete(`/matches/${id}`),
};

// ── Players ──────────────────────────────────────────────────────────────────
export const playerApi = {
  list:   (sort = 'runs', search = '') => api.get(`/players?sort=${sort}&search=${search}`),
  get:    (id)                         => api.get(`/players/${id}`),
  create: (data)                       => api.post('/players', data),
  createBatch: (names)                 => api.post('/players/batch', { names }),
  update: (id, data)                   => api.patch(`/players/${id}`, data),
  delete: (id)                         => api.delete(`/players/${id}`),
};

// ── Teams ─────────────────────────────────────────────────────────────────────
export const teamApi = {
  list:   ()       => api.get('/teams'),
  get:    (id)     => api.get(`/teams/${id}`),
  create: (data)   => api.post('/teams', data),
  update: (id, d)  => api.patch(`/teams/${id}`, d),
  delete: (id)     => api.delete(`/teams/${id}`),
};

// ── Sync ──────────────────────────────────────────────────────────────────────
export const syncApi = {
  batchSync: (matches) => api.post('/sync/offline-batch', { matches }),
};

export default api;
