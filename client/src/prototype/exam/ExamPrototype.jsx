import { useMemo, useState } from 'react';
import PrototypeBanner from '../../components/common/PrototypeBanner.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Tabs from '../../components/ui/Tabs.jsx';
import BottomNav from '../../features/exam/components/BottomNav.jsx';
import ExamHeader from '../../features/exam/components/ExamHeader.jsx';
import Palette from '../../features/exam/components/Palette.jsx';
import QuestionPanel from '../../features/exam/components/QuestionPanel.jsx';
import SubmitDialog from '../../features/exam/components/SubmitDialog.jsx';
import { countStatuses, deriveStatus, hasAnswer } from '../../features/exam/utils/questionStatus.js';
import { useUiStore } from '../../store/uiStore.js';
import { sampleExam } from './examData.js';
import { useDemoCountdown } from './useDemoCountdown.js';
import { usePrototypeExam } from './usePrototypeExam.js';

/**
 * PROTOTYPE · composes the real exam components with local sample state.
 * Everything under features/exam is reusable in Phase 4; everything in this folder is throwaway.
 */
export default function ExamPrototype() {
  const exam = sampleExam;
  const addToast = useUiStore((s) => s.addToast);

  const { state, actions } = usePrototypeExam(exam.questions);
  const remainingSeconds = useDemoCountdown(exam.durationMinutes * 60);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Attach a global question number (1-based, continuous across sections).
  const questions = useMemo(() => exam.questions.map((q, i) => ({ ...q, number: i + 1 })), [exam.questions]);

  const currentQuestion = questions[state.current];
  const currentResponse = state.responses[currentQuestion.id];
  const currentSection = exam.sections.find((s) => s.id === currentQuestion.sectionId);

  const statuses = useMemo(
    () => Object.fromEntries(questions.map((q) => [q.id, deriveStatus(state.responses[q.id])])),
    [questions, state.responses],
  );

  const sectionQuestions = questions.filter((q) => q.sectionId === currentSection.id);
  const sectionCounts = countStatuses(sectionQuestions.map((q) => statuses[q.id]));

  const submitRows = exam.sections.map((section) => {
    const qs = questions.filter((q) => q.sectionId === section.id);
    return { name: section.name, total: qs.length, counts: countStatuses(qs.map((q) => statuses[q.id])) };
  });

  const sectionTabs = exam.sections.map((s) => ({
    id: s.id,
    label: s.id === 'ga' ? 'General Aptitude' : 'Computer Science',
    count: questions.filter((q) => q.sectionId === s.id).length,
  }));

  function selectSection(sectionId) {
    const first = questions.findIndex((q) => q.sectionId === sectionId);
    actions.goTo(first);
  }

  function selectQuestion(id) {
    actions.goTo(questions.findIndex((q) => q.id === id));
    setPaletteOpen(false);
  }

  function confirmSubmit() {
    setSubmitOpen(false);
    addToast({
      tone: 'warning',
      title: 'Nothing was submitted',
      message: 'This is a layout prototype. Real submission is built in a later phase.',
    });
  }

  const paletteProps = {
    candidate: exam.candidate,
    sectionName: currentSection.name,
    questions: sectionQuestions,
    statuses,
    currentId: currentQuestion.id,
    counts: sectionCounts,
    onSelect: selectQuestion,
  };

  return (
    <>
      <PrototypeBanner
        variant="strip"
        backTo="/dashboard"
        backLabel="Leave prototype"
      >
        Layout preview. Answers are kept in this tab only and the timer is a local demo.
      </PrototypeBanner>

      <ExamHeader
        title={exam.title}
        subtitle={exam.subtitle}
        candidate={exam.candidate}
        remainingSeconds={remainingSeconds}
        onSubmit={() => setSubmitOpen(true)}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      <div className="shrink-0 border-b border-ink-200 bg-white px-4 py-2 sm:px-6">
        <Tabs tabs={sectionTabs} value={currentSection.id} onChange={selectSection} label="Exam sections" />
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {/* key remounts this area per question, which resets the scroll position */}
          <div key={currentQuestion.id} className="flex-1 overflow-y-auto">
            <QuestionPanel
              question={currentQuestion}
              number={currentQuestion.number}
              sectionName={currentSection.name}
              answer={currentResponse.answer}
              onAnswerChange={(answer) => actions.setAnswer(currentQuestion.id, answer)}
            />
          </div>

          <BottomNav
            isFirst={state.current === 0}
            isLast={state.current === questions.length - 1}
            canClear={hasAnswer(currentResponse.answer)}
            onMarkNext={actions.markNext}
            onClear={() => actions.clear(currentQuestion.id)}
            onPrev={actions.prev}
            onNext={actions.next}
            onSaveNext={actions.saveNext}
          />
        </div>

        <aside
          aria-label="Question palette"
          className="hidden w-80 shrink-0 overflow-y-auto border-l border-ink-200 bg-ink-50 lg:block"
        >
          <Palette {...paletteProps} />
        </aside>
      </div>

      <Modal open={paletteOpen} onClose={() => setPaletteOpen(false)} title="Question palette" size="sm">
        <div className="-mx-5 -my-4 bg-ink-50">
          <Palette {...paletteProps} />
        </div>
      </Modal>

      <SubmitDialog
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onConfirm={confirmSubmit}
        rows={submitRows}
        confirmLabel="Submit (prototype)"
        notice="Prototype: confirming will not submit or save anything."
      />
    </>
  );
}
