import { z } from 'zod';
import { OPTION_KEYS } from '../questions/questionRules.js';
import { objectId, paginationQuery } from '../../validators/common.js';

export const startBody = z.object({ testId: objectId });

export const practiceBody = z.object({
  subjectId: objectId,
  topicId: objectId.optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  count: z.number().int().min(5).max(30),
});

const update = z.object({
  index: z.number().int().min(0).max(199),
  // Shape only; the answer is validated against the question's type and options in the service.
  answer: z.union([z.null(), z.string().max(20), z.array(z.enum(OPTION_KEYS)).max(6)]),
  marked: z.boolean(),
  visited: z.boolean(),
  seq: z.number().int().min(1).max(1_000_000_000),
});

export const saveBody = z.object({ updates: z.array(update).min(1).max(100) });

export const historyQuery = paginationQuery.extend({ status: z.enum(['in_progress', 'submitted', 'auto_submitted']).optional() });
