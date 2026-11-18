import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { bulkAction, listAllTopics, listQuestions } from '../../api/admin.api.js';
import { listSubjects } from '../../api/taxonomy.api.js';
import Badge from '../../components/ui/Badge.jsx';
import Button, { LinkButton } from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Select from '../../components/ui/Select.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import { Table, TBody, THead, Td, Th, Tr } from '../../components/ui/Table.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useUiStore } from '../../store/uiStore.js';
import { DIFFICULTY_LABEL, options, SOURCE_LABEL, SOURCE_TONE, STATUS_TONE, VERIFICATION_LABEL, VERIFICATION_TONE } from '../../utils/adminLabels.js';
import { describeApiError } from '../../utils/errorMessage.js';

const FILTERS = ['source', 'difficulty', 'verificationStatus', 'status', 'type', 'subjectId', 'topicId', 'q', 'batchId'];
const BULK = [['verify', 'Verify'], ['publish', 'Publish'], ['unpublish', 'Unpublish'], ['revalidate', 'Re-check']];

export default function AdminQuestionsPage() {
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const addToast = useUiStore((s) => s.addToast);

  const filters = useMemo(() => Object.fromEntries(FILTERS.map((k) => [k, params.get(k) ?? '']).filter(([, v]) => v)), [params]);
  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key === 'subjectId') next.delete('topicId');
    setParams(next, { replace: true });
    setPage(1);
    setSelected(new Set());
  };

  const subjects = useAsync(listSubjects, []);
  const topics = useAsync(listAllTopics, []);
  const list = useAsync(() => listQuestions({ ...filters, page, limit: 20 }), [JSON.stringify(filters), page]);
  const subjectName = new Map((subjects.data ?? []).map((s) => [s.id, s.name]));
  const topicName = new Map((topics.data ?? []).map((t) => [t.id, t.name]));
  const topicOptions = (topics.data ?? []).filter((t) => !filters.subjectId || t.subjectId === filters.subjectId).map((t) => ({ value: t.id, label: t.name }));
  const items = list.data?.items ?? [];

  const toggle = (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSelected((s) => (s.size === items.length ? new Set() : new Set(items.map((q) => q.id))));

  async function run(action, extra = {}) {
    setBusy(true);
    try {
      const res = await bulkAction({ action, ids: [...selected], ...extra });
      setReport(res);
      addToast({ tone: res.failed ? 'warning' : 'success', title: `${res.succeeded} done, ${res.failed} failed`, message: res.failed ? 'See the details below the filters.' : undefined });
      setSelected(new Set());
      list.reload();
    } catch (err) {
      addToast({ tone: 'danger', title: 'Action failed', message: describeApiError(err) });
    } finally {
      setBusy(false);
      setRejectOpen(false);
      setReason('');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink-900">Question bank</h1>
          <p className="mt-1 text-ink-600">Review, verify and publish questions. Students only ever see published questions.</p>
        </div>
        <LinkButton to="/admin/import" variant="secondary" size="sm">Import JSON</LinkButton>
      </div>

      <Card className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Select label="Source" placeholder="All" value={filters.source ?? ''} onChange={(e) => setFilter('source', e.target.value)} options={options(SOURCE_LABEL)} />
        <Select label="Verification" placeholder="All" value={filters.verificationStatus ?? ''} onChange={(e) => setFilter('verificationStatus', e.target.value)} options={options(VERIFICATION_LABEL)} />
        <Select label="Visibility to students" placeholder="All" value={filters.status ?? ''} onChange={(e) => setFilter('status', e.target.value)} options={[{ value: 'draft', label: 'Draft' }, { value: 'pending', label: 'Pending' }, { value: 'published', label: 'Published' }]} />
        <Select label="Difficulty" placeholder="All" value={filters.difficulty ?? ''} onChange={(e) => setFilter('difficulty', e.target.value)} options={options(DIFFICULTY_LABEL)} />
        <Select label="Subject" placeholder="All" value={filters.subjectId ?? ''} onChange={(e) => setFilter('subjectId', e.target.value)} options={(subjects.data ?? []).map((s) => ({ value: s.id, label: s.name }))} />
        <Select label="Topic" placeholder="All" value={filters.topicId ?? ''} onChange={(e) => setFilter('topicId', e.target.value)} options={topicOptions} />
        <Select label="Type" placeholder="All" value={filters.type ?? ''} onChange={(e) => setFilter('type', e.target.value)} options={['MCQ', 'MSQ', 'NAT'].map((v) => ({ value: v, label: v }))} />
        <Input label="Search statement" value={filters.q ?? ''} onChange={(e) => setFilter('q', e.target.value)} placeholder="Words in the question" />
      </Card>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 py-3">
          <span className="mr-2 text-sm font-medium text-primary-800">{selected.size} selected</span>
          {BULK.map(([action, label]) => <Button key={action} size="sm" variant="secondary" disabled={busy} onClick={() => run(action)}>{label}</Button>)}
          <Button size="sm" variant="danger" disabled={busy} onClick={() => setRejectOpen(true)}>Reject</Button>
        </div>
      )}

      {report && report.failed > 0 && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink-900">{report.failed} question(s) could not be {report.action === 'verify' ? 'verified' : `${report.action}ed`}</h2>
          <ul className="mt-2 space-y-1 text-sm text-ink-700">
            {report.results.filter((r) => !r.ok).slice(0, 10).map((r) => (
              <li key={r.id}><Link className="font-medium text-primary-700 hover:underline" to={`/admin/questions/${r.id}`}>{r.id.slice(-6)}</Link>: {r.error}{r.details?.[0] ? ` (${r.details[0].message})` : ''}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        {list.loading ? (
          <div className="grid place-items-center py-12"><Spinner className="size-5 text-primary-600" /></div>
        ) : list.error ? (
          <EmptyState icon="alert" title="Could not load questions" description={list.error} action={<Button variant="secondary" onClick={list.reload}>Try again</Button>} />
        ) : items.length === 0 ? (
          <EmptyState icon="book" title="No questions match" description="Change the filters, or import or generate some questions." />
        ) : (
          <>
            <Table>
              <THead>
                <Tr>
                  <Th><input type="checkbox" aria-label="Select all" checked={selected.size === items.length} onChange={toggleAll} className="accent-primary-600" /></Th>
                  <Th>Question</Th>
                  <Th>Subject / topic</Th>
                  <Th>Review</Th>
                </Tr>
              </THead>
              <TBody>
                {items.map((q) => (
                  <Tr key={q.id}>
                    <Td><input type="checkbox" aria-label="Select question" checked={selected.has(q.id)} onChange={() => toggle(q.id)} className="accent-primary-600" /></Td>
                    <Td className="max-w-md">
                      <Link to={`/admin/questions/${q.id}`} className="font-medium text-ink-900 hover:text-primary-700">{q.statement.replace(/\$/g, '').slice(0, 110)}{q.statement.length > 110 ? '…' : ''}</Link>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Badge tone="primary">{q.type}</Badge>
                        <Badge tone={SOURCE_TONE[q.source]}>{SOURCE_LABEL[q.source]}{q.source === 'PYQ' && q.pyq ? ` ${q.pyq.year}` : ''}</Badge>
                        <Badge>{DIFFICULTY_LABEL[q.difficulty]}</Badge>
                      </div>
                    </Td>
                    <Td className="text-sm text-ink-600">{subjectName.get(q.subjectId)}<br /><span className="text-ink-500">{topicName.get(q.topicId)}</span></Td>
                    <Td>
                      <div className="flex flex-col items-start gap-1">
                        {q.verificationStatus ? <Badge tone={VERIFICATION_TONE[q.verificationStatus]}>{VERIFICATION_LABEL[q.verificationStatus]}</Badge> : <Badge>Legacy</Badge>}
                        <Badge tone={STATUS_TONE[q.status]}>{q.status === 'published' ? 'Published' : q.status === 'pending' ? 'Pending' : 'Not published'}</Badge>
                        {q.validation?.aiVerification?.checked && !q.validation.aiVerification.agrees && <Badge tone="danger">Solver disagrees</Badge>}
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
            <div className="flex items-center justify-between border-t border-ink-200 px-5 py-3 text-sm text-ink-600">
              <span>{list.data.meta.total} questions · page {list.data.meta.page} of {list.data.meta.pages}</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="secondary" size="sm" disabled={page >= list.data.meta.pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        size="sm"
        title={`Reject ${selected.size} question(s)`}
        description="Rejected questions are unpublished and kept for the record."
        footer={<><Button variant="secondary" onClick={() => setRejectOpen(false)}>Cancel</Button><Button variant="danger" loading={busy} disabled={reason.trim().length < 3} onClick={() => run('reject', { reason: reason.trim() })}>Reject</Button></>}
      >
        <Textarea label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
      </Modal>
    </div>
  );
}
