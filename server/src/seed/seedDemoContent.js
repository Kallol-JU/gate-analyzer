import { connectDb, disconnectDb } from '../config/db.js';
import { env, isProd } from '../config/env.js';
import { Question } from '../models/Question.js';
import { Subject } from '../models/Subject.js';
import { Test } from '../models/Test.js';
import { Topic } from '../models/Topic.js';
import { User } from '../models/User.js';
import { computeDistribution, validatePublishable, validateTestConfig } from '../modules/tests/testRules.js';
import { slugify } from '../utils/http.js';
import { buildTestPlans, flattenDemoContent } from './demoContent.js';

/**
 * DEVELOPMENT CONTENT SEED. Adds demo/practice questions and published tests.
 *
 *   npm run seed:demo            create what is missing
 *   npm run seed:demo -- --dry-run     show what would be created, write nothing
 *
 * - Insert-only and idempotent: a question is identified by (subject, topic, statement) and a test by
 *   (title, kind). Anything that already exists is left exactly as it is, so re-running creates no
 *   duplicates and never overwrites edits. Nothing is ever updated or deleted.
 * - Uses only subjects and topics that already exist (run `npm run seed` first). It never creates them.
 * - Questions are source "ADMIN" (never PYQ), published and public, so they appear in private practice.
 */
const DRY_RUN = process.argv.includes('--dry-run');

if (isProd && !process.argv.includes('--allow-production')) {
  console.error('Refusing to seed demo content into NODE_ENV=production. Pass --allow-production if you really mean it.');
  process.exit(1);
}

const log = (...a) => console.log(...a);
const warn = (...a) => console.warn('WARNING:', ...a);
const stats = { q: { created: 0, existing: 0, skipped: 0 }, t: { created: 0, existing: 0, skipped: 0 } };

await connectDb(env.MONGODB_URI);
try {
  log(`${DRY_RUN ? '[dry run] ' : ''}Seeding demo content into "${Subject.db.name}"`);

  // Optional author: the first existing admin. No admin is required.
  const admin = await User.findOne({ role: 'admin' }).select('_id');
  const createdBy = admin?._id;

  // ---------- resolve existing subjects and topics ----------
  const subjectCache = new Map();
  const topicCache = new Map();
  const findSubject = async (name) => {
    if (!subjectCache.has(name)) subjectCache.set(name, await Subject.findOne({ $or: [{ slug: slugify(name) }, { name }] }));
    return subjectCache.get(name);
  };
  const findTopic = async (subject, name) => {
    const key = `${subject._id}|${name}`;
    if (!topicCache.has(key)) topicCache.set(key, await Topic.findOne({ subjectId: subject._id, $or: [{ slug: slugify(name) }, { name }] }));
    return topicCache.get(key);
  };

  // ---------- questions ----------
  const resolved = new Map(); // "Subject|position" -> plain question info (as stored)
  let fakeId = 0;
  for (const item of flattenDemoContent()) {
    const key = `${item.subject}|${item.position}`;
    const subject = await findSubject(item.subject);
    const topic = subject && (await findTopic(subject, item.topic));
    if (!subject || !topic) {
      warn(`Missing ${!subject ? `subject "${item.subject}"` : `topic "${item.topic}" in "${item.subject}"`}. Run "npm run seed" first. Skipping a question.`);
      stats.q.skipped += 1;
      continue;
    }

    let doc = await Question.findOne({ subjectId: subject._id, topicId: topic._id, statement: item.statement }).select('type marks subjectId topicId status visibility source');
    if (doc) {
      stats.q.existing += 1;
    } else {
      const data = {
        type: item.type,
        statement: item.statement,
        code: item.code,
        options: item.options ?? [],
        correctOptions: item.correctOptions ?? [],
        natAnswer: item.natAnswer,
        explanation: item.explanation,
        marks: item.marks, // negativeMarks is left unset: the model applies the GATE default (MCQ 1/3 of marks, others 0)
        difficulty: item.difficulty,
        subjectId: subject._id,
        topicId: topic._id,
        source: 'ADMIN',
        status: 'published',
        visibility: 'public',
        createdBy,
      };
      if (DRY_RUN) {
        doc = { _id: `dry-${(fakeId += 1)}`, type: item.type, marks: item.marks, subjectId: subject._id, topicId: topic._id, status: 'published', visibility: 'public', source: 'ADMIN' };
      } else {
        const saved = await new Question(data).save(); // runs the model's validation rules
        doc = { _id: saved._id, type: saved.type, marks: saved.marks, subjectId: saved.subjectId, topicId: saved.topicId, status: saved.status, visibility: saved.visibility, source: saved.source };
      }
      stats.q.created += 1;
    }
    resolved.set(key, doc);
  }

  // ---------- tests ----------
  for (const plan of buildTestPlans()) {
    if (await Test.exists({ title: plan.title, kind: plan.kind })) {
      stats.t.existing += 1;
      continue;
    }

    const sections = plan.sections.map((s) => ({ name: s.name, questions: s.items.map((i) => resolved.get(`${i.subject}|${i.position}`)) }));
    if (sections.some((s) => s.questions.some((q) => !q))) {
      warn(`"${plan.title}" skipped: some of its questions could not be created.`);
      stats.t.skipped += 1;
      continue;
    }

    const subject = plan.scope ? await findSubject(plan.scope.subject) : undefined;
    const topic = plan.scope?.topic ? await findTopic(subject, plan.scope.topic) : undefined;
    const config = {
      kind: plan.kind,
      mode: plan.mode,
      durationMinutes: plan.durationMinutes,
      sections: sections.map((s) => ({ name: s.name, questionIds: s.questions.map((q) => String(q._id)) })),
      scope: { subjectId: subject && String(subject._id), topicId: topic && String(topic._id) },
    };
    const allQuestions = sections.flatMap((s) => s.questions);
    // The same checks the admin "publish" endpoint applies: never create a test students cannot start.
    const problems = [...validateTestConfig(config), ...validatePublishable(config, allQuestions)];
    if (problems.length) {
      warn(`"${plan.title}" skipped: ${problems.map((p) => p.message).join(' ')}`);
      stats.t.skipped += 1;
      continue;
    }

    if (!DRY_RUN) {
      const { totalQuestions, totalMarks, distribution } = computeDistribution(allQuestions);
      await new Test({
        title: plan.title,
        description: plan.description,
        kind: plan.kind,
        mode: plan.mode,
        durationMinutes: plan.durationMinutes,
        sections: sections.map((s) => ({ name: s.name, questionIds: s.questions.map((q) => q._id) })),
        scope: subject ? { subjectId: subject._id, topicId: topic?._id } : undefined,
        totalQuestions,
        totalMarks,
        distribution,
        status: 'published',
        publishedAt: new Date(),
        createdBy,
      }).save();
    }
    stats.t.created += 1;
  }

  log('');
  log(`Questions: ${stats.q.created} ${DRY_RUN ? 'would be created' : 'created'}, ${stats.q.existing} already existed, ${stats.q.skipped} skipped`);
  log(`Tests:     ${stats.t.created} ${DRY_RUN ? 'would be created' : 'created'}, ${stats.t.existing} already existed, ${stats.t.skipped} skipped`);
  if (stats.q.skipped || stats.t.skipped) process.exitCode = 2;
} finally {
  await disconnectDb();
}
