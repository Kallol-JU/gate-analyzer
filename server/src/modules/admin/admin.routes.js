import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { idParams } from '../../validators/common.js';
import * as q from '../questions/question.controller.js';
import { adminQuestionQuery, questionCreate, questionUpdate } from '../questions/question.schema.js';
import * as tax from '../taxonomy/taxonomy.controller.js';
import { subjectCreate, subjectUpdate, topicCreate, topicListQuery, topicUpdate } from '../taxonomy/taxonomy.schema.js';
import * as c from '../content/content.controller.js';
import { batchListQuery, bulkBody, generateBody, importBody, rejectBody, verifyBody } from '../content/content.schema.js';
import * as t from '../tests/test.controller.js';
import { adminTestQuery, testBuildBody, testCreate, testUpdate } from '../tests/test.schema.js';

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

// Question review workflow, bulk actions and JSON import
router.post('/questions/import', validate({ body: importBody }), c.importJson);
router.post('/questions/bulk', validate({ body: bulkBody }), c.bulk);
router.post('/questions/:id/verify', validate({ params: idParams, body: verifyBody }), c.verify);
router.post('/questions/:id/reject', validate({ params: idParams, body: rejectBody }), c.reject);
router.post('/questions/:id/publish', validate({ params: idParams }), c.publish);
router.post('/questions/:id/unpublish', validate({ params: idParams }), c.unpublish);
router.post('/questions/:id/revalidate', validate({ params: idParams }), c.revalidate);

// AI question generation (drafts only)
router.get('/ai/status', c.status);
router.post('/ai/generate', validate({ body: generateBody }), c.generate);
router.get('/ai/batches', validate({ query: batchListQuery }), c.listBatches);
router.get('/ai/batches/:id', validate({ params: idParams }), c.getBatch);

// Tests
router.post('/tests/build', validate({ body: testBuildBody }), t.buildTest);
router.get('/tests', validate({ query: adminTestQuery }), t.listForAdmin);
router.post('/tests', validate({ body: testCreate }), t.createTest);
router.get('/tests/:id', validate({ params: idParams }), t.getForAdmin);
router.patch('/tests/:id', validate({ params: idParams, body: testUpdate }), t.updateTest);
router.delete('/tests/:id', validate({ params: idParams }), t.deleteTest);
router.post('/tests/:id/publish', validate({ params: idParams }), t.publishTest);
router.post('/tests/:id/unpublish', validate({ params: idParams }), t.unpublishTest);
router.post('/tests/:id/clone', validate({ params: idParams }), t.cloneTest);

export default router;
