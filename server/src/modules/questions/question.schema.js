import { z } from 'zod';
import { objectId, paginationQuery } from '../../validators/common.js';
import { DIFFICULTIES, OPTION_KEYS, PYQ_MAX_YEAR, PYQ_MIN_YEAR, QUESTION_SOURCES, QUESTION_STATUSES, QUESTION_TYPES } from './questionRules.js';

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

export const adminQuestionQuery = paginationQuery.extend({ ...filters, status: z.enum(QUESTION_STATUSES).optional() });
// Students cannot filter by status: they only ever see published, public questions.
export const studentQuestionQuery = paginationQuery.extend(filters);
