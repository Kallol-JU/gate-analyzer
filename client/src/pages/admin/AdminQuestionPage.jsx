import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getQuestion, publishQuestion, rejectQuestion, revalidateQuestion, unpublishQuestion, updateQuestion, verifyQuestion } from '../../api/admin.api.js';
import MathText from '../../components/common/MathText.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Card, { CardHeader } from '../../components/ui/Card.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useUiStore } from '../../store/uiStore.js';
import { DIFFICULTY_LABEL, SOURCE_LABEL, SOURCE_TONE, STATUS_TONE, VERIFICATION_LABEL, VERIFICATION_TONE } from '../../utils/adminLabels.js';
import { describeApiError } from '../../utils/errorMessage.js';
import { formatDate } from '../../utils/formatTime.js';

const EDITABLE = ['type', 'statement', 'code', 'options', 'correctOptions', 'natAnswer', 'explanation', 'marks', 'difficulty', 'conceptTags', 'relatedConcepts', 'estimatedTimeSeconds', 'learningObjective', 'solutionSteps', 'optionAnalysis', 'commonMistakes', 'pyq', 'sourceReference', 'inspirationNote'];
const pickEditable = (q) => Object.fromEntries(EDITABLE.filter((k) => q[k] !== undefined).map((k) => [k, q[k]]));

function Issue({ tone, children }) {
  return <li className={`flex gap-2 text-sm ${tone === 'error' ? 'text-danger-700' : 'text-warning-700'}`}><Icon name="alert" className="mt-0.5 size-4" /><span>{children}</span></li>;
}

