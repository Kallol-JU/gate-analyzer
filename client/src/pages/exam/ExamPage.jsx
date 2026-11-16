import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { cn } from '../../utils/cn.js';
import Button, { buttonStyles } from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Tabs from '../../components/ui/Tabs.jsx';
import BottomNav from '../../features/exam/components/BottomNav.jsx';
import ExamHeader from '../../features/exam/components/ExamHeader.jsx';
import Palette from '../../features/exam/components/Palette.jsx';
import QuestionPanel from '../../features/exam/components/QuestionPanel.jsx';
import SubmitDialog from '../../features/exam/components/SubmitDialog.jsx';
import { useExamStore } from '../../features/exam/engine/examStore.js';
import { useRemainingSeconds } from '../../features/exam/engine/useRemainingSeconds.js';
import { countStatuses, deriveStatus, hasAnswer } from '../../features/exam/utils/questionStatus.js';
import { useAuthStore } from '../../store/authStore.js';

const SYNC_TEXT = {
  saved: ['bg-success-600', 'All answers saved'],
  saving: ['bg-primary-600', 'Saving…'],
  offline: ['bg-warning-600', 'Offline: answers are kept on this device and sync when you reconnect'],
  error: ['bg-danger-600', 'Could not save some answers'],
};

function SyncIndicator({ sync, pendingCount, detail }) {
  const [dot, text] = SYNC_TEXT[sync];
  return (
    <p role="status" className="flex items-center gap-2 text-xs text-ink-600" title={detail ?? undefined}>
      <span className={cn('size-2 rounded-full', dot)} aria-hidden="true" />
      <span className="hidden sm:inline">{text}</span>
      <span className="sm:hidden">{sync === 'saved' ? 'Saved' : sync === 'saving' ? 'Saving…' : sync === 'offline' ? 'Offline' : 'Save error'}</span>
      {pendingCount > 0 && sync !== 'saved' && <span className="text-ink-500">({pendingCount} pending)</span>}
    </p>
  );
}

