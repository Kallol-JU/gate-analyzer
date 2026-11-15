import bcrypt from 'bcrypt';
import { connectDb, disconnectDb } from '../config/db.js';
import { env } from '../config/env.js';
import { Subject } from '../models/Subject.js';
import { Topic } from '../models/Topic.js';
import { User } from '../models/User.js';
import { slugify } from '../utils/http.js';

/**
 * Idempotent: safe to run repeatedly. Creates the 12 subjects, a starter topic list, and (only if
 * ADMIN_EMAIL and ADMIN_PASSWORD are set) the first admin. There is no public admin sign-up.
 * The topic names are a working summary of the GATE CS syllabus: check them against the official
 * information brochure and edit via the admin API.
 */
const CURRICULUM = [
  ['Engineering Mathematics', ['Linear Algebra', 'Calculus', 'Probability and Statistics']],
  ['Discrete Mathematics', ['Propositional and First-Order Logic', 'Sets, Relations and Functions', 'Graph Theory', 'Combinatorics', 'Groups and Lattices']],
  ['Digital Logic', ['Boolean Algebra and Minimization', 'Combinational Circuits', 'Sequential Circuits', 'Number Representation']],
  ['Computer Organization and Architecture', ['Machine Instructions and Addressing Modes', 'ALU and Data Path', 'Pipelining', 'Memory Hierarchy and Cache', 'I/O Interface']],
  ['Programming and Data Structures', ['Programming in C', 'Recursion', 'Arrays, Stacks and Queues', 'Linked Lists', 'Trees and Binary Search Trees', 'Binary Heaps', 'Graphs']],
  ['Algorithms', ['Asymptotic Analysis', 'Divide and Conquer', 'Greedy Method', 'Dynamic Programming', 'Graph Algorithms', 'Searching and Sorting', 'Hashing']],
  ['Theory of Computation', ['Regular Languages and Finite Automata', 'Context-Free Languages and Pushdown Automata', 'Turing Machines and Undecidability']],
  ['Compiler Design', ['Lexical Analysis', 'Parsing', 'Syntax-Directed Translation', 'Runtime Environments', 'Intermediate Code Generation', 'Code Optimization']],
  ['Operating Systems', ['Processes and Threads', 'CPU Scheduling', 'Synchronization and Deadlock', 'Memory Management', 'Virtual Memory', 'File Systems and I/O']],
  ['Databases', ['ER Model', 'Relational Model and Algebra', 'SQL', 'Normalization', 'Transactions and Concurrency Control', 'File Organization and Indexing']],
  ['Computer Networks', ['Layering and Network Models', 'Data Link and MAC', 'Routing and IP', 'Transport Layer', 'Application Layer Protocols', 'Network Security']],
  ['General Aptitude', ['Verbal Ability', 'Numerical Ability', 'Analytical Reasoning', 'Spatial Reasoning', 'Data Interpretation']],
];

await connectDb(env.MONGODB_URI);

let order = 1;
for (const [name, topics] of CURRICULUM) {
  const slug = slugify(name);
  const subject = await Subject.findOneAndUpdate({ slug }, { $setOnInsert: { name, slug, order } }, { upsert: true, new: true });
  order += 1;
  for (const topicName of topics) {
    const topicSlug = slugify(topicName);
    await Topic.updateOne({ subjectId: subject._id, slug: topicSlug }, { $setOnInsert: { subjectId: subject._id, name: topicName, slug: topicSlug } }, { upsert: true });
  }
}
console.log(`Subjects: ${await Subject.countDocuments()}, topics: ${await Topic.countDocuments()}`);

if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
  const existing = await User.findOne({ email: env.ADMIN_EMAIL });
  if (existing) {
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
      console.log(`Promoted ${env.ADMIN_EMAIL} to admin.`);
    } else {
      console.log(`Admin ${env.ADMIN_EMAIL} already exists (password unchanged).`);
    }
  } else {
    await User.create({ name: env.ADMIN_NAME, email: env.ADMIN_EMAIL, passwordHash: await bcrypt.hash(env.ADMIN_PASSWORD, 12), role: 'admin' });
    console.log(`Created admin ${env.ADMIN_EMAIL}. Remove ADMIN_PASSWORD from .env now.`);
  }
} else {
  console.log('ADMIN_EMAIL / ADMIN_PASSWORD not set: no admin created.');
}

await disconnectDb();
