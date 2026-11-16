import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { listActive, startPractice } from '../../api/attempts.api.js';
import { listSubjects, listTopics } from '../../api/taxonomy.api.js';
import { listTests } from '../../api/tests.api.js';
import Badge from '../../components/ui/Badge.jsx';
import Button, { LinkButton } from '../../components/ui/Button.jsx';
import Card, { CardHeader } from '../../components/ui/Card.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Tabs from '../../components/ui/Tabs.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { KIND_LABEL, KIND_TONE, MODE_LABEL } from '../../utils/testLabels.js';
import { describeApiError } from '../../utils/errorMessage.js';

const TABS = [
  { id: 'mock', label: 'Full mocks', query: { kind: 'mock' } },
  { id: 'pyq', label: 'PYQ papers', query: { kind: 'pyq' } },
  { id: 'subject', label: 'Subject-wise', query: { kind: 'subject' } },
  { id: 'topic', label: 'Topic-wise', query: { kind: 'topic' } },
  { id: 'practice', label: 'Practice', query: { mode: 'practice' } },
];

function TestRow({ test, activeAttempt }) {
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium text-ink-900">{test.title}</h3>
          <Badge tone={KIND_TONE[test.kind]}>{KIND_LABEL[test.kind]}</Badge>
          <Badge>{MODE_LABEL[test.mode]}</Badge>
          {activeAttempt && <Badge tone="warning">In progress</Badge>}
        </div>
        {test.description && <p className="mt-1 text-sm text-ink-600">{test.description}</p>}
        <p className="mt-1 text-sm text-ink-500">
          {test.durationMinutes} min · {test.totalQuestions} questions · {test.totalMarks} marks
        </p>
      </div>
      {activeAttempt ? (
        <LinkButton to={`/exam/${activeAttempt.id}`} size="sm">
          Resume
        </LinkButton>
      ) : (
        <LinkButton to={`/tests/${test.id}`} variant="secondary" size="sm">
          View and start
        </LinkButton>
      )}
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
    <Card>
      <CardHeader title="Build a private practice test" description="Random published questions from the bank. Timed at 3 minutes per question. Never appears on a leaderboard." />
      {activeCustom ? (
        <div className="m-5 flex flex-wrap items-center justify-between gap-3 rounded-md bg-warning-50 px-4 py-3 text-sm text-warning-700">
          <p>You already have a practice test in progress. Finish it before starting another.</p>
          <LinkButton to={`/exam/${activeCustom.id}`} size="sm">
            Resume practice
          </LinkButton>
        </div>
      ) : (
        <form onSubmit={start} className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4" noValidate>
          <Select
            label="Subject"
            placeholder={subjects.loading ? 'Loading…' : 'Choose a subject'}
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            options={(subjects.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
          />
          <Select
            label="Topic (optional)"
            placeholder="All topics"
            value={form.topicId}
            disabled={!subjectId}
            onChange={(e) => setForm((f) => ({ ...f, topicId: e.target.value }))}
            options={topics.map((t) => ({ value: t.id, label: t.name }))}
          />
          <Select
            label="Difficulty (optional)"
            placeholder="Any"
            value={form.difficulty}
            onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
            options={['easy', 'medium', 'hard'].map((d) => ({ value: d, label: d[0].toUpperCase() + d.slice(1) }))}
          />
          <Input
            label="Questions"
            type="number"
            min="5"
            max="30"
            value={form.count}
            onChange={(e) => setForm((f) => ({ ...f, count: e.target.value }))}
          />
          {error && (
            <p role="alert" className="text-sm text-danger-700 sm:col-span-2 lg:col-span-4">
              {error}
            </p>
          )}
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" loading={busy}>
              Start practice
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

export default function TestsPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.id === params.get('tab')) ?? TABS[0];

  const tests = useAsync(() => listTests({ ...tab.query, limit: 50 }), [tab.id]);
  const active = useAsync(listActive, []);
  const activeByTest = useMemo(() => new Map((active.data ?? []).filter((a) => a.testId).map((a) => [a.testId, a])), [active.data]);
  const activeCustom = (active.data ?? []).find((a) => a.kind === 'custom');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-ink-900">Tests</h1>
        <p className="mt-1 text-ink-600">Timed exams that follow the real GATE screen. Your answers are saved as you go.</p>
      </div>

      {(active.data ?? []).length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning-600/30 bg-warning-50 px-4 py-3 text-sm text-warning-700">
          <p>
            You have {active.data.length} exam{active.data.length > 1 ? 's' : ''} in progress.
          </p>
          <Link to="/history" className="font-medium underline underline-offset-2">
            See my attempts
          </Link>
        </div>
      )}

      <Tabs tabs={TABS} value={tab.id} onChange={(id) => setParams({ tab: id })} label="Test categories" />

      {tab.id === 'practice' && <PracticeBuilder activeCustom={activeCustom} />}

      <Card>
        {tab.id === 'practice' && <CardHeader title="Practice tests from your instructors" className="pb-3" />}
        {tests.loading ? (
          <div className="grid place-items-center py-12">
            <Spinner className="size-5 text-primary-600" />
          </div>
        ) : tests.error ? (
          <EmptyState icon="alert" title="Could not load tests" description={tests.error} action={<Button variant="secondary" onClick={tests.reload}>Try again</Button>} />
        ) : tests.data.items.length === 0 ? (
          <EmptyState icon="clipboard" title="No tests here yet" description="Published tests of this type will appear here." />
        ) : (
          <ul className="divide-y divide-ink-100">
            {tests.data.items.map((t) => (
              <TestRow key={t.id} test={t} activeAttempt={activeByTest.get(t.id)} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