/** The live exam. All state lives in examStore; the server is the source of truth for time and answers. */
export default function ExamPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const phase = useExamStore((s) => s.phase);
  const error = useExamStore((s) => s.error);
  const test = useExamStore((s) => s.test);
  const questions = useExamStore((s) => s.questions);
  const responses = useExamStore((s) => s.responses);
  const current = useExamStore((s) => s.current);
  const pending = useExamStore((s) => s.pending);
  const sync = useExamStore((s) => s.sync);
  const syncError = useExamStore((s) => s.syncError);
  const submitting = useExamStore((s) => s.submitting);
  const submitError = useExamStore((s) => s.submitError);
  const store = useExamStore.getState;

  const remainingSeconds = useRemainingSeconds();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const pendingCount = Object.keys(pending).length;

  useEffect(() => {
    store().load(attemptId);
    return () => store().reset();
  }, [attemptId, store]);

  // Finished (submitted, expired, or closed elsewhere): go to the result.
  useEffect(() => {
    if (phase === 'closed') navigate(`/results/${attemptId}`, { replace: true });
  }, [phase, attemptId, navigate]);

  // Time is up on the display: ask the server to close the exam (it decides; this just prompts it).
  const timeUp = phase === 'ready' && remainingSeconds === 0; // null (no server report yet) is not time-up
  useEffect(() => {
    if (timeUp) store().submit({ auto: true });
  }, [timeUp, store]);

  // Reconnect, tab becoming visible again (after sleep), and leaving with unsaved changes.
  useEffect(() => {
    const onOnline = () => store().syncNow();
    const onVisible = () => document.visibilityState === 'visible' && store().syncNow();
    const onBeforeUnload = (e) => {
      if (Object.keys(store().pending).length) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [store]);

  const numbered = useMemo(() => questions.map((q, i) => ({ ...q, number: i + 1 })), [questions]);
  const statuses = useMemo(
    () => Object.fromEntries(numbered.map((q, i) => [q.id, deriveStatus(responses[i])])),
    [numbered, responses],
  );

  if (phase === 'idle' || phase === 'loading' || phase === 'closed') {
    return (
      <div className="grid flex-1 place-items-center">
        <Spinner className="size-6 text-primary-600" label="Loading exam" />
      </div>
    );
  }
  if (phase === 'error') {
    return (
      <div className="grid flex-1 place-items-center p-6 text-center">
        <div className="max-w-sm">
          <h1 className="text-lg font-semibold text-ink-900">Cannot open this exam</h1>
          <p className="mt-2 text-sm text-ink-600">{error}</p>
          <div className="mt-5 flex justify-center gap-3">
            <Button onClick={() => store().load(attemptId)}>Try again</Button>
            <Link to="/history" className={buttonStyles({ variant: 'secondary' })}>
              My attempts
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const question = numbered[current];
  const response = responses[current];
  const sectionIndex = question.sectionIndex;
  const section = test.sections[sectionIndex];
  const sectionQuestions = numbered.filter((q) => q.sectionIndex === sectionIndex);
  const candidate = { name: user.name, rollNo: user.email };

  const rows = test.sections.map((sec, i) => {
    const qs = numbered.filter((q) => q.sectionIndex === i);
    return { name: sec.name, total: qs.length, counts: countStatuses(qs.map((q) => statuses[q.id])) };
  });
  const tabs = test.sections.map((sec, i) => ({ id: String(i), label: sec.name, count: sec.count }));
  const paletteProps = {
    candidate,
    sectionName: section.name,
    questions: sectionQuestions,
    statuses,
    currentId: question.id,
    counts: countStatuses(sectionQuestions.map((q) => statuses[q.id])),
    onSelect: (id) => {
      store().goTo(numbered.findIndex((q) => q.id === id));
      setPaletteOpen(false);
    },
  };

  async function confirmSubmit() {
    const done = await store().submit();
    if (done) setSubmitOpen(false);
  }

  return (
    <>
      <ExamHeader
        title={test.title}
        subtitle={`${test.totalQuestions} questions · ${test.totalMarks} marks`}
        candidate={candidate}
        remainingSeconds={remainingSeconds ?? 0}
        onSubmit={() => setSubmitOpen(true)}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-ink-200 bg-white px-4 py-2 sm:px-6">
        {test.sections.length > 1 ? (
          <Tabs tabs={tabs} value={String(sectionIndex)} onChange={(id) => store().goTo(test.sections[Number(id)].startIndex)} label="Exam sections" />
        ) : (
          <p className="text-sm font-medium text-ink-700">{section.name}</p>
        )}
        <SyncIndicator sync={sync} pendingCount={pendingCount} detail={syncError} />
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {/* key remounts this area per question, which resets the scroll position */}
          <div key={question.id} className="flex-1 overflow-y-auto">
            <QuestionPanel
              question={question}
              number={question.number}
              sectionName={section.name}
              answer={response.answer}
              onAnswerChange={(answer) => store().setAnswer(current, answer)}
            />
          </div>
          <BottomNav
            isFirst={current === 0}
            isLast={current === questions.length - 1}
            canClear={hasAnswer(response.answer)}
            onMarkNext={() => store().markNext()}
            onClear={() => store().clearAnswer(current)}
            onPrev={() => store().prev()}
            onNext={() => store().next()}
            onSaveNext={() => store().saveNext()}
          />
        </div>

        <aside aria-label="Question palette" className="hidden w-80 shrink-0 overflow-y-auto border-l border-ink-200 bg-ink-50 lg:block">
          <Palette {...paletteProps} />
        </aside>
      </div>

      <Modal open={paletteOpen} onClose={() => setPaletteOpen(false)} title="Question palette" size="sm">
        <div className="-mx-5 -my-4 bg-ink-50">
          <Palette {...paletteProps} />
        </div>
      </Modal>

      <SubmitDialog
        open={submitOpen && !timeUp}
        onClose={() => setSubmitOpen(false)}
        onConfirm={confirmSubmit}
        rows={rows}
        busy={submitting}
        error={submitError}
        notice={pendingCount ? `${pendingCount} recent change(s) have not reached the server yet. They will be saved before submitting.` : undefined}
      />

      {timeUp && (
        <div role="alertdialog" aria-label="Time is up" className="fixed inset-0 z-50 grid place-items-center bg-ink-900/60 p-6">
          <div className="max-w-sm rounded-lg bg-white p-6 text-center">
            <Spinner className="mx-auto size-6 text-primary-600" />
            <h2 className="mt-4 text-lg font-semibold text-ink-900">Time is up</h2>
            <p className="mt-1 text-sm text-ink-600">Submitting your exam…</p>
          </div>
        </div>
      )}
    </>
  );
}
