import { create } from 'zustand';

let nextToastId = 1;

/** Global UI state. Right now: toast notifications. */
export const useUiStore = create((set, get) => ({
  toasts: [],

  addToast: ({ title, message, tone = 'neutral', duration = 4500 }) => {
    const id = nextToastId++;
    set((state) => ({ toasts: [...state.toasts, { id, title, message, tone }] }));
    if (duration > 0) {
      setTimeout(() => get().removeToast(id), duration);
    }
    return id;
  },

  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
