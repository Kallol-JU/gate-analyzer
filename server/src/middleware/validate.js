import { ApiError } from '../utils/ApiError.js';

/**
 * validate({ body, query, params }) parses each part with its Zod schema and replaces
 * req.body / req.query / req.params with the parsed (stripped, coerced) result.
 * Unknown keys are dropped by Zod, so clients cannot smuggle extra fields (e.g. role).
 */
export const validate = (schemas) => (req, _res, next) => {
  for (const part of ['params', 'query', 'body']) {
    if (!schemas[part]) continue;
    const result = schemas[part].safeParse(req[part] ?? {});
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
      return next(new ApiError(400, 'VALIDATION_ERROR', 'Invalid request.', details));
    }
    req[part] = result.data;
  }
  return next();
};
