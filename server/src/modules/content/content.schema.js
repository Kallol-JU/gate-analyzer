import { z } from 'zod';
import { objectId, paginationQuery } from '../../validators/common.js';
import { questionFields } from '../questions/question.schema.js';

// One imported question: the normal fields, but taxonomy by NAME or slug (portable between databases),
// and no way to choose the publication state (imports are always drafts).
const importItem = questionFields
  .omit({ subjectId: true, topicId: true, status: true, visibility: true })
  .extend({ subject: z.string().trim().min(2).max(100), topic: z.string().trim().min(2).max(120) });

export const importBody = z.object({
  items: z.array(importItem).min(1).max(200),
  dryRun: z.boolean().default(true), // safe by default: validate only
});

export const verifyBody = z.object({ notes: z.string().trim().max(1000).optional(), acknowledgeAiDisagreement: z.boolean().default(false) });
export const rejectBody = z.object({ reason: z.string().trim().min(3).max(500) });

export const bulkBody = z.object({
  action: z.enum(['verify', 'publish', 'unpublish', 'reject', 'revalidate']),
  ids: z.array(objectId).min(1).max(100),
  reason: z.string().trim().min(3).max(500).optional(),
  acknowledgeAiDisagreement: z.boolean().default(false),
});

export const generateBody = z.object({
  subjectId: objectId,
  topicId: objectId,
  counts: z.object({ MCQ: z.number().int().min(0).max(50).default(0), MSQ: z.number().int().min(0).max(50).default(0), NAT: z.number().int().min(0).max(50).default(0) }),
  difficulty: z.enum(['easy', 'medium', 'hard', 'very_hard']),
  style: z.enum(['PYQ_INSPIRED', 'ADVANCED']),
  concepts: z.array(z.string().trim().min(2).max(80)).max(10).default([]),
  referenceQuestionId: objectId.optional(),
});

export const batchListQuery = paginationQuery;
