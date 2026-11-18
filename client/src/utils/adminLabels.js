export const SOURCE_LABEL = { PYQ: 'Authentic PYQ', PYQ_INSPIRED: 'PYQ-inspired', ADVANCED: 'Advanced original', AI: 'AI', ADMIN: 'Admin-written' };
export const SOURCE_TONE = { PYQ: 'success', PYQ_INSPIRED: 'purple', ADVANCED: 'primary', AI: 'purple', ADMIN: 'neutral' };
export const VERIFICATION_LABEL = { draft: 'Draft', pending_review: 'Pending review', verified: 'Verified', rejected: 'Rejected' };
export const VERIFICATION_TONE = { draft: 'neutral', pending_review: 'warning', verified: 'success', rejected: 'danger' };
export const DIFFICULTY_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard', very_hard: 'Very hard' };
export const STATUS_TONE = { draft: 'neutral', pending: 'warning', published: 'success' };
export const options = (labels) => Object.entries(labels).map(([value, label]) => ({ value, label }));
