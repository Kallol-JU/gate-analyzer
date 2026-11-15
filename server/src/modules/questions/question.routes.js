import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { idParams } from '../../validators/common.js';
import { getForStudent, listForStudents } from './question.controller.js';
import { studentQuestionQuery } from './question.schema.js';

// Student-facing, read-only. Mounted (behind authenticate) at /api/v1/questions.
// These handlers only return published, public questions through the answer-free serializer.
const router = Router();

router.get('/', validate({ query: studentQuestionQuery }), listForStudents);
router.get('/:id', validate({ params: idParams }), getForStudent);

export default router;
