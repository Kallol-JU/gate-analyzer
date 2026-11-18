import Badge from '../../components/ui/Badge.jsx';
import { Table, TBody, THead, Td, Th, Tr } from '../../components/ui/Table.jsx';
import { formatDate, formatDuration } from '../../utils/formatTime.js';
import { LinkButton } from '../../components/ui/Button.jsx';

const KIND = {
  mock: { label: 'Mock test', tone: 'primary' },
  practice: { label: 'Practice', tone: 'neutral' },
  ai_practice: { label: 'AI practice', tone: 'purple' },
  advanced: { label: 'Advanced', tone: 'purple' },
  subject: { label: 'Subject test', tone: 'neutral' },
  topic: { label: 'Topic test', tone: 'neutral' },
  pyq: { label: 'PYQ paper', tone: 'neutral' },
  custom: { label: 'Private practice', tone: 'warning' },
};

/** `attempts`: [{ id, title, kind, date, score, totalMarks, accuracy, timeTakenSec }] */
export default function RecentAttemptsTable({ attempts }) {
  return (
    <Table>
      <THead>
        <Tr>
          <Th>Test</Th>
          <Th>Date</Th>
          <Th align="right">Score</Th>
          <Th align="right">Accuracy</Th>
          <Th align="right">Time taken</Th>
          <Th><span className="sr-only">Action</span></Th>
        </Tr>
      </THead>
      <TBody>
        {attempts.map((a) => (
          <Tr key={a.id}>
            <Td>
              <p className="font-medium text-ink-900">{a.title}</p>
              <Badge tone={(KIND[a.kind] || { tone: 'neutral' }).tone} className="mt-1">
                {(KIND[a.kind] || { label: 'Test' }).label}
              </Badge>
            </Td>
            <Td className="whitespace-nowrap text-ink-600">{formatDate(a.startedAt)}</Td>
            <Td align="right">
              <span className="font-semibold">{a.result?.score ?? '—'}</span>
              <span className="text-ink-500"> / {a.result?.totalMarks ?? '—'}</span>
            </Td>
            <Td align="right">{a.result ? `${a.result.accuracy}%` : '—'}</Td>
            <Td align="right">{a.status === 'in_progress' ? `${formatDuration(a.remainingSeconds)} left` : a.timeTakenSec != null ? formatDuration(a.timeTakenSec) : '—'}</Td>
            <Td align="right">{a.status === 'in_progress' ? <LinkButton to={`/exam/${a.id}`} size="sm">Resume</LinkButton> : <LinkButton to={`/results/${a.id}`} size="sm" variant="secondary">Result</LinkButton>}</Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}
