import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { listActive, startPractice } from '../../api/attempts.api.js';
import { listSubjects, listTopics } from '../../api/taxonomy.api.js';
import { listTests } from '../../api/tests.api.js';
import Badge from '../../components/ui/Badge.jsx';
import Button, { LinkButton } from '../../components/ui/Button.jsx';
import Card, { CardHeader } from '../../components/ui/Card.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Tabs from '../../components/ui/Tabs.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { KIND_LABEL, KIND_TONE, MODE_LABEL } from '../../utils/testLabels.js';
import { describeApiError } from '../../utils/errorMessage.js';

// PYQ papers are intentionally omitted until verified, licensed papers are available.
const TABS = [
  { id: 'mock', label: 'Mock tests', query: { kind: 'mock' } },
  { id: 'subject', label: 'Subject-wise', query: { kind: 'subject' } },
  { id: 'topic', label: 'Topic-wise', query: { kind: 'topic' } },
  { id: 'advanced', label: 'Advanced', query: { kind: 'advanced' } },
  { id: 'practice', label: 'Practice', query: { mode: 'practice' } },
];

function displayTitle(title = '') {
  return title
    .replace(/^demo\s+/i, '')
    .replace(/\s*\(practice content\)/i, '')
    .trim();
}

function isSampleDescription(description = '') {
  return /generated sample content for development and practice/i.test(description);
}

