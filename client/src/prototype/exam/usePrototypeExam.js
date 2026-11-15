import { useMemo, useReducer } from 'react';

/**
 * PROTOTYPE · local-only exam state (useReducer). Nothing is sent to a server.
 * In Phase 4 the real examStore (Zustand) replaces this and syncs every change to the API.
 *
 * state = { current: index, ids: [questionId], responses: { [id]: { answer, visited, marked } } }
 */
function init(questions) {
  const ids = questions.map((q) => q.id);
  const responses = {};
  ids.forEach((id, i) => {
    responses[id] = { answer: null, visited: i === 0, marked: false };
  });
  return { current: 0, ids, responses };
}

function reducer(state, action) {
  const { ids } = state;
  const currentId = ids[state.current];

  const patch = (id, changes) => ({ ...state.responses, [id]: { ...state.responses[id], ...changes } });

  // Move to an index (clamped) and mark that question as visited.
  const moveTo = (responses, index) => {
    const target = Math.min(Math.max(index, 0), ids.length - 1);
    const id = ids[target];
    return { ...state, current: target, responses: { ...responses, [id]: { ...responses[id], visited: true } } };
  };

  switch (action.type) {
    case 'goTo':
      return moveTo(state.responses, action.index);
    case 'prev':
      return moveTo(state.responses, state.current - 1);
    case 'next':
      return moveTo(state.responses, state.current + 1);
    case 'setAnswer':
      return { ...state, responses: patch(action.id, { answer: action.answer }) };
    case 'clear':
      return { ...state, responses: patch(action.id, { answer: null }) };
    case 'saveNext':
      // Saving removes the review flag, then moves on.
      return moveTo(patch(currentId, { marked: false }), state.current + 1);
    case 'markNext':
      return moveTo(patch(currentId, { marked: true }), state.current + 1);
    default:
      return state;
  }
}

export function usePrototypeExam(questions) {
  const [state, dispatch] = useReducer(reducer, questions, init);

  const actions = useMemo(
    () => ({
      goTo: (index) => dispatch({ type: 'goTo', index }),
      prev: () => dispatch({ type: 'prev' }),
      next: () => dispatch({ type: 'next' }),
      setAnswer: (id, answer) => dispatch({ type: 'setAnswer', id, answer }),
      clear: (id) => dispatch({ type: 'clear', id }),
      saveNext: () => dispatch({ type: 'saveNext' }),
      markNext: () => dispatch({ type: 'markNext' }),
    }),
    [],
  );

  return { state, actions };
}
