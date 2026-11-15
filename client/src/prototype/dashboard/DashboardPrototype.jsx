import { useAuthStore } from '../../store/authStore.js';
import { Card, CardHeader } from '../../components/ui/Card.jsx';
import PrototypeBanner from '../../components/common/PrototypeBanner.jsx';
import RecentAttemptsTable from '../../features/dashboard/RecentAttemptsTable.jsx';
import ScoreTrendChart from '../../features/dashboard/ScoreTrendChart.jsx';
import StatStrip from '../../features/dashboard/StatStrip.jsx';
import SubjectAccuracyChart from '../../features/dashboard/SubjectAccuracyChart.jsx';
import WeakTopicsTable from '../../features/dashboard/WeakTopicsTable.jsx';
import {
  sampleRecentAttempts,
  sampleScoreTrend,
  sampleStats,
  sampleSubjectAccuracy,
  sampleWeakTopics,
} from './dashboardData.js';

/**
 * PROTOTYPE · feeds invented statistics into the real dashboard components (only the name is real).
 * In Phase 6 this file is replaced by a page that loads /analytics/* from the API.
 */
export default function DashboardPrototype() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-6">
      <PrototypeBanner>
        Your name comes from your account. Every number and chart below is invented to review the layout. Real results
        appear once you have completed attempts.
      </PrototypeBanner>

      <div>
        <h1 className="font-serif text-3xl font-semibold text-ink-900">Welcome back, {user.name}</h1>
        <p className="mt-1 text-ink-600">Here is how your recent attempts look.</p>
      </div>

      <StatStrip stats={sampleStats} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Score over time" description="Marks on your last 8 mock tests, out of 100." />
          <div className="px-3 pb-4 pt-4">
            <ScoreTrendChart data={sampleScoreTrend} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Accuracy by subject"
            description="Red is below 50%, amber is 50 to 69%, blue is 70% and above."
          />
          <div className="px-3 pb-4 pt-4">
            <SubjectAccuracyChart data={sampleSubjectAccuracy} />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardHeader title="Topics to revisit" description="Your lowest-accuracy topics." />
          <div className="pt-3">
            <WeakTopicsTable topics={sampleWeakTopics} />
          </div>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader title="Recent attempts" />
          <div className="pt-3">
            <RecentAttemptsTable attempts={sampleRecentAttempts} />
          </div>
        </Card>
      </div>
    </div>
  );
}
