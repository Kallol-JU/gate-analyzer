import MathText from '../../components/common/MathText.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { cn } from '../../utils/cn.js';
import { formatMarkValue } from '../../utils/formatTime.js';

const OUTCOME = {
  correct: { label: 'Correct', tone: 'success' },
  incorrect: { label: 'Incorrect', tone: 'danger' },
  unanswered: { label: 'Not answered', tone: 'neutral' },
};

const signed = (n) => (n > 0 ? `+${formatMarkValue(n)}` : n < 0 ? `−${formatMarkValue(Math.abs(n))}` : '0');
const natText = (n) => (n.min === n.max ? String(n.min) : `${n.min} to ${n.max}`);

/** One reviewed question: your answer, the correct answer and the explanation (only shown after submission). */
export default function QuestionReviewCard({ q }) {
  const outcome = OUTCOME[q.outcome];
  const mine = Array.isArray(q.yourAnswer) ? q.yourAnswer : q.yourAnswer ? [q.yourAnswer] : [];

  return (
    <article className="rounded-lg border border-ink-200 bg-white p-5">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3 className="font-semibold text-ink-900">Question {q.number}</h3>
        <Badge tone="primary">{q.type}</Badge>
        <Badge tone={outcome.tone}>{outcome.label}</Badge>
        <p className="text-sm text-ink-600">
          {signed(q.marksAwarded)} of {q.marks} marks
        </p>
        <p className="text-xs text-ink-500 sm:ml-auto">
          {q.subjectName} · {q.topicName}
        </p>
      </header>

      <MathText className="mt-4 block font-serif text-base leading-relaxed text-ink-900">{q.statement}</MathText>
      {q.code && (
        <pre className="mt-3 overflow-x-auto rounded-md border border-ink-200 bg-ink-50 p-4 font-mono text-sm leading-relaxed">
          <code>{q.code}</code>
        </pre>
      )}

      {q.type === 'NAT' ? (
        <dl className="mt-4 grid max-w-sm grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-ink-500">Your answer</dt>
          <dd className={cn('font-medium', q.outcome === 'incorrect' ? 'text-danger-700' : 'text-ink-900')}>{q.yourAnswer ?? 'Not answered'}</dd>
          <dt className="text-ink-500">Correct answer</dt>
          <dd className="font-medium text-success-700">{q.natAnswer ? natText(q.natAnswer) : 'Not available'}</dd>
        </dl>
      ) : (
        <ul className="mt-4 space-y-2">
          {q.options.map((o) => {
            const isCorrect = q.correctOptions.includes(o.key);
            const picked = mine.includes(o.key);
            return (
              <li
                key={o.key}
                className={cn(
                  'flex items-start gap-3 rounded-md border px-3 py-2 text-sm',
                  isCorrect ? 'border-success-600 bg-success-50' : picked ? 'border-danger-600 bg-danger-50' : 'border-ink-200',
                )}
              >
                <span className="w-5 shrink-0 font-semibold text-ink-500">{o.key}</span>
                <MathText className="min-w-0 flex-1 text-ink-900">{o.text}</MathText>
                <span className="shrink-0 text-xs font-medium">
                  {isCorrect && <span className="text-success-700">Correct{picked ? ' · your answer' : ''}</span>}
                  {!isCorrect && picked && <span className="text-danger-700">Your answer</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {q.explanation && (
        <div className="mt-4 rounded-md bg-ink-50 px-4 py-3">
          <p className="text-xs font-semibold text-ink-500">Explanation</p>
          <MathText className="mt-1 block text-sm leading-relaxed text-ink-800">{q.explanation}</MathText>
        </div>
      )}
    </article>
  );
}
