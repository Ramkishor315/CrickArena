import Player from '../models/Player.js';
import { AppError } from '../middleware/errorHandler.js';

/** POST /api/players */
export const createPlayer = async (req, res, next) => {
  try {
    const player = await Player.create(req.body);
    res.status(201).json({ success: true, data: player });
  } catch (err) {
    next(err);
  }
};

/** POST /api/players/batch — create or find multiple players by name */
export const createPlayersBatch = async (req, res, next) => {
  try {
    const { names } = req.body; 
    console.log(`📦 Batch create players: Received ${names?.length || 0} names`);
    if (!Array.isArray(names)) throw new AppError('Names array is required', 400);

    const players = await Promise.all(
      names.map(async (name) => {
        const trimmedName = name.trim();
        if (!trimmedName) return null;
        
        // Use a more robust case-insensitive find
        let player = await Player.findOne({ name: { $regex: new RegExp('^' + trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } });
        if (!player) {
          player = await Player.create({ name: trimmedName });
        }
        return player;
      })
    );

    res.status(200).json({ success: true, data: players.filter(p => p !== null) });
  } catch (err) {
    console.error('❌ Batch create players error:', err.message);
    next(err);
  }
};

/** GET /api/players — leaderboard with sort options */
export const getPlayers = async (req, res, next) => {
  try {
    const { sort = 'runs', order = 'desc', search } = req.query;
    const validSorts = ['runs', 'wickets', 'matches', 'ballsFaced'];
    const sortField = validSorts.includes(sort) ? sort : 'runs';

    const query = search ? { name: { $regex: search, $options: 'i' } } : {};
    const players = await Player.find(query)
      .sort({ [sortField]: order === 'asc' ? 1 : -1 })
      .limit(100);

    res.json({ success: true, data: players });
  } catch (err) {
    next(err);
  }
};

/** GET /api/players/:id */
export const getPlayer = async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) throw new AppError('Player not found', 404);
    res.json({ success: true, data: player });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/players/:id */
export const updatePlayer = async (req, res, next) => {
  try {
    const player = await Player.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!player) throw new AppError('Player not found', 404);
    res.json({ success: true, data: player });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/players/:id */
export const deletePlayer = async (req, res, next) => {
  try {
    await Player.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Player deleted' });
  } catch (err) {
    next(err);
  }
};
