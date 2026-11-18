import { connectDb, disconnectDb } from '../config/db.js';
import { env, isProd } from '../config/env.js';
import { Question } from '../models/Question.js';
import { Subject } from '../models/Subject.js';
import { Topic } from '../models/Topic.js';
import { User } from '../models/User.js';
import { contentHash } from '../modules/content/duplicateDetection.js';
import { evaluateQuestionQuality } from '../modules/content/questionQuality.js';
import { slugify } from '../utils/http.js';
import { SAMPLE_QUESTIONS } from './sampleContent.js';

/**
 * Seeds 10 original workflow-sample questions as DRAFTS awaiting review (never published, never verified).
 *   npm run seed:samples [-- --dry-run]
 * Insert-only and idempotent: a question already present (same content fingerprint, or same subject, topic and
 * statement) is skipped and never modified. Nothing is deleted. Needs `npm run seed` first (subjects and topics).
 */
const DRY_RUN = process.argv.includes('--dry-run');
if (isProd && !process.argv.includes('--allow-production')) {
  console.error('Refusing to seed sample content into NODE_ENV=production. Pass --allow-production if you really mean it.');
  process.exit(1);
}

await connectDb(env.MONGODB_URI);
try {
  const admin = await User.findOne({ role: 'admin' }).select('_id');
  let created = 0;
  let existing = 0;
  let skipped = 0;

  for (const item of SAMPLE_QUESTIONS) {
    const subject = await Subject.findOne({ $or: [{ slug: slugify(item.subject) }, { name: item.subject }] });
    const topic = subject && (await Topic.findOne({ subjectId: subject._id, $or: [{ slug: slugify(item.topic) }, { name: item.topic }] }));
    if (!subject || !topic) {
      console.warn(`WARNING: missing ${!subject ? `subject "${item.subject}"` : `topic "${item.topic}"`}. Run "npm run seed" first. Skipping.`);
      skipped += 1;
      continue;
    }
    const { subject: _s, topic: _t, ...fields } = item;
    const hash = contentHash(fields);
    if (await Question.exists({ $or: [{ contentHash: hash }, { subjectId: subject._id, topicId: topic._id, statement: item.statement.trim() }] })) {
      existing += 1;
      continue;
    }

    const quality = evaluateQuestionQuality({ ...fields, status: 'draft', verificationStatus: 'pending_review' });
    if (quality.blocking) {
      console.warn(`WARNING: sample "${item.statement.slice(0, 50)}" has quality errors: ${quality.errors.map((e) => e.message).join('; ')}. Skipping.`);
      skipped += 1;
      continue;
    }
    if (!DRY_RUN) {
      await new Question({
        ...fields,
        subjectId: subject._id,
        topicId: topic._id,
        status: 'draft',
        verificationStatus: 'pending_review',
        visibility: 'public',
        createdBy: admin?._id,
        validation: { checkedAt: new Date(), errors: quality.errors, warnings: quality.warnings, duplicates: quality.duplicates },
      }).save();
    }
    created += 1;
  }

  console.log(`${DRY_RUN ? '[dry run] ' : ''}Sample questions: ${created} ${DRY_RUN ? 'would be created' : 'created'}, ${existing} already existed, ${skipped} skipped`);
  console.log('They are drafts: open Admin > Question bank, then Verify and Publish them to use them in tests.');
  if (skipped) process.exitCode = 2;
} finally {
  await disconnectDb();
}
