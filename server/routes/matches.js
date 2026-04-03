import { Router } from 'express';
import {
  createMatch, getMatches, getMatch,
  startMatch, addBall, undoBall, switchInnings,
  completeMatch, deleteMatch,
} from '../controllers/matchController.js';

const router = Router();

router.route('/').get(getMatches).post(createMatch);
router.route('/:id').get(getMatch).delete(deleteMatch);
router.patch('/:id/start', startMatch);
router.patch('/:id/ball', addBall);
router.post('/:id/undo', undoBall);
router.patch('/:id/innings-break', switchInnings);
router.patch('/:id/complete', completeMatch);

export default router;