function TestRow({ test, activeAttempt }) {
  const shortMock = test.kind === 'mock' && test.totalQuestions < 65;
  const sampleContent = isSampleDescription(test.description);
  const description = sampleContent
    ? 'Original practice questions designed to build GATE CSE problem-solving skills.'
    : test.description;

  return (
    <li className="group flex flex-col gap-4 px-5 py-5 transition-colors hover:bg-ink-50/70 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold tracking-tight text-ink-900">{displayTitle(test.title)}</h3>
          <Badge tone={shortMock ? 'neutral' : KIND_TONE[test.kind]}>
            {shortMock ? 'Short mock' : KIND_LABEL[test.kind]}
          </Badge>
          {test.mode && <Badge>{MODE_LABEL[test.mode] ?? test.mode}</Badge>}
          {activeAttempt && <Badge tone="warning">In progress</Badge>}
        </div>
        {description && <p className="mt-1.5 max-w-3xl text-sm leading-6 text-ink-600">{description}</p>}
        {sampleContent && (
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-ink-500">
            <Icon name="info" className="size-3.5" /> Original content · Not an official GATE paper
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-500">
          <span className="inline-flex items-center gap-1.5"><Icon name="clock" className="size-4" />{test.durationMinutes} min</span>
          <span className="inline-flex items-center gap-1.5"><Icon name="list" className="size-4" />{test.totalQuestions} questions</span>
          <span className="inline-flex items-center gap-1.5"><Icon name="target" className="size-4" />{test.totalMarks} marks</span>
        </div>
      </div>
      <div className="flex shrink-0 sm:pl-4">
        {activeAttempt ? (
          <LinkButton to={`/exam/${activeAttempt.id}`} size="sm">Resume test <span aria-hidden="true">→</span></LinkButton>
        ) : (
          <LinkButton to={`/tests/${test.id}`} variant="secondary" size="sm">View details <span aria-hidden="true">→</span></LinkButton>
        )}
      </div>
    </li>
  );
}

/** Private practice from the question bank (never competitive, never ranked). */
function PracticeBuilder({ activeCustom }) {
  const navigate = useNavigate();
  const subjects = useAsync(listSubjects, []);
  const [subjectId, setSubjectId] = useState('');
  const [topics, setTopics] = useState([]);
  const [form, setForm] = useState({ topicId: '', difficulty: '', count: '10' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setTopics([]);
    setForm((f) => ({ ...f, topicId: '' }));
    if (subjectId) listTopics(subjectId).then(setTopics).catch(() => setTopics([]));
  }, [subjectId]);

  async function start(e) {
    e.preventDefault();
    setError('');
    const count = Number(form.count);
    if (!subjectId) return setError('Choose a subject.');
    if (!Number.isInteger(count) || count < 5 || count > 30) return setError('Choose between 5 and 30 questions.');
    setBusy(true);
    try {
      const { attempt } = await startPractice({
        subjectId,
        count,
        ...(form.topicId && { topicId: form.topicId }),
        ...(form.difficulty && { difficulty: form.difficulty }),
      });
      navigate(`/exam/${attempt.id}`);
    } catch (err) {
      setError(describeApiError(err));
      setBusy(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Build a practice session"
        description="Create a private session from published questions. Choose a subject, narrow it to a topic, or focus on a difficulty."
        className="px-5 pt-5 sm:px-6"
      />
      {activeCustom ? (
        <div className="m-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-warning-50 px-4 py-3 text-sm text-warning-700 sm:m-6">
          <p>You have a practice session in progress. Resume it before starting another.</p>
          <LinkButton to={`/exam/${activeCustom.id}`} size="sm">Resume practice</LinkButton>
        </div>
      ) : (
        <form onSubmit={start} className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4" noValidate>
          <Select label="Subject" placeholder={subjects.loading ? 'Loading…' : 'Choose a subject'} value={subjectId} onChange={(e) => setSubjectId(e.target.value)} options={(subjects.data ?? []).map((s) => ({ value: s.id, label: s.name }))} />
          <Select label="Topic" placeholder="All topics" value={form.topicId} disabled={!subjectId} onChange={(e) => setForm((f) => ({ ...f, topicId: e.target.value }))} options={topics.map((t) => ({ value: t.id, label: t.name }))} />
          <Select label="Difficulty" placeholder="Any level" value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))} options={[['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard'], ['very_hard', 'Very hard']].map(([value, label]) => ({ value, label }))} />
          <Input label="Number of questions" type="number" min="5" max="30" value={form.count} onChange={(e) => setForm((f) => ({ ...f, count: e.target.value }))} />
          {error && <p role="alert" className="text-sm text-danger-700 sm:col-span-2 lg:col-span-4">{error}</p>}
          <div className="sm:col-span-2 lg:col-span-4"><Button type="submit" loading={busy}>Start practice <span aria-hidden="true">→</span></Button></div>
        </form>
      )}
    </Card>
  );
}

export default function TestsPage() {
  const [params, setParams] = useSearchParams();
  const requestedTab = params.get('tab');
  const tab = TABS.find((t) => t.id === requestedTab) ?? TABS[0];

  useEffect(() => {
    if (requestedTab && !TABS.some((t) => t.id === requestedTab)) setParams({ tab: 'mock' }, { replace: true });
  }, [requestedTab, setParams]);

  const tests = useAsync(() => listTests({ ...tab.query, limit: 50 }), [tab.id]);
  const active = useAsync(listActive, []);
  const activeByTest = useMemo(() => new Map((active.data ?? []).filter((a) => a.testId).map((a) => [a.testId, a])), [active.data]);
  const activeCustom = (active.data ?? []).find((a) => a.kind === 'custom');
  const availableCount = tests.data?.items?.length ?? 0;

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-3 border-b border-ink-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-700">GATE CSE preparation</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">Test library</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600 sm:text-base">Choose a mock, focus on a subject, or practise a specific topic. Your progress is saved as you work.</p>
        </div>
        <Link to="/history" className="inline-flex items-center gap-2 self-start text-sm font-medium text-primary-700 hover:text-primary-800 sm:self-auto">
          <Icon name="history" className="size-4" /> View attempt history <span aria-hidden="true">→</span>
        </Link>
      </header>

      {(active.data ?? []).length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning-600/25 bg-warning-50 px-4 py-3 text-sm text-warning-700">
          <p className="inline-flex items-center gap-2"><Icon name="clock" className="size-4" /> You have {active.data.length} test{active.data.length === 1 ? '' : 's'} in progress.</p>
          <Link to="/history" className="font-semibold underline underline-offset-2">Review active attempts</Link>
        </div>
      )}

      <section aria-label="Test categories" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs tabs={TABS} value={tab.id} onChange={(id) => setParams({ tab: id })} label="Test categories" className="max-w-full overflow-x-auto pb-1" />
          {!tests.loading && !tests.error && (
            <p className="shrink-0 text-xs text-ink-500">{availableCount} {availableCount === 1 ? 'test' : 'tests'} available</p>
          )}
        </div>

        {tab.id === 'practice' && <PracticeBuilder activeCustom={activeCustom} />}

        <Card className="overflow-hidden">
          {tests.loading ? (
            <div className="grid place-items-center py-16"><Spinner className="size-6 text-primary-600" /></div>
          ) : tests.error ? (
            <EmptyState icon="alert" title="Tests could not be loaded" description={tests.error} action={<Button variant="secondary" onClick={tests.reload}>Try again</Button>} />
          ) : tests.data.items.length === 0 ? (
            <EmptyState icon="clipboard" title="No tests available yet" description="There are no published tests in this category right now. Choose another category or check back after new tests are published." />
          ) : (
            <ul className="divide-y divide-ink-100">
              {tests.data.items.map((test) => <TestRow key={test.id} test={test} activeAttempt={activeByTest.get(test.id)} />)}
            </ul>
          )}
        </Card>
      </section>

      <p className="text-xs leading-5 text-ink-500">Test availability and question counts reflect the published question bank. Original practice content is not presented as an official GATE paper.</p>
    </div>
  );
}
