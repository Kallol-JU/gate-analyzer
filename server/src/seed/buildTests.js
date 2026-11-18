import { connectDb, disconnectDb } from '../config/db.js';
import { env, isProd } from '../config/env.js';
import { Question } from '../models/Question.js';
import { Subject } from '../models/Subject.js';
import { Test } from '../models/Test.js';
import { Topic } from '../models/Topic.js';
import { User } from '../models/User.js';
import { GATE_FULL_MOCK, mulberry32, resolveTemplate, selectQuestions } from '../modules/content/testBuilder.js';
import { computeDistribution, validatePublishable, validateTestConfig } from '../modules/tests/testRules.js';

/**
 * Builds and PUBLISHES test series from the verified question bank.
 *   npm run build:tests [-- --dry-run] [--min N] [--mocks N] [--advanced-tests N] [--exclude-admin]
 *
 * Series: year-wise PYQ papers, PYQ practice by subject and topic, full GATE-style mocks (65 q / 100 marks /
 * 180 min), subject-wise tests by difficulty band, topic-wise tests, and mixed-subject advanced tests.
 *
 * Safe by design:
 *  - Only published, public questions that are verified (or legacy) are used, so unverified AI content never appears.
 *  - PYQ tests contain authentic PYQs only; mocks use original content only (PYQ-inspired / advanced), never PYQs.
 *  - Curated, published ADMIN/demo questions are included by default; use --exclude-admin to omit them.
 *  - Idempotent: a test is identified by (title, kind); existing tests are never changed or deleted.
 *  - A test is created only if the bank has enough questions. Otherwise the shortfall is reported, nothing is faked.
 *    --min N lowers every threshold (useful while the bank is still small).
 */
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const DRY = process.argv.includes('--dry-run');
const MIN = Number(arg('min', 0));
const T = {
  pyqPaper: MIN || 20, pyqSubject: MIN || 10, pyqTopic: MIN || 6, band: MIN || 3, topic: MIN || 3, advanced: MIN || 20,
  mocks: Number(arg('mocks', 10)), advancedTests: Number(arg('advanced-tests', 5)),
};
const GA = 'General Aptitude';

if (isProd && !process.argv.includes('--allow-production')) {
  console.error('Refusing to publish tests in NODE_ENV=production without --allow-production.');
  process.exit(1);
}

const hashSeed = (s) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
const pick = (pool, n, title) => selectQuestions({ pool: pool.map((q) => ({ ...q, id: String(q._id), subjectId: String(q.subjectId), topicId: String(q.topicId) })), sections: [{ name: 'x', filters: {}, quotas: [{ count: n }] }], rng: mulberry32(hashSeed(title)) }).sections[0]?.questionIds ?? [];
const stats = { created: 0, existing: 0, skipped: [] };
const made = [];

