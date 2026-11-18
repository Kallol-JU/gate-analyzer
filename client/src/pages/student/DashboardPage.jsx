import { Link } from 'react-router-dom';
import { getDashboardAnalytics } from '../../api/dashboard.api.js';
import Badge from '../../components/ui/Badge.jsx';
import Button, { LinkButton } from '../../components/ui/Button.jsx';
import { Card, CardHeader } from '../../components/ui/Card.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import RecentAttemptsTable from '../../features/dashboard/RecentAttemptsTable.jsx';
import ScoreTrendChart from '../../features/dashboard/ScoreTrendChart.jsx';
import StatStrip from '../../features/dashboard/StatStrip.jsx';
import SubjectAccuracyChart from '../../features/dashboard/SubjectAccuracyChart.jsx';
import WeakTopicsTable from '../../features/dashboard/WeakTopicsTable.jsx';
import { formatDuration } from '../../utils/formatTime.js';

function makeStats(stats) {
  return [
    { label: 'Tests completed', value: stats.completed, hint: 'Submitted attempts' },
    { label: 'Average score', value: stats.averageScore == null ? '—' : stats.averageScore.toFixed(1), hint: 'Percentage of available marks' },
    { label: 'Accuracy', value: stats.accuracy == null ? '—' : `${stats.accuracy}%`, hint: 'Correct answers / attempted' },
    { label: 'Average time', value: stats.averageTimeSec == null ? '—' : formatDuration(stats.averageTimeSec), hint: 'Time spent per completed test' },
  ];
}

export default function DashboardPage() {
  const dashboard = useAsync(getDashboardAnalytics, []);

  if (dashboard.loading && !dashboard.data) {
    return <div className="grid min-h-72 place-items-center"><Spinner className="size-6 text-primary-600" /></div>;
  }

  if (dashboard.error) {
    return (
      <Card>
        <EmptyState icon="alert" title="Your dashboard couldn't load" description={dashboard.error} action={<Button variant="secondary" onClick={dashboard.reload}>Try again</Button>} />
      </Card>
    );
  }

  const data = dashboard.data;
  const hasAttempts = data.stats.completed > 0 || data.activeAttempts.length > 0;

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-700">Your preparation</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">Dashboard</h1>
          <p className="mt-2 text-sm text-ink-600">A clear view of your progress, strengths and next steps.</p>
        </div>
        <div className="flex gap-2">
          <LinkButton to="/tests" size="md">Browse tests</LinkButton>
          <LinkButton to="/history" variant="secondary" size="md">View history</LinkButton>
        </div>
      </div>

      {data.activeAttempts.length > 0 && (
        <Card className="border-primary-200 bg-primary-50/50">
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2"><Badge tone="warning">In progress</Badge><span className="text-xs text-ink-500">Continue where you left off</span></div>
              <h2 className="mt-2 font-semibold text-ink-900">{data.activeAttempts[0].title}</h2>
              <p className="mt-1 text-sm text-ink-600">{formatDuration(data.activeAttempts[0].remainingSeconds)} remaining</p>
            </div>
            <LinkButton to={`/exam/${data.activeAttempts[0].id}`} size="sm">Resume test</LinkButton>
          </div>
        </Card>
      )}

      <section aria-label="Performance summary" className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-ink-800">Performance overview</h2><span className="text-xs text-ink-500">Based on your submitted attempts</span></div>
        <StatStrip stats={makeStats(data.stats)} />
      </section>

      {!hasAttempts ? (
        <Card>
          <EmptyState
            icon="chart"
            title="Your progress starts with your first test"
            description="Once you complete a test, your scores, subject accuracy and topics to revisit will appear here. Your dashboard uses only your actual attempts."
            action={<LinkButton to="/tests">Explore available tests</LinkButton>}
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-5 xl:grid-cols-2">
            <Card>
              <CardHeader title="Score trend" description={data.scoreTrend.some((x) => x.label.startsWith('Mock')) ? 'Your latest completed mock tests.' : 'Your latest completed tests.'} />
              <div className="px-3 pb-4 pt-3">
                {data.scoreTrend.length ? <ScoreTrendChart data={data.scoreTrend} /> : <EmptyState title="Not enough score data yet" description="Complete a test to start your score trend." />}
              </div>
            </Card>
            <Card>
              <CardHeader title="Accuracy by subject" description="Calculated from correct and incorrect answers in completed tests." />
              <div className="px-3 pb-4 pt-3">
                {data.subjectAccuracy.length ? <SubjectAccuracyChart data={data.subjectAccuracy} /> : <EmptyState title="Subject insights will appear here" description="Complete a test with subject-tagged questions." />}
              </div>
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-5">
            <Card className="xl:col-span-2">
              <CardHeader title="Topics to revisit" description="Topics where your recorded accuracy is lowest." />
              <div className="pt-3">
                {data.weakTopics.length ? <WeakTopicsTable topics={data.weakTopics} /> : <EmptyState title="No topic insights yet" description="More topic-level insights will appear as you complete tests." />}
              </div>
            </Card>
            <Card className="min-w-0 xl:col-span-3">
              <CardHeader title="Recent attempts" action={<Link to="/history" className="text-sm font-medium text-primary-700 hover:text-primary-800">All attempts</Link>} />
              <div className="overflow-x-auto pt-3">
                {data.recentAttempts.length ? <RecentAttemptsTable attempts={data.recentAttempts} /> : <EmptyState title="No attempts yet" description="Your completed and active tests will appear here." />}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
