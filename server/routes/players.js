import { Router } from 'express';
import { createPlayer, createPlayersBatch, getPlayers, getPlayer, updatePlayer, deletePlayer } from '../controllers/playerController.js';

const router = Router();
router.route('/').get(getPlayers).post(createPlayer);
router.post('/batch', createPlayersBatch);
router.route('/:id').get(getPlayer).patch(updatePlayer).delete(deletePlayer);

export default router;
