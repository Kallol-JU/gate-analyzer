// Pure functions. The student view is an explicit WHITELIST: a field that is not listed here can
// never reach a student, even if it is added to the model later.

const str = (v) => (v == null ? undefined : String(v));
const plain = (q) => (typeof q?.toObject === 'function' ? q.toObject() : q);

export function toStudentQuestion(doc) {
  const q = plain(doc);
  return {
    id: str(q._id ?? q.id),
    type: q.type,
    statement: q.statement,
    code: q.code || undefined,
    options: (q.options ?? []).map((o) => ({ key: o.key, text: o.text })),
    marks: q.marks,
    negativeMarks: q.negativeMarks,
    subjectId: str(q.subjectId),
    topicId: str(q.topicId),
    difficulty: q.difficulty,
    source: q.source,
    pyq: q.source === 'PYQ' && q.pyq ? { year: q.pyq.year, session: q.pyq.session } : undefined,
  };
}

/** Full view for admins only: includes the answer key and explanation. */
export function toAdminQuestion(doc) {
  const q = plain(doc);
  return {
    id: str(q._id ?? q.id),
    type: q.type,
    statement: q.statement,
    code: q.code || undefined,
    options: (q.options ?? []).map((o) => ({ key: o.key, text: o.text })),
    correctOptions: q.correctOptions ?? [],
    natAnswer: q.natAnswer ? { min: q.natAnswer.min, max: q.natAnswer.max } : undefined,
    explanation: q.explanation || undefined,
    marks: q.marks,
    negativeMarks: q.negativeMarks,
    subjectId: str(q.subjectId),
    topicId: str(q.topicId),
    difficulty: q.difficulty,
    source: q.source,
    pyq: q.pyq ? { year: q.pyq.year, session: q.pyq.session } : undefined,
    status: q.status,
    visibility: q.visibility,
    ownerId: str(q.ownerId),
    createdBy: str(q.createdBy),
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  };
}
