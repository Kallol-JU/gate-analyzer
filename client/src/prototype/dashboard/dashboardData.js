/**
 * PROTOTYPE · SAMPLE DATA
 * Invented numbers used only to review the dashboard layout. None of this is real,
 * and nothing here is read from or written to the API. Replaced in Phase 6.
 */
export const sampleStats = [
  { label: 'Tests attempted', value: '9', hint: '6 mock, 2 practice, 1 AI' },
  { label: 'Average score', value: '47.3', hint: 'out of 100' },
  { label: 'Accuracy', value: '61%', hint: 'across all attempts' },
  { label: 'Avg. time per test', value: '2h 21m', hint: 'of 3h allowed' },
];

export const sampleScoreTrend = [
  { label: 'Mock 1', score: 31.3 },
  { label: 'Mock 2', score: 36.7 },
  { label: 'Mock 3', score: 42 },
  { label: 'Mock 4', score: 40.3 },
  { label: 'Mock 5', score: 49.7 },
  { label: 'Mock 6', score: 53 },
  { label: 'Mock 7', score: 55.3 },
  { label: 'Mock 8', score: 58.7 },
];

export const sampleSubjectAccuracy = [
  { subject: 'Engineering Mathematics', accuracy: 48 },
  { subject: 'Discrete Mathematics', accuracy: 56 },
  { subject: 'Digital Logic', accuracy: 74 },
  { subject: 'Computer Organization', accuracy: 52 },
  { subject: 'Programming & Data Structures', accuracy: 78 },
  { subject: 'Algorithms', accuracy: 63 },
  { subject: 'Theory of Computation', accuracy: 41 },
  { subject: 'Compiler Design', accuracy: 58 },
  { subject: 'Operating Systems', accuracy: 67 },
  { subject: 'Databases', accuracy: 72 },
  { subject: 'Computer Networks', accuracy: 59 },
  { subject: 'General Aptitude', accuracy: 81 },
];

export const sampleWeakTopics = [
  { topic: 'Pumping lemma', subject: 'Theory of Computation', accuracy: 28, attempted: 14 },
  { topic: 'Linear algebra', subject: 'Engineering Mathematics', accuracy: 35, attempted: 17 },
  { topic: 'Cache mapping', subject: 'Computer Organization', accuracy: 42, attempted: 12 },
  { topic: 'LR parsing', subject: 'Compiler Design', accuracy: 46, attempted: 9 },
  { topic: 'Graph theory', subject: 'Discrete Mathematics', accuracy: 49, attempted: 21 },
];

export const sampleRecentAttempts = [
  { id: 'a1', title: 'Sample Mock Test 08', kind: 'mock', date: '2026-11-12', score: 58.7, totalMarks: 100, accuracy: 68, timeTakenSec: 9840 },
  { id: 'a2', title: 'Sample Algorithms practice', kind: 'practice', date: '2026-11-10', score: 14, totalMarks: 20, accuracy: 71, timeTakenSec: 2520 },
  { id: 'a3', title: 'Sample Mock Test 07', kind: 'mock', date: '2026-11-07', score: 55.3, totalMarks: 100, accuracy: 66, timeTakenSec: 10110 },
  { id: 'a4', title: 'Sample AI test: Theory of Computation', kind: 'ai', date: '2026-11-04', score: 9, totalMarks: 20, accuracy: 45, timeTakenSec: 3300 },
  { id: 'a5', title: 'Sample Mock Test 06', kind: 'mock', date: '2026-10-31', score: 53, totalMarks: 100, accuracy: 64, timeTakenSec: 10380 },
];
