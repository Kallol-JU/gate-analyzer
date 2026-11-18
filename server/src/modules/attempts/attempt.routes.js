import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { idParams } from '../../validators/common.js';
import * as c from './attempt.controller.js';
import { analytics } from './dashboard.controller.js';
import { historyQuery, practiceBody, saveBody, startBody } from './attempt.schema.js';

// Mounted (behind authenticate) at /api/v1/attempts. Every handler scopes queries to req.user.
const router = Router();

router.post('/', validate({ body: startBody }), c.start);
router.post('/practice', validate({ body: practiceBody }), c.startPractice);
router.get('/active', c.active);
router.get('/analytics', analytics);
router.get('/', validate({ query: historyQuery }), c.history);

router.get('/:id', validate({ params: idParams }), c.getAttempt);
router.get('/:id/status', validate({ params: idParams }), c.getStatus);
router.put('/:id/responses', validate({ params: idParams, body: saveBody }), c.save);
router.post('/:id/submit', validate({ params: idParams }), c.submit);
router.get('/:id/result', validate({ params: idParams }), c.result);

export default router;
