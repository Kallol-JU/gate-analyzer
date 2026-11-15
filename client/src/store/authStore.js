import { create } from 'zustand';
import * as authApi from '../api/auth.api.js';

let initPromise = null;

/**
 * status: 'loading'       - checking the session cookie (first page load)
 *         'authenticated' - user is set
 *         'anonymous'     - no valid session
 *         'unavailable'   - the API could not be reached, so the session is unknown
 *
 * Only the user object is kept here. The token is an HttpOnly cookie that scripts cannot see.
 * Refreshing the page re-runs init(), which asks the server who the cookie belongs to.
 */
export const useAuthStore = create((set) => ({
  user: null,
  status: 'loading',

  init: () => {
    if (!initPromise) {
      initPromise = authApi
        .fetchMe()
        .then((user) => set({ user, status: 'authenticated' }))
        .catch((err) => set({ user: null, status: err.response?.status === 401 ? 'anonymous' : 'unavailable' }));
    }
    return initPromise;
  },

  retry: () => {
    initPromise = null;
    set({ status: 'loading' });
    return useAuthStore.getState().init();
  },

  login: async (credentials) => {
    const user = await authApi.login(credentials);
    set({ user, status: 'authenticated' });
  },

  register: async (details) => {
    const user = await authApi.register(details);
    set({ user, status: 'authenticated' });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      // Even if the request fails, drop the local session so the UI is never stuck logged in.
      set({ user: null, status: 'anonymous' });
    }
  },
}));
