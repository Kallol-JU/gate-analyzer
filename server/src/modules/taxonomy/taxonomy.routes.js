import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { idParams } from '../../validators/common.js';
import { listSubjects, listTopicsOfSubject } from './taxonomy.controller.js';

// Public, read-only. Mounted at /api/v1
const router = Router();

router.get('/subjects', listSubjects);
router.get('/subjects/:id/topics', validate({ params: idParams }), listTopicsOfSubject);

export default router;
