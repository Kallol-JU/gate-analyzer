// Pure functions: choose questions for a test from a pool, and describe the GATE full-length structure.

/**
 * GATE CS paper structure used by the full-mock template: 65 questions, 100 marks, 180 minutes.
 * General Aptitude: 10 questions (5 x 1 mark, 5 x 2 marks) = 15 marks.
 * Core subjects: 55 questions (25 x 1 mark, 30 x 2 marks) = 85 marks.
 * Verify against the official information brochure of the exam year before relying on it.
 */
export const GATE_FULL_MOCK = {
  durationMinutes: 180,
  totalQuestions: 65,
  totalMarks: 100,
  sections: [
    { name: 'General Aptitude', subjects: ['General Aptitude'], quotas: [{ marks: 1, count: 5 }, { marks: 2, count: 5 }] },
    { name: 'Computer Science and Information Technology', excludeSubjects: ['General Aptitude'], balanceBySubject: true, quotas: [{ marks: 1, count: 25 }, { marks: 2, count: 30 }] },
  ],
};

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const shuffle = (arr, rng) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** pool item: { id, type, marks, subjectId, topicId, difficulty, source, year } */
export function matchesFilters(q, f = {}) {
  const has = (list) => Array.isArray(list) && list.length > 0;
  if (has(f.subjectIds) && !f.subjectIds.includes(q.subjectId)) return false;
  if (has(f.excludeSubjectIds) && f.excludeSubjectIds.includes(q.subjectId)) return false;
  if (has(f.topicIds) && !f.topicIds.includes(q.topicId)) return false;
  if (has(f.sources) && !f.sources.includes(q.source)) return false;
  if (has(f.difficulties) && !f.difficulties.includes(q.difficulty)) return false;
  if (has(f.types) && !f.types.includes(q.type)) return false;
  if (f.year != null && q.year !== f.year) return false;
  return true;
}

/**
 * sections: [{ name, filters, balanceBySubject?, quotas: [{ count, marks?, type? }] }]
 * Picks distinct random questions (never the same question twice in one test).
 * Returns { sections: [{ name, questionIds }], shortages: [{ section, quota, requested, found }] }.
 */
export function selectQuestions({ pool, sections, rng = Math.random }) {
  const used = new Set();
  const shortages = [];
  const out = sections.map((section) => {
    const picked = [];
    for (const quota of section.quotas) {
      const candidates = pool.filter(
        (q) => !used.has(q.id) && matchesFilters(q, section.filters) && (quota.marks == null || q.marks === quota.marks) && (quota.type == null || q.type === quota.type),
      );
      let chosen;
      if (section.balanceBySubject) {
        // Round-robin across subjects so no single subject dominates the section.
        const bySubject = new Map();
        for (const q of shuffle(candidates, rng)) (bySubject.get(q.subjectId) ?? bySubject.set(q.subjectId, []).get(q.subjectId)).push(q);
        const queues = shuffle([...bySubject.values()], rng);
        chosen = [];
        while (chosen.length < quota.count && queues.some((x) => x.length)) for (const queue of queues) if (queue.length && chosen.length < quota.count) chosen.push(queue.shift());
      } else {
        chosen = shuffle(candidates, rng).slice(0, quota.count);
      }
      chosen.forEach((q) => used.add(q.id));
      if (chosen.length < quota.count) shortages.push({ section: section.name, quota, requested: quota.count, found: chosen.length });
      picked.push(...chosen.map((q) => q.id));
    }
    return { name: section.name, questionIds: picked };
  });
  return { sections: out.filter((s) => s.questionIds.length > 0), shortages };
}

/** Turns the template's subject NAMES into subject ids using a name -> id map. */
export function resolveTemplate(template, subjectIdByName) {
  // A subject the template names but the database lacks must match NOTHING (an empty filter would match everything).
  const ids = (names) => {
    if (!names?.length) return [];
    const found = names.map((n) => subjectIdByName.get(n)).filter(Boolean);
    return found.length ? found : ['__missing_subject__'];
  };
  return template.sections.map((s) => ({
    name: s.name,
    balanceBySubject: s.balanceBySubject,
    quotas: s.quotas,
    filters: { subjectIds: ids(s.subjects), excludeSubjectIds: ids(s.excludeSubjects) },
  }));
}
