const str = (v) => (v == null ? undefined : String(v));
const plain = (t) => (typeof t?.toObject === 'function' ? t.toObject() : t);

function base(t) {
  return {
    id: str(t._id ?? t.id),
    title: t.title,
    description: t.description || undefined,
    kind: t.kind,
    mode: t.mode,
    durationMinutes: t.durationMinutes,
    marking: t.marking ? { negativeMarkingEnabled: t.marking.negativeMarkingEnabled, mcqNegativeFraction: t.marking.mcqNegativeFraction } : undefined,
    totalQuestions: t.totalQuestions,
    totalMarks: t.totalMarks,
    distribution: t.distribution
      ? { byType: t.distribution.byType, bySubject: (t.distribution.bySubject ?? []).map((s) => ({ subjectId: str(s.subjectId), count: s.count })) }
      : undefined,
    scope: t.scope?.subjectId ? { subjectId: str(t.scope.subjectId), topicId: str(t.scope.topicId) } : undefined,
  };
}

/** Student view: metadata only. Question ids and answers are never included. */
export function toStudentTest(doc) {
  const t = plain(doc);
  return { ...base(t), sections: (t.sections ?? []).map((s) => ({ name: s.name, questionCount: (s.questionIds ?? []).length })), publishedAt: t.publishedAt };
}

export function toAdminTest(doc) {
  const t = plain(doc);
  return {
    ...base(t),
    sections: (t.sections ?? []).map((s) => ({ name: s.name, questionIds: (s.questionIds ?? []).map(String) })),
    blueprint: t.blueprint?.counts ? { ...t.blueprint, subjectId: str(t.blueprint.subjectId), topicId: str(t.blueprint.topicId) } : undefined,
    status: t.status,
    publishedAt: t.publishedAt,
    createdBy: str(t.createdBy),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}
