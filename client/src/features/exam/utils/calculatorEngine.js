/**
 * Pure GATE-style (TCS iON) Scientific Virtual Calculator engine.
 * No DOM or React dependencies. Driven by `press(state, key)`.
 */

const PRECEDENCE = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
  mod: 2,
  pow: 3,
  yroot: 3,
  logy: 3,
};

const RIGHT_ASSOC = new Set(['pow', 'yroot', 'logy']);

const OP_LABEL = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
  mod: 'Mod',
  pow: '^',
  yroot: 'yroot',
  logy: 'log_base',
};

export function initialState() {
  return {
    display: '0',
    expression: '',
    angleMode: 'deg', // 'deg' | 'rad'
    memory: 0,
    hasMemory: false,
    error: null,
    // Internal evaluation stack: frames of { values: number[], ops: string[] }
    frames: [{ values: [], ops: [] }],
    entering: false, // true while user is typing digits/decimal/exp
    justEvaluated: false,
  };
}

function formatNumber(n) {
  if (!Number.isFinite(n)) return null;
  if (Object.is(n, -0) || Math.abs(n) < 1e-15) return '0';
  // Clean floating point noise like 0.30000000000000004 or 0.5000000000000001
  const rounded = Number(n.toPrecision(12));
  if (Math.abs(rounded) >= 1e12 || (Math.abs(rounded) > 0 && Math.abs(rounded) < 1e-9)) {
    return rounded.toExponential(8).replace(/\.?0+e/, 'e');
  }
  return String(rounded);
}

function toRadians(x, angleMode) {
  return angleMode === 'deg' ? (x * Math.PI) / 180 : x;
}

function fromRadians(rad, angleMode) {
  return angleMode === 'deg' ? (rad * 180) / Math.PI : rad;
}

function sinVal(x, angleMode) {
  if (angleMode === 'deg') {
    const m = ((x % 360) + 360) % 360;
    if (m === 0 || m === 180) return 0;
    if (m === 30 || m === 150) return 0.5;
    if (m === 210 || m === 330) return -0.5;
    if (m === 90) return 1;
    if (m === 270) return -1;
  }
  return Math.sin(toRadians(x, angleMode));
}

function cosVal(x, angleMode) {
  if (angleMode === 'deg') {
    const m = ((x % 360) + 360) % 360;
    if (m === 90 || m === 270) return 0;
    if (m === 60 || m === 300) return 0.5;
    if (m === 120 || m === 240) return -0.5;
    if (m === 0) return 1;
    if (m === 180) return -1;
  }
  return Math.cos(toRadians(x, angleMode));
}

function tanVal(x, angleMode) {
  if (angleMode === 'deg') {
    const m = ((x % 180) + 180) % 180;
    if (m === 90) return NaN;
    if (m === 0) return 0;
    if (m === 45) return 1;
    if (m === 135) return -1;
  }
  const c = cosVal(x, angleMode);
  if (Math.abs(c) < 1e-15) return NaN;
  return sinVal(x, angleMode) / c;
}

function factorial(n) {
  if (!Number.isInteger(n) || n < 0 || n > 170) return NaN;
  let res = 1;
  for (let i = 2; i <= n; i += 1) res *= i;
  return res;
}

function applyBinary(a, b, op) {
  switch (op) {
    case '+':
      return { value: a + b };
    case '-':
      return { value: a - b };
    case '*':
      return { value: a * b };
    case '/':
      if (b === 0) return { error: 'Divide by zero' };
      return { value: a / b };
    case 'mod':
      if (b === 0) return { error: 'Divide by zero' };
      return { value: a % b };
    case 'pow': {
      const v = a ** b;
      return Number.isFinite(v) ? { value: v } : { error: Number.isNaN(v) ? 'Invalid input' : 'Error' };
    }
    case 'yroot': {
      // a yroot b = b^(1/a), i.e., 3 y√x 8 = 2
      if (a === 0) return { error: 'Divide by zero' };
      if (b < 0 && Number.isInteger(a) && Math.abs(a % 2) === 1) {
        return { value: -(Math.abs(b) ** (1 / a)) };
      }
      const v = b ** (1 / a);
      return Number.isFinite(v) ? { value: v } : { error: 'Invalid input' };
    }
    case 'logy': {
      // a log_y(x) b = log_a(b), i.e., 2 log_y(x) 8 = 3
      if (a <= 0 || a === 1 || b <= 0) return { error: 'Invalid input' };
      const v = Math.log(b) / Math.log(a);
      return Number.isFinite(v) ? { value: v } : { error: 'Invalid input' };
    }
    default:
      return { error: 'Error' };
  }
}

