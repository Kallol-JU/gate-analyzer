import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { getResult } from '../../api/attempts.api.js';
import Badge from '../../components/ui/Badge.jsx';
import { buttonStyles } from '../../components/ui/Button.jsx';
import Card, { CardHeader } from '../../components/ui/Card.jsx';
import ProgressBar from '../../components/ui/ProgressBar.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Tabs from '../../components/ui/Tabs.jsx';
import { Table, TBody, THead, Td, Th, Tr } from '../../components/ui/Table.jsx';
import StatStrip from '../../features/dashboard/StatStrip.jsx';
import QuestionReviewCard from '../../features/results/QuestionReviewCard.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { formatDate, formatDuration } from '../../utils/formatTime.js';
import { KIND_LABEL, KIND_TONE } from '../../utils/testLabels.js';

export default function ResultPage() {
  const { attemptId } = useParams();
  const res = useAsync(() => getResult(attemptId), [attemptId]);
  const [filter, setFilter] = useState('all');
  useEffect(() => setFilter('all'), [attemptId]);

  if (res.loading) return <div className="grid place-items-center py-20"><Spinner className="size-6 text-primary-600" /></div>;
  if (res.error) {
    // Still in progress: results are not released yet, so send the student back to the exam.
    if (res.error.includes('after you submit')) return <Navigate to={`/exam/${attemptId}`} replace />;
    return (
      <div className="py-16 text-center">
        <h1 className="text-lg font-semibold text-ink-900">Result not available</h1>
        <p className="mt-2 text-sm text-ink-600">{res.error}</p>
        <Link to="/history" className={buttonStyles({ variant: 'secondary', className: 'mt-5' })}>My attempts</Link>
      </div>
    );
  }

  const { test, result: r, review } = res.data;
  const counts = { all: review.length, correct: r.correct, incorrect: r.incorrect, unanswered: r.unanswered };
  const shown = filter === 'all' ? review : review.filter((q) => q.outcome === filter);
  const tabs = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'correct', label: 'Correct', count: counts.correct },
    { id: 'incorrect', label: 'Incorrect', count: counts.incorrect },
    { id: 'unanswered', label: 'Not answered', count: counts.unanswered },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={KIND_TONE[test.kind]}>{KIND_LABEL[test.kind]}</Badge>
          {res.data.autoSubmitted && <Badge tone="danger">Submitted automatically when time ran out</Badge>}
        </div>
        <h1 className="mt-3 font-serif text-3xl font-semibold text-ink-900">{test.title}</h1>
        <p className="mt-1 text-ink-600">Submitted {formatDate(res.data.submittedAt)}</p>
      </div>

      <StatStrip
        stats={[
          { label: 'Score', value: `${r.score} / ${r.totalMarks}` },
          { label: 'Accuracy', value: `${r.accuracy}%`, hint: `${r.correct} of ${r.attempted} attempted` },
          { label: 'Correct · Incorrect · Blank', value: `${r.correct} · ${r.incorrect} · ${r.unanswered}` },
          { label: 'Time taken', value: formatDuration(res.data.timeTakenSec), hint: `of ${test.durationMinutes} min allowed` },
        ]}
      />

      <Card>
        <CardHeader title="Subject-wise performance" />
        <div className="pt-3">
          <Table>
            <THead>
              <Tr>
                <Th>Subject</Th>
                <Th align="right">Correct</Th>
                <Th align="right">Incorrect</Th>
                <Th align="right">Blank</Th>
                <Th align="right">Marks</Th>
                <Th>Accuracy</Th>
              </Tr>
            </THead>
            <TBody>
              {r.subjectBreakdown.map((s) => (
                <Tr key={s.subjectId}>
                  <Td className="font-medium">{s.subjectName}</Td>
                  <Td align="right">{s.correct}</Td>
                  <Td align="right">{s.incorrect}</Td>
                  <Td align="right">{s.unanswered}</Td>
                  <Td align="right">{s.marksObtained} / {s.maxMarks}</Td>
                  <Td className="min-w-36">
                    <div className="flex items-center gap-3">
                      <ProgressBar value={s.accuracy} tone={s.accuracy < 50 ? 'danger' : s.accuracy < 70 ? 'warning' : 'primary'} label={`${s.subjectName} accuracy`} className="w-20" />
                      <span className="w-12 text-sm tabular-nums text-ink-700">{s.accuracy}%</span>
                    </div>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
      </Card>

      <section aria-labelledby="review-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="review-heading" className="text-xl font-semibold text-ink-900">Question review</h2>
          <Tabs tabs={tabs} value={filter} onChange={setFilter} label="Filter questions" />
        </div>
        {shown.length === 0 ? (
          <p className="rounded-lg border border-ink-200 bg-white px-5 py-8 text-center text-sm text-ink-500">No questions in this group.</p>
        ) : (
          shown.map((q) => <QuestionReviewCard key={q.id} q={q} />)
        )}
      </section>

      <div className="flex gap-3">
        <Link to="/history" className={buttonStyles({ variant: 'secondary' })}>My attempts</Link>
        <Link to="/tests" className={buttonStyles()}>Take another test</Link>
      </div>
    </div>
  );
}