export default function AdminQuestionPage() {
  const { id } = useParams();
  const addToast = useUiStore((s) => s.addToast);
  const res = useAsync(() => getQuestion(id), [id]);
  const q = res.data;
  const [busy, setBusy] = useState('');
  const [modal, setModal] = useState(null); // 'verify' | 'reject'
  const [notes, setNotes] = useState('');
  const [ack, setAck] = useState(false);
  const [json, setJson] = useState('');
  const [editError, setEditError] = useState('');

  useEffect(() => { if (q) setJson(JSON.stringify(pickEditable(q), null, 2)); }, [q]);

  async function act(name, fn, success) {
    setBusy(name);
    try {
      await fn();
      addToast({ tone: 'success', title: success });
      setModal(null);
      setNotes('');
      res.reload();
    } catch (err) {
      const detail = err.response?.data?.error?.details?.map((d) => d.message).slice(0, 4).join(' ');
      addToast({ tone: 'danger', title: describeApiError(err), message: detail });
    } finally {
      setBusy('');
    }
  }

  async function save() {
    setEditError('');
    let body;
    try { body = JSON.parse(json); } catch { return setEditError('This is not valid JSON.'); }
    setBusy('save');
    try {
      const saved = await updateQuestion(id, body);
      addToast({ tone: saved.reverificationRequired ? 'warning' : 'success', title: saved.reverificationRequired ? 'Saved. Verification was withdrawn: verify again.' : 'Saved' });
      res.reload();
    } catch (err) {
      setEditError([describeApiError(err), ...(err.response?.data?.error?.details ?? []).map((d) => `${d.path}: ${d.message}`)].join('\n'));
    } finally {
      setBusy('');
    }
  }

  if (res.loading && !q) return <div className="grid place-items-center py-20"><Spinner className="size-6 text-primary-600" /></div>;
  if (res.error) return <div className="py-16 text-center"><p className="text-ink-700">{res.error}</p><Link to="/admin/questions" className="mt-3 inline-block text-primary-700 hover:underline">Back to the question bank</Link></div>;

  const v = q.validation;
  const ai = v?.aiVerification;
  const reviewed = q.source !== 'ADMIN';
  const published = q.status === 'published';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/admin/questions" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900"><Icon name="arrow-left" className="size-4" />Question bank</Link>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="primary">{q.type}</Badge>
        <Badge tone={SOURCE_TONE[q.source]}>{SOURCE_LABEL[q.source]}</Badge>
        <Badge>{DIFFICULTY_LABEL[q.difficulty]}</Badge>
        <Badge>{q.marks} mark{q.marks > 1 ? 's' : ''}</Badge>
        {q.verificationStatus ? <Badge tone={VERIFICATION_TONE[q.verificationStatus]}>{VERIFICATION_LABEL[q.verificationStatus]}</Badge> : <Badge>Legacy (pre-review)</Badge>}
        <Badge tone={STATUS_TONE[q.status]}>{published ? 'Published to students' : 'Not published'}</Badge>
        {q.source === 'PYQ' && q.pyq && <Badge tone="success">GATE {q.pyq.year} · {q.pyq.session}</Badge>}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" loading={busy === 'revalidate'} onClick={() => act('revalidate', () => revalidateQuestion(id), 'Checks re-run')}>Re-run checks</Button>
        {q.verificationStatus !== 'verified' && reviewed && <Button size="sm" onClick={() => { setAck(false); setModal('verify'); }}>Verify</Button>}
        {!published && (q.verificationStatus === 'verified' || !reviewed) && <Button size="sm" loading={busy === 'publish'} onClick={() => act('publish', () => publishQuestion(id), 'Published')}>Publish</Button>}
        {published && <Button variant="secondary" size="sm" loading={busy === 'unpublish'} onClick={() => act('unpublish', () => unpublishQuestion(id), 'Unpublished')}>Unpublish</Button>}
        {q.verificationStatus !== 'rejected' && <Button variant="danger" size="sm" onClick={() => setModal('reject')}>Reject</Button>}
      </div>
      {q.review?.rejectedReason && <p className="rounded-md bg-danger-50 px-4 py-3 text-sm text-danger-700">Rejected: {q.review.rejectedReason}</p>}

      <Card>
        <CardHeader title="Preview" description="How the question reads, with the answer key marked (admins only)." />
        <div className="space-y-4 p-5">
          <MathText className="block font-serif text-lg leading-relaxed text-ink-900">{q.statement}</MathText>
          {q.code && <pre className="overflow-x-auto rounded-md border border-ink-200 bg-ink-50 p-4 font-mono text-sm"><code>{q.code}</code></pre>}
          {q.type === 'NAT' ? (
            <p className="text-sm text-ink-700">Accepted answer: <span className="font-semibold text-success-700">{q.natAnswer.min === q.natAnswer.max ? q.natAnswer.min : `${q.natAnswer.min} to ${q.natAnswer.max}`}</span></p>
          ) : (
            <ul className="space-y-2">
              {q.options.map((o) => {
                const right = q.correctOptions.includes(o.key);
                const note = q.optionAnalysis?.find((a) => a.key === o.key)?.analysis;
                return (
                  <li key={o.key} className={`rounded-md border px-3 py-2 text-sm ${right ? 'border-success-600 bg-success-50' : 'border-ink-200'}`}>
                    <div className="flex gap-3"><span className="w-5 font-semibold text-ink-500">{o.key}</span><MathText className="flex-1">{o.text}</MathText>{right && <span className="text-xs font-medium text-success-700">Correct</span>}</div>
                    {note && <p className="ml-8 mt-1 text-xs text-ink-600">{note}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Solution" />
        <div className="space-y-4 p-5 text-sm text-ink-800">
          {q.explanation ? <MathText className="block leading-relaxed">{q.explanation}</MathText> : <p className="text-ink-500">No explanation.</p>}
          {q.solutionSteps?.length > 0 && <ol className="list-decimal space-y-1.5 pl-5">{q.solutionSteps.map((s, i) => <li key={i}><MathText>{s}</MathText></li>)}</ol>}
          {q.commonMistakes?.length > 0 && <div><p className="font-semibold">Common mistakes</p><ul className="mt-1 list-disc space-y-1 pl-5">{q.commonMistakes.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
          <p className="text-xs text-ink-500">{q.conceptTags?.length ? `Concepts: ${q.conceptTags.join(', ')}. ` : ''}{q.estimatedTimeSeconds ? `Estimated ${q.estimatedTimeSeconds}s. ` : ''}{q.learningObjective}</p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Source and review" />
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 p-5 text-sm">
          {q.sourceReference?.paperName && (<><dt className="text-ink-500">Paper</dt><dd>{q.sourceReference.paperName}</dd></>)}
          {q.sourceReference?.paperUrl && (<><dt className="text-ink-500">Official paper</dt><dd><a href={q.sourceReference.paperUrl} target="_blank" rel="noreferrer" className="break-all text-primary-700 hover:underline">{q.sourceReference.paperUrl}</a></dd></>)}
          {q.sourceReference?.answerKeyRef && (<><dt className="text-ink-500">Answer key</dt><dd className="break-all">{q.sourceReference.answerKeyRef}</dd></>)}
          {q.inspirationNote && (<><dt className="text-ink-500">Inspiration</dt><dd>{q.inspirationNote}</dd></>)}
          {q.aiMeta && (<><dt className="text-ink-500">Generated by</dt><dd>{q.aiMeta.model} · {q.aiMeta.promptVersion} · {formatDate(q.aiMeta.generatedAt)}</dd></>)}
          {q.review?.verifiedAt && (<><dt className="text-ink-500">Last review</dt><dd>{formatDate(q.review.verifiedAt)}{q.review.notes ? `: ${q.review.notes}` : ''}</dd></>)}
          {q.source === 'PYQ' && !q.sourceReference?.paperUrl && (<><dt className="text-ink-500">Warning</dt><dd className="text-warning-700">No official source recorded. This PYQ cannot be verified yet.</dd></>)}
        </dl>
      </Card>

      <Card>
        <CardHeader title="Automated checks" description={v ? `Last run ${formatDate(v.checkedAt)}. These catch mistakes; they do not prove the answer is right.` : 'Not run yet. Use "Re-run checks".'} />
        <div className="space-y-3 p-5">
          {v && v.errors.length === 0 && v.warnings.length === 0 && <p className="flex items-center gap-2 text-sm text-success-700"><Icon name="check" className="size-4" />No problems found.</p>}
          <ul className="space-y-1.5">{v?.errors.map((e, i) => <Issue key={`e${i}`} tone="error">{e.message}</Issue>)}{v?.warnings.map((e, i) => <Issue key={`w${i}`} tone="warning">{e.message}</Issue>)}</ul>
          {v?.duplicates?.length > 0 && <p className="text-sm text-ink-600">Similar: {v.duplicates.map((d) => <Link key={d.id} to={`/admin/questions/${d.id}`} className="mr-2 text-primary-700 hover:underline">{d.id.slice(-6)} ({Math.round(d.similarity * 100)}%)</Link>)}</p>}
          {ai && (
            <div className={`rounded-md px-4 py-3 text-sm ${!ai.checked ? 'bg-ink-100 text-ink-700' : ai.agrees ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'}`}>
              <p className="font-semibold">Independent AI solver</p>
              <p>{!ai.checked ? ai.note ?? 'Not checked.' : ai.agrees ? `Solved it from scratch and reached the same answer (${ai.solverAnswer}).` : `Disagrees: it answered "${ai.solverAnswer}"${ai.ambiguous ? ' and flagged the question as ambiguous' : ''}. ${ai.note ?? ''}`}</p>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Edit" description="Edit the fields as JSON. Changing the substance of a verified question withdraws its verification and unpublishes it." />
        <div className="space-y-3 p-5">
          <Textarea aria-label="Question JSON" value={json} onChange={(e) => setJson(e.target.value)} rows={18} inputClassName="font-mono text-xs" error={editError} />
          <Button loading={busy === 'save'} onClick={save}>Save changes</Button>
        </div>
      </Card>

      <Modal
        open={modal === 'verify'}
        onClose={() => setModal(null)}
        size="sm"
        title="Verify this question"
        description={q.source === 'PYQ' ? 'Confirm you checked the wording, options and answer against the official paper and answer key.' : 'Confirm the question, answer key and explanation are correct.'}
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button loading={busy === 'verify'} disabled={ai?.checked && !ai.agrees && !ack} onClick={() => act('verify', () => verifyQuestion(id, { notes: notes.trim() || undefined, acknowledgeAiDisagreement: ack }), 'Verified')}>Verify</Button></>}
      >
        <div className="space-y-4">
          <Textarea label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          {ai?.checked && !ai.agrees && <Checkbox checked={ack} onChange={(e) => setAck(e.target.checked)} label="I reviewed the solver's disagreement and the answer key is correct." />}
        </div>
      </Modal>
      <RejectModal open={modal === 'reject'} onClose={() => setModal(null)} busy={busy === 'reject'} onReject={(reason) => act('reject', () => rejectQuestion(id, reason), 'Rejected')} />
    </div>
  );
}

function RejectModal({ open, onClose, onReject, busy }) {
  const [reason, setReason] = useState('');
  return (
    <Modal open={open} onClose={onClose} size="sm" title="Reject this question" description="It will be unpublished and kept for the record."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" loading={busy} disabled={reason.trim().length < 3} onClick={() => onReject(reason.trim())}>Reject</Button></>}>
      <Textarea label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
    </Modal>
  );
}
