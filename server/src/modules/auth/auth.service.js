import bcrypt from 'bcrypt';
import { User } from '../../models/User.js';
import { ApiError } from '../../utils/ApiError.js';

const COST = 12;

let dummyHash;
/** Compared against when the email is unknown so response time does not reveal which emails exist. */
async function getDummyHash() {
  dummyHash ??= await bcrypt.hash('not-a-real-password-1', COST);
  return dummyHash;
}

export async function registerUser({ name, email, password, showOnLeaderboard }) {
  const passwordHash = await bcrypt.hash(password, COST);
  try {
    // role is never taken from the request: public sign-up always creates a student.
    return await User.create({ name, email, passwordHash, role: 'student', showOnLeaderboard });
  } catch (err) {
    if (err?.code === 11000) throw new ApiError(409, 'EMAIL_TAKEN', 'An account with this email already exists.');
    throw err;
  }
}

export async function verifyCredentials(email, password) {
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = await bcrypt.compare(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  return user;
}
