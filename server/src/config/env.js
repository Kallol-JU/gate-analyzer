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
