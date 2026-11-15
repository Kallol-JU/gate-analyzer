import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { idParams } from '../../validators/common.js';
import { getForStudent, listForStudents } from './test.controller.js';
import { studentTestQuery } from './test.schema.js';

// Student-facing, read-only. Mounted (behind authenticate) at /api/v1/tests.
// Published tests only, metadata only: question ids and answers never leave the server here.
const router = Router();

router.get('/', validate({ query: studentTestQuery }), listForStudents);
router.get('/:id', validate({ params: idParams }), getForStudent);

export default router;
