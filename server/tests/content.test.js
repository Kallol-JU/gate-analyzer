// Integration tests for the content workflow (import, review, publish, AI drafts, test builder, leakage, backward
// compatibility). Needs TEST_MONGODB_URI (a throwaway database whose name contains "test"; it is wiped).
// Gemini is replaced by a fake client: no network and no API key are used.
import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';

const URI = process.env.TEST_MONGODB_URI;

if (!URI) {
  test('content workflow integration tests', { skip: 'set TEST_MONGODB_URI to run (see server/README.md)' }, () => {});
} else if (!/test/i.test(new URL(URI.replace('mongodb+srv', 'https').replace('mongodb', 'https')).pathname)) {
  throw new Error('Refusing to run: TEST_MONGODB_URI database name must contain "test" because it is wiped.');
} else {
  const { default: mongoose } = await import('mongoose');
  const { createApp } = await import('../src/app.js');
  const { User } = await import('../src/models/User.js');
  const { Question } = await import('../src/models/Question.js');
  const { setAiClientForTests } = await import('../src/modules/ai/geminiClient.js');

  await mongoose.connect(URI);
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  const server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  test.after(async () => { setAiClientForTests(undefined); server.close(); await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });

  function client() {
    let cookie = '';
    const call = async (method, path, body) => {
      const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'gate-cbt', ...(cookie && { Cookie: cookie }) }, body: body === undefined ? undefined : JSON.stringify(body) });
      for (const c of res.headers.getSetCookie()) cookie = /^gate_token=;/.test(c) ? '' : c.split(';')[0];
      return { status: res.status, body: await res.json().catch(() => null) };
    };
    return { get: (p) => call('GET', p), post: (p, b = {}) => call('POST', p, b), patch: (p, b) => call('PATCH', p, b), put: (p, b) => call('PUT', p, b) };
  }
  const user = async (n) => { const c = client(); await c.post('/auth/register', { name: `U ${n}`, email: `c${n}@example.com`, password: 'Passw0rdOK' }); return c; };

  const admin = await user(0);
  await User.updateOne({ email: 'c0@example.com' }, { role: 'admin' });
  await admin.post('/auth/login', { email: 'c0@example.com', password: 'Passw0rdOK' });
  const student = await user(1);

  const subject = (await admin.post('/admin/subjects', { name: 'Algorithms' })).body.data;
  const topic = (await admin.post('/admin/topics', { subjectId: subject.id, name: 'Sorting' })).body.data;
  const opts = (t) => ['A', 'B', 'C', 'D'].map((key, i) => ({ key, text: `${t} option ${i + 1}` }));
  // Every fixture needs genuinely different wording, otherwise the duplicate detector (correctly) rejects it.
  const STATEMENTS = {
    1: 'A binary search tree is built by inserting the keys 50, 30, 70, 20, 40, 60 and 80 in this order. What is the height of the resulting tree, counting edges?',
    2: 'A hash table with 7 slots uses linear probing and the hash function h(k) = k mod 7. After inserting 15, 22, 29 and 36, in which slot does 36 end up?',
    3: 'Dijkstra shortest path is run on a weighted graph with non-negative edge weights from a single source. Which data structure gives the best overall running time on sparse graphs?',
    11: 'A min-heap stores the integers 4, 9, 6, 12, 11, 8 as an array. What is the array after one delete-min operation is performed?',
    12: 'The recurrence T(n) = 2T(n/2) + n describes merge sort on n elements. What is the value of T(n) for n equal to 8 when T(1) equals 1?',
  };
  const WORDS = { 1: 'tree', 2: 'probe', 3: 'graph', 11: 'heap', 12: 'recur' };
  const adv = (n, extra = {}) => ({
    source: 'ADVANCED', subject: 'Algorithms', topic: 'Sorting', type: 'MCQ', marks: 1, difficulty: 'hard',
    statement: STATEMENTS[n],
    options: opts(WORDS[n]), correctOptions: ['B'], explanation: `Working through the algorithm step by step shows the correct option is B, by counting the operations involved in this case.`,
    solutionSteps: ['Set up the structure.', 'Apply the algorithm.', 'Compare with the options.'], commonMistakes: ['Off by one.'], conceptTags: ['sorting'], ...extra,
  });
  const FORBIDDEN = ['correctOptions', 'natAnswer', 'explanation', 'solutionSteps', 'optionAnalysis', 'commonMistakes', 'validation', 'inspirationNote', 'sourceReference', 'conceptTags', 'aiMeta', 'verificationStatus'];
  const noLeak = (payload, label) => { const j = JSON.stringify(payload); for (const f of FORBIDDEN) assert.ok(!j.includes(`"${f}"`), `${label} leaked ${f}`); };

  test('only admins can use the content and AI endpoints', async () => {
    for (const [m, p] of [['get', '/admin/ai/status'], ['post', '/admin/questions/import'], ['post', '/admin/questions/bulk'], ['post', '/admin/tests/build']]) assert.equal((await student[m](p, {})).status, 403, p);
    assert.equal((await client().get('/admin/ai/status')).status, 401);
  });

  test('import: dry run saves nothing, placeholders and unknown taxonomy are rejected, commit makes drafts, re-import skips duplicates', async () => {
    const items = [adv(1), adv(2, { statement: 'REPLACE WITH THE EXACT TEXT FROM THE OFFICIAL PAPER' }), adv(3, { subject: 'Nope' })];
    const dry = (await admin.post('/admin/questions/import', { items, dryRun: true })).body.data;
    assert.deepEqual([dry.summary.ok, dry.summary.invalid], [1, 2]);
    assert.equal(await Question.countDocuments(), 0);
    const real = (await admin.post('/admin/questions/import', { items, dryRun: false })).body.data;
    assert.equal(real.summary.created, 1);
    const q = await Question.findById(real.results[0].id).select('+validation');
    assert.equal(q.status, 'draft');
    assert.equal(q.verificationStatus, 'pending_review');
    assert.ok(q.validation.checkedAt);
    assert.equal((await admin.post('/admin/questions/import', { items: [adv(1)], dryRun: false })).body.data.summary.duplicate, 1);
    assert.equal(await Question.countDocuments(), 1);
    assert.equal((await student.get('/questions')).body.meta.total, 0); // drafts are invisible
  });

  test('review gates: unverified content cannot be published; PYQs need an official source; verified content reaches students without any solution data', async () => {
    const id = (await admin.get('/admin/questions?source=ADVANCED')).body.data[0].id;
    assert.equal((await admin.post(`/admin/questions/${id}/publish`)).body.error.code, 'NOT_VERIFIED');
    assert.equal((await admin.patch(`/admin/questions/${id}`, { status: 'published' })).status, 400); // the model refuses it too

    // a PYQ without a recorded official source stays a draft
    const pyq = { source: 'PYQ', subject: 'Algorithms', topic: 'Sorting', type: 'MCQ', marks: 1, pyq: { year: 2019, session: 'Set 1' }, statement: 'Which of the following sorting algorithms has the best worst-case time complexity among those listed?', options: ['Bubble sort', 'Merge sort', 'Quick sort', 'Selection sort'].map((text, i) => ({ key: 'ABCD'[i], text })), correctOptions: ['B'], explanation: 'Merge sort is O(n log n) in the worst case, so the correct option is B.' };
    const imp = (await admin.post('/admin/questions/import', { items: [pyq], dryRun: false })).body.data;
    assert.equal(imp.results[0].warnings.some((w) => w.code === 'PYQ_NO_SOURCE'), true);
    const pid = imp.results[0].id;
    assert.equal((await Question.findById(pid)).verificationStatus, 'draft');
    const refused = await admin.post(`/admin/questions/${pid}/verify`, {});
    assert.equal(refused.status, 409);
    assert.ok(refused.body.error.details.some((d) => d.path === 'sourceReference.paperUrl'));
    await admin.patch(`/admin/questions/${pid}`, { sourceReference: { paperName: 'GATE CSE 2019', paperUrl: 'https://example.org/official-paper.pdf', answerKeyRef: 'Official key, Q1' } });
    assert.equal((await admin.post(`/admin/questions/${pid}/verify`, { notes: 'Checked against the paper' })).status, 200);
    assert.equal((await admin.post(`/admin/questions/${pid}/publish`)).status, 200);

    // verified + published: students see it, with PYQ metadata but no key, solution or internal data
    const list = await student.get('/questions');
    assert.equal(list.body.meta.total, 1);
    assert.deepEqual(list.body.data[0].pyq, { year: 2019, session: 'Set 1' });
    noLeak(list.body, 'student list');
    noLeak((await student.get(`/questions/${pid}`)).body, 'student detail');
    assert.equal((await student.get(`/questions/${id}`)).status, 404);

    // editing the substance withdraws verification and unpublishes
    const edited = await admin.patch(`/admin/questions/${pid}`, { statement: 'Which of the following sorting algorithms has the best worst-case running time among those listed below?' });
    assert.equal(edited.body.data.reverificationRequired, true);
    assert.equal(edited.body.data.status, 'draft');
    assert.equal((await student.get('/questions')).body.meta.total, 0);
  });

  test('bulk actions report each question separately and reject needs a reason', async () => {
    const ids = [(await admin.post('/admin/questions/import', { items: [adv(11), adv(12)], dryRun: false })).body.data.results.map((r) => r.id)].flat();
    assert.equal((await admin.post('/admin/questions/bulk', { action: 'reject', ids })).status, 400);
    const res = (await admin.post('/admin/questions/bulk', { action: 'verify', ids: [...ids, '0'.repeat(24)] })).body.data;
    assert.deepEqual([res.succeeded, res.failed], [2, 1]);
    assert.equal((await admin.post('/admin/questions/bulk', { action: 'publish', ids })).body.data.succeeded, 2);
  });

  test('AI generation: needs configuration, saves drafts only, rejects bad and duplicate output, flags solver disagreement, no auto-publish', async () => {
    setAiClientForTests(null);
    assert.equal((await admin.post('/admin/ai/generate', { subjectId: subject.id, topicId: topic.id, counts: { MCQ: 1 }, difficulty: 'hard', style: 'ADVANCED' })).body.error.code, 'AI_NOT_CONFIGURED');

    const G = {
      1: 'A priority queue implemented as a binary heap holds nine elements. What is the worst-case number of comparisons for one delete-min operation?',
      2: 'Consider an open-addressing hash table with double hashing and a load factor of one half. What is the expected number of probes for an unsuccessful search?',
    };
    const good = (n) => ({ type: 'MCQ', statement: G[n], options: opts(n === 1 ? 'heapq' : 'dhash'), correctOptions: ['B'], marks: 1, difficulty: 'hard', explanation: `Reasoning through the structure carefully shows that the correct option is B for generated question ${n}.`, solutionSteps: ['Set up the structure.', 'Count the operations.', 'Compare with the options.'], conceptTags: ['structures'], estimatedTimeSeconds: 100 });
    const bad = { type: 'MCQ', statement: 'A deliberately broken question that claims two options are both correct at once?', options: opts('broke'), correctOptions: ['A', 'B'], marks: 1, difficulty: 'hard', explanation: 'x', solutionSteps: [], conceptTags: [] };
    let solver = { 0: 'B', 1: 'C' }; // question 1 will disagree with the key
    let calls = 0;
    setAiClientForTests({
      model: 'fake-gemini',
      async generateJson({ schema }) {
        calls += 1;
        if (schema.properties.questions) return { text: JSON.stringify({ questions: [good(1), good(2), bad, good(1)] }), usage: { promptTokens: 100, outputTokens: 400 } };
        return { text: JSON.stringify({ results: Object.entries(solver).map(([index, answer]) => ({ index: Number(index), answer, ambiguous: false })) }), usage: { promptTokens: 50, outputTokens: 50 } };
      },
    });
    const start = await admin.post('/admin/ai/generate', { subjectId: subject.id, topicId: topic.id, counts: { MCQ: 4 }, difficulty: 'hard', style: 'ADVANCED' });
    assert.equal(start.status, 202);
    let batch;
    for (let i = 0; i < 40; i += 1) { batch = (await admin.get(`/admin/ai/batches/${start.body.data._id}`)).body.data; if (batch.status !== 'running') break; await new Promise((r) => setTimeout(r, 150)); }
    assert.equal(batch.status, 'completed');
    assert.equal(batch.saved, 2);
    assert.equal(batch.flagged, 1);
    assert.ok(batch.rejectedCount >= 2); // the invalid one and the in-batch duplicate
    assert.equal(calls, 2); // one generation call and one independent verification call
    const drafts = await Question.find({ 'aiMeta.batchId': batch._id }).select('+validation');
    assert.equal(drafts.length, 2);
    for (const d of drafts) { assert.equal(d.status, 'draft'); assert.equal(d.source, 'ADVANCED'); assert.equal(d.aiMeta.model, 'fake-gemini'); assert.equal(d.pyq, undefined); }
    assert.deepEqual(drafts.map((d) => d.verificationStatus).sort(), ['draft', 'pending_review']); // disagreement stands out
    const flagged = drafts.find((d) => d.verificationStatus === 'draft');
    const refuse = await admin.post(`/admin/questions/${flagged.id}/verify`, {});
    assert.equal(refuse.body.error.code, 'AI_DISAGREEMENT'); // needs an explicit acknowledgement
    assert.equal((await admin.post(`/admin/questions/${flagged.id}/verify`, { acknowledgeAiDisagreement: true })).status, 200);
    assert.equal((await student.get('/questions')).body.data.every((q) => !q.statement.startsWith('Generated')), true);

    // a second identical run produces only duplicates
    const again = await admin.post('/admin/ai/generate', { subjectId: subject.id, topicId: topic.id, counts: { MCQ: 4 }, difficulty: 'hard', style: 'ADVANCED' });
    for (let i = 0; i < 40; i += 1) { batch = (await admin.get(`/admin/ai/batches/${again.body.data._id}`)).body.data; if (batch.status !== 'running') break; await new Promise((r) => setTimeout(r, 150)); }
    assert.equal(batch.saved, 0);
    assert.equal(batch.status, 'failed');
    setAiClientForTests(undefined);
  });

  test('test builder: uses only published verified questions, reports shortages, PYQ tests contain only PYQs', async () => {
    const built = await admin.post('/admin/tests/build', { title: 'Sorting practice', kind: 'topic', mode: 'practice', count: 2, filters: { subjectIds: [subject.id], topicIds: [topic.id] } });
    assert.equal(built.status, 201, JSON.stringify(built.body));
    assert.equal(built.body.data.test.status, 'draft');
    assert.equal(built.body.data.selected, 2);
    assert.equal((await admin.post(`/admin/tests/${built.body.data.test.id}/publish`)).status, 200);
    assert.equal((await student.get('/tests')).body.meta.total, 1);

    const short = await admin.post('/admin/tests/build', { title: 'Too big', kind: 'subject', mode: 'practice', count: 50, filters: { subjectIds: [subject.id] } });
    assert.equal(short.body.error.code, 'INSUFFICIENT_QUESTIONS');
    const mock = await admin.post('/admin/tests/build', { title: 'Full mock', kind: 'mock', mode: 'competitive', template: 'gate_full_mock' });
    assert.equal(mock.body.error.code, 'INSUFFICIENT_QUESTIONS'); // the bank is far too small, and nothing is faked
    const pyqOnly = await admin.post('/admin/tests/build', { title: 'PYQ 2019', kind: 'pyq', mode: 'practice', count: 5, allowPartial: true, filters: { year: 2019 } });
    assert.equal(pyqOnly.status, 409); // the only PYQ was unpublished by the edit above
  });

  test('backward compatibility: legacy questions (no verification fields) stay visible, startable and key-safe', async () => {
    const legacy = await Question.collection.insertOne({
      type: 'MCQ', statement: 'A legacy Milestone 3 question about binary search: what is its worst-case complexity?', options: opts('l').slice(0, 2), correctOptions: ['A'], explanation: 'Legacy.', marks: 1, negativeMarks: 0.3333,
      subjectId: new mongoose.Types.ObjectId(subject.id), topicId: new mongoose.Types.ObjectId(topic.id), difficulty: 'easy', source: 'ADMIN', status: 'published', visibility: 'public', createdAt: new Date(), updatedAt: new Date(),
    });
    const list = (await student.get('/questions')).body.data;
    assert.ok(list.some((q) => q.id === String(legacy.insertedId)));
    noLeak(list, 'legacy student list');
    const view = (await admin.get(`/admin/questions/${legacy.insertedId}`)).body.data;
    assert.equal(view.verificationStatus, undefined);
    assert.equal((await admin.post(`/admin/questions/${legacy.insertedId}/revalidate`)).status, 200);
    const t = (await admin.post('/admin/tests', { title: 'Legacy test', kind: 'subject', mode: 'practice', durationMinutes: 10, scope: { subjectId: subject.id }, sections: [{ name: 'S', questionIds: [String(legacy.insertedId)] }] })).body.data;
    assert.equal((await admin.post(`/admin/tests/${t.id}/publish`)).status, 200);
    const started = await student.post('/attempts', { testId: t.id });
    assert.equal(started.status, 201);
    const exam = (await student.get(`/attempts/${started.body.data.attempt.id}`)).body.data;
    noLeak(exam, 'exam view');
    assert.equal(exam.questions.length, 1);
  });
}
