import 'dotenv/config';
import { z } from 'zod';

/** Validated once at startup. The process exits with a readable message if anything is wrong. */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: z
    .string({ required_error: 'MONGODB_URI is required' })
    .regex(/^mongodb(\+srv)?:\/\//, 'must start with mongodb:// or mongodb+srv://'),
  JWT_SECRET: z.string({ required_error: 'JWT_SECRET is required' }).min(32, 'must be at least 32 characters'),
  JWT_EXPIRES_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).optional(),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  REGISTER_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  // AI question generation (optional). Without GEMINI_API_KEY the AI endpoints report "not configured".
  GEMINI_API_KEY: z.string().trim().min(10).optional().or(z.literal('').transform(() => undefined)),
  // Gemini retired gemini-2.5-flash for new users; normalize existing .env files too.
  GEMINI_MODEL: z.string().trim().min(3).default('gemini-3.8-flash').transform((model) =>
    model === 'gemini-2.5-flash' ? 'gemini-3.8-flash' : model
  ),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().min(5000).max(180000).default(60000),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(1024).max(32768).default(8192),
  AI_MAX_RETRIES: z.coerce.number().int().min(0).max(4).default(2),
  AI_CHUNK_SIZE: z.coerce.number().int().min(1).max(10).default(5), // questions per model call
  AI_MAX_BATCH_QUESTIONS: z.coerce.number().int().min(1).max(50).default(10), // questions per admin request
  AI_DAILY_QUESTION_LIMIT: z.coerce.number().int().min(1).max(2000).default(100), // per admin, per UTC day
  AI_VERIFY_ENABLED: z.enum(['true', 'false']).default('true').transform((v) => v === 'true'),
  ADMIN_NAME: z.string().trim().min(2).max(80).default('Admin'),
  ADMIN_EMAIL: z.string().trim().toLowerCase().email().optional().or(z.literal('').transform(() => undefined)),
  ADMIN_PASSWORD: z.string().min(8).max(72).optional().or(z.literal('').transform(() => undefined)),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  console.error('See server/.env.example for the required values.');
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
