# GATE CBT server

Express 4 + Mongoose 8 (MongoDB Atlas). Node.js 20 or newer.

## Setup

```bash
cd server
npm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```

Fill in `.env` (the server refuses to start with a clear message if something is missing):

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | yes | Atlas > Connect > Drivers. Include a database name (`/gate_cbt`). In Atlas > Network Access allow your IP (or `0.0.0.0/0` for Render). |
| `JWT_SECRET` | yes | 32+ random characters: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CLIENT_ORIGIN` | no | Exact frontend origin for CORS. Default `http://localhost:5173` |
| `JWT_EXPIRES_DAYS` | no | Login lifetime, default 7 |
| `COOKIE_SAME_SITE` | no | Default `lax` in development, `none` (+Secure) in production |
| `LOGIN_RATE_LIMIT_MAX`, `REGISTER_RATE_LIMIT_MAX` | no | Defaults 10 failed logins per 15 min, 20 sign-ups per hour, per IP |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | seed only | First admin, see below |

## Run

```bash
npm run seed    # once: 12 subjects, starter topics, and the first admin if ADMIN_* are set
npm run dev     # http://localhost:5000
npm start       # production
```

There is no public admin sign-up. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD`, run `npm run seed`, then delete `ADMIN_PASSWORD` from `.env`. The seed is idempotent and can be re-run.
Then, for development content (needed to see any test or use private practice), run `npm run seed:demo` (see below).
The topic list is a working summary of the GATE CS syllabus. Verify it against the official brochure and edit through the admin API.

## Tests

```bash
npm test
```

| File | Needs | Covers |
|---|---|---|
| `questionRules`, `testRules`, `serializers`, `attemptRules`, `attemptSerializer` | nothing | question/test rules, publish rules, **evaluation (MCQ/MSQ/NAT, negative marking, tolerance, subject breakdown)**, answer validation, timing helpers, snapshot immutability, answer-key stripping |
| `health`, `ratelimit` | `npm install` | envelope, CSRF guard, 401s, DB status, login rate limit |
| `attempts` | `npm install` **and** `TEST_MONGODB_URI` | exam engine: concurrent start, server-side expiry, refresh recovery, autosave (stale/out-of-order/simultaneous), ownership, key protection, exactly-once submit, expiry + grace + sweeper, snapshot immutability, private practice, history |
| `api` | `npm install` **and** `TEST_MONGODB_URI` | register/login/logout/me, cookie flags, role escalation, admin authorization, taxonomy/question/test CRUD, publish rules, locking, no answer-key leaks |

`api.test.js` is skipped unless `TEST_MONGODB_URI` is set. Use a throwaway database whose name contains `test` (for example a free Atlas cluster database `gate_cbt_test`, or local `mongodb://127.0.0.1:27017/gate_cbt_test`). **The database is wiped before and after the run**, and the test refuses to start otherwise.

```bash
TEST_MONGODB_URI="mongodb://127.0.0.1:27017/gate_cbt_test" npm test      # PowerShell: $env:TEST_MONGODB_URI="..."; npm test
```

## API (all under `/api/v1`)

Responses: `{ success: true, data, meta? }` or `{ success: false, error: { code, message, details? } }`.
Every non-GET request needs the header `X-Requested-With: gate-cbt` (CSRF protection; the client sends it automatically).

| Area | Endpoints |
|---|---|
| Health | `GET /health` (`status: ok` or `degraded`, `database.status`) |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Taxonomy (public) | `GET /subjects`, `GET /subjects/:id/topics` |
| Questions (logged in) | `GET /questions`, `GET /questions/:id`. Published and public only, **no answer key** |
| Tests (logged in) | `GET /tests`, `GET /tests/:id`. Published only, metadata only (no question ids) |
| Attempts (logged in, owner only) | `POST /attempts {testId}` start or resume, `POST /attempts/practice` private practice from the bank, `GET /attempts/active`, `GET /attempts` history, `GET /attempts/:id` (exam view, no key), `GET /attempts/:id/status`, `PUT /attempts/:id/responses` batch autosave, `POST /attempts/:id/submit` (idempotent), `GET /attempts/:id/result` (answers and explanations, only after submission) |
| Admin (role `admin`) | `/admin/subjects`, `/admin/topics`, `/admin/questions`: `GET`, `POST`, `PATCH /:id`, `DELETE /:id`. `/admin/tests`: same, plus `POST /:id/publish`, `/unpublish`, `/clone` |

Admin list endpoints accept `page`, `limit` and filters (questions: `subjectId`, `topicId`, `type`, `difficulty`, `source`, `status`, `year`, `q`; tests: `status`, `kind`, `mode`).

## Rules enforced by the server

