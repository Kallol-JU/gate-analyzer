import { z } from 'zod';
import { objectId, paginationQuery } from '../../validators/common.js';
import { DIFFICULTIES, OPTION_KEYS, PYQ_MAX_YEAR, PYQ_MIN_YEAR, QUESTION_SOURCES, QUESTION_STATUSES, QUESTION_TYPES, VERIFICATION_STATUSES } from './questionRules.js';

const option = z.object({ key: z.enum(OPTION_KEYS), text: z.string().trim().min(1).max(1000) });

// Zod checks shapes and types. The cross-field rules (exactly one MCQ answer, NAT range, PYQ
// metadata...) live in questionRules.js and are enforced by the model on every save.
export const questionFields = z.object({
  type: z.enum(QUESTION_TYPES),
  statement: z.string().trim().min(1).max(5000),
  code: z.string().max(5000).nullish(),
  options: z.array(option).max(6).default([]),
  correctOptions: z.array(z.enum(OPTION_KEYS)).max(6).default([]),
  natAnswer: z.object({ min: z.number().finite(), max: z.number().finite() }).nullish(),
  explanation: z.string().trim().max(5000).nullish(),
  marks: z.number().positive().max(10),
  negativeMarks: z.number().min(0).max(10).optional(),
  subjectId: objectId,
  topicId: objectId,
  difficulty: z.enum(DIFFICULTIES).default('medium'),
  source: z.enum(QUESTION_SOURCES).default('ADMIN'),
  pyq: z.object({ year: z.number().int().min(PYQ_MIN_YEAR).max(PYQ_MAX_YEAR), session: z.string().trim().min(1).max(40) }).nullish(),
  status: z.enum(QUESTION_STATUSES).default('draft'),
  visibility: z.enum(['public', 'private']).default('public'),

  // Rich metadata and solution (all optional; existing questions have none of it).
  conceptTags: z.array(z.string().trim().min(1).max(60)).max(8).optional(),
  relatedConcepts: z.array(z.string().trim().min(1).max(80)).max(8).optional(),
  estimatedTimeSeconds: z.number().int().min(10).max(1800).nullish(),
  learningObjective: z.string().trim().max(500).nullish(),
  solutionSteps: z.array(z.string().trim().min(1).max(600)).max(12).optional(),
  optionAnalysis: z.array(z.object({ key: z.enum(OPTION_KEYS), analysis: z.string().trim().min(1).max(600) })).max(6).optional(),
  commonMistakes: z.array(z.string().trim().min(1).max(400)).max(6).optional(),
  sourceReference: z
    .object({
      paperName: z.string().trim().max(200).optional(),
      paperUrl: z.string().trim().url().max(500).optional(),
      answerKeyRef: z.string().trim().max(500).optional(),
      questionNumber: z.string().trim().max(20).optional(),
      notes: z.string().trim().max(500).optional(),
    })
    .nullish(),
  inspiredByQuestionId: objectId.nullish(),
  inspirationNote: z.string().trim().max(600).nullish(),
  // Only draft or pending_review can be set here. "verified" and "rejected" are set by the review endpoints,
  // which record who did it.
  verificationStatus: z.enum(['draft', 'pending_review']).optional(),
});

export const questionCreate = questionFields;
export const questionUpdate = questionFields.partial();

const filters = {
  subjectId: objectId.optional(),
  topicId: objectId.optional(),
  type: z.enum(QUESTION_TYPES).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  source: z.enum(QUESTION_SOURCES).optional(),
  year: z.coerce.number().int().min(PYQ_MIN_YEAR).max(PYQ_MAX_YEAR).optional(),
  q: z.string().trim().min(1).max(100).optional(),
};

export const adminQuestionQuery = paginationQuery.extend({
  ...filters,
  status: z.enum(QUESTION_STATUSES).optional(),
  verificationStatus: z.enum(VERIFICATION_STATUSES).optional(),
  tag: z.string().trim().min(1).max(60).optional(),
  batchId: objectId.optional(),
});
// Students cannot filter by status: they only ever see published, public questions.
export const studentQuestionQuery = paginationQuery.extend(filters);
