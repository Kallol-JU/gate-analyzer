/** Paginated list response: { success, data: [...], meta: { page, limit, total, pages } } */
export function sendPage(res, items, { page, limit, total }) {
  res.json({ success: true, data: items, meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
}

export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Mongoose id -> string; passes strings and undefined through. */
export const idString = (v) => (v == null ? undefined : String(v));
