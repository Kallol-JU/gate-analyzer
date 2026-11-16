import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { listActive, startAttempt } from '../../api/attempts.api.js';
import { getTest } from '../../api/tests.api.js';
import Badge from '../../components/ui/Badge.jsx';
import Button, { buttonStyles } from '../../components/ui/Button.jsx';
import Card, { CardHeader } from '../../components/ui/Card.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { describeApiError } from '../../utils/errorMessage.js';
import { formatMarkValue } from '../../utils/formatTime.js';
import { KIND_LABEL, KIND_TONE, MODE_LABEL } from '../../utils/testLabels.js';

function negativeText(marking) {
  if (!marking.negativeMarkingEnabled) return 'There is no negative marking in this test.';
  if (marking.useQuestionNegativeMarks) return 'A wrong MCQ answer loses the negative marks shown on that question.';
  const f = marking.mcqNegativeFraction;
  return `A wrong MCQ answer loses ${f === 1 / 3 ? '1/3' : formatMarkValue(f)} of that question's marks (for example ${formatMarkValue(Math.round(f * 2 * 10000) / 10000)} for a 2-mark question).`;
}

export default function TestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const test = useAsync(() => getTest(id), [id]);
  const active = useAsync(listActive, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const inProgress = (active.data ?? []).find((a) => a.testId === id);

  async function start() {
    setBusy(true);
    setError('');
    try {
      const { attempt } = await startAttempt(id);
      navigate(`/exam/${attempt.id}`);
    } catch (err) {
      setError(describeApiError(err));
      setBusy(false);
    }
  }

  if (test.loading) return <div className="grid place-items-center py-20"><Spinner className="size-6 text-primary-600" /></div>;
  if (test.error) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-lg font-semibold text-ink-900">Test not found</h1>
        <p className="mt-2 text-sm text-ink-600">{test.error}</p>
        <Link to="/tests" className={buttonStyles({ variant: 'secondary', className: 'mt-5' })}>Back to tests</Link>
      </div>
    );
  }

  const t = test.data;
  const rules = [
    `The exam lasts ${t.durationMinutes} minutes. The countdown is kept by the server, so refreshing the page or changing your device clock does not change it.`,
    'Your answers are saved automatically. If you refresh or lose your connection, they are kept and sent when you are back online.',
    'The exam is submitted automatically when time runs out. You can also submit earlier from the Submit button.',
    'After you submit you will see your score, the correct answers and explanations. They are not shown during the exam.',
    t.mode === 'competitive'
      ? 'This is a competitive test with fixed questions and a fixed marking scheme.'
      : 'This is a practice test. Nothing here affects any ranking.',
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/tests" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900">
        <Icon name="arrow-left" className="size-4" />
        All tests
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={KIND_TONE[t.kind]}>{KIND_LABEL[t.kind]}</Badge>
          <Badge>{MODE_LABEL[t.mode]}</Badge>
        </div>
        <h1 className="mt-3 font-serif text-3xl font-semibold text-ink-900">{t.title}</h1>
        {t.description && <p className="mt-2 text-ink-600">{t.description}</p>}
      </div>

      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200">
        {[['Duration', `${t.durationMinutes} min`], ['Questions', t.totalQuestions], ['Total marks', t.totalMarks]].map(([k, v]) => (
          <div key={k} className="bg-white px-5 py-4">
            <dt className="text-sm text-ink-500">{k}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-ink-900">{v}</dd>
          </div>
        ))}
      </dl>

      <Card>
        <CardHeader title="Sections" />
        <ul className="divide-y divide-ink-100 pt-3">
          {t.sections.map((s) => (
            <li key={s.name} className="flex justify-between px-5 py-3 text-sm">
              <span className="text-ink-800">{s.name}</span>
              <span className="tabular-nums text-ink-500">{s.questionCount} questions</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Marking" />
        <ul className="space-y-2 px-5 pb-5 pt-3 text-sm text-ink-700">
          <li><span className="font-semibold">MCQ:</span> one correct option. {negativeText(t.marking)}</li>
          <li><span className="font-semibold">MSQ:</span> one or more correct options. You must select exactly the right set. No partial marks and no negative marking.</li>
          <li><span className="font-semibold">NAT:</span> type a number using the keypad. No negative marking.</li>
        </ul>
      </Card>

      <Card>
        <CardHeader title="Before you begin" />
        <ul className="list-disc space-y-2 py-3 pl-10 pr-5 text-sm text-ink-700">
          {rules.map((r) => <li key={r}>{r}</li>)}
        </ul>
      </Card>

      {error && <p role="alert" className="rounded-md bg-danger-50 px-4 py-3 text-sm text-danger-700">{error}</p>}

      {inProgress ? (
        <div className="flex flex-wrap items-center gap-3">
          <Link to={`/exam/${inProgress.id}`} className={buttonStyles({ size: 'lg' })}>Resume exam</Link>
          <p className="text-sm text-ink-600">You started this exam earlier. The clock has kept running.</p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={start} loading={busy}>Start exam</Button>
          <p className="text-sm text-ink-600">The timer starts as soon as you click.</p>
        </div>
      )}
    </div>
  );
}
