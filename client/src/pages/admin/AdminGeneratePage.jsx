import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { aiStatus, generate, getBatch, listBatches } from '../../api/admin.api.js';
import { listSubjects, listTopics } from '../../api/taxonomy.api.js';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Card, { CardHeader } from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { Table, TBody, THead, Td, Th, Tr } from '../../components/ui/Table.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { DIFFICULTY_LABEL, options } from '../../utils/adminLabels.js';
import { describeApiError } from '../../utils/errorMessage.js';
import { formatDate } from '../../utils/formatTime.js';

const STATUS_TONE = { running: 'primary', completed: 'success', partial: 'warning', failed: 'danger' };

export default function AdminGeneratePage() {
  const status = useAsync(aiStatus, []);
  const subjects = useAsync(listSubjects, []);
  const history = useAsync(() => listBatches({ limit: 10 }), []);
  const [topics, setTopics] = useState([]);
  const [form, setForm] = useState({ subjectId: '', topicId: '', MCQ: '2', MSQ: '1', NAT: '1', difficulty: 'hard', style: 'ADVANCED', concepts: '', referenceQuestionId: '' });
  const [batch, setBatch] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    setTopics([]);
    setForm((f) => ({ ...f, topicId: '' }));
    if (form.subjectId) listTopics(form.subjectId).then(setTopics).catch(() => {});
  }, [form.subjectId]);

  // Poll a running batch. The server keeps working even if this page is closed.
  useEffect(() => {
    if (batch?.status !== 'running') return undefined;
    const t = setInterval(async () => {
      try {
        const b = await getBatch(batch._id ?? batch.id);
        setBatch(b);
        if (b.status !== 'running') { clearInterval(t); history.reload(); status.reload(); }
      } catch { /* keep polling */ }
    }, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch?.status, batch?._id]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      setBatch(await generate({
        subjectId: form.subjectId, topicId: form.topicId, difficulty: form.difficulty, style: form.style,
        counts: { MCQ: Number(form.MCQ) || 0, MSQ: Number(form.MSQ) || 0, NAT: Number(form.NAT) || 0 },
        concepts: form.concepts.split(',').map((s) => s.trim()).filter(Boolean),
        ...(form.referenceQuestionId.trim() && { referenceQuestionId: form.referenceQuestionId.trim() }),
      }));
    } catch (err) {
      setError([describeApiError(err), ...(err.response?.data?.error?.details ?? []).map((d) => d.message)].join(' '));
    } finally {
      setBusy(false);
    }
  }

  const s = status.data;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-ink-900">AI question generator</h1>
        <p className="mt-1 text-ink-600">Gemini drafts original questions on the server. Each draft is validated, checked for duplicates and re-solved independently. <strong>Nothing is published automatically</strong>: review every draft in the question bank.</p>
      </div>

      {s && !s.configured && <p role="alert" className="rounded-lg border border-warning-600/30 bg-warning-50 px-4 py-3 text-sm text-warning-700">AI generation is not configured. Add <code>GEMINI_API_KEY</code> to <code>server/.env</code> and restart the server.</p>}
      {s?.configured && <p className="text-sm text-ink-600">Model {s.model}. Used today: {s.usedToday} of {s.limits.dailyQuestionsPerAdmin} questions. Up to {s.limits.maxQuestionsPerRequest} per request. Independent verification {s.verifyEnabled ? 'on' : 'off'}.</p>}

      <Card>
        <CardHeader title="New batch" />
        <form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-2" noValidate>
          <Select label="Subject" placeholder="Choose" value={form.subjectId} onChange={set('subjectId')} options={(subjects.data ?? []).map((x) => ({ value: x.id, label: x.name }))} />
          <Select label="Topic" placeholder="Choose" value={form.topicId} onChange={set('topicId')} disabled={!form.subjectId} options={topics.map((x) => ({ value: x.id, label: x.name }))} />
          <Select label="Style" value={form.style} onChange={set('style')} options={[{ value: 'ADVANCED', label: 'Advanced original' }, { value: 'PYQ_INSPIRED', label: 'PYQ-inspired variation' }]} />
          <Select label="Difficulty" value={form.difficulty} onChange={set('difficulty')} options={options(DIFFICULTY_LABEL)} />
          <div className="grid grid-cols-3 gap-3 sm:col-span-2">
            {['MCQ', 'MSQ', 'NAT'].map((t) => <Input key={t} label={`${t} count`} type="number" min="0" max="10" value={form[t]} onChange={set(t)} />)}
          </div>
          <Input label="Concepts (optional, comma separated)" className="sm:col-span-2" value={form.concepts} onChange={set('concepts')} placeholder="e.g. amortised analysis, potential method" />
          {form.style === 'PYQ_INSPIRED' && <Input label="Reference PYQ id (optional)" className="sm:col-span-2" value={form.referenceQuestionId} onChange={set('referenceQuestionId')} hint="The id of a verified PYQ already in the bank. It is used only as a concept pattern." />}
          {error && <p role="alert" className="text-sm text-danger-700 sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2"><Button type="submit" loading={busy} disabled={!s?.configured || !form.subjectId || !form.topicId || batch?.status === 'running'}>Generate drafts</Button></div>
        </form>
      </Card>

      {batch && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            {batch.status === 'running' && <Spinner className="size-4 text-primary-600" />}
            <Badge tone={STATUS_TONE[batch.status]}>{batch.status}</Badge>
            <p className="text-sm text-ink-700">{batch.saved} saved as drafts, {batch.flagged} flagged by the solver, {batch.rejectedCount} rejected by validation (of {batch.requested} requested).</p>
          </div>
          {batch.error && <p className="mt-2 text-sm text-danger-700">{batch.error}</p>}
          {batch.status !== 'running' && batch.saved > 0 && <Link className="mt-3 inline-block text-sm font-medium text-primary-700 hover:underline" to={`/admin/questions?batchId=${batch._id ?? batch.id}`}>Review these drafts</Link>}
          {batch.rejected?.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-ink-600">{batch.rejected.slice(0, 5).map((r, i) => <li key={i}>{r.reason}: {r.detail}</li>)}</ul>}
        </Card>
      )}

      <Card>
        <CardHeader title="History" />
        <div className="pt-3">
          <Table>
            <THead><Tr><Th>When</Th><Th>Topic</Th><Th>Style</Th><Th>Result</Th><Th align="right">Tokens</Th></Tr></THead>
            <TBody>
              {(history.data?.items ?? []).map((b) => (
                <Tr key={b._id}>
                  <Td className="whitespace-nowrap">{formatDate(b.createdAt)}</Td>
                  <Td className="text-sm">{b.params.subjectName}<br /><span className="text-ink-500">{b.params.topicName}</span></Td>
                  <Td>{b.params.style === 'ADVANCED' ? 'Advanced' : 'PYQ-inspired'}</Td>
                  <Td><Badge tone={STATUS_TONE[b.status]}>{b.status}</Badge> <Link className="ml-1 text-sm text-primary-700 hover:underline" to={`/admin/questions?batchId=${b._id}`}>{b.saved} drafts</Link></Td>
                  <Td align="right">{b.usage.promptTokens + b.usage.outputTokens}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
          {history.data?.items.length === 0 && <p className="px-5 pb-5 text-sm text-ink-500">No batches yet.</p>}
        </div>
      </Card>
    </div>
  );
}
