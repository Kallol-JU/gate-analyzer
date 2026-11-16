// Pure functions. Whitelist serializers: the exam view can never contain the answer key.
import { remainingMs } from './attemptRules.js';

const str = (v) => (v == null ? undefined : String(v));
const plain = (a) => (typeof a?.toObject === 'function' ? a.toObject() : a);

export function timing(a, now) {
  return {
    startedAt: a.startedAt,
    expiresAt: a.expiresAt,
    serverNow: new Date(now).toISOString(),
    remainingMs: remainingMs(a.expiresAt, now),
    remainingSeconds: Math.ceil(remainingMs(a.expiresAt, now) / 1000),
  };
}

const testInfo = (t) => ({
  title: t.title, kind: t.kind, mode: t.mode, durationMinutes: t.durationMinutes,
  totalQuestions: t.totalQuestions, totalMarks: t.totalMarks, marking: t.marking, sections: t.sections,
});

/** In-progress view: questions without keys, plus the student's saved responses and server timing. */
export function toExamView(doc, now = Date.now()) {
  const a = plain(doc);
  return {
    id: str(a._id),
    status: a.status,
    test: testInfo(a.testSnapshot),
    questions: a.questions.map((q) => ({
      id: str(q.qid),
      type: q.type,
      statement: q.statement,
      code: q.code || undefined,
      options: (q.options ?? []).map((o) => ({ key: o.key, text: o.text })),
      marks: q.marks,
      negativeMarks: q.negativeMarks,
      sectionIndex: q.sectionIndex,
    })),
    responses: a.responses.map((r) => ({ answer: r.answer ?? null, visited: Boolean(r.visited), marked: Boolean(r.marked), seq: r.seq ?? 0 })),
    timing: timing(a, now),
  };
}

/** Lightweight listing item (history, active attempts). No questions, no responses. */
export function toSummary(doc, now = Date.now()) {
  const a = plain(doc);
  const closed = a.status !== 'in_progress';
  return {
    id: str(a._id),
    testId: str(a.testId),
    title: a.testSnapshot.title,
    kind: a.kind,
    mode: a.mode,
    status: a.status,
    startedAt: a.startedAt,
    submittedAt: a.submittedAt,
    expiresAt: a.expiresAt,
    remainingSeconds: closed ? 0 : Math.ceil(remainingMs(a.expiresAt, now) / 1000),
    timeTakenSec: a.timeTakenSec,
    result: closed && a.result
      ? { score: a.result.score, totalMarks: a.result.totalMarks, correct: a.result.correct, incorrect: a.result.incorrect, unanswered: a.result.unanswered, accuracy: a.result.accuracy }
      : undefined,
  };
}

/** Completed view with the answer review. Only ever called for attempts that are no longer in progress. */
export function toResultView(doc) {
  const a = plain(doc);
  const r = a.result;
  return {
    id: str(a._id),
    status: a.status,
    autoSubmitted: a.status === 'auto_submitted',
    test: testInfo(a.testSnapshot),
    startedAt: a.startedAt,
    submittedAt: a.submittedAt,
    timeTakenSec: a.timeTakenSec,
    result: {
      score: r.score, totalMarks: r.totalMarks, correct: r.correct, incorrect: r.incorrect, unanswered: r.unanswered,
      attempted: r.attempted, accuracy: r.accuracy,
      subjectBreakdown: r.subjectBreakdown.map((s) => ({ ...s, subjectId: str(s.subjectId) })),
    },
    review: a.questions.map((q, i) => {
      const key = a.answerKey?.[i] ?? {};
      return {
        number: i + 1,
        id: str(q.qid),
        type: q.type,
        statement: q.statement,
        code: q.code || undefined,
        options: (q.options ?? []).map((o) => ({ key: o.key, text: o.text })),
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        sectionIndex: q.sectionIndex,
        subjectName: q.subjectName,
        topicName: q.topicName,
        yourAnswer: a.responses[i]?.answer ?? null,
        correctOptions: key.correctOptions ?? [],
        natAnswer: key.natAnswer ? { min: key.natAnswer.min, max: key.natAnswer.max } : undefined,
        explanation: key.explanation || undefined,
        outcome: r.perQuestion[i]?.outcome,
        marksAwarded: r.perQuestion[i]?.marksAwarded,
      };
    }),
  };
}
