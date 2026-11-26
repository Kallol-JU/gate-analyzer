import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, press } from '../src/features/exam/utils/calculatorEngine.js';

function seq(keys, start = initialState()) {
  let s = start;
  for (const k of keys) s = press(s, k);
  return s;
}

test('basic arithmetic and operator precedence', () => {
  const s = seq(['2', '+', '3', '*', '4', '=']);
  assert.equal(s.display, '14');
  assert.equal(s.error, null);
});

test('parentheses override precedence', () => {
  const s = seq(['(', '2', '+', '3', ')', '*', '4', '=']);
  assert.equal(s.display, '20');
});

test('right-associative powers and two-operand roots/logs', () => {
  // 2 ^ 3 ^ 2 = 2 ^ 9 = 512
  assert.equal(seq(['2', 'pow', '3', 'pow', '2', '=']).display, '512');
  // 3 yroot 8 = 2
  assert.equal(seq(['3', 'yroot', '8', '=']).display, '2');
  // 2 log_y(x) 8 = 3
  assert.equal(seq(['2', 'logy', '8', '=']).display, '3');
});

test('Deg and Rad trig modes with exact degree angles', () => {
  assert.equal(seq(['3', '0', 'sin']).display, '0.5');
  assert.equal(seq(['1', '8', '0', 'sin']).display, '0');
  assert.equal(seq(['6', '0', 'cos']).display, '0.5');
  assert.equal(seq(['9', '0', 'tan']).error, 'Invalid input');
  assert.equal(seq(['0', '.', '5', 'asin']).display, '30');

  // Radian mode: sin(pi/2) = 1
  const rad = seq(['rad', 'pi', '/', '2', '=', 'sin']);
  assert.equal(rad.display, '1');
});

test('logarithms, exponentials, factorial, and percent', () => {
  assert.equal(seq(['1', '0', '0', 'log10']).display, '2');
  assert.equal(seq(['8', 'log2']).display, '3');
  assert.equal(seq(['e', 'ln']).display, '1');
  assert.equal(seq(['5', 'fact']).display, '120');
  assert.equal(seq(['0', 'fact']).display, '1');
  assert.equal(seq(['2', '5', 'pct']).display, '0.25');
});

test('memory operations MC, MR, MS, M+, M-', () => {
  let s = seq(['1', '0', 'MS', '5', 'M+', '3', 'M-', 'C']);
  assert.equal(s.hasMemory, true);
  assert.equal(s.display, '0');
  s = press(s, 'MR');
  assert.equal(s.display, '12');
  s = press(s, 'MC');
  assert.equal(s.hasMemory, false);
  assert.equal(s.memory, 0);
});

test('error handling and clean recovery preserving memory and angle mode', () => {
  let s = seq(['rad', '7', 'MS', '5', '/', '0', '=']);
  assert.equal(s.error, 'Divide by zero');
  // Pressing an operator while in error is ignored
  s = press(s, '+');
  assert.equal(s.error, 'Divide by zero');
  // Digit recovers cleanly while keeping memory and rad mode
  s = press(s, '9');
  assert.equal(s.error, null);
  assert.equal(s.display, '9');
  assert.equal(s.angleMode, 'rad');
  assert.equal(s.memory, 7);
});
