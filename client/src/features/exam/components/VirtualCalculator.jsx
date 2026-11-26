import { useEffect, useRef, useState } from 'react';
import Icon from '../../../components/ui/Icon.jsx';
import { cn } from '../../../utils/cn.js';
import { initialState, press } from '../utils/calculatorEngine.js';

const KEY_STYLES = {
  num: 'bg-white text-ink-900 border-ink-200 hover:bg-ink-50 active:bg-ink-100 font-semibold',
  op: 'bg-ink-100 text-ink-900 border-ink-200 hover:bg-ink-200 active:bg-ink-300 font-medium',
  sci: 'bg-ink-50 text-ink-800 border-ink-200 hover:bg-ink-100 active:bg-ink-200 text-xs',
  mem: 'bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100 text-xs font-medium',
  danger: 'bg-danger-50 text-danger-700 border-danger-200 hover:bg-danger-100 font-medium',
  eq: 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700 active:bg-primary-800 font-semibold',
};

const SCI_ROWS = [
  [
    { label: 'MC', k: 'MC', tone: 'mem' },
    { label: 'MR', k: 'MR', tone: 'mem' },
    { label: 'MS', k: 'MS', tone: 'mem' },
    { label: 'M+', k: 'M+', tone: 'mem' },
    { label: 'M−', k: 'M-', tone: 'mem' },
  ],
  [
    { label: 'sin', k: 'sin', tone: 'sci' },
    { label: 'cos', k: 'cos', tone: 'sci' },
    { label: 'tan', k: 'tan', tone: 'sci' },
    { label: 'sinh', k: 'sinh', tone: 'sci' },
    { label: 'cosh', k: 'cosh', tone: 'sci' },
  ],
  [
    { label: 'sin⁻¹', k: 'asin', tone: 'sci' },
    { label: 'cos⁻¹', k: 'acos', tone: 'sci' },
    { label: 'tan⁻¹', k: 'atan', tone: 'sci' },
    { label: 'tanh', k: 'tanh', tone: 'sci' },
    { label: 'sinh⁻¹', k: 'asinh', tone: 'sci' },
  ],
  [
    { label: 'cosh⁻¹', k: 'acosh', tone: 'sci' },
    { label: 'tanh⁻¹', k: 'atanh', tone: 'sci' },
    { label: 'ln', k: 'ln', tone: 'sci' },
    { label: 'log₁₀', k: 'log10', tone: 'sci' },
    { label: 'log₂', k: 'log2', tone: 'sci' },
  ],
  [
    { label: 'log_y(x)', k: 'logy', tone: 'sci' },
    { label: 'eˣ', k: 'exp', tone: 'sci' },
    { label: '10ˣ', k: 'pow10', tone: 'sci' },
    { label: 'xʸ', k: 'pow', tone: 'sci' },
    { label: 'ʸ√x', k: 'yroot', tone: 'sci' },
  ],
  [
    { label: 'x²', k: 'sq', tone: 'sci' },
    { label: 'x³', k: 'cube', tone: 'sci' },
    { label: '√x', k: 'sqrt', tone: 'sci' },
    { label: '∛x', k: 'cbrt', tone: 'sci' },
    { label: '1/x', k: 'inv', tone: 'sci' },
  ],
  [
    { label: 'n!', k: 'fact', tone: 'sci' },
    { label: '%', k: 'pct', tone: 'sci' },
    { label: '|x|', k: 'abs', tone: 'sci' },
    { label: 'π', k: 'pi', tone: 'sci' },
    { label: 'e', k: 'e', tone: 'sci' },
  ],
];

const STD_ROWS = [
  [
    { label: '←', k: 'backspace', tone: 'danger', title: 'Backspace' },
    { label: 'CE', k: 'CE', tone: 'danger', title: 'Clear entry' },
    { label: 'C', k: 'C', tone: 'danger', title: 'All clear' },
    { label: '±', k: '+/-', tone: 'op', title: 'Change sign' },
  ],
  [
    { label: '(', k: '(', tone: 'op' },
    { label: ')', k: ')', tone: 'op' },
    { label: 'Mod', k: 'mod', tone: 'op' },
    { label: '÷', k: '/', tone: 'op' },
  ],
  [
    { label: '7', k: '7', tone: 'num' },
    { label: '8', k: '8', tone: 'num' },
    { label: '9', k: '9', tone: 'num' },
    { label: '×', k: '*', tone: 'op' },
  ],
  [
    { label: '4', k: '4', tone: 'num' },
    { label: '5', k: '5', tone: 'num' },
    { label: '6', k: '6', tone: 'num' },
    { label: '−', k: '-', tone: 'op' },
  ],
  [
    { label: '1', k: '1', tone: 'num' },
    { label: '2', k: '2', tone: 'num' },
    { label: '3', k: '3', tone: 'num' },
    { label: '+', k: '+', tone: 'op' },
  ],
  [
    { label: '0', k: '0', tone: 'num' },
    { label: '.', k: '.', tone: 'num' },
    { label: 'Exp', k: 'exp-sci', tone: 'op', title: 'Scientific notation' },
    { label: '=', k: '=', tone: 'eq' },
  ],
];

const KEYBOARD_MAP = {
  Enter: '=',
  '=': '=',
  Backspace: 'backspace',
  Escape: 'C',
  '+': '+',
  '-': '-',
  '*': '*',
  '/': '/',
  '(': '(',
  ')': ')',
  '.': '.',
  '%': 'pct',
};

