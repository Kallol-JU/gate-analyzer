import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import ToastViewport from './components/ui/Toast.jsx';
import { router } from './routes/index.jsx';
import { useAuthStore } from './store/authStore.js';

export default function App() {
  const init = useAuthStore((s) => s.init);

  // Ask the server who the session cookie belongs to, so login survives page refreshes.
  useEffect(() => {
    init();
  }, [init]);

  return (
    <>
      <RouterProvider router={router} />
      <ToastViewport />
    </>
  );
}
