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
The topic list is a working summary of the GATE CS syllabus. Verify it against the official brochure and edit through the admin API.

## Tests

```bash
npm test
```

| File | Needs | Covers |
|---|---|---|
| `questionRules`, `testRules`, `serializers` | nothing | question/test rules, negative-marking, publish rules, answer-key stripping |
| `health`, `ratelimit` | `npm install` | envelope, CSRF guard, 401s, DB status, login rate limit |
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
