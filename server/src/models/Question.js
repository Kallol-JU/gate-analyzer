import mongoose from 'mongoose';
import {
  defaultNegativeMarks,
  DIFFICULTIES,
  OPTION_KEYS,
  QUESTION_SOURCES,
  QUESTION_STATUSES,
  QUESTION_TYPES,
  validateQuestionRules,
} from '../modules/questions/questionRules.js';

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
    explanation: { type: String, trim: true, maxlength: 5000, select: false },

    marks: { type: Number, required: true },
    negativeMarks: { type: Number },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
    difficulty: { type: String, enum: DIFFICULTIES, default: 'medium' },

    source: { type: String, enum: QUESTION_SOURCES, required: true, default: 'ADMIN' },
    pyq: { type: pyqSchema },
    aiMeta: { model: String, generatedAt: Date }, // filled by the AI generator in a later milestone

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

/** Fields an admin code path must request to see/validate the answer key. */
export const ADMIN_SELECT = '+correctOptions +natAnswer +explanation';

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
  });
  for (const e of errors) this.invalidate(e.path, e.message);
});

export const Question = mongoose.model('Question', questionSchema);
