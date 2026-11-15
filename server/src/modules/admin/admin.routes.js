import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { idParams } from '../../validators/common.js';
import * as q from '../questions/question.controller.js';
import { adminQuestionQuery, questionCreate, questionUpdate } from '../questions/question.schema.js';
import * as tax from '../taxonomy/taxonomy.controller.js';
import { subjectCreate, subjectUpdate, topicCreate, topicListQuery, topicUpdate } from '../taxonomy/taxonomy.schema.js';
import * as t from '../tests/test.controller.js';
import { adminTestQuery, testCreate, testUpdate } from '../tests/test.schema.js';

// Everything under /api/v1/admin requires a logged-in admin.
const router = Router();
router.use(authenticate, requireRole('admin'));

// Subjects
router.get('/subjects', tax.listSubjects);
router.post('/subjects', validate({ body: subjectCreate }), tax.createSubject);
router.patch('/subjects/:id', validate({ params: idParams, body: subjectUpdate }), tax.updateSubject);
router.delete('/subjects/:id', validate({ params: idParams }), tax.deleteSubject);

// Topics
router.get('/topics', validate({ query: topicListQuery }), tax.listTopics);
router.post('/topics', validate({ body: topicCreate }), tax.createTopic);
router.patch('/topics/:id', validate({ params: idParams, body: topicUpdate }), tax.updateTopic);
router.delete('/topics/:id', validate({ params: idParams }), tax.deleteTopic);

// Questions (full view, including the answer key)
router.get('/questions', validate({ query: adminQuestionQuery }), q.listForAdmin);
router.post('/questions', validate({ body: questionCreate }), q.createQuestion);
router.get('/questions/:id', validate({ params: idParams }), q.getForAdmin);
router.patch('/questions/:id', validate({ params: idParams, body: questionUpdate }), q.updateQuestion);
router.delete('/questions/:id', validate({ params: idParams }), q.deleteQuestion);

// Tests
router.get('/tests', validate({ query: adminTestQuery }), t.listForAdmin);
router.post('/tests', validate({ body: testCreate }), t.createTest);
router.get('/tests/:id', validate({ params: idParams }), t.getForAdmin);
router.patch('/tests/:id', validate({ params: idParams, body: testUpdate }), t.updateTest);
router.delete('/tests/:id', validate({ params: idParams }), t.deleteTest);
router.post('/tests/:id/publish', validate({ params: idParams }), t.publishTest);
router.post('/tests/:id/unpublish', validate({ params: idParams }), t.unpublishTest);
router.post('/tests/:id/clone', validate({ params: idParams }), t.cloneTest);

export default router;
