import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// $$ ... $$ is display math, $ ... $ is inline math. Everything else is plain text.
const MATH_PATTERN = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;

function renderMath(source, displayMode) {
  return katex.renderToString(source, { displayMode, throwOnError: false, output: 'htmlAndMathml' });
}

/**
 * Renders text containing KaTeX. Plain-text segments go through React (so they are escaped);
 * only the KaTeX output itself is injected as HTML. Invalid LaTeX is shown in red, not thrown.
 */
export default function MathText({ children, className }) {
  const text = typeof children === 'string' ? children : '';

  const parts = useMemo(() => {
    return text.split(MATH_PATTERN).filter(Boolean).map((segment, i) => {
      if (segment.startsWith('$$') && segment.endsWith('$$') && segment.length > 4) {
        return { key: i, math: true, display: true, html: renderMath(segment.slice(2, -2), true) };
      }
      if (segment.startsWith('$') && segment.endsWith('$') && segment.length > 2) {
        return { key: i, math: true, display: false, html: renderMath(segment.slice(1, -1), false) };
      }
      return { key: i, math: false, text: segment };
    });
  }, [text]);

  return (
    <span className={className}>
      {parts.map((p) =>
        p.math ? (
          <span key={p.key} className={p.display ? 'block overflow-x-auto py-2' : undefined} dangerouslySetInnerHTML={{ __html: p.html }} />
        ) : (
          <span key={p.key} className="whitespace-pre-line">
            {p.text}
          </span>
        ),
      )}
    </span>
  );
}
