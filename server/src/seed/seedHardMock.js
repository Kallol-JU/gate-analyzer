import { connectDb, disconnectDb } from '../config/db.js';
import { env, isProd } from '../config/env.js';
import { Question } from '../models/Question.js';
import { Subject } from '../models/Subject.js';
import { Test } from '../models/Test.js';
import { Topic } from '../models/Topic.js';
import { User } from '../models/User.js';
import { contentHash } from '../modules/content/duplicateDetection.js';
import { evaluateQuestionQuality } from '../modules/content/questionQuality.js';
import { computeDistribution, validatePublishable, validateTestConfig } from '../modules/tests/testRules.js';
import { slugify } from '../utils/http.js';
import { HARD_MOCK_QUESTIONS, HARD_MOCK_TEST_META } from './hardMockPaper.js';

/**
 * Seeds the full-length 65-question, 100-mark GATE CSE Hard Mock Test.
 *
 *   npm run seed:hard-mock                 create what is missing
 *   npm run seed:hard-mock -- --dry-run    preview without writing
 *
 * - Insert-only and idempotent: questions are matched by (subject, topic, statement) or contentHash,
 *   and the test is matched by (title, kind). Existing records are never overwritten.
 * - Requires `npm run seed` first so all 12 subjects and their topics exist.
 */
const DRY_RUN = process.argv.includes('--dry-run');

if (isProd && !process.argv.includes('--allow-production')) {
  console.error('Refusing to seed into NODE_ENV=production. Pass --allow-production if you really mean it.');
  process.exit(1);
}

const log = (...a) => console.log(...a);
const warn = (...a) => console.warn('WARNING:', ...a);

await connectDb(env.MONGODB_URI);
try {
  log(`${DRY_RUN ? '[dry run] ' : ''}Seeding "${HARD_MOCK_TEST_META.title}" into "${Subject.db.name}"`);

  const admin = await User.findOne({ role: 'admin' }).select('_id');
  const createdBy = admin?._id;

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

  let qCreated = 0;
  let qExisting = 0;
  let qSkipped = 0;
  let fakeId = 0;

  const gaQuestions = [];
  const csQuestions = [];

  for (const item of HARD_MOCK_QUESTIONS) {
    const subject = await findSubject(item.subject);
    const topic = subject && (await findTopic(subject, item.topic));
    if (!subject || !topic) {
      warn(`Missing ${!subject ? `subject "${item.subject}"` : `topic "${item.topic}" in "${item.subject}"`}. Run "npm run seed" first.`);
      qSkipped += 1;
      continue;
    }

    const hash = contentHash({ statement: item.statement, code: item.code, options: item.options ?? [] });
    let doc = await Question.findOne({
      $or: [{ contentHash: hash }, { subjectId: subject._id, topicId: topic._id, statement: item.statement.trim() }],
    }).select('type marks subjectId topicId status visibility source');

    if (doc) {
      qExisting += 1;
    } else {
      const data = {
        type: item.type,
        statement: item.statement,
        code: item.code,
        options: item.options ?? [],
        correctOptions: item.correctOptions ?? [],
        natAnswer: item.natAnswer,
        explanation: item.explanation,
        marks: item.marks,
        difficulty: item.difficulty ?? 'hard',
        subjectId: subject._id,
        topicId: topic._id,
        source: 'ADVANCED',
        verificationStatus: 'verified',
        status: 'published',
        visibility: 'public',
        createdBy,
      };
      const quality = evaluateQuestionQuality(data);
      if (quality.blocking) {
        warn(`Question "${item.statement.slice(0, 50)}" failed quality check: ${quality.errors.map((e) => e.message).join('; ')}`);
        qSkipped += 1;
        continue;
      }

      if (DRY_RUN) {
        doc = {
          _id: `dry-${(fakeId += 1)}`,
          type: item.type,
          marks: item.marks,
          subjectId: subject._id,
          topicId: topic._id,
          status: 'published',
          visibility: 'public',
          source: 'ADVANCED',
        };
      } else {
        const saved = await new Question({
          ...data,
          validation: { checkedAt: new Date(), errors: quality.errors, warnings: quality.warnings, duplicates: quality.duplicates },
        }).save();
        doc = {
          _id: saved._id,
          type: saved.type,
          marks: saved.marks,
          subjectId: saved.subjectId,
          topicId: saved.topicId,
          status: saved.status,
          visibility: saved.visibility,
          source: saved.source,
        };
      }
      qCreated += 1;
    }

    if (item.subject === 'General Aptitude') gaQuestions.push(doc);
    else csQuestions.push(doc);
  }

  let testStatus = 'skipped';
  if (await Test.exists({ title: HARD_MOCK_TEST_META.title, kind: HARD_MOCK_TEST_META.kind })) {
    testStatus = 'already existed';
  } else if (qSkipped === 0) {
    const sections = [
      { name: 'General Aptitude', questions: gaQuestions },
      { name: 'Computer Science and Information Technology', questions: csQuestions },
    ];
    const allQuestions = [...gaQuestions, ...csQuestions];
    const config = {
      kind: HARD_MOCK_TEST_META.kind,
      mode: HARD_MOCK_TEST_META.mode,
      durationMinutes: HARD_MOCK_TEST_META.durationMinutes,
      sections: sections.map((s) => ({ name: s.name, questionIds: s.questions.map((q) => String(q._id)) })),
    };
    const problems = [...validateTestConfig(config), ...validatePublishable(config, allQuestions)];
    if (problems.length) {
      warn(`"${HARD_MOCK_TEST_META.title}" skipped: ${problems.map((p) => p.message).join(' ')}`);
    } else {
      if (!DRY_RUN) {
        const { totalQuestions, totalMarks, distribution } = computeDistribution(allQuestions);
        await new Test({
          ...HARD_MOCK_TEST_META,
          sections: sections.map((s) => ({ name: s.name, questionIds: s.questions.map((q) => q._id) })),
          totalQuestions,
          totalMarks,
          distribution,
          status: 'published',
          publishedAt: new Date(),
          createdBy,
        }).save();
      }
      testStatus = DRY_RUN ? 'would be created' : 'created';
    }
  }

  log('');
  log(`Questions: ${qCreated} ${DRY_RUN ? 'would be created' : 'created'}, ${qExisting} already existed, ${qSkipped} skipped`);
  log(`Test "${HARD_MOCK_TEST_META.title}": ${testStatus}`);
  if (qSkipped) process.exitCode = 2;
} finally {
  await disconnectDb();
}
