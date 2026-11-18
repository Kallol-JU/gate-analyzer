import { useEffect, useState } from 'react';
import { buildTest, listAdminTests, publishTest, unpublishTest } from '../../api/admin.api.js';
import { listSubjects, listTopics } from '../../api/taxonomy.api.js';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Card, { CardHeader } from '../../components/ui/Card.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { Table, TBody, THead, Td, Th, Tr } from '../../components/ui/Table.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useUiStore } from '../../store/uiStore.js';
import { DIFFICULTY_LABEL, options, SOURCE_LABEL } from '../../utils/adminLabels.js';
import { describeApiError } from '../../utils/errorMessage.js';
import { KIND_LABEL, MODE_LABEL } from '../../utils/testLabels.js';

const KINDS = ['mock', 'pyq', 'subject', 'topic', 'advanced'];

export default function AdminTestsPage() {
  const addToast = useUiStore((s) => s.addToast);
  const [page, setPage] = useState(1);
  const tests = useAsync(() => listAdminTests({ page, limit: 15 }), [page]);
  const subjects = useAsync(listSubjects, []);
  const [topics, setTopics] = useState([]);
  const [f, setF] = useState({ title: '', kind: 'subject', mode: 'practice', template: false, subjectId: '', topicId: '', source: '', difficulty: '', count: '20', year: '', allowPartial: false });
  const [problems, setProblems] = useState([]);
  const [busy, setBusy] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => {
    setTopics([]);
    if (f.subjectId) listTopics(f.subjectId).then(setTopics).catch(() => {});
  }, [f.subjectId]);

  async function toggle(t) {
    setBusy(t.id);
    try {
      await (t.status === 'published' ? unpublishTest(t.id) : publishTest(t.id));
      tests.reload();
    } catch (err) {
      addToast({ tone: 'danger', title: describeApiError(err), message: err.response?.data?.error?.details?.slice(0, 3).map((d) => d.message).join(' ') });
    } finally { setBusy(''); }
  }

  async function build(e) {
    e.preventDefault();
    setProblems([]);
    setBusy('build');
    try {
      const body = {
        title: f.title, kind: f.template ? 'mock' : f.kind, mode: f.template ? 'competitive' : f.mode,
        ...(f.template ? { template: 'gate_full_mock' } : { count: Number(f.count) || 1 }),
        filters: {
          subjectIds: f.subjectId ? [f.subjectId] : [], topicIds: f.topicId ? [f.topicId] : [],
          sources: f.source ? [f.source] : [], difficulties: f.difficulty ? [f.difficulty] : [], ...(f.year && { year: Number(f.year) }),
        },
        balanceBySubject: !f.subjectId, allowPartial: f.allowPartial,
      };
      const res = await buildTest(body);
      addToast({ tone: 'success', title: `Draft created with ${res.selected} questions`, message: 'Publish it from the list below.' });
      tests.reload();
    } catch (err) {
      setProblems([describeApiError(err), ...(err.response?.data?.error?.details ?? []).map((d) => `${d.path}: ${d.message}`)]);
    } finally { setBusy(''); }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-ink-900">Manage tests</h1>
        <p className="mt-1 text-ink-600">Build a draft test from the question bank, then publish it. Only published, verified questions are ever selected. For bulk series run <code>npm run build:tests</code> in the server folder.</p>
      </div>

      <Card>
        <CardHeader title="Build a test" />
        <form onSubmit={build} className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3" noValidate>
          <Input label="Title" className="lg:col-span-3" value={f.title} onChange={set('title')} />
          <Checkbox className="lg:col-span-3" checked={f.template} onChange={(e) => setF((s) => ({ ...s, template: e.target.checked }))} label="Full-length GATE mock" description="65 questions, 100 marks, 180 minutes: 10 General Aptitude + 55 core. Competitive." />
          {!f.template && (
            <>
              <Select label="Type" value={f.kind} onChange={set('kind')} options={KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))} />
              <Select label="Mode" value={f.mode} onChange={set('mode')} options={options(MODE_LABEL)} />
              <Input label="Questions" type="number" min="1" max="200" value={f.count} onChange={set('count')} />
              <Select label="Subject" placeholder="Any" value={f.subjectId} onChange={set('subjectId')} options={(subjects.data ?? []).map((s) => ({ value: s.id, label: s.name }))} />
              <Select label="Topic" placeholder="Any" value={f.topicId} onChange={set('topicId')} disabled={!f.subjectId} options={topics.map((t) => ({ value: t.id, label: t.name }))} />
              <Select label="Difficulty" placeholder="Any" value={f.difficulty} onChange={set('difficulty')} options={options(DIFFICULTY_LABEL)} />
              {f.kind !== 'pyq' && <Select label="Source" placeholder="Any" value={f.source} onChange={set('source')} options={options(SOURCE_LABEL)} />}
              {f.kind === 'pyq' && <Input label="Year (optional)" type="number" value={f.year} onChange={set('year')} />}
            </>
          )}
          <Checkbox className="lg:col-span-3" checked={f.allowPartial} onChange={(e) => setF((s) => ({ ...s, allowPartial: e.target.checked }))} label="Allow a smaller test if the bank has fewer questions" />
          {problems.length > 0 && <ul role="alert" className="list-disc space-y-1 pl-5 text-sm text-danger-700 lg:col-span-3">{problems.map((p, i) => <li key={i}>{p}</li>)}</ul>}
          <div className="lg:col-span-3"><Button type="submit" loading={busy === 'build'} disabled={f.title.trim().length < 3}>Build draft test</Button></div>
        </form>
      </Card>

      <Card>
        {tests.loading ? <div className="grid place-items-center py-12"><Spinner className="size-5 text-primary-600" /></div> : (
          <>
            <Table>
              <THead><Tr><Th>Test</Th><Th>Type</Th><Th align="right">Questions</Th><Th align="right">Marks</Th><Th>Status</Th><Th><span className="sr-only">Action</span></Th></Tr></THead>
              <TBody>
                {(tests.data?.items ?? []).map((t) => (
                  <Tr key={t.id}>
                    <Td className="font-medium text-ink-900">{t.title}</Td>
                    <Td><Badge>{KIND_LABEL[t.kind]}</Badge> <Badge tone={t.mode === 'competitive' ? 'primary' : 'neutral'}>{MODE_LABEL[t.mode]}</Badge></Td>
                    <Td align="right">{t.totalQuestions}</Td>
                    <Td align="right">{t.totalMarks}</Td>
                    <Td><Badge tone={t.status === 'published' ? 'success' : 'neutral'}>{t.status === 'published' ? 'Published' : 'Draft'}</Badge></Td>
                    <Td align="right"><Button size="sm" variant="secondary" loading={busy === t.id} onClick={() => toggle(t)}>{t.status === 'published' ? 'Unpublish' : 'Publish'}</Button></Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
            {tests.data?.meta.pages > 1 && (
              <div className="flex items-center justify-between border-t border-ink-200 px-5 py-3 text-sm text-ink-600">
                <span>Page {tests.data.meta.page} of {tests.data.meta.pages}</span>
                <div className="flex gap-2"><Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button><Button variant="secondary" size="sm" disabled={page >= tests.data.meta.pages} onClick={() => setPage((p) => p + 1)}>Next</Button></div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