function clampPosition(x, y, el) {
  if (typeof window === 'undefined') return { x, y };
  const w = el?.offsetWidth ?? 520;
  const h = el?.offsetHeight ?? 440;
  const maxX = Math.max(8, window.innerWidth - w - 8);
  const maxY = Math.max(8, window.innerHeight - h - 8);
  return {
    x: Math.min(Math.max(8, x), maxX),
    y: Math.min(Math.max(8, y), maxY),
  };
}

/**
 * Floating, draggable GATE-style scientific calculator.
 * Stays mounted in ExamPage so memory, angle mode, and position persist when toggled.
 */
export default function VirtualCalculator({ open, onClose }) {
  const [state, setState] = useState(initialState);
  const [pos, setPos] = useState(() => {
    if (typeof window === 'undefined') return { x: 24, y: 72 };
    return { x: Math.max(8, window.innerWidth - 548), y: 72 };
  });
  const panelRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setPos((p) => clampPosition(p.x, p.y, panelRef.current));
    const onResize = () => setPos((p) => clampPosition(p.x, p.y, panelRef.current));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open]);

  if (!open) return null;

  function handlePointerDown(e) {
    if (e.target.closest('button')) return;
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPos(clampPosition(dragRef.current.origX + dx, dragRef.current.origY + dy, panelRef.current));
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function handleKeyDown(e) {
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      setState((s) => press(s, e.key));
      return;
    }
    const mapped = KEYBOARD_MAP[e.key];
    if (mapped) {
      e.preventDefault();
      setState((s) => press(s, mapped));
    }
  }

  function trigger(k) {
    setState((s) => press(s, k));
  }

  return (
    <section
      ref={panelRef}
      aria-label="Scientific Calculator"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ left: `${pos.x}px`, top: `${pos.y}px`, width: 'min(33rem, calc(100vw - 1rem))' }}
      className="fixed z-50 flex max-h-[calc(100vh-1rem)] flex-col overflow-hidden rounded-lg border border-ink-300 bg-ink-100 shadow-xl outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    >
      {/* Draggable title bar */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="flex cursor-move select-none items-center justify-between bg-ink-900 px-3 py-2 text-white touch-none"
      >
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide">
          <Icon name="calculator" className="size-4 text-primary-300" />
          <span>Scientific Calculator</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close calculator"
          className="rounded p-1 text-ink-300 transition-colors hover:bg-ink-800 hover:text-white"
        >
          <Icon name="x" className="size-4" />
        </button>
      </div>

      {/* Scrollable body for compact viewports */}
      <div className="overflow-y-auto p-3">
        {/* Dual-line readout */}
        <div className="rounded-md border border-ink-300 bg-white px-3 py-2">
          <div className="flex items-center justify-between gap-2 text-[11px] text-ink-500">
            <div className="flex items-center gap-1.5">
              <span className="rounded bg-ink-100 px-1.5 py-0.5 font-semibold uppercase text-ink-700">
                {state.angleMode}
              </span>
              {state.hasMemory && (
                <span className="rounded bg-primary-100 px-1.5 py-0.5 font-semibold text-primary-700">
                  M
                </span>
              )}
            </div>
            <p className="min-h-4 truncate text-right font-mono text-xs text-ink-500" title={state.expression}>
              {state.expression}
            </p>
          </div>
          <p
            role="status"
            aria-live="polite"
            className={cn(
              'mt-1 truncate text-right font-mono text-xl font-semibold tabular-nums',
              state.error ? 'text-danger-600' : 'text-ink-900',
            )}
          >
            {state.display}
          </p>
        </div>

        {/* Angle mode radios */}
        <div className="mt-2 flex items-center justify-between rounded border border-ink-200 bg-white px-2.5 py-1 text-xs text-ink-700">
          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="radio"
                name="calc-angle-mode"
                checked={state.angleMode === 'deg'}
                onChange={() => trigger('deg')}
                className="accent-primary-600"
              />
              <span>Deg</span>
            </label>
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="radio"
                name="calc-angle-mode"
                checked={state.angleMode === 'rad'}
                onChange={() => trigger('rad')}
                className="accent-primary-600"
              />
              <span>Rad</span>
            </label>
          </div>
          <span className="text-[11px] text-ink-400">Drag header to move</span>
        </div>

        {/* Keypad: scientific + standard */}
        <div className="mt-2.5 grid gap-2 sm:grid-cols-[1.2fr_1fr]">
          <div className="grid gap-1">
            {SCI_ROWS.map((row, ri) => (
              <div key={ri} className="grid grid-cols-5 gap-1">
                {row.map((btn) => (
                  <button
                    key={btn.k}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => trigger(btn.k)}
                    className={cn(
                      'h-8 rounded border px-1 text-center transition-colors select-none',
                      KEY_STYLES[btn.tone],
                    )}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div className="grid gap-1">
            {STD_ROWS.map((row, ri) => (
              <div key={ri} className="grid grid-cols-4 gap-1">
                {row.map((btn) => (
                  <button
                    key={btn.k}
                    type="button"
                    title={btn.title}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => trigger(btn.k)}
                    className={cn(
                      'h-8 sm:h-[2.38rem] rounded border px-1.5 text-sm transition-colors select-none',
                      KEY_STYLES[btn.tone],
                    )}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
