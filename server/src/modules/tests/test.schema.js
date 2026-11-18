import { z } from 'zod';
import { objectId, paginationQuery } from '../../validators/common.js';
import { DIFFICULTIES, QUESTION_SOURCES, QUESTION_TYPES } from '../questions/questionRules.js';
import { DEFAULT_MARKING, TEST_KINDS, TEST_MODES, TEST_STATUSES } from './testRules.js';

const section = z.object({
  name: z.string().trim().min(1).max(100),
  questionIds: z.array(objectId).max(200).default([]),
});

const count = z.number().int().min(0).max(65).default(0);

export const testFields = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).optional(),
  kind: z.enum(TEST_KINDS),
  mode: z.enum(TEST_MODES),
  durationMinutes: z.number().int().min(1).max(600),
  sections: z.array(section).max(10).default([]),
  scope: z.object({ subjectId: objectId, topicId: objectId.optional() }).optional(),
  blueprint: z
    .object({
      subjectId: objectId.optional(),
      topicId: objectId.optional(),
      difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
      counts: z.object({ MCQ: count, MSQ: count, NAT: count }),
    })
    .optional(),
  marking: z
    .object({
      negativeMarkingEnabled: z.boolean().default(DEFAULT_MARKING.negativeMarkingEnabled),
      mcqNegativeFraction: z.number().min(0).max(1).default(DEFAULT_MARKING.mcqNegativeFraction),
      useQuestionNegativeMarks: z.boolean().default(false),
    })
    .default({}),
});

export const testCreate = testFields;
export const testUpdate = testFields.partial();

export const adminTestQuery = paginationQuery.extend({
  status: z.enum(TEST_STATUSES).optional(),
  kind: z.enum(TEST_KINDS).optional(),
  mode: z.enum(TEST_MODES).optional(),
});
export const studentTestQuery = paginationQuery.extend({
  kind: z.enum(TEST_KINDS).optional(),
  mode: z.enum(TEST_MODES).optional(),
});

// Builds a DRAFT test by selecting published, verified questions that match the filters.
export const testBuildBody = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).optional(),
  kind: z.enum(TEST_KINDS.filter((k) => k !== 'ai_practice')),
  mode: z.enum(TEST_MODES),
  durationMinutes: z.number().int().min(1).max(600).optional(),
  template: z.enum(['gate_full_mock']).optional(), // 65 questions, 100 marks, 180 min
  filters: z
    .object({
      subjectIds: z.array(objectId).max(20).default([]),
      topicIds: z.array(objectId).max(50).default([]),
      sources: z.array(z.enum(QUESTION_SOURCES)).max(5).default([]),
      difficulties: z.array(z.enum(DIFFICULTIES)).max(4).default([]),
      types: z.array(z.enum(QUESTION_TYPES)).max(3).default([]),
      year: z.number().int().min(1987).max(2100).optional(),
    })
    .default({}),
  count: z.number().int().min(1).max(200).optional(), // total questions, when no typeCounts
  typeCounts: z.object({ MCQ: z.number().int().min(0).max(200).default(0), MSQ: z.number().int().min(0).max(200).default(0), NAT: z.number().int().min(0).max(200).default(0) }).optional(),
  balanceBySubject: z.boolean().default(false),
  allowPartial: z.boolean().default(false), // create the test even if the bank has fewer questions than requested
  seed: z.number().int().optional(), // makes the random selection repeatable
});
