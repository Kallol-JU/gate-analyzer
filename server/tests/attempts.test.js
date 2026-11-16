// Integration tests for the exam engine: real Express app + real MongoDB (see api.test.js for the safety rules).
import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';

const URI = process.env.TEST_MONGODB_URI;

if (!URI) {
  test('exam engine integration tests', { skip: 'set TEST_MONGODB_URI to run (see server/README.md)' }, () => {});
} else if (!/test/i.test(new URL(URI.replace('mongodb+srv', 'https').replace('mongodb', 'https')).pathname)) {
  throw new Error('Refusing to run: TEST_MONGODB_URI database name must contain "test" because it is wiped.');
} else {
  const { default: mongoose } = await import('mongoose');
  const { createApp } = await import('../src/app.js');
  const { User } = await import('../src/models/User.js');
  const { TestAttempt } = await import('../src/models/TestAttempt.js');
  const { sweepExpiredAttempts } = await import('../src/modules/attempts/attempt.service.js');

  await mongoose.connect(URI);
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  const server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;

  test.after(async () => {
    server.close();
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  function client() {
    let cookie = '';
    async function call(method, path, body) {
      const res = await fetch(base + path, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'gate-cbt', ...(cookie && { Cookie: cookie }) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      for (const c of res.headers.getSetCookie()) cookie = /^gate_token=;/.test(c) ? '' : c.split(';')[0];
      return { status: res.status, body: await res.json().catch(() => null) };
    }
    return { get: (p) => call('GET', p), post: (p, b = {}) => call('POST', p, b), put: (p, b) => call('PUT', p, b), patch: (p, b) => call('PATCH', p, b) };
  }
  const register = async (n) => {
    const c = client();
    await c.post('/auth/register', { name: `User ${n}`, email: `eng${n}@example.com`, password: 'Passw0rdOK' });
    return c;
  };
  const upd = (index, answer, seq, extra = {}) => ({ index, answer, marked: false, visited: true, seq, ...extra });
  const FORBIDDEN = ['correctOptions', 'natAnswer', 'explanation', 'Because B'];

  // ---------- fixtures: one mock test (3 questions, 2 sections) + extra questions for custom practice ----------
  const admin = await register(0);
  await User.updateOne({ email: 'eng0@example.com' }, { role: 'admin' });
  await admin.post('/auth/login', { email: 'eng0@example.com', password: 'Passw0rdOK' });

  const subject = (await admin.post('/admin/subjects', { name: 'Algorithms' })).body.data;
  const topic = (await admin.post('/admin/topics', { subjectId: subject.id, name: 'Sorting' })).body.data;
  const mk = async (extra) => (await admin.post('/admin/questions', { subjectId: subject.id, topicId: topic.id, status: 'published', marks: 2, ...extra })).body.data;
  const opts = [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }, { key: 'C', text: 'c' }];
  const q1 = await mk({ type: 'MCQ', statement: 'Q1 original', options: opts, correctOptions: ['B'], explanation: 'Because B' });
  const q2 = await mk({ type: 'MSQ', statement: 'Q2', options: opts, correctOptions: ['A', 'C'], explanation: 'Because A and C' });
  const q3 = await mk({ type: 'NAT', statement: 'Q3', marks: 1, natAnswer: { min: 3.9, max: 4.1 }, explanation: 'Because 4' });
  for (const n of [4, 5]) await mk({ type: 'MCQ', statement: `extra ${n}`, options: opts, correctOptions: ['A'] });

  const mkTest = async (title, durationMinutes = 180) => {
    const t = (await admin.post('/admin/tests', { title, kind: 'mock', mode: 'competitive', durationMinutes, sections: [{ name: 'GA', questionIds: [q1.id] }, { name: 'CS', questionIds: [q2.id, q3.id] }] })).body.data;
    assert.equal((await admin.post(`/admin/tests/${t.id}/publish`)).status, 200);
    return t;
  };
  const mock = await mkTest('Mock A');

  test('start, resume and concurrent starts produce exactly one attempt', async () => {
    const s = await register(1);
    const [r1, ...rest] = await Promise.all(Array.from({ length: 5 }, () => s.post('/attempts', { testId: mock.id })));
    const ids = new Set([r1, ...rest].map((r) => r.body.data.attempt.id));
    assert.equal(ids.size, 1);
    assert.equal(await TestAttempt.countDocuments({ testId: mock.id, status: 'in_progress' }), 1);
    assert.ok([r1, ...rest].some((r) => r.status === 201));
    assert.equal((await s.post('/attempts', { testId: mock.id })).body.data.resumed, true);
    assert.equal((await s.post('/attempts', { testId: '0'.repeat(24) })).status, 404);
  });

  test('client cannot influence duration or marking; server computes expiry; refresh keeps the timer', async () => {
    const s = await register(2);
    const started = (await s.post('/attempts', { testId: mock.id, durationMinutes: 1, marking: { negativeMarkingEnabled: false } })).body.data.attempt;
    const first = (await s.get(`/attempts/${started.id}`)).body.data;
    assert.equal(first.test.durationMinutes, 180);
    assert.ok(first.timing.remainingSeconds > 179 * 60 && first.timing.remainingSeconds <= 180 * 60);
    assert.equal(new Date(first.timing.expiresAt) - new Date(first.timing.startedAt), 180 * 60_000);
    await new Promise((r) => setTimeout(r, 1100));
    const again = (await s.get(`/attempts/${started.id}`)).body.data; // "refresh"
    assert.equal(again.timing.expiresAt, first.timing.expiresAt);
    assert.ok(again.timing.remainingMs < first.timing.remainingMs);
    assert.equal(first.questions[0].negativeMarks, 0.6667);
  });

  test('active attempt payloads never contain the answer key', async () => {
    const s = await register(3);
    const { id } = (await s.post('/attempts', { testId: mock.id })).body.data.attempt;
    for (const path of [`/attempts/${id}`, `/attempts/${id}/status`, '/attempts/active', '/attempts', `/tests/${mock.id}`]) {
      const json = JSON.stringify((await s.get(path)).body);
      for (const f of FORBIDDEN) assert.ok(!json.includes(f), `${path} leaked ${f}`);
    }
    const saved = await s.put(`/attempts/${id}/responses`, { updates: [upd(0, 'B', 1)] });
    for (const f of FORBIDDEN) assert.ok(!JSON.stringify(saved.body).includes(f));
    assert.equal((await s.get(`/attempts/${id}/result`)).status, 409); // not released before submission
  });

  test('autosave: validation, persistence, stale and out-of-order requests', async () => {
    const s = await register(4);
    const { id } = (await s.post('/attempts', { testId: mock.id })).body.data.attempt;
    const put = (updates) => s.put(`/attempts/${id}/responses`, { updates });

    assert.equal((await put([upd(0, 'Z', 1)])).status, 400); // option does not exist
    assert.equal((await put([upd(1, 'A', 1)])).status, 400); // MSQ needs a list
    assert.equal((await put([upd(2, 'abc', 1)])).status, 400); // NAT must be numeric
    assert.equal((await put([upd(9, 'A', 1)])).status, 400); // no such question
    assert.equal((await put([{ ...upd(0, 'A', 1), seq: 0 }])).status, 400); // seq must be >= 1

    const ok = await put([upd(0, 'A', 1), upd(1, ['C', 'A'], 1), upd(2, '4.0', 1, { marked: true })]);
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.applied, 3);
    assert.equal(ok.body.data.status, 'in_progress');

    // newer then older arrives late: the older one must not overwrite
    assert.equal((await put([upd(0, 'B', 3)])).body.data.applied, 1);
    const late = await put([upd(0, 'C', 2)]);
    assert.deepEqual([late.body.data.applied, late.body.data.stale], [0, 1]);
    // duplicate retry is idempotent
    assert.equal((await put([upd(0, 'B', 3)])).body.data.stale, 1);

    // refresh recovery: everything is on the server
    const view = (await s.get(`/attempts/${id}`)).body.data;
    assert.deepEqual(view.responses[0], { answer: 'B', visited: true, marked: false, seq: 3 });
    assert.deepEqual(view.responses[1].answer, ['A', 'C']);
    assert.deepEqual([view.responses[2].answer, view.responses[2].marked], ['4.0', true]);
    // clearing a response
    await put([upd(0, null, 4)]);
    assert.equal((await s.get(`/attempts/${id}`)).body.data.responses[0].answer, null);
  });

  test('simultaneous saves of the same question keep the highest seq', async () => {
    const s = await register(5);
    const { id } = (await s.post('/attempts', { testId: mock.id })).body.data.attempt;
    const letters = ['A', 'B', 'C', 'A', 'B', 'C', 'A', 'B'];
    await Promise.all(letters.map((l, i) => s.put(`/attempts/${id}/responses`, { updates: [upd(0, l, i + 1)] })));
    assert.equal((await s.get(`/attempts/${id}`)).body.data.responses[0].answer, letters[7]);
  });

  test('ownership: other students and anonymous visitors cannot touch an attempt', async () => {
    const owner = await register(6);
    const other = await register(7);
    const { id } = (await owner.post('/attempts', { testId: mock.id })).body.data.attempt;
    for (const [m, path, body] of [
      ['get', `/attempts/${id}`], ['get', `/attempts/${id}/status`], ['get', `/attempts/${id}/result`],
      ['put', `/attempts/${id}/responses`, { updates: [upd(0, 'A', 1)] }], ['post', `/attempts/${id}/submit`],
    ]) {
      assert.equal((await other[m](path, body)).status, 404, `${m} ${path}`);
    }
    assert.equal((await client().get(`/attempts/${id}`)).status, 401);
    assert.equal((await other.get('/attempts')).body.meta.total, 0);
    assert.equal((await owner.get(`/attempts/${id}`)).status, 200); // untouched by the intruder
  });

  test('manual submit: correct server-side score, exactly-once under concurrency, then locked', async () => {
    const s = await register(8);
    const { id } = (await s.post('/attempts', { testId: mock.id })).body.data.attempt;
    // Q1 wrong (-2/3), Q2 exact set (+2), Q3 inside tolerance (+1)
    await s.put(`/attempts/${id}/responses`, { updates: [upd(0, 'A', 1), upd(1, ['A', 'C'], 1), upd(2, '4.05', 1)] });

    const results = await Promise.all(Array.from({ length: 6 }, () => s.post(`/attempts/${id}/submit`)));
    for (const r of results) {
      assert.equal(r.status, 200);
      assert.equal(r.body.data.status, 'submitted');
    }
    const stored = await TestAttempt.findById(id);
    assert.equal(stored.result.score, 2.33);
    assert.equal(stored.status, 'submitted');
    assert.ok(stored.submittedAt && stored.timeTakenSec >= 0);
    const firstSubmittedAt = stored.submittedAt.getTime();

    // later submits and saves cannot change anything
    assert.equal((await s.post(`/attempts/${id}/submit`)).status, 200);
    assert.equal((await s.put(`/attempts/${id}/responses`, { updates: [upd(0, 'B', 9)] })).body.error.code, 'ATTEMPT_CLOSED');
    const after = await TestAttempt.findById(id);
    assert.equal(after.submittedAt.getTime(), firstSubmittedAt);
    assert.equal(after.responses[0].answer, 'A');

    const res = (await s.get(`/attempts/${id}/result`)).body.data;
    assert.deepEqual([res.result.score, res.result.totalMarks, res.result.correct, res.result.incorrect, res.result.unanswered], [2.33, 5, 2, 1, 0]);
    assert.equal(res.result.accuracy, 66.67);
    assert.equal(res.result.subjectBreakdown[0].subjectName, 'Algorithms');
    assert.deepEqual(res.review[0].correctOptions, ['B']);
    assert.equal(res.review[0].explanation, 'Because B');
    assert.equal(res.review[0].yourAnswer, 'A');
    assert.equal(res.review[0].outcome, 'incorrect');
    assert.equal((await s.get(`/attempts/${id}`)).body.data.status, 'submitted'); // exam view is gone; summary only
  });

  test('editing questions after an attempt cannot change its snapshot or result', async () => {
    const s = await register(9);
    const { id } = (await s.post('/attempts', { testId: mock.id })).body.data.attempt;
    await s.put(`/attempts/${id}/responses`, { updates: [upd(0, 'B', 1)] });
    await admin.patch(`/admin/questions/${q1.id}`, { statement: 'Q1 EDITED', correctOptions: ['A'], marks: 5, explanation: 'changed' });
    await s.post(`/attempts/${id}/submit`);
    const res = (await s.get(`/attempts/${id}/result`)).body.data;
    assert.equal(res.review[0].statement, 'Q1 original');
    assert.equal(res.review[0].marks, 2);
    assert.deepEqual(res.review[0].correctOptions, ['B']);
    assert.equal(res.review[0].outcome, 'correct');
    await admin.patch(`/admin/questions/${q1.id}`, { statement: 'Q1 original', correctOptions: ['B'], marks: 2, explanation: 'Because B' });
  });

  test('expiry: lazy auto-submit, capped time taken, late saves rejected', async () => {
    const t = await mkTest('Mock expiry', 30);
    const s = await register(10);
    const { id } = (await s.post('/attempts', { testId: t.id })).body.data.attempt;
    await s.put(`/attempts/${id}/responses`, { updates: [upd(1, ['A', 'C'], 1)] });

    // Simulate the server clock passing the deadline: move expiry 1 minute into the past (grace is 5 s).
    await TestAttempt.collection.updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: { expiresAt: new Date(Date.now() - 60_000), startedAt: new Date(Date.now() - 31 * 60_000) } });

    const late = await s.put(`/attempts/${id}/responses`, { updates: [upd(0, 'B', 5)] });
    assert.equal(late.status, 409);
    assert.ok(['ATTEMPT_EXPIRED', 'ATTEMPT_CLOSED'].includes(late.body.error.code));

    const done = await TestAttempt.findById(id);
    assert.equal(done.status, 'auto_submitted');
    assert.equal(done.responses[0].answer, null); // the late answer was not accepted
    assert.equal(done.timeTakenSec, 30 * 60); // capped at the allowed duration, not "now"
    assert.equal(done.result.correct, 1);
    const res = (await s.get(`/attempts/${id}/result`)).body.data;
    assert.equal(res.autoSubmitted, true);
  });

  test('saves inside the grace window are still accepted', async () => {
    const t = await mkTest('Mock grace', 30);
    const s = await register(11);
    const { id } = (await s.post('/attempts', { testId: t.id })).body.data.attempt;
    await TestAttempt.collection.updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: { expiresAt: new Date(Date.now() - 2000) } });
    const r = await s.put(`/attempts/${id}/responses`, { updates: [upd(0, 'B', 1)] });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.applied, 1);
    assert.equal(r.body.data.timing.remainingSeconds, 0);
  });

  test('background sweeper submits expired attempts with no student request', async () => {
    const t = await mkTest('Mock sweep', 30);
    const s = await register(12);
    const { id } = (await s.post('/attempts', { testId: t.id })).body.data.attempt;
    await s.put(`/attempts/${id}/responses`, { updates: [upd(0, 'B', 1)] });
    await TestAttempt.collection.updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: { expiresAt: new Date(Date.now() - 10_000) } });
    assert.ok((await sweepExpiredAttempts()) >= 1);
    const done = await TestAttempt.findById(id);
    assert.equal(done.status, 'auto_submitted');
    assert.equal(done.result.correct, 1);
    assert.equal(await sweepExpiredAttempts(), 0); // nothing left to do, nothing re-processed
  });

  test('private practice: built from the question bank, one active at a time, history and active lists', async () => {
    const s = await register(13);
    const bad = await s.post('/attempts/practice', { subjectId: subject.id, count: 30 });
    assert.equal(bad.body.error.code, 'NOT_ENOUGH_QUESTIONS');
    assert.equal((await s.post('/attempts/practice', { subjectId: subject.id, count: 2 })).status, 400);

    const made = await s.post('/attempts/practice', { subjectId: subject.id, topicId: topic.id, count: 5 });
    assert.equal(made.status, 201);
    assert.equal(made.body.data.attempt.kind, 'custom');
    assert.equal(made.body.data.attempt.mode, 'practice');
    const again = await s.post('/attempts/practice', { subjectId: subject.id, count: 5 });
    assert.equal(again.body.error.code, 'ACTIVE_PRACTICE_EXISTS');
    assert.equal(again.body.error.details[0].message, made.body.data.attempt.id);

    const view = (await s.get(`/attempts/${made.body.data.attempt.id}`)).body.data;
    assert.equal(view.questions.length, 5);
    assert.equal(view.test.durationMinutes, 15);
    assert.equal(view.test.sections.length, 1);

    assert.equal((await s.get('/attempts/active')).body.data.length, 1);
    await s.post(`/attempts/${made.body.data.attempt.id}/submit`);
    assert.equal((await s.get('/attempts/active')).body.data.length, 0);
    const hist = (await s.get('/attempts')).body;
    assert.equal(hist.meta.total, 1);
    assert.equal(hist.data[0].status, 'submitted');
    assert.equal(hist.data[0].result.unanswered, 5);
    assert.equal(hist.data[0].result.score, 0);
    assert.equal((await s.get('/attempts?status=in_progress')).body.meta.total, 0);
  });

  test('draft or unpublished tests cannot be started', async () => {
    const s = await register(14);
    const draft = (await admin.post('/admin/tests', { title: 'Draft one', kind: 'mock', mode: 'practice', durationMinutes: 60, sections: [{ name: 'S', questionIds: [q1.id] }] })).body.data;
    assert.equal((await s.post('/attempts', { testId: draft.id })).status, 404);
  });
}
