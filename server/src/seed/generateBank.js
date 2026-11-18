import { connectDb, disconnectDb } from '../config/db.js';
import { env } from '../config/env.js';
import { GenerationBatch } from '../models/GenerationBatch.js';
import { Subject } from '../models/Subject.js';
import { Topic } from '../models/Topic.js';
import { User } from '../models/User.js';
import { getAiClient } from '../modules/ai/geminiClient.js';
import { startGeneration } from '../modules/ai/generation.service.js';

/**
 * Runs the Gemini generator across every subject and topic. Everything it creates is a DRAFT awaiting review.
 *   npm run generate:bank -- --per-topic 5 --style ADVANCED --difficulty hard --max-total 300
 * Options: --per-topic N (default 3)  --style ADVANCED|PYQ_INSPIRED  --difficulty easy|medium|hard|very_hard
 *          --subject "Name" (one subject)  --max-total N (stop after N requested questions, default 150)
 * Needs GEMINI_API_KEY and at least one admin user. Honours the per-request and daily limits in .env.
 */
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const perTopic = Math.min(env.AI_MAX_BATCH_QUESTIONS, Math.max(1, Number(arg('per-topic', 5))));
const style = arg('style', 'ADVANCED');
const difficulty = arg('difficulty', 'hard');
const onlySubject = arg('subject');
const maxTotal = Number(arg('max-total', 300));

if (!getAiClient()) {
  console.error('GEMINI_API_KEY is not set in server/.env. Nothing was generated.');
  process.exit(1);
}
if (!['ADVANCED', 'PYQ_INSPIRED'].includes(style) || !['easy', 'medium', 'hard', 'very_hard'].includes(difficulty)) {
  console.error('Invalid --style or --difficulty.');
  process.exit(1);
}

await connectDb(env.MONGODB_URI);
try {
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) throw new Error('No admin user exists. Run "npm run seed" with ADMIN_EMAIL and ADMIN_PASSWORD first.');

  // Spread the questions over MCQ, MSQ and NAT.
  const counts = { MCQ: Math.ceil(perTopic / 3), MSQ: Math.floor((perTopic - Math.ceil(perTopic / 3)) / 2 + 0.5), NAT: 0 };
  counts.NAT = perTopic - counts.MCQ - counts.MSQ;

  const subjects = await Subject.find(onlySubject ? { name: onlySubject } : {}).sort({ order: 1 });
  let requested = 0;
  const totals = { saved: 0, flagged: 0, rejected: 0, tokens: 0 };
  outer: for (const subject of subjects) {
    for (const topic of await Topic.find({ subjectId: subject._id }).sort({ name: 1 })) {
      if (requested + perTopic > maxTotal) { console.log('Reached --max-total.'); break outer; }
      let batch;
      try {
        batch = await startGeneration(admin, { subjectId: String(subject._id), topicId: String(topic._id), counts, difficulty, style, concepts: [] });
      } catch (err) {
        console.log(`Stopping: ${err.message}`);
        break outer;
      }
      requested += perTopic;
      while (batch.status === 'running') {
        await new Promise((r) => setTimeout(r, 2500));
        batch = await GenerationBatch.findById(batch._id);
      }
      totals.saved += batch.saved; totals.flagged += batch.flagged; totals.rejected += batch.rejectedCount; totals.tokens += batch.usage.promptTokens + batch.usage.outputTokens;
      console.log(`${subject.name} / ${topic.name}: ${batch.status}, saved ${batch.saved}, flagged ${batch.flagged}, rejected ${batch.rejectedCount}${batch.error ? ` (${batch.error})` : ''}`);
    }
  }
  console.log(`\nDrafts created: ${totals.saved} (flagged by the independent solver: ${totals.flagged}), rejected by validation: ${totals.rejected}, tokens used: ${totals.tokens}`);
  console.log('All are drafts. Review, verify and publish them in Admin > Question bank. Nothing is visible to students yet.');
} finally {
  await disconnectDb();
}
