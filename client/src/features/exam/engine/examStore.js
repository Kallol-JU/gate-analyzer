import { create } from 'zustand';
import * as attemptsApi from '../../../api/attempts.api.js';
import { describeApiError } from '../../../utils/errorMessage.js';

/**
 * Client side of the exam engine. The SERVER owns time, answers and scoring; this store only
 * renders them and delivers the student's changes reliably.
 *
 *  - Every change gets a per-question sequence number (seq) and goes into `pending`.
 *  - `pending` is mirrored to localStorage, so a refresh or a dead connection loses nothing.
 *  - Pending changes are sent in batches. The server applies only newer seq values, so retries,
 *    duplicates and out-of-order requests are harmless.
 *  - Time left = (server-reported remaining time) minus (monotonic time since that report).
 *    performance.now() ignores wall-clock changes, and the report is refreshed regularly.
 */
const FLUSH_DELAY_MS = 400;
const RETRY_DELAYS_MS = [2000, 4000, 8000, 15000];
const RESYNC_INTERVAL_MS = 30_000;
const AUTO_SUBMIT_RETRY_MS = 3000;

const storageKey = (id) => `gatecbt:attempt:${id}`;
const readLocal = (id) => {
  try {
    return JSON.parse(localStorage.getItem(storageKey(id)) ?? 'null');
  } catch {
    return null;
  }
};
const writeLocal = (id, data) => {
  try {
    const hasPending = Object.keys(data.pending).length > 0;
    if (hasPending) localStorage.setItem(storageKey(id), JSON.stringify(data));
    else localStorage.removeItem(storageKey(id));
  } catch {
    /* storage full or blocked: the server copy still works */
  }
};
const clearLocal = (id) => {
  try {
    localStorage.removeItem(storageKey(id));
  } catch {
    /* ignore */
  }
};

const normalizeAnswer = (a) => (a === '' || (Array.isArray(a) && a.length === 0) ? null : a);
const anchorFrom = (timing) => ({ perf: performance.now(), remainingMs: timing.remainingMs });

let flushTimer = null;
let retryTimer = null;
let resyncTimer = null;
let flight = null; // promise of the request currently in flight
let retryCount = 0;

const INITIAL = {
  phase: 'idle', // idle | loading | ready | closed | error
  error: null,
  attemptId: null,
  test: null,
  questions: [],
  responses: [],
  current: 0,
  anchor: null,
  pending: {},
  sync: 'saved', // saved | saving | offline | error
  syncError: null,
  submitting: false,
  submitError: null,
};