- **Questions**: MCQ has exactly one correct option; MSQ at least one; NAT needs a numeric `{min, max}` range and no options. `source: PYQ` requires `pyq.year` and `pyq.session`; AI and admin questions cannot carry them. Default negative marks are 1/3 of the marks for MCQ and 0 for MSQ/NAT. A topic must belong to the question's subject. Statuses: `draft`, `pending`, `published`.
- **Answer key**: `correctOptions`, `natAnswer` and `explanation` are `select: false` in the model, and student responses go through a whitelist serializer.
- **Tests**: kinds `mock`, `subject`, `topic`, `pyq`, `ai_practice`; modes `competitive` and `practice`. Totals and distribution are computed from the questions. Publishing requires every question to exist, be published and be public (PYQ tests: PYQ questions only; subject/topic tests: matching questions only). A published competitive test is locked (only title and description can change). AI practice tests can be created as drafts but not published until AI generation exists.
- **Marking** (`marking.negativeMarkingEnabled`, `marking.mcqNegativeFraction`) overrides per-question negative marks for the test. Evaluation uses it in the exam-engine milestone.
- **Deletion guards**: a subject with topics/questions, a topic with questions, a question used by any test, and a published test cannot be deleted.

## Auth design

Login sets an HttpOnly cookie (`gate_token`, HS256 JWT, `Secure` in production). The user and role are re-read from the database on every request. Passwords use bcrypt (cost 12), 8 to 72 characters with a letter and a number. Unknown email and wrong password give the same error. Login counts only failed attempts toward the rate limit.
This replaces the earlier plan of short access token + refresh token with a single cookie to keep the first milestone simple; the trade-off is that logging out clears the cookie but cannot revoke a copied token before it expires.

## Exam engine design

- **Server-authoritative time**: `expiresAt = startedAt + duration`, both computed by the server when the attempt is created and frozen (`immutable`). Every response carries `serverNow` and remaining time. The client counts down from the server's report using a monotonic clock, re-syncing every 30 s and when the tab becomes visible.
- **Expiry**: saves are accepted up to 5 s after expiry (network grace); later writes finalise the attempt as `auto_submitted` and return 409. Expired attempts are also finalised lazily on any read or list, and by a 30 s sweeper job (`jobs/attemptSweeper.js`). Time taken is capped at the allowed duration.
- **Autosave safety**: each question carries a client `seq`. The server applies an update only if its `seq` is higher than the stored one (atomic conditional write), so retries, duplicates, out-of-order and simultaneous requests are harmless.
- **Exactly-once submit**: `finalizeAttempt` evaluates, then closes with `findOneAndUpdate({ status: 'in_progress', version })`. Only one caller wins; a save that lands mid-evaluation changes `version` and forces re-evaluation. A closed attempt is returned unchanged. A partial unique index allows one active attempt per student per test (and one active private practice).
- **Snapshot**: questions, options, marks, effective negative marks and the answer key are copied into the attempt at start (`answerKey` is `select: false`). Later edits to questions or tests never change an attempt or its result.
- **Marking**: negative marks are frozen per question from the test's `marking` (fraction of marks for MCQ; or each question's own value if `marking.useQuestionNegativeMarks`). MSQ is exact-set only; NAT uses the question's `{min, max}` range as its tolerance; only MCQ can lose marks. Accuracy = correct / attempted.
- Existing data: `Test.marking.useQuestionNegativeMarks` is a new optional field (default `false`); existing tests and users are untouched. `TestAttempt` is a new collection.

## Demo content seed (development only)

```bash
npm run seed              # once: subjects and topics (required first)
npm run seed:demo -- --dry-run    # preview: writes nothing
npm run seed:demo         # create the demo questions and tests
```

Creates, on a fresh database: **72 questions** (24 MCQ, 24 MSQ, 24 NAT; 6 per subject across 2 topics each) and **26 published tests**: 2 full mocks (competitive, 36 questions, 120 min), 12 subject-wise and 12 topic-wise tests (practice mode). The questions are also what private practice draws from (`source: ADMIN`, `status: published`, `visibility: public`).

- **Demo content, not GATE content**: every question is original, has no PYQ year/session, and ends its explanation with a demo notice. Test descriptions say the same.
- **Idempotent and non-destructive**: insert-only. A question is identified by (subject, topic, statement), a test by (title, kind). Existing records are never updated or deleted, so re-running creates nothing new (output: `0 created, N already existed`), and your edits are preserved.
- **Existing references only**: subjects and topics are looked up (by slug, then name). Missing ones are reported and skipped; they are never created.
- **No admin required**: `createdBy` is set to the first admin user if one exists, otherwise left empty. Only database access is needed.
- Refuses to run when `NODE_ENV=production` unless `--allow-production` is passed. Exit code 2 means something was skipped (see the warnings).
- Every test is checked with the same rules as the admin publish endpoint before it is created.