function applyUnary(x, fn, angleMode) {
  switch (fn) {
    case 'sin':
      return sinVal(x, angleMode);
    case 'cos':
      return cosVal(x, angleMode);
    case 'tan':
      return tanVal(x, angleMode);
    case 'asin':
      return x < -1 || x > 1 ? NaN : fromRadians(Math.asin(x), angleMode);
    case 'acos':
      return x < -1 || x > 1 ? NaN : fromRadians(Math.acos(x), angleMode);
    case 'atan':
      return fromRadians(Math.atan(x), angleMode);
    case 'sinh':
      return Math.sinh(x);
    case 'cosh':
      return Math.cosh(x);
    case 'tanh':
      return Math.tanh(x);
    case 'asinh':
      return Math.asinh(x);
    case 'acosh':
      return x < 1 ? NaN : Math.acosh(x);
    case 'atanh':
      return x <= -1 || x >= 1 ? NaN : Math.atanh(x);
    case 'ln':
      return x <= 0 ? NaN : Math.log(x);
    case 'log10':
      return x <= 0 ? NaN : Math.log10(x);
    case 'log2':
      return x <= 0 ? NaN : Math.log2(x);
    case 'exp':
      return Math.exp(x);
    case 'pow10':
      return 10 ** x;
    case 'sq':
      return x * x;
    case 'cube':
      return x * x * x;
    case 'sqrt':
      return x < 0 ? NaN : Math.sqrt(x);
    case 'cbrt':
      return Math.cbrt(x);
    case 'inv':
      return x === 0 ? 'DIV_ZERO' : 1 / x;
    case 'fact':
      return factorial(x);
    case 'abs':
      return Math.abs(x);
    case 'pct':
      return x / 100;
    default:
      return NaN;
  }
}

function cloneFrames(frames) {
  return frames.map((f) => ({ values: [...f.values], ops: [...f.ops] }));
}

function reduceFrame(frame, minPrec = 0) {
  while (frame.ops.length > 0) {
    const topOp = frame.ops[frame.ops.length - 1];
    const prec = PRECEDENCE[topOp];
    if (prec < minPrec) break;
    if (prec === minPrec && RIGHT_ASSOC.has(topOp)) break;
    frame.ops.pop();
    const b = frame.values.pop();
    const a = frame.values.pop();
    const res = applyBinary(a, b, topOp);
    if (res.error) return { error: res.error };
    frame.values.push(res.value);
  }
  return {};
}

function setError(state, msg) {
  return {
    ...initialState(),
    angleMode: state.angleMode,
    memory: state.memory,
    hasMemory: state.hasMemory,
    display: msg,
    error: msg,
  };
}

const ERROR_ALLOWED = new Set(['C', 'CE', 'MC', 'deg', 'rad', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.']);

const UNARY_KEYS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
  'ln', 'log10', 'log2', 'exp', 'pow10', 'sq', 'cube',
  'sqrt', 'cbrt', 'inv', 'fact', 'abs', 'pct',
]);

