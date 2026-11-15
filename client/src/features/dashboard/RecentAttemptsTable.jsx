import Badge from '../../components/ui/Badge.jsx';
import { Table, TBody, THead, Td, Th, Tr } from '../../components/ui/Table.jsx';
import { formatDate, formatDuration } from '../../utils/formatTime.js';

const KIND = {
  mock: { label: 'Mock test', tone: 'primary' },
  practice: { label: 'Practice', tone: 'neutral' },
  ai: { label: 'AI generated', tone: 'purple' },
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
        </Tr>
      </THead>
      <TBody>
        {attempts.map((a) => (
          <Tr key={a.id}>
            <Td>
              <p className="font-medium text-ink-900">{a.title}</p>
              <Badge tone={KIND[a.kind].tone} className="mt-1">
                {KIND[a.kind].label}
              </Badge>
            </Td>
            <Td className="whitespace-nowrap text-ink-600">{formatDate(a.date)}</Td>
            <Td align="right">
              <span className="font-semibold">{a.score}</span>
              <span className="text-ink-500"> / {a.totalMarks}</span>
            </Td>
            <Td align="right">{a.accuracy}%</Td>
            <Td align="right">{formatDuration(a.timeTakenSec)}</Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}
