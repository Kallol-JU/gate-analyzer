import MathText from '../../../components/common/MathText.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import { QUESTION_TYPE_LABEL } from '../../../utils/constants.js';
import { formatMarkValue } from '../../../utils/formatTime.js';
import NatInput from './NatInput.jsx';
import OptionList from './OptionList.jsx';

/**
 * The question area. It receives the student's view of a question (never the answer key)
 * and reports answer changes through onAnswerChange(answer).
 */
export default function QuestionPanel({ question, number, sectionName, answer, onAnswerChange }) {
  const negative = question.negativeMarks > 0 ? `−${formatMarkValue(question.negativeMarks)}` : 'None';

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-ink-200 pb-4">
        <h2 className="text-lg font-semibold text-ink-900">Question {number}</h2>
        <Badge tone="primary">{question.type}</Badge>
        <p className="text-sm text-ink-600">
          Marks: <span className="font-semibold text-ink-900">{question.marks}</span>
        </p>
        <p className="text-sm text-ink-600">
          Negative marking: <span className="font-semibold text-ink-900">{negative}</span>
        </p>
        <p className="w-full text-xs text-ink-500 sm:ml-auto sm:w-auto">{sectionName}</p>
      </div>

      <div className="mt-6">
        <MathText className="font-serif text-lg leading-relaxed text-ink-900">{question.statement}</MathText>

        {question.code && (
          <pre className="mt-4 overflow-x-auto rounded-md border border-ink-200 bg-ink-50 p-4 font-mono text-sm leading-relaxed text-ink-900">
            <code>{question.code}</code>
          </pre>
        )}
      </div>

      <p className="mt-6 text-sm font-medium text-ink-600">{QUESTION_TYPE_LABEL[question.type]}</p>

      <div className="mt-3">
        {question.type === 'NAT' ? (
          <NatInput value={answer} onChange={onAnswerChange} />
        ) : (
          <OptionList
            type={question.type}
            options={question.options}
            value={answer}
            onChange={onAnswerChange}
            legend={`Answer options for question ${number}`}
          />
        )}
      </div>
    </article>
  );
}
