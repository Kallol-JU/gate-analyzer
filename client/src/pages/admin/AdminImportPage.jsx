import { useState } from 'react';
import { Link } from 'react-router-dom';
import { importQuestions } from '../../api/admin.api.js';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Card, { CardHeader } from '../../components/ui/Card.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import { Table, TBody, THead, Td, Th, Tr } from '../../components/ui/Table.jsx';
import { useUiStore } from '../../store/uiStore.js';
import { describeApiError } from '../../utils/errorMessage.js';

// Shape only. Every value must be replaced with what the OFFICIAL paper and answer key say; the placeholder
// text is rejected by the validator, so an unfilled template can never be imported.
const TEMPLATE = [
  {
    source: 'PYQ', subject: 'Algorithms', topic: 'Asymptotic Analysis', type: 'MCQ', marks: 1, difficulty: 'medium',
    pyq: { year: 2020, session: 'Set 1' },
    sourceReference: { paperName: 'GATE CSE <year> <set>', paperUrl: 'https://REPLACE-with-the-official-paper-url', answerKeyRef: 'REPLACE: official answer key, question number', questionNumber: '0' },
    statement: 'REPLACE WITH THE EXACT TEXT FROM THE OFFICIAL PAPER',
    options: [{ key: 'A', text: 'REPLACE' }, { key: 'B', text: 'REPLACE' }, { key: 'C', text: 'REPLACE' }, { key: 'D', text: 'REPLACE' }],
    correctOptions: ['A'], explanation: 'REPLACE with a worked solution', solutionSteps: ['REPLACE'],
  },
];

export default function AdminImportPage() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const addToast = useUiStore((s) => s.addToast);

  async function run(dryRun) {
    setError('');
    let items;
    try {
      const parsed = JSON.parse(text);
      items = Array.isArray(parsed) ? parsed : parsed.items;
      if (!Array.isArray(items)) throw new Error();
    } catch {
      return setError('Paste a JSON array of questions (or { "items": [...] }).');
    }
    setBusy(dryRun ? 'check' : 'import');
    try {
      const res = await importQuestions({ items, dryRun });
      setResult(res);
      if (!dryRun) addToast({ tone: 'success', title: `${res.summary.created} question(s) saved as drafts` });
    } catch (err) {
      setResult(null);
      setError([describeApiError(err), ...(err.response?.data?.error?.details ?? []).slice(0, 8).map((d) => `${d.path}: ${d.message}`)].join('\n'));
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-ink-900">Import questions</h1>
        <p className="mt-1 text-ink-600">Up to 200 questions per file. Everything is saved as a <strong>draft</strong>; nothing reaches students until it is verified and published. Duplicates are skipped, so re-importing a file is safe.</p>
      </div>

      <Card>
        <CardHeader title="Authentic PYQs" description="Copy each question from the official GATE paper and answer key. Use source PYQ with the year, session, official paper URL and answer-key reference. A PYQ cannot be verified without them. Do not paste content from coaching sites." />
        <div className="space-y-3 p-5">
          <Textarea aria-label="Questions JSON" value={text} onChange={(e) => setText(e.target.value)} rows={16} inputClassName="font-mono text-xs" placeholder='[ { "source": "PYQ", "subject": "...", ... } ]' error={error} />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setText(JSON.stringify(TEMPLATE, null, 2))}>Insert template</Button>
            <label className="inline-flex h-10 cursor-pointer items-center rounded-md border border-ink-300 bg-white px-4 text-sm font-medium text-ink-800 hover:bg-ink-50">
              Load file
              <input type="file" accept=".json,application/json" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setText(await f.text()); e.target.value = ''; }} />
            </label>
            <Button variant="secondary" loading={busy === 'check'} disabled={!text.trim()} onClick={() => run(true)}>Check only</Button>
            <Button loading={busy === 'import'} disabled={!text.trim()} onClick={() => run(false)}>Import as drafts</Button>
          </div>
        </div>
      </Card>

      {result && (
        <Card>
          <CardHeader title={result.dryRun ? 'Check result (nothing saved)' : 'Import result'} description={`${result.summary.ok} valid, ${result.summary.invalid} invalid, ${result.summary.duplicate} duplicate${result.dryRun ? '' : `, ${result.summary.created} saved`}.`} />
          <div className="pt-3">
            <Table>
              <THead><Tr><Th>#</Th><Th>Result</Th><Th>Details</Th></Tr></THead>
              <TBody>
                {result.results.map((r) => (
                  <Tr key={r.index}>
                    <Td>{r.index + 1}</Td>
                    <Td><Badge tone={r.status === 'ok' ? 'success' : r.status === 'duplicate' ? 'warning' : 'danger'}>{r.status === 'ok' ? (result.dryRun ? 'Valid' : 'Saved') : r.status}</Badge></Td>
                    <Td className="text-sm">
                      {r.errors.map((e, i) => <p key={i} className="text-danger-700">{e.message}</p>)}
                      {r.warnings.map((e, i) => <p key={i} className="text-warning-700">{e.message}</p>)}
                      {r.id && <Link className="text-primary-700 hover:underline" to={`/admin/questions/${r.id}`}>Open</Link>}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
