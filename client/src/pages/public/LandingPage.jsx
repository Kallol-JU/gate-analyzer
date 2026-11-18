import { LinkButton } from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';
import HeroExamIllustration from '../../features/landing/HeroExamIllustration.jsx';
import { SUBJECTS } from '../../utils/constants.js';
import Logo from '../../components/ui/Logo.jsx';

const PILLARS = [
  {
    number: '01',
    title: 'Exam-style timed tests',
    text: 'Work through a timed paper, move between questions and keep track of what you have answered or marked for review.',
    icon: 'clock',
  },
  {
    number: '02',
    title: 'Focused subject practice',
    text: 'Choose a subject or topic and spend your time strengthening one part of the syllabus at a time.',
    icon: 'book',
  },
  {
    number: '03',
    title: 'Review every attempt',
    text: 'Return to your completed attempts, review your performance and use the results to decide what to practise next.',
    icon: 'chart',
  },
];

const QUESTION_TYPES = [
  { type: 'MCQ', detail: 'Choose one correct option.' },
  { type: 'MSQ', detail: 'Select the complete set of correct options.' },
  { type: 'NAT', detail: 'Enter a numerical answer.' },
];

const STEPS = [
  { title: 'Create your account', text: 'Sign in to keep your tests and attempts together.' },
  { title: 'Choose how to practise', text: 'Pick an available test or build a focused practice session.' },
  { title: 'Learn from the attempt', text: 'Review your result and use it to guide your next session.' },
];

export default function LandingPage() {
  return (
    <div className="overflow-hidden bg-white">
      {/* Hero */}
      <section className="relative border-b border-ink-200">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_78%_30%,rgba(42,71,196,0.08),transparent_42%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50 px-3 py-1.5 text-xs font-semibold tracking-wide text-primary-700">
              <Logo showText={false} markClassName="size-5" />
              PREPGATE · GATE CSE PREPARATION
            </div>
            <h1 className="mt-6 max-w-2xl font-display text-4xl font-normal leading-[1.08] tracking-tight text-ink-900 sm:text-5xl lg:text-[3.85rem]">
              Your GATE CSE prep,
              <span className="block italic text-primary-700">one focused session at a time.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-ink-600">
              PrepGate brings your GATE CSE practice into one focused workspace. Take timed tests, strengthen subjects and topics, and learn from every attempt.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton to="/register" size="lg" className="shadow-sm">
                Get started for free <Icon name="arrow-right" className="size-4" />
              </LinkButton>
              <LinkButton to="/login" variant="secondary" size="lg">
                Log in
              </LinkButton>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-ink-500">
              <span className="inline-flex items-center gap-2"><Icon name="check" className="size-4 text-success-600" /> Timed and practice modes</span>
              <span className="inline-flex items-center gap-2"><Icon name="check" className="size-4 text-success-600" /> MCQ, MSQ and NAT</span>
              <span className="inline-flex items-center gap-2"><Icon name="check" className="size-4 text-success-600" /> Attempt history</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[34rem]">
            <div className="absolute -inset-5 rounded-[2rem] bg-primary-50/80 blur-2xl" />
            <div className="relative rounded-2xl border border-ink-200 bg-white p-3 shadow-[0_24px_70px_-34px_rgba(20,26,38,0.35)] sm:p-5">
              <div className="mb-4 flex items-center justify-between border-b border-ink-100 pb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-400">The test experience</p>
                  <p className="mt-1 text-sm font-semibold text-ink-800">A familiar exam workspace</p>
                </div>
                <span className="rounded-full bg-success-50 px-2.5 py-1 text-xs font-medium text-success-700">Autosave enabled</span>
              </div>
              <HeroExamIllustration />
              <div className="mt-4 grid grid-cols-3 divide-x divide-ink-200 rounded-xl border border-ink-200 bg-ink-50 py-3">
                {QUESTION_TYPES.map((item) => (
                  <div key={item.type} className="px-2 text-center">
                    <p className="text-sm font-bold text-primary-700">{item.type}</p>
                    <p className="mt-1 text-[11px] leading-4 text-ink-500">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <p className="relative mt-3 text-center text-xs text-ink-400">Illustrative view of the question palette and exam interface.</p>
          </div>
        </div>
      </section>

      {/* Value proposition */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-700">A better way to practise</p>
          <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight text-ink-900 sm:text-4xl">
            Everything you need to make each study session count.
          </h2>
          <p className="mt-4 leading-7 text-ink-600">
            Build consistency with a clear practice loop: attempt questions, understand your performance, and return to the topics that need more work.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PILLARS.map((item) => (
            <article key={item.number} className="group rounded-xl border border-ink-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-primary-200 hover:shadow-lg hover:shadow-primary-900/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-[0.16em] text-ink-400">{item.number}</span>
                <span className="grid size-10 place-items-center rounded-lg bg-primary-50 text-primary-700">
                  <Icon name={item.icon} className="size-5" />
                </span>
              </div>
              <h3 className="mt-6 text-lg font-semibold text-ink-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-600">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Question formats */}
      <section className="border-y border-ink-200 bg-ink-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-700">Built around the exam format</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight text-ink-900 sm:text-4xl">
              Practise all three GATE question types.
            </h2>
            <p className="mt-4 leading-7 text-ink-600">
              Get comfortable with selecting options, handling multiple correct answers and entering numerical responses.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {QUESTION_TYPES.map((item) => (
              <div key={item.type} className="rounded-xl border border-ink-200 bg-white p-5">
                <span className="inline-flex rounded-md bg-primary-50 px-2.5 py-1 text-sm font-bold text-primary-700">{item.type}</span>
                <p className="mt-4 text-sm leading-6 text-ink-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subject coverage */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-700">CSE syllabus areas</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold text-ink-900 sm:text-4xl">Organise your preparation by subject.</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-ink-500">Explore the subject areas available in the platform and focus your practice where it matters most.</p>
        </div>
        <ul className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SUBJECTS.map((subject, index) => (
            <li key={subject} className="flex min-h-14 items-center gap-3 rounded-lg border border-ink-200 bg-white px-4 py-3 text-sm font-medium text-ink-700">
              <span className="grid size-7 shrink-0 place-items-center rounded-md bg-ink-50 text-xs font-semibold text-ink-500">{String(index + 1).padStart(2, '0')}</span>
              {subject}
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section className="border-t border-ink-200 bg-ink-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-700">Get started</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold text-ink-900 sm:text-4xl">A simple routine. Steady progress.</h2>
          </div>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative border-t-2 border-primary-200 pt-5">
                <span className="text-xs font-bold tracking-[0.16em] text-primary-700">STEP 0{index + 1}</span>
                <h3 className="mt-3 font-semibold text-ink-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-600">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Honest positioning and CTA */}
      <section className="bg-primary-900">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-14 sm:px-6 sm:py-16 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-200">Start preparing today</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight text-white sm:text-4xl">Prepare with purpose. Practise with confidence.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-primary-100">Start building a consistent GATE CSE routine with PrepGate.</p>
          </div>
          <LinkButton to="/register" variant="inverse" size="lg" className="shrink-0">
            Create your free account <Icon name="arrow-right" className="size-4" />
          </LinkButton>
        </div>
      </section>
      <div className="border-t border-ink-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs leading-5 text-ink-500 sm:px-6">
          PrepGate is an independent preparation platform and is not affiliated with or endorsed by the GATE organising institutes. Content availability may vary as the question bank is expanded.
        </div>
      </div>
    </div>
  );
}
