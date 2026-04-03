import { Router } from 'express';
import { createTeam, getTeams, getTeam, updateTeam, deleteTeam } from '../controllers/teamController.js';

const router = Router();
router.route('/').get(getTeams).post(createTeam);
router.route('/:id').get(getTeam).patch(updateTeam).delete(deleteTeam);

export default router;
