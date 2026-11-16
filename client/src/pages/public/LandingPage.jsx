import { LinkButton } from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';
import HeroExamIllustration from '../../features/landing/HeroExamIllustration.jsx';
import StatusSwatch from '../../features/exam/components/StatusSwatch.jsx';
import { PALETTE_STATUS as S } from '../../features/exam/constants.js';
import { SUBJECTS } from '../../utils/constants.js';

const FEATURES = [
  {
    title: 'Previous-year questions',
    text: 'Filter by year, subject and topic. Every question shows its source paper and year.',
  },
  {
    title: 'Full-length mock tests',
    text: 'Timed papers with fixed question sets and a fixed marking scheme, so scores are comparable.',
  },
  {
    title: 'Subject and topic practice',
    text: 'Work through one topic at a time, without a timer, and read the explanation straight after each question.',
  },
  {
    title: 'AI practice tests',
    text: 'Generate a private test by subject, topic and difficulty. AI questions are always labelled as AI-generated.',
  },
  {
    title: 'Results and analytics',
    text: 'After each attempt, see marks, accuracy, time taken and which topics cost you the most.',
  },
  {
    title: 'Leaderboards, if you want them',
    text: 'Compete on fixed mock tests, or practise privately and stay off the rankings.',
  },
];

const PALETTE_LEGEND = [
  { status: S.NOT_VISITED, label: 'Not visited', text: "You haven't opened the question yet." },
  { status: S.NOT_ANSWERED, label: 'Not answered', text: 'You opened it but left it blank.' },
  { status: S.ANSWERED, label: 'Answered', text: 'You have saved an answer.' },
  { status: S.MARKED, label: 'Marked for review', text: 'Flagged to come back to, no answer yet.' },
  { status: S.ANSWERED_MARKED, label: 'Answered and marked', text: 'Answered, and flagged to double-check.' },
];

const QUESTION_TYPES = [
  { type: 'MCQ', rule: 'One correct option. A wrong answer loses marks (by default 1/3 of the question marks).' },
  { type: 'MSQ', rule: 'One or more correct options. You must select exactly the right set. No negative marking.' },
  { type: 'NAT', rule: 'Type a number using the on-screen keypad. No negative marking.' },
];

const FAIR_PLAY = [
  { title: 'The clock belongs to the server', text: 'Refreshing the page or changing your device time cannot give you extra minutes.' },
  { title: 'Answer keys stay hidden', text: 'During an exam, correct answers are never sent to your browser.' },
  { title: 'Practice stays private', text: 'Only fixed mock tests reach the leaderboard. Everything else is for you alone.' },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-ink-200 bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:py-20">
          <div>
            <h1 className="max-w-xl font-serif text-4xl font-semibold leading-tight text-ink-900 sm:text-5xl">
              Practise GATE CSE on a screen that works like the real exam.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-600">
              Free mock tests, previous-year practice and subject-wise analysis, built around the same question palette,
              timer and question types you will meet on exam day.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton to="/register" size="lg">
                Create free account
              </LinkButton>
              <LinkButton to="/tests" variant="secondary" size="lg">
                Browse tests
              </LinkButton>
            </div>

            <div className="mt-8 flex max-w-xl items-start gap-3 rounded-md bg-ink-100 px-4 py-3 text-sm text-ink-700">
              <Icon name="info" className="mt-0.5 size-4 text-ink-500" />
              <p>
                Early preview. Timed tests, autosave and results work. Dashboard statistics are still sample data, and the question bank is growing.
              </p>
            </div>
          </div>

          <HeroExamIllustration />
        </div>
      </section>

      {/* Features */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="max-w-lg font-serif text-3xl font-semibold text-ink-900">What you will be able to do</h2>
          <dl className="mt-10 grid gap-x-12 gap-y-8 md:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="border-t border-ink-200 pt-4">
                <dt className="font-semibold text-ink-900">{f.title}</dt>
                <dd className="mt-1.5 max-w-md text-ink-600">{f.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Exam screen: palette states and question types */}
      <section className="border-y border-ink-200 bg-ink-50">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="font-serif text-3xl font-semibold text-ink-900">Five question states, always visible</h2>
            <p className="mt-3 max-w-md text-ink-600">
              The palette on the right of the exam shows what you have answered, skipped and flagged. Shapes differ as well as
              colours, so it stays readable for everyone.
            </p>
            <ul className="mt-8 space-y-4">
              {PALETTE_LEGEND.map((item) => (
                <li key={item.status} className="flex items-center gap-4">
                  <StatusSwatch status={item.status} />
                  <p className="text-ink-600">
                    <span className="font-semibold text-ink-900">{item.label}.</span> {item.text}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-serif text-3xl font-semibold text-ink-900">Three question types</h2>
            <p className="mt-3 max-w-md text-ink-600">Default marking is shown below. Each test can set its own scheme.</p>
            <dl className="mt-8 divide-y divide-ink-200 border-y border-ink-200">
              {QUESTION_TYPES.map((q) => (
                <div key={q.type} className="grid grid-cols-[4rem_1fr] gap-4 py-4">
                  <dt className="font-semibold text-primary-700">{q.type}</dt>
                  <dd className="text-ink-600">{q.rule}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Subjects */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-serif text-3xl font-semibold text-ink-900">One question bank for all twelve subjects</h2>
          <ul className="mt-8 grid gap-x-8 gap-y-3 text-ink-700 sm:grid-cols-2 lg:grid-cols-3">
            {SUBJECTS.map((subject) => (
              <li key={subject} className="flex items-center gap-3 border-b border-ink-100 pb-3">
                <Icon name="check" className="size-4 text-primary-600" strokeWidth={2.5} />
                {subject}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Fair play */}
      <section className="border-t border-ink-200 bg-ink-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-serif text-3xl font-semibold text-ink-900">Designed to be fair</h2>
          <p className="mt-3 max-w-lg text-ink-600">These are the rules the real exam will follow once it is built.</p>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {FAIR_PLAY.map((item) => (
              <div key={item.title}>
                <h3 className="font-semibold text-ink-900">{item.title}</h3>
                <p className="mt-1.5 text-ink-600">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="bg-primary-900">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center">
          <h2 className="max-w-md font-serif text-3xl font-semibold text-white">Take your first timed test today.</h2>
          <div className="flex flex-wrap gap-3">
            <LinkButton to="/register" variant="inverse" size="lg">
              Create free account
            </LinkButton>
            <LinkButton to="/tests" variant="outline-inverse" size="lg">
              Browse tests
            </LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}
