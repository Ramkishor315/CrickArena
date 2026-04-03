import Team from '../models/Team.js';
import { AppError } from '../middleware/errorHandler.js';

/** POST /api/teams */
export const createTeam = async (req, res, next) => {
  try {
    const team = await Team.create(req.body);
    res.status(201).json({ success: true, data: team });
  } catch (err) {
    next(err);
  }
};

/** GET /api/teams */
export const getTeams = async (req, res, next) => {
  try {
    const teams = await Team.find().populate('players', 'name runs wickets').sort({ matchesWon: -1 });
    res.json({ success: true, data: teams });
  } catch (err) {
    next(err);
  }
};

/** GET /api/teams/:id */
export const getTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id).populate('players');
    if (!team) throw new AppError('Team not found', 404);
    res.json({ success: true, data: team });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/teams/:id */
export const updateTeam = async (req, res, next) => {
  try {
    const team = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!team) throw new AppError('Team not found', 404);
    res.json({ success: true, data: team });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/teams/:id */
export const deleteTeam = async (req, res, next) => {
  try {
    await Team.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Team deleted' });
  } catch (err) {
    next(err);
  }
};