export function press(state, key) {
  if (state.error && !ERROR_ALLOWED.has(key)) {
    return state;
  }

  if (key === 'deg' || key === 'rad') {
    return { ...state, angleMode: key };
  }

  if (key === 'C') {
    return {
      ...initialState(),
      angleMode: state.angleMode,
      memory: state.memory,
      hasMemory: state.hasMemory,
    };
  }

  if (key === 'CE') {
    if (state.error) {
      return {
        ...initialState(),
        angleMode: state.angleMode,
        memory: state.memory,
        hasMemory: state.hasMemory,
      };
    }
    return { ...state, display: '0', entering: false };
  }

  // Memory operations
  const currentNum = Number(state.display);
  if (key === 'MC') return { ...state, memory: 0, hasMemory: false };
  if (key === 'MR') {
    if (!state.hasMemory && state.memory === 0) {
      return { ...state, display: '0', entering: false, justEvaluated: true };
    }
    return { ...state, display: formatNumber(state.memory) ?? '0', entering: false, justEvaluated: true };
  }
  if (key === 'MS') {
    if (!Number.isFinite(currentNum)) return state;
    return { ...state, memory: currentNum, hasMemory: true, entering: false };
  }
  if (key === 'M+') {
    if (!Number.isFinite(currentNum)) return state;
    return { ...state, memory: state.memory + currentNum, hasMemory: true, entering: false };
  }
  if (key === 'M-') {
    if (!Number.isFinite(currentNum)) return state;
    return { ...state, memory: state.memory - currentNum, hasMemory: true, entering: false };
  }

  // Digits & decimal point
  if (/^[0-9]$/.test(key)) {
    if (state.error || state.justEvaluated) {
      return {
        ...initialState(),
        angleMode: state.angleMode,
        memory: state.memory,
        hasMemory: state.hasMemory,
        display: key,
        entering: true,
      };
    }
    if (!state.entering || state.display === '0') {
      return { ...state, display: key, entering: true };
    }
    if (state.display.length >= 18) return state;
    return { ...state, display: state.display + key, entering: true };
  }

  if (key === '.') {
    if (state.error || state.justEvaluated) {
      return {
        ...initialState(),
        angleMode: state.angleMode,
        memory: state.memory,
        hasMemory: state.hasMemory,
        display: '0.',
        entering: true,
      };
    }
    if (!state.entering) {
      return { ...state, display: '0.', entering: true };
    }
    if (state.display.includes('.') || state.display.includes('e')) return state;
    return { ...state, display: state.display + '.', entering: true };
  }

  if (key === 'exp-sci') {
    if (!state.entering && state.justEvaluated) {
      return { ...state, display: `${state.display}e+`, entering: true, justEvaluated: false };
    }
    if (state.display.includes('e')) return state;
    return { ...state, display: `${state.display}e+`, entering: true };
  }

  if (key === 'backspace') {
    if (!state.entering) return state;
    if (state.display.endsWith('e+') || state.display.endsWith('e-')) {
      const trimmed = state.display.slice(0, -2) || '0';
      return { ...state, display: trimmed, entering: trimmed !== '0' };
    }
    const next = state.display.slice(0, -1);
    if (!next || next === '-') return { ...state, display: '0', entering: false };
    return { ...state, display: next, entering: true };
  }

  if (key === '+/-') {
    if (state.display.includes('e')) {
      const idx = state.display.indexOf('e');
      const mantissa = state.display.slice(0, idx);
      const expPart = state.display.slice(idx + 1);
      const toggledExp = expPart.startsWith('-') ? '+' + expPart.slice(1) : expPart.startsWith('+') ? '-' + expPart.slice(1) : '-' + expPart;
      return { ...state, display: `${mantissa}e${toggledExp}` };
    }
    if (state.display === '0') return state;
    const next = state.display.startsWith('-') ? state.display.slice(1) : '-' + state.display;
    return { ...state, display: next };
  }

  if (key === 'pi') {
    return { ...state, display: formatNumber(Math.PI), entering: false, justEvaluated: false };
  }
  if (key === 'e') {
    return { ...state, display: formatNumber(Math.E), entering: false, justEvaluated: false };
  }

  // Unary functions
  if (UNARY_KEYS.has(key)) {
    const val = Number(state.display);
    if (!Number.isFinite(val)) return setError(state, 'Invalid input');
    const out = applyUnary(val, key, state.angleMode);
    if (out === 'DIV_ZERO') return setError(state, 'Divide by zero');
    if (typeof out !== 'number' || Number.isNaN(out)) return setError(state, 'Invalid input');
    const formatted = formatNumber(out);
    if (formatted === null) return setError(state, 'Error');
    return { ...state, display: formatted, entering: false, justEvaluated: false };
  }

  // Parentheses
  if (key === '(') {
    const frames = cloneFrames(state.justEvaluated ? [{ values: [], ops: [] }] : state.frames);
    frames.push({ values: [], ops: [] });
    const baseExpr = state.justEvaluated ? '' : state.expression;
    return {
      ...state,
      frames,
      expression: `${baseExpr}(`,
      display: '0',
      entering: false,
      justEvaluated: false,
    };
  }

  if (key === ')') {
    if (state.frames.length <= 1) return state;
    const frames = cloneFrames(state.frames);
    const top = frames.pop();
    const val = Number(state.display);
    if (!Number.isFinite(val)) return setError(state, 'Invalid input');
    top.values.push(val);
    const { error } = reduceFrame(top, 0);
    if (error) return setError(state, error);
    const groupVal = top.values[top.values.length - 1] ?? 0;
    const formatted = formatNumber(groupVal);
    if (formatted === null) return setError(state, 'Error');
    return {
      ...state,
      frames,
      display: formatted,
      expression: `${state.expression}${state.display})`,
      entering: false,
      justEvaluated: false,
    };
  }

  // Binary operators
  if (key in PRECEDENCE) {
    const frames = cloneFrames(state.justEvaluated ? [{ values: [], ops: [] }] : state.frames);
    const top = frames[frames.length - 1];
    const val = Number(state.display);
    if (!Number.isFinite(val)) return setError(state, 'Invalid input');

    let expr = state.justEvaluated ? '' : state.expression;

    if (!state.entering && top.ops.length > 0 && top.values.length === top.ops.length && !state.justEvaluated) {
      // Replace trailing binary operator if user pressed two operators in a row
      const prevOp = top.ops.pop();
      const prevLabel = OP_LABEL[prevOp];
      if (expr.endsWith(` ${prevLabel} `)) {
        expr = expr.slice(0, -(prevLabel.length + 2));
      }
    } else {
      top.values.push(val);
      expr = `${expr}${state.display}`;
    }

    const { error } = reduceFrame(top, PRECEDENCE[key]);
    if (error) return setError(state, error);
    top.ops.push(key);

    const preview = formatNumber(top.values[top.values.length - 1]);
    return {
      ...state,
      frames,
      display: preview ?? state.display,
      expression: `${expr} ${OP_LABEL[key]} `,
      entering: false,
      justEvaluated: false,
    };
  }

  // Equals
  if (key === '=') {
    if (state.justEvaluated) return state;
    const frames = cloneFrames(state.frames);
    const val = Number(state.display);
    if (!Number.isFinite(val)) return setError(state, 'Invalid input');

    // Close any unclosed parentheses automatically
    while (frames.length > 1) {
      const top = frames.pop();
      top.values.push(val);
      const { error } = reduceFrame(top, 0);
      if (error) return setError(state, error);
      const innerVal = top.values[top.values.length - 1] ?? 0;
      frames[frames.length - 1].values.push(innerVal);
    }

    const root = frames[0];
    if (root.values.length <= root.ops.length) {
      root.values.push(val);
    }
    const { error } = reduceFrame(root, 0);
    if (error) return setError(state, error);
    const finalVal = root.values[root.values.length - 1] ?? val;
    const formatted = formatNumber(finalVal);
    if (formatted === null) return setError(state, 'Error');

    return {
      ...state,
      frames: [{ values: [], ops: [] }],
      display: formatted,
      expression: '',
      entering: false,
      justEvaluated: true,
    };
  }

  return state;
}