await connectDb(env.MONGODB_URI);
try {
  const admin = await User.findOne({ role: 'admin' }).select('_id');
  const subjects = await Subject.find().sort({ order: 1 });
  const topics = await Topic.find();
  const sName = new Map(subjects.map((s) => [String(s._id), s.name]));
  const tName = new Map(topics.map((t) => [String(t._id), t.name]));
  const order = new Map(subjects.map((s, i) => [String(s._id), i]));
  const excludeAdmin = process.argv.includes('--exclude-admin');

  const docs = await Question.find({ status: 'published', visibility: 'public', verificationStatus: { $in: [null, 'verified'] }, ...(excludeAdmin ? { source: { $ne: 'ADMIN' } } : {}) })
    .select('type marks subjectId topicId difficulty source pyq status visibility').lean();
  const byId = new Map(docs.map((d) => [String(d._id), d]));
  console.log(`Eligible questions: ${docs.length} (PYQ ${docs.filter((d) => d.source === 'PYQ').length}, PYQ-inspired ${docs.filter((d) => d.source === 'PYQ_INSPIRED').length}, advanced ${docs.filter((d) => d.source === 'ADVANCED').length})`);

  async function create({ title, description, kind, mode, durationMinutes, sections, scope }) {
    if (await Test.exists({ title, kind })) { stats.existing += 1; return true; }
    const secs = sections.map((s) => ({ name: s.name, questions: s.ids.map((id) => byId.get(id)) }));
    const all = secs.flatMap((s) => s.questions);
    const config = { kind, mode, durationMinutes, sections: secs.map((s) => ({ name: s.name, questionIds: s.questions.map((q) => String(q._id)) })), scope };
    const problems = [...validateTestConfig(config), ...validatePublishable(config, all)];
    if (problems.length) { stats.skipped.push(`${title}: ${problems[0].message}`); return false; }
    if (!DRY) {
      const d = computeDistribution(all);
      await new Test({
        title, description, kind, mode, durationMinutes,
        sections: secs.map((s) => ({ name: s.name, questionIds: s.questions.map((q) => q._id) })),
        scope, totalQuestions: d.totalQuestions, totalMarks: d.totalMarks, distribution: d.distribution,
        status: 'published', publishedAt: new Date(), createdBy: admin?._id,
      }).save();
    }
    stats.created += 1;
    made.push(title);
    return true;
  }
  const need = (title, have, want) => stats.skipped.push(`${title}: has ${have} eligible question(s), needs at least ${want}`);
  const split = (list) => [
    { name: GA, ids: list.filter((q) => sName.get(String(q.subjectId)) === GA).map((q) => String(q._id)) },
    { name: 'Computer Science and Information Technology', ids: list.filter((q) => sName.get(String(q.subjectId)) !== GA).sort((a, b) => order.get(String(a.subjectId)) - order.get(String(b.subjectId))).map((q) => String(q._id)) },
  ].filter((s) => s.ids.length);

  // 1. Year-wise PYQ papers (competitive), one per year and session.
  const pyq = docs.filter((d) => d.source === 'PYQ');
  const papers = new Map();
  for (const q of pyq) (papers.get(`${q.pyq.year}|${q.pyq.session}`) ?? papers.set(`${q.pyq.year}|${q.pyq.session}`, []).get(`${q.pyq.year}|${q.pyq.session}`)).push(q);
  for (const [key, list] of [...papers].sort()) {
    const [year, session] = key.split('|');
    const title = `GATE CSE ${year} ${session} (PYQ paper)`;
    if (list.length < T.pyqPaper) { need(title, list.length, T.pyqPaper); continue; }
    await create({ title, description: `Authentic previous-year questions from GATE CSE ${year}, ${session}, taken from the official paper and answer key.`, kind: 'pyq', mode: 'competitive', durationMinutes: Math.max(10, Math.min(180, Math.round((180 * list.length) / 65))), sections: split(list) });
  }

  // 2. PYQ practice by subject and topic.
  for (const s of subjects) {
    const list = pyq.filter((q) => String(q.subjectId) === String(s._id)).sort((a, b) => b.pyq.year - a.pyq.year);
    const title = `PYQ Practice: ${s.name}`;
    if (list.length < T.pyqSubject) { if (list.length) need(title, list.length, T.pyqSubject); } else {
      await create({ title, description: `Previous-year GATE questions on ${s.name}, newest first.`, kind: 'pyq', mode: 'practice', durationMinutes: Math.min(180, list.slice(0, 40).length * 3), sections: [{ name: s.name, ids: list.slice(0, 40).map((q) => String(q._id)) }] });
    }
    for (const t of topics.filter((x) => String(x.subjectId) === String(s._id))) {
      const tl = list.filter((q) => String(q.topicId) === String(t._id));
      if (tl.length >= T.pyqTopic) await create({ title: `PYQ Practice: ${s.name}: ${t.name}`, description: `Previous-year GATE questions on ${t.name}.`, kind: 'pyq', mode: 'practice', durationMinutes: Math.min(180, tl.length * 3), sections: [{ name: t.name, ids: tl.map((q) => String(q._id)) }] });
    }
  }

  // 3. Full GATE-style mocks from original content only (never PYQs).
  const original = docs.filter((d) => d.source !== 'PYQ');
  const subjectIds = new Map(subjects.map((s) => [s.name, String(s._id)]));
  const mockPool = original.map((q) => ({ id: String(q._id), type: q.type, marks: q.marks, subjectId: String(q.subjectId), topicId: String(q.topicId), difficulty: q.difficulty, source: q.source }));
  for (let n = 1; n <= T.mocks; n += 1) {
    const title = `GATE CSE Full Mock ${n}`;
    if (await Test.exists({ title, kind: 'mock' })) { stats.existing += 1; continue; }
    // Each mock has no repeated question internally. Different mocks may reuse the verified bank,
    // with deterministic, differently shuffled selections; this avoids requiring 650 unique items.
    const { sections, shortages } = selectQuestions({ pool: mockPool, sections: resolveTemplate(GATE_FULL_MOCK, subjectIds), rng: mulberry32(n * 7919) });
    if (shortages.length) {
      stats.skipped.push(`${title}: ${shortages.map((s) => `${s.section} needs ${s.requested}${s.quota.marks ? ` x ${s.quota.marks}-mark` : ''}, found ${s.found}`).join('; ')}`);
      continue;
    }
    await create({ title, description: 'Full-length GATE CSE mock: 65 questions, 100 marks, 180 minutes. Original questions; question sets may overlap across different mocks.', kind: 'mock', mode: 'competitive', durationMinutes: GATE_FULL_MOCK.durationMinutes, sections: sections.map((s) => ({ name: s.name, ids: s.questionIds })) });
  }

  // 4. Subject-wise tests by difficulty band, and topic-wise tests.
  const bands = [['Easy', ['easy']], ['Medium', ['medium']], ['Hard', ['hard', 'very_hard']], ['Mixed', ['easy', 'medium', 'hard', 'very_hard']]];
  for (const s of subjects) {
    for (const [label, diffs] of bands) {
      const list = original.filter((q) => String(q.subjectId) === String(s._id) && diffs.includes(q.difficulty));
      const title = `${s.name}: ${label} Practice`;
      if (list.length < T.band) { if (list.length) need(title, list.length, T.band); continue; }
      const ids = pick(list, label === 'Mixed' ? 30 : 20, title);
      await create({ title, description: `${label} questions on ${s.name}.`, kind: 'subject', mode: 'practice', durationMinutes: ids.length * 3, scope: { subjectId: String(s._id) }, sections: [{ name: s.name, ids }] });
    }
    for (const t of topics.filter((x) => String(x.subjectId) === String(s._id))) {
      const list = original.filter((q) => String(q.topicId) === String(t._id));
      const title = `${s.name}: ${t.name}`;
      if (list.length < T.topic) { if (list.length) need(title, list.length, T.topic); continue; }
      const ids = pick(list, 20, title).sort((a, b) => ['easy', 'medium', 'hard', 'very_hard'].indexOf(byId.get(a).difficulty) - ['easy', 'medium', 'hard', 'very_hard'].indexOf(byId.get(b).difficulty)); // progressive difficulty
      await create({ title, description: `Topic practice on ${t.name}, easiest first.`, kind: 'topic', mode: 'practice', durationMinutes: ids.length * 3, scope: { subjectId: String(s._id), topicId: String(t._id) }, sections: [{ name: t.name, ids }] });
    }
  }

  // 5. Mixed-subject advanced tests (original advanced / PYQ-inspired content).
  let advPool = original.filter((q) => ['ADVANCED', 'PYQ_INSPIRED'].includes(q.source)).map((q) => ({ id: String(q._id), subjectId: String(q.subjectId), topicId: String(q.topicId) }));
  for (let n = 1; n <= T.advancedTests; n += 1) {
    const title = `Advanced Mixed Test ${n}`;
    const existingAdv = await Test.findOne({ title, kind: 'advanced' }).select('sections');
    if (existingAdv) {
      const used = new Set(existingAdv.sections.flatMap((s) => s.questionIds.map(String)));
      advPool = advPool.filter((q) => !used.has(q.id));
      stats.existing += 1;
      continue;
    }
    if (advPool.length < T.advanced) { need(title, advPool.length, T.advanced); break; }
    const { sections } = selectQuestions({ pool: advPool, sections: [{ name: 'Mixed subjects', filters: {}, balanceBySubject: true, quotas: [{ count: Math.min(25, advPool.length) }] }], rng: mulberry32(n * 104729) });
    const ids = sections[0].questionIds;
    await create({ title, description: 'Mixed-subject test of advanced, multi-step GATE-level questions.', kind: 'advanced', mode: 'practice', durationMinutes: ids.length * 4, sections: [{ name: 'Mixed subjects', ids }] });
    const used = new Set(ids);
    advPool = advPool.filter((q) => !used.has(q.id));
  }

  console.log(`\n${DRY ? '[dry run] ' : ''}Tests ${DRY ? 'that would be ' : ''}created: ${stats.created}, already existed: ${stats.existing}, not built (not enough verified content): ${stats.skipped.length}`);
  made.slice(0, 40).forEach((t) => console.log(`  + ${t}`));
  stats.skipped.slice(0, 25).forEach((s) => console.log(`  - ${s}`));
  if (stats.skipped.length > 25) console.log(`  ... and ${stats.skipped.length - 25} more`);
} finally {
  await disconnectDb();
}
