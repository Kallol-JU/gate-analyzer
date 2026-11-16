import mongoose from 'mongoose';

const { Schema } = mongoose;

// Everything marked `immutable` is frozen when the attempt is created: later edits to the live
// question bank or the test cannot change an existing attempt, its marks or its result.
const optionSnap = new Schema({ key: String, text: String }, { _id: false });

const questionSnap = new Schema(
  {
    qid: { type: Schema.Types.ObjectId, required: true },
    type: { type: String, enum: ['MCQ', 'MSQ', 'NAT'], required: true },
    statement: { type: String, required: true },
    code: String,
    options: [optionSnap],
    marks: { type: Number, required: true },
    negativeMarks: { type: Number, default: 0 }, // effective value, frozen from the test's marking scheme
    sectionIndex: { type: Number, required: true },
    subjectId: Schema.Types.ObjectId,
    subjectName: String,
    topicId: Schema.Types.ObjectId,
    topicName: String,
  },
  { _id: false },
);

const answerKeySnap = new Schema(
  { correctOptions: [String], natAnswer: { type: new Schema({ min: Number, max: Number }, { _id: false }) }, explanation: String },
  { _id: false },
);

const responseSchema = new Schema(
  {
    answer: { type: Schema.Types.Mixed, default: null }, // MCQ: "B"  MSQ: ["A","C"]  NAT: "4.5"  none: null
    visited: { type: Boolean, default: false },
    marked: { type: Boolean, default: false },
    seq: { type: Number, default: 0 }, // client-side counter; stale or out-of-order saves are ignored
    updatedAt: Date,
  },
  { _id: false },
);

const resultSchema = new Schema(
  {
    score: Number,
    totalMarks: Number,
    correct: Number,
    incorrect: Number,
    unanswered: Number,
    attempted: Number,
    accuracy: Number,
    subjectBreakdown: [
      new Schema(
        { subjectId: Schema.Types.ObjectId, subjectName: String, totalQuestions: Number, correct: Number, incorrect: Number, unanswered: Number, marksObtained: Number, maxMarks: Number, accuracy: Number },
        { _id: false },
      ),
    ],
    perQuestion: [new Schema({ outcome: { type: String, enum: ['correct', 'incorrect', 'unanswered'] }, marksAwarded: Number }, { _id: false })],
  },
  { _id: false },
);

const attemptSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    testId: { type: Schema.Types.ObjectId, ref: 'Test', immutable: true }, // absent for custom private practice
    kind: { type: String, required: true, immutable: true }, // test kind, or 'custom' for private practice
    mode: { type: String, enum: ['competitive', 'practice'], required: true, immutable: true },

    testSnapshot: {
      type: new Schema(
        {
          title: String,
          kind: String,
          mode: String,
          durationMinutes: Number,
          marking: { negativeMarkingEnabled: Boolean, mcqNegativeFraction: Number, useQuestionNegativeMarks: Boolean },
          totalQuestions: Number,
          totalMarks: Number,
          sections: [new Schema({ name: String, startIndex: Number, count: Number }, { _id: false })],
        },
        { _id: false },
      ),
      required: true,
      immutable: true,
    },
    questions: { type: [questionSnap], immutable: true },
    // ANSWER KEY (index-aligned with `questions`). select:false: never loaded unless asked for with +answerKey.
    answerKey: { type: [answerKeySnap], select: false, immutable: true },

    status: { type: String, enum: ['in_progress', 'submitted', 'auto_submitted'], default: 'in_progress' },
    startedAt: { type: Date, required: true, immutable: true },
    expiresAt: { type: Date, required: true, immutable: true }, // computed by the server at creation
    submittedAt: Date,
    timeTakenSec: Number,

    responses: [responseSchema], // index-aligned with `questions`
    version: { type: Number, default: 0 }, // bumped on every save; finalisation is conditional on it
    result: resultSchema,
  },
  { timestamps: true, strict: true },
);

attemptSchema.index({ userId: 1, startedAt: -1 });
attemptSchema.index({ status: 1, expiresAt: 1 }); // sweeper
// At most one active attempt per test per student (also closes the double-click race on "Start").
attemptSchema.index({ userId: 1, testId: 1 }, { unique: true, partialFilterExpression: { status: 'in_progress', testId: { $exists: true } } });
// At most one active custom practice attempt per student.
attemptSchema.index({ userId: 1 }, { unique: true, name: 'one_active_custom', partialFilterExpression: { status: 'in_progress', kind: 'custom' } });

export const TestAttempt = mongoose.model('TestAttempt', attemptSchema);
