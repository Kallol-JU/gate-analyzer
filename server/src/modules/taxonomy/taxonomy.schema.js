import { z } from 'zod';
import { objectId } from '../../validators/common.js';

const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens.').max(80);

export const subjectCreate = z.object({
  name: z.string().trim().min(2).max(100),
  slug: slug.optional(),
  order: z.number().int().min(0).optional(),
});
export const subjectUpdate = subjectCreate.partial();

export const topicCreate = z.object({
  subjectId: objectId,
  name: z.string().trim().min(2).max(120),
  slug: slug.optional(),
});
// A topic cannot be moved to another subject (its questions would become inconsistent).
export const topicUpdate = topicCreate.omit({ subjectId: true }).partial();

export const topicListQuery = z.object({ subjectId: objectId.optional() });
