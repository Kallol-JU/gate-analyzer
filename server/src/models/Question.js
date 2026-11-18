import mongoose from 'mongoose';
import {
  defaultNegativeMarks,
  DIFFICULTIES,
  OPTION_KEYS,
  QUESTION_SOURCES,
  QUESTION_STATUSES,
  QUESTION_TYPES,
  validateQuestionRules,
  VERIFICATION_STATUSES,
} from '../modules/questions/questionRules.js';
import { contentHash } from '../modules/content/duplicateDetection.js';

const { Schema } = mongoose;

const optionSchema = new Schema({ key: { type: String, enum: OPTION_KEYS, required: true }, text: { type: String, required: true, trim: true, maxlength: 1000 } }, { _id: false });
const natSchema = new Schema({ min: { type: Number, required: true }, max: { type: Number, required: true } }, { _id: false });
const pyqSchema = new Schema({ year: { type: Number, required: true }, session: { type: String, required: true, trim: true, maxlength: 40 } }, { _id: false });

const questionSchema = new Schema(
  {
    type: { type: String, enum: QUESTION_TYPES, required: true },
    statement: { type: String, required: true, trim: true, maxlength: 5000 },
    code: { type: String, maxlength: 5000 },
    options: { type: [optionSchema], default: [] },

    // ANSWER KEY. select:false means these are excluded from every query unless an admin code path
    // asks for them with '+correctOptions +natAnswer +explanation'. The student serializer is a
    // second, independent barrier.
    correctOptions: { type: [String], default: [], select: false },
    natAnswer: { type: natSchema, select: false },
    explanation: { type: String, trim: true, maxlength: 5000, select: false }, // the final explanation

    // RICH SOLUTION (all admin-only, same protection as the key): never sent to students while an exam runs.
    solutionSteps: { type: [{ type: String, maxlength: 600 }], default: undefined, select: false },
    optionAnalysis: { type: [new Schema({ key: { type: String, enum: OPTION_KEYS }, analysis: { type: String, maxlength: 600 } }, { _id: false })], default: undefined, select: false },
    commonMistakes: { type: [{ type: String, maxlength: 400 }], default: undefined, select: false },

    // Metadata (backward compatible: every field is optional, so existing questions are valid as they are).
    conceptTags: { type: [{ type: String, trim: true, lowercase: true, maxlength: 60 }], default: undefined },
    relatedConcepts: { type: [{ type: String, trim: true, maxlength: 80 }], default: undefined },
    estimatedTimeSeconds: { type: Number, min: 10, max: 1800 },
    learningObjective: { type: String, trim: true, maxlength: 500 },

    marks: { type: Number, required: true },
    negativeMarks: { type: Number },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
    difficulty: { type: String, enum: DIFFICULTIES, default: 'medium' },

    source: { type: String, enum: QUESTION_SOURCES, required: true, default: 'ADMIN' },
    pyq: { type: pyqSchema },
    // Where the content comes from. For PYQ: the official paper and answer key. For PYQ_INSPIRED: the internal
    // link to the pattern it was modelled on (never shown to students). For AI content: how it was generated.
    sourceReference: { paperName: String, paperUrl: String, answerKeyRef: String, questionNumber: String, notes: String },
    inspiredByQuestionId: { type: Schema.Types.ObjectId, ref: 'Question' },
    inspirationNote: { type: String, maxlength: 600 },
    aiMeta: { model: String, generatedAt: Date, batchId: Schema.Types.ObjectId, promptVersion: String, style: String },

    // Content-correctness review, separate from `status` (student visibility). Absent on legacy questions.
    verificationStatus: { type: String, enum: VERIFICATION_STATUSES },
    review: { verifiedBy: Schema.Types.ObjectId, verifiedAt: Date, rejectedReason: { type: String, maxlength: 500 }, notes: { type: String, maxlength: 1000 } },
    // Latest automated check: { checkedAt, errors, warnings, duplicates, aiVerification } (admin-only).
    validation: { type: Schema.Types.Mixed, select: false },
    contentHash: { type: String, index: true }, // normalised-content fingerprint for duplicate detection

    status: { type: String, enum: QUESTION_STATUSES, default: 'draft' },
    visibility: { type: String, enum: ['public', 'private'], default: 'public' },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User' }, // owner of private (AI) questions
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

questionSchema.index({ status: 1, visibility: 1, subjectId: 1, topicId: 1 });
questionSchema.index({ source: 1, 'pyq.year': 1 });
questionSchema.index({ ownerId: 1 });
questionSchema.index({ verificationStatus: 1, source: 1, createdAt: -1 });
questionSchema.index({ conceptTags: 1 });

/** Fields an admin code path must request to see/validate the answer key. */
export const ADMIN_SELECT = '+correctOptions +natAnswer +explanation';
/** Everything an admin review tool needs: the key plus the rich solution and the validation report. */
export const ADMIN_FULL_SELECT = `${ADMIN_SELECT} +solutionSteps +optionAnalysis +commonMistakes +validation`;

// All structural rules live in questionRules.js so they are shared and unit-tested.
questionSchema.pre('validate', function () {
  if (this.negativeMarks == null && this.type && Number.isFinite(this.marks)) {
    this.negativeMarks = defaultNegativeMarks(this.type, this.marks);
  }
  const errors = validateQuestionRules({
    type: this.type,
    options: this.options.map((o) => ({ key: o.key, text: o.text })),
    correctOptions: [...this.correctOptions],
    natAnswer: this.natAnswer ? { min: this.natAnswer.min, max: this.natAnswer.max } : undefined,
    marks: this.marks,
    negativeMarks: this.negativeMarks,
    source: this.source,
    pyq: this.pyq ? { year: this.pyq.year, session: this.pyq.session } : undefined,
    status: this.status,
    verificationStatus: this.verificationStatus,
    // explanation is select:false; if this document was loaded without it, do not report it as missing.
    explanation: this.isSelected('explanation') ? this.explanation : 'not loaded',
    sourceReference: this.sourceReference ? { paperUrl: this.sourceReference.paperUrl, answerKeyRef: this.sourceReference.answerKeyRef } : undefined,
    inspiredByQuestionId: this.inspiredByQuestionId,
  });
  this.contentHash = contentHash({ statement: this.statement, code: this.code, options: this.options.map((o) => ({ key: o.key, text: o.text })) });
  for (const e of errors) this.invalidate(e.path, e.message);
});

export const Question = mongoose.model('Question', questionSchema);
