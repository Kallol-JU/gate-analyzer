import { useState } from 'react';
import { listHistory } from '../../api/attempts.api.js';
import Badge from '../../components/ui/Badge.jsx';
import Button, { LinkButton } from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { Table, TBody, THead, Td, Th, Tr } from '../../components/ui/Table.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { formatDate, formatDuration } from '../../utils/formatTime.js';
import { KIND_LABEL, KIND_TONE, STATUS_LABEL } from '../../utils/testLabels.js';

const PAGE_SIZE = 15;

export default function HistoryPage() {
  const [page, setPage] = useState(1);
  const history = useAsync(() => listHistory({ page, limit: PAGE_SIZE }), [page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-ink-900">My attempts</h1>
        <p className="mt-1 text-ink-600">Every exam you have started, newest first.</p>
      </div>

      <Card>
        {history.loading ? (
          <div className="grid place-items-center py-12"><Spinner className="size-5 text-primary-600" /></div>
        ) : history.error ? (
          <EmptyState icon="alert" title="Could not load your attempts" description={history.error} action={<Button variant="secondary" onClick={history.reload}>Try again</Button>} />
        ) : history.data.items.length === 0 ? (
          <EmptyState icon="history" title="No attempts yet" description="Start a test and it will appear here." action={<LinkButton to="/tests" size="sm">Browse tests</LinkButton>} />
        ) : (
          <>
            <Table>
              <THead>
                <Tr>
                  <Th>Test</Th>
                  <Th>Started</Th>
                  <Th align="right">Score</Th>
                  <Th align="right">Accuracy</Th>
                  <Th align="right">Time taken</Th>
                  <Th><span className="sr-only">Action</span></Th>
                </Tr>
              </THead>
              <TBody>
                {history.data.items.map((a) => {
                  const live = a.status === 'in_progress';
                  return (
                    <Tr key={a.id}>
                      <Td>
                        <p className="font-medium text-ink-900">{a.title}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <Badge tone={KIND_TONE[a.kind]}>{KIND_LABEL[a.kind]}</Badge>
                          <Badge tone={live ? 'warning' : a.status === 'auto_submitted' ? 'danger' : 'success'}>{STATUS_LABEL[a.status]}</Badge>
                        </div>
                      </Td>
                      <Td className="whitespace-nowrap text-ink-600">{formatDate(a.startedAt)}</Td>
                      <Td align="right">
                        {a.result ? (<><span className="font-semibold">{a.result.score}</span><span className="text-ink-500"> / {a.result.totalMarks}</span></>) : <span className="text-ink-400">–</span>}
                      </Td>
                      <Td align="right">{a.result ? `${a.result.accuracy}%` : '–'}</Td>
                      <Td align="right">
                        {live ? `${formatDuration(a.remainingSeconds)} left` : a.timeTakenSec != null ? formatDuration(a.timeTakenSec) : '–'}
                      </Td>
                      <Td align="right">
                        {live ? (
                          <LinkButton to={`/exam/${a.id}`} size="sm">Resume</LinkButton>
                        ) : (
                          <LinkButton to={`/results/${a.id}`} variant="secondary" size="sm">View result</LinkButton>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
            {history.data.meta.pages > 1 && (
              <div className="flex items-center justify-between border-t border-ink-200 px-5 py-3 text-sm text-ink-600">
                <span>Page {history.data.meta.page} of {history.data.meta.pages}</span>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <Button variant="secondary" size="sm" disabled={page >= history.data.meta.pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
