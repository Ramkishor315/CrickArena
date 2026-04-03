import { Router } from 'express';
import Match from '../models/Match.js';

const router = Router();

/**
 * POST /api/sync/offline-batch
 * Accepts an array of match objects created offline and upserts them.
 * Uses clientId for deduplication.
 */
router.post('/offline-batch', async (req, res, next) => {
  try {
    const { matches } = req.body;
    if (!Array.isArray(matches) || matches.length === 0) {
      return res.status(400).json({ success: false, message: 'No matches provided' });
    }

    const results = [];
    for (const m of matches) {
      try {
        // Upsert by clientId — if already exists, skip
        const saved = await Match.findOneAndUpdate(
          { clientId: m.clientId },
          { ...m, syncedAt: new Date() },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        results.push({ clientId: m.clientId, status: 'synced', id: saved._id });
      } catch (e) {
        results.push({ clientId: m.clientId, status: 'error', error: e.message });
      }
    }

    res.json({ success: true, results });
  } catch (err) {
    next(err);
  }
});

export default router;
