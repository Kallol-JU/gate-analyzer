// Integration tests: real Express app + real MongoDB.
// They run only when TEST_MONGODB_URI is set, and only against a database whose name contains
// "test", because the database is WIPED before and after.
import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';

const URI = process.env.TEST_MONGODB_URI;

if (!URI) {
  test('integration tests', { skip: 'set TEST_MONGODB_URI to run (see server/README.md)' }, () => {});
} else if (!/test/i.test(new URL(URI.replace('mongodb+srv', 'https').replace('mongodb', 'https')).pathname)) {
  throw new Error('Refusing to run: TEST_MONGODB_URI database name must contain "test" because it is wiped.');
} else {
  const { default: mongoose } = await import('mongoose');
  const { createApp } = await import('../src/app.js');
  const { User } = await import('../src/models/User.js');

  await mongoose.connect(URI);
  await mongoose.connection.dropDatabase();
  // dropDatabase also drops the unique indexes that mongoose built on connect; rebuild them.
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  const server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;

  test.after(async () => {
    server.close();
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  /** Tiny fetch client with a cookie jar. */
  function client() {
    let cookie = '';
    async function call(method, path, body) {
      const res = await fetch(base + path, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'gate-cbt', ...(cookie && { Cookie: cookie }) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const setCookies = res.headers.getSetCookie();
      for (const c of setCookies) cookie = /^gate_token=;/.test(c) ? '' : c.split(';')[0];
      return { status: res.status, body: await res.json().catch(() => null), setCookies };
    }
    return { get: (p) => call('GET', p), post: (p, b = {}) => call('POST', p, b), patch: (p, b) => call('PATCH', p, b), del: (p) => call('DELETE', p) };
  }

  const creds = (n) => ({ name: `User ${n}`, email: `user${n}@example.com`, password: 'Passw0rdOK' });

  test('auth: register, cookie flags, me, logout, login', async () => {
    const c = client();
    const reg = await c.post('/auth/register', { ...creds(1), role: 'admin' }); // role must be ignored
    assert.equal(reg.status, 201);
    assert.equal(reg.body.data.user.role, 'student');
    assert.ok(!JSON.stringify(reg.body).includes('passwordHash'));
    assert.match(reg.setCookies[0], /HttpOnly/i);

    assert.equal((await c.get('/auth/me')).body.data.user.email, 'user1@example.com');
    assert.equal((await c.post('/auth/logout')).status, 200);
    assert.equal((await c.get('/auth/me')).status, 401);

    assert.equal((await c.post('/auth/login', { email: 'user1@example.com', password: 'wrong-pass1' })).status, 401);
    assert.equal((await c.post('/auth/login', { email: 'nobody@example.com', password: 'wrong-pass1' })).body.error.message, 'Invalid email or password.');
    assert.equal((await c.post('/auth/login', { email: 'USER1@example.com', password: 'Passw0rdOK' })).status, 200);
  });

  test('auth: validation and duplicate email', async () => {
    const c = client();
    const weak = await c.post('/auth/register', { ...creds(2), password: 'short' });
    assert.equal(weak.status, 400);
    assert.equal(weak.body.error.details[0].path, 'password');
    assert.equal((await c.post('/auth/register', creds(3))).status, 201);
    assert.equal((await client().post('/auth/register', creds(3))).status, 409);
  });

  test('authorization: students cannot use admin APIs', async () => {
    const c = client();
    await c.post('/auth/register', creds(4));
    assert.equal((await c.get('/admin/questions')).status, 403);
    assert.equal((await c.post('/admin/subjects', { name: 'Nope' })).status, 403);
  });

  test('admin flow: taxonomy, questions, tests, and no answer-key leaks', async () => {
    const admin = client();
    await admin.post('/auth/register', creds(10));
    await User.updateOne({ email: 'user10@example.com' }, { role: 'admin' });
    assert.equal((await admin.post('/auth/login', { email: 'user10@example.com', password: 'Passw0rdOK' })).body.data.user.role, 'admin');

    const subject = (await admin.post('/admin/subjects', { name: 'Algorithms' })).body.data;
    const topic = (await admin.post('/admin/topics', { subjectId: subject.id, name: 'Sorting' })).body.data;
    const other = (await admin.post('/admin/subjects', { name: 'Databases' })).body.data;
    assert.equal((await admin.post('/admin/topics', { subjectId: subject.id, name: 'Sorting' })).status, 409);

    const mcq = {
      type: 'MCQ', statement: 'Worst case of quicksort?', marks: 1, subjectId: subject.id, topicId: topic.id,
      options: [{ key: 'A', text: 'n log n' }, { key: 'B', text: 'n^2' }], correctOptions: ['B'], explanation: 'Bad pivots.',
    };
    // invalid: two correct answers for an MCQ; topic from a different subject
    assert.equal((await admin.post('/admin/questions', { ...mcq, correctOptions: ['A', 'B'] })).status, 400);
    assert.equal((await admin.post('/admin/questions', { ...mcq, subjectId: other.id })).body.error.code, 'TAXONOMY_MISMATCH');
    // invalid: AI question labelled as PYQ
    assert.equal((await admin.post('/admin/questions', { ...mcq, source: 'AI', pyq: { year: 2024, session: 'Set 1' } })).status, 400);

    const created = (await admin.post('/admin/questions', { ...mcq, source: 'PYQ', pyq: { year: 2024, session: 'Set 1' } })).body.data;
    assert.deepEqual(created.correctOptions, ['B']);
    assert.equal(created.negativeMarks, 0.3333); // default negative marking applied
    assert.equal(created.status, 'draft');

    const nat = (await admin.post('/admin/questions', {
      type: 'NAT', statement: '2+2?', marks: 2, subjectId: subject.id, topicId: topic.id, natAnswer: { min: 4, max: 4 }, status: 'published',
    })).body.data;

    // A student sees only published questions, and never the key.
    const student = client();
    await student.post('/auth/register', creds(11));
    let list = await student.get('/questions');
    assert.equal(list.body.meta.total, 1); // the draft MCQ is hidden
    assert.equal((await student.get(`/questions/${created.id}`)).status, 404);

    // Publish the MCQ (PATCH) and re-check both student endpoints for leaks.
    assert.equal((await admin.patch(`/admin/questions/${created.id}`, { status: 'published' })).status, 200);
    list = await student.get('/questions');
    const one = await student.get(`/questions/${created.id}`);
    for (const payload of [list.body, one.body]) {
      const json = JSON.stringify(payload);
      for (const forbidden of ['correctOptions', 'natAnswer', 'explanation', 'Bad pivots']) {
        assert.ok(!json.includes(forbidden), `leaked ${forbidden}`);
      }
    }
    assert.equal((await student.get('/questions?status=draft')).status, 200); // unknown filter is stripped, not honoured
    assert.equal((await student.get('/questions?status=draft')).body.meta.total, 2);

    // Changing the type while keeping the old key is rejected by the merged-document validation.
    assert.equal((await admin.patch(`/admin/questions/${created.id}`, { type: 'NAT' })).status, 400);

    // ---- tests ----
    const draftQ = (await admin.post('/admin/questions', { ...mcq, statement: 'Another?' })).body.data;
    const body = {
      title: 'Sample mock', kind: 'mock', mode: 'competitive', durationMinutes: 180,
      sections: [{ name: 'Core', questionIds: [created.id, nat.id] }],
    };
    assert.equal((await admin.post('/admin/tests', { ...body, kind: 'ai_practice' })).status, 400); // competitive AI is invalid
    assert.equal((await admin.post('/admin/tests', { ...body, sections: [{ name: 'x', questionIds: ['0'.repeat(24)] }] })).body.error.code, 'UNKNOWN_QUESTIONS');

    const t = (await admin.post('/admin/tests', body)).body.data;
    assert.equal(t.totalQuestions, 2);
    assert.equal(t.totalMarks, 3);
    assert.deepEqual(t.distribution.byType, { MCQ: 1, MSQ: 0, NAT: 1 });
    assert.equal((await student.get('/tests')).body.meta.total, 0); // drafts invisible

    // Cannot publish while it contains a draft question.
    await admin.patch(`/admin/questions/${draftQ.id}`, { status: 'draft' });
    const withDraft = (await admin.post('/admin/tests', { ...body, title: 'With draft', sections: [{ name: 'Core', questionIds: [draftQ.id] }] })).body.data;
    assert.equal((await admin.post(`/admin/tests/${withDraft.id}/publish`)).status, 409);

    assert.equal((await admin.post(`/admin/tests/${t.id}/publish`)).status, 200);
    const visible = await student.get('/tests');
    assert.equal(visible.body.meta.total, 1);
    assert.ok(!JSON.stringify(visible.body).includes(created.id), 'student test list must not expose question ids');
    assert.deepEqual((await student.get(`/tests/${t.id}`)).body.data.sections, [{ name: 'Core', questionCount: 2 }]);

    // Published competitive tests are locked; wording can still change.
    assert.equal((await admin.patch(`/admin/tests/${t.id}`, { durationMinutes: 60 })).body.error.code, 'TEST_LOCKED');
    assert.equal((await admin.patch(`/admin/tests/${t.id}`, { title: 'Sample mock (renamed)' })).status, 200);
    assert.equal((await admin.del(`/admin/tests/${t.id}`)).status, 409);

    // A question used by a test cannot be deleted.
    assert.equal((await admin.del(`/admin/questions/${created.id}`)).body.error.code, 'QUESTION_IN_USE');

    assert.equal((await admin.post(`/admin/tests/${t.id}/unpublish`)).status, 200);
    const clone = (await admin.post(`/admin/tests/${t.id}/clone`)).body.data;
    assert.equal(clone.status, 'draft');
    assert.equal((await admin.del(`/admin/tests/${clone.id}`)).status, 200);

    // Taxonomy deletion guards
    assert.equal((await admin.del(`/admin/topics/${topic.id}`)).body.error.code, 'TOPIC_IN_USE');
    assert.equal((await admin.del(`/admin/subjects/${subject.id}`)).body.error.code, 'SUBJECT_IN_USE');
  });

  test('health reports the connected database', async () => {
    const res = await fetch(`${base}/health`);
    const { data } = await res.json();
    assert.equal(data.database.status, 'connected');
    assert.equal(data.status, 'ok');
  });
}
