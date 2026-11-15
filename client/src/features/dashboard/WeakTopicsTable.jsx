import ProgressBar from '../../components/ui/ProgressBar.jsx';
import { Table, TBody, THead, Td, Th, Tr } from '../../components/ui/Table.jsx';

/** `topics`: [{ topic, subject, accuracy, attempted }] */
export default function WeakTopicsTable({ topics }) {
  return (
    <Table>
      <THead>
        <Tr>
          <Th>Topic</Th>
          <Th>Accuracy</Th>
          <Th align="right">Attempted</Th>
        </Tr>
      </THead>
      <TBody>
        {topics.map((t) => (
          <Tr key={t.topic}>
            <Td>
              <p className="font-medium text-ink-900">{t.topic}</p>
              <p className="text-xs text-ink-500">{t.subject}</p>
            </Td>
            <Td className="min-w-40">
              <div className="flex items-center gap-3">
                <ProgressBar
                  value={t.accuracy}
                  tone={t.accuracy < 50 ? 'danger' : 'warning'}
                  label={`${t.topic} accuracy`}
                  className="w-24"
                />
                <span className="w-10 text-sm tabular-nums text-ink-700">{t.accuracy}%</span>
              </div>
            </Td>
            <Td align="right">{t.attempted}</Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}