export const useExamStore = create((set, get) => {
  const persist = () => {
    const { attemptId, pending, current } = get();
    if (attemptId) writeLocal(attemptId, { pending, current });
  };

  const scheduleFlush = (delay = FLUSH_DELAY_MS) => {
    clearTimeout(flushTimer);
    flushTimer = setTimeout(() => flush(), delay);
  };

  const scheduleRetry = () => {
    clearTimeout(retryTimer);
    const delay = RETRY_DELAYS_MS[Math.min(retryCount, RETRY_DELAYS_MS.length - 1)];
    retryCount += 1;
    retryTimer = setTimeout(() => flush(), delay);
  };

  const markClosed = () => {
    const { attemptId } = get();
    if (attemptId) clearLocal(attemptId);
    clearTimeout(flushTimer);
    clearTimeout(retryTimer);
    set({ phase: 'closed', pending: {} });
  };

  async function sendBatch() {
    const { attemptId, pending } = get();
    const entries = Object.values(pending).slice(0, 100);
    if (entries.length === 0) {
      set({ sync: 'saved', syncError: null });
      return;
    }
    set({ sync: 'saving' });
    try {
      const res = await attemptsApi.saveResponses(attemptId, entries);
      retryCount = 0;
      // Drop only what was acknowledged; a newer local change to the same question stays queued.
      const next = { ...get().pending };
      for (const e of entries) if (next[e.index]?.seq === e.seq) delete next[e.index];
      set({ pending: next, anchor: anchorFrom(res.timing), sync: Object.keys(next).length ? 'saving' : 'saved', syncError: null });
      persist();
      if (res.status !== 'in_progress') markClosed();
      else if (Object.keys(next).length) scheduleFlush(0);
    } catch (err) {
      const status = err.response?.status;
      const code = err.response?.data?.error?.code;
      if (code === 'ATTEMPT_EXPIRED' || code === 'ATTEMPT_CLOSED') {
        markClosed();
      } else if (!err.response || status >= 500 || status === 429 || status === 401) {
        // Offline, server trouble or an expired login: keep everything queued and retry.
        set({ sync: 'offline', syncError: status === 401 ? 'Your login expired. Log in again in another tab.' : null });
        scheduleRetry();
      } else {
        // The server rejected this batch (should not happen). Drop it so it cannot block later saves.
        const next = { ...get().pending };
        for (const e of entries) if (next[e.index]?.seq === e.seq) delete next[e.index];
        set({ pending: next, sync: 'error', syncError: describeApiError(err) });
        persist();
      }
    }
  }

  function flush() {
    if (flight) return flight;
    flight = sendBatch().finally(() => {
      flight = null;
    });
    return flight;
  }

  /** Waits for the in-flight request, then sends whatever is still queued. */
  async function flushNow() {
    clearTimeout(flushTimer);
    clearTimeout(retryTimer);
    if (flight) await flight;
    if (Object.keys(get().pending).length) await flush();
  }

  /** Records a change to one question: bumps its seq, queues it, persists it, schedules a send. */
  function change(index, patch) {
    const { responses, pending } = get();
    const old = responses[index];
    if (!old || get().phase !== 'ready') return;
    if (Object.entries(patch).every(([k, v]) => JSON.stringify(old[k]) === JSON.stringify(v))) return;

    const updated = { ...old, ...patch, seq: old.seq + 1 };
    const nextResponses = responses.slice();
    nextResponses[index] = updated;
    set({
      responses: nextResponses,
      pending: { ...pending, [index]: { index, answer: updated.answer, marked: updated.marked, visited: updated.visited, seq: updated.seq } },
    });
    persist();
    scheduleFlush();
  }

  async function resync() {
    const { attemptId, phase } = get();
    if (phase !== 'ready') return;
    try {
      const res = await attemptsApi.getStatus(attemptId);
      if (res.status !== 'in_progress') markClosed();
      else set({ anchor: anchorFrom(res.timing) });
    } catch {
      /* offline: keep counting from the last server report */
    }
  }

  return {
    ...INITIAL,

    async load(attemptId) {
      get().reset();
      set({ phase: 'loading', attemptId });
      try {
        const data = await attemptsApi.getAttempt(attemptId);
        if (data.status !== 'in_progress') {
          set({ phase: 'closed' });
          return;
        }
        // Merge changes that were queued locally but never reached the server (refresh while offline).
        const local = readLocal(attemptId);
        const responses = data.responses.map((r) => ({ ...r }));
        const pending = {};
        for (const p of Object.values(local?.pending ?? {})) {
          if (responses[p.index] && p.seq > responses[p.index].seq) {
            responses[p.index] = { answer: p.answer, marked: p.marked, visited: p.visited, seq: p.seq };
            pending[p.index] = p;
          }
        }
        const current = Number.isInteger(local?.current) && local.current < data.questions.length ? local.current : 0;
        set({
          phase: 'ready',
          test: data.test,
          questions: data.questions,
          responses,
          pending,
          current,
          anchor: anchorFrom(data.timing),
          sync: Object.keys(pending).length ? 'saving' : 'saved',
        });
        persist();
        if (Object.keys(pending).length) scheduleFlush(0);
        clearInterval(resyncTimer);
        resyncTimer = setInterval(resync, RESYNC_INTERVAL_MS);
        if (!responses[current].visited) change(current, { visited: true });
      } catch (err) {
        set({ phase: 'error', error: err.response?.status === 404 ? 'This exam was not found.' : describeApiError(err) });
      }
    },

    reset() {
      clearTimeout(flushTimer);
      clearTimeout(retryTimer);
      clearInterval(resyncTimer);
      flight = null;
      retryCount = 0;
      set({ ...INITIAL });
    },

    setAnswer: (index, answer) => change(index, { answer: normalizeAnswer(answer), visited: true }),
    clearAnswer: (index) => change(index, { answer: null }),

    goTo(index) {
      const { questions, responses } = get();
      const target = Math.min(Math.max(index, 0), questions.length - 1);
      set({ current: target });
      if (!responses[target].visited) change(target, { visited: true });
      persist();
    },
    prev: () => get().goTo(get().current - 1),
    next: () => get().goTo(get().current + 1),
    saveNext() {
      change(get().current, { marked: false });
      get().goTo(get().current + 1);
    },
    markNext() {
      change(get().current, { marked: true });
      get().goTo(get().current + 1);
    },

    /** Called by the online event, tab becoming visible, and the Retry button. */
    syncNow() {
      retryCount = 0;
      clearTimeout(retryTimer);
      flush();
      resync();
    },
    resync,

    /**
     * Manual submit: first make sure every answer reached the server; if the connection is down,
     * refuse rather than silently submit an incomplete set. Auto submit (time is up) always submits,
     * and keeps retrying until the server confirms.
     */
    async submit({ auto = false } = {}) {
      if (get().submitting) return false;
      set({ submitting: true, submitError: null });
      await flushNow();
      if (!auto && Object.keys(get().pending).length) {
        set({ submitting: false, submitError: 'Some answers have not been saved because the connection is down. Reconnect, then submit again.' });
        return false;
      }
      const attemptId = get().attemptId;
      for (;;) {
        try {
          await attemptsApi.submitAttempt(attemptId);
          markClosed();
          set({ submitting: false });
          return true;
        } catch (err) {
          const retryable = !err.response || err.response.status >= 500;
          if (!auto || !retryable) {
            set({ submitting: false, submitError: describeApiError(err) });
            return false;
          }
          await new Promise((r) => setTimeout(r, AUTO_SUBMIT_RETRY_MS));
        }
      }
    },
  };
});
