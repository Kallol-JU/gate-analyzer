import mongoose from 'mongoose';
import {
  DEFAULT_MARKING,
  TEST_KINDS,
  TEST_MODES,
  TEST_STATUSES,
  validateTestConfig,
} from '../modules/tests/testRules.js';

const { Schema } = mongoose;

const sectionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    questionIds: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
  },
  { _id: false },
);

const testSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000 },
    kind: { type: String, enum: TEST_KINDS, required: true },
    // competitive = public, fixed questions, counts for leaderboards. practice = private practice.
    mode: { type: String, enum: TEST_MODES, required: true },
    durationMinutes: { type: Number, required: true },

    sections: { type: [sectionSchema], default: [] },
    scope: { subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' }, topicId: { type: Schema.Types.ObjectId, ref: 'Topic' } },
    // Template for AI practice tests (questions are generated per student in a later milestone).
    blueprint: {
      subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
      topicId: { type: Schema.Types.ObjectId, ref: 'Topic' },
      difficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
      counts: { MCQ: { type: Number, min: 0, max: 65 }, MSQ: { type: Number, min: 0, max: 65 }, NAT: { type: Number, min: 0, max: 65 } },
    },

    marking: {
      negativeMarkingEnabled: { type: Boolean, default: DEFAULT_MARKING.negativeMarkingEnabled },
      mcqNegativeFraction: { type: Number, default: DEFAULT_MARKING.mcqNegativeFraction, min: 0, max: 1 },
    },

    // Computed by the server from the questions; never accepted from clients.
    totalQuestions: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    distribution: {
      byType: { MCQ: { type: Number, default: 0 }, MSQ: { type: Number, default: 0 }, NAT: { type: Number, default: 0 } },
      bySubject: [{ _id: false, subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' }, count: Number }],
    },

    status: { type: String, enum: TEST_STATUSES, default: 'draft' },
    publishedAt: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

testSchema.index({ status: 1, mode: 1, kind: 1 });

// Plain-object view used by the shared pure rules.
export function testToPlain(doc) {
  const o = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const s = (v) => (v == null ? undefined : String(v));
  return {
    kind: o.kind,
    mode: o.mode,
    durationMinutes: o.durationMinutes,
    sections: (o.sections ?? []).map((x) => ({ name: x.name, questionIds: (x.questionIds ?? []).map(String) })),
    scope: { subjectId: s(o.scope?.subjectId), topicId: s(o.scope?.topicId) },
    blueprint: o.blueprint?.counts ? { ...o.blueprint, subjectId: s(o.blueprint.subjectId), topicId: s(o.blueprint.topicId) } : undefined,
    marking: o.marking,
  };
}

testSchema.pre('validate', function () {
  for (const e of validateTestConfig(testToPlain(this))) this.invalidate(e.path, e.message);
});

export const Test = mongoose.model('Test', testSchema);
