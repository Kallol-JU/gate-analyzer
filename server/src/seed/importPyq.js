import { readFileSync } from 'node:fs';
import { connectDb, disconnectDb } from '../config/db.js';
import { env, isProd } from '../config/env.js';
import { User } from '../models/User.js';
import { importBody } from '../modules/content/content.schema.js';
import { importQuestions } from '../modules/content/content.service.js';

/**
 * Imports authentic GATE previous-year questions from a JSON file YOU prepared from the official papers.
 *   npm run import:pyq -- path/to/pyq-2023.json            validate only (dry run)
 *   npm run import:pyq -- path/to/pyq-2023.json --commit   save as drafts
 *
 * The file is an array of questions (or { "items": [...] }), each with source "PYQ", pyq { year, session },
 * sourceReference { paperName, paperUrl, answerKeyRef, questionNumber }, subject, topic, the answer key and a solution.
 * Nothing is invented here: this only validates and stores what you supply. Imported PYQs are saved as DRAFTS
 * with verificationStatus "draft". They become "verified" only when an admin checks them against the official
 * paper and answer key (Admin > Question bank > Verify), which requires the official paper URL and key reference.
 */
const [file] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const commit = process.argv.includes('--commit');
if (!file) {
  console.error('Usage: npm run import:pyq -- <file.json> [--commit]');
  process.exit(1);
}
if (isProd && commit && !process.argv.includes('--allow-production')) {
  console.error('Refusing to write to NODE_ENV=production without --allow-production.');
  process.exit(1);
}

const raw = JSON.parse(readFileSync(file, 'utf8'));
const items = Array.isArray(raw) ? raw : raw.items;
const parsed = importBody.safeParse({ items, dryRun: !commit });
if (!parsed.success) {
  for (const i of parsed.error.issues.slice(0, 20)) console.error(`  ${i.path.join('.')}: ${i.message}`);
  console.error('The file does not match the import format. Nothing was imported.');
  process.exit(1);
}
const notPyq = parsed.data.items.map((q, i) => [i, q]).filter(([, q]) => q.source !== 'PYQ');
if (notPyq.length) {
  console.error(`Items ${notPyq.map(([i]) => i).slice(0, 10).join(', ')} are not source "PYQ". This command imports authentic PYQs only. Nothing was imported.`);
  process.exit(1);
}

await connectDb(env.MONGODB_URI);
try {
  const admin = await User.findOne({ role: 'admin' }).select('_id');
  const out = [];
  for (let i = 0; i < parsed.data.items.length; i += 200) {
    out.push(await importQuestions(admin?._id, { items: parsed.data.items.slice(i, i + 200), dryRun: !commit }));
  }
  const total = out.reduce((a, r) => ({ ok: a.ok + r.summary.ok, invalid: a.invalid + r.summary.invalid, duplicate: a.duplicate + r.summary.duplicate }), { ok: 0, invalid: 0, duplicate: 0 });
  out.forEach((r, c) => r.results.filter((x) => x.status !== 'ok').forEach((x) => console.log(`  item ${c * 200 + x.index}: ${x.status}: ${x.errors.map((e) => e.message).join(' | ')}`)));
  console.log(`${commit ? 'Imported' : '[dry run] Valid'}: ${total.ok}, invalid: ${total.invalid}, duplicates skipped: ${total.duplicate}`);
  console.log(commit ? 'Saved as drafts. Verify each against the official paper in Admin > Question bank.' : 'Re-run with --commit to save.');
  if (total.invalid) process.exitCode = 2;
} finally {
  await disconnectDb();
}
