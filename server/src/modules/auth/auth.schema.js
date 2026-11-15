import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Enter a valid email address.').max(254);

// bcrypt only uses the first 72 bytes, so longer passwords are rejected rather than silently truncated.
export const passwordRule = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(72, 'Use at most 72 characters.')
  .regex(/[A-Za-z]/, 'Include at least one letter.')
  .regex(/\d/, 'Include at least one number.');

export const registerBody = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(80),
  email,
  password: passwordRule,
  showOnLeaderboard: z.boolean().default(true),
});

export const loginBody = z.object({
  email,
  password: z.string().min(1, 'Enter your password.').max(72),
});
