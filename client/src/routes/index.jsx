import { createBrowserRouter } from 'react-router-dom';
import RouteError from '../components/common/RouteError.jsx';
import { AdminRoute, GuestRoute, ProtectedRoute } from './guards.jsx';
import AdminGeneratePage from '../pages/admin/AdminGeneratePage.jsx';
import AdminImportPage from '../pages/admin/AdminImportPage.jsx';
import AdminQuestionPage from '../pages/admin/AdminQuestionPage.jsx';
import AdminQuestionsPage from '../pages/admin/AdminQuestionsPage.jsx';
import AdminTestsPage from '../pages/admin/AdminTestsPage.jsx';
import AuthLayout from '../layouts/AuthLayout.jsx';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import ExamLayout from '../layouts/ExamLayout.jsx';
import PublicLayout from '../layouts/PublicLayout.jsx';
import LoginPage from '../pages/auth/LoginPage.jsx';
import RegisterPage from '../pages/auth/RegisterPage.jsx';
import ComponentGalleryPage from '../pages/dev/ComponentGalleryPage.jsx';
import ExamPage from '../pages/exam/ExamPage.jsx';
import LandingPage from '../pages/public/LandingPage.jsx';
import NotFoundPage from '../pages/public/NotFoundPage.jsx';
import DashboardPage from '../pages/student/DashboardPage.jsx';
import HistoryPage from '../pages/student/HistoryPage.jsx';
import ResultPage from '../pages/student/ResultPage.jsx';
import TestDetailPage from '../pages/student/TestDetailPage.jsx';
import TestsPage from '../pages/student/TestsPage.jsx';

/**
 * Everything except the landing page and the auth pages requires login (ProtectedRoute).
 * /login and /register redirect logged-in users away (GuestRoute). Admin routes arrive with the admin dashboard.
 */
export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <LandingPage /> },
      // Dev-only: Vite removes this in production builds.
      ...(import.meta.env.DEV ? [{ path: '/dev/components', element: <ComponentGalleryPage /> }] : []),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    element: <GuestRoute />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    errorElement: <RouteError />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/tests', element: <TestsPage /> },
          { path: '/tests/:id', element: <TestDetailPage /> },
          { path: '/history', element: <HistoryPage /> },
          { path: '/results/:attemptId', element: <ResultPage /> },
          {
            element: <AdminRoute />,
            children: [
              { path: '/admin/questions', element: <AdminQuestionsPage /> },
              { path: '/admin/questions/:id', element: <AdminQuestionPage /> },
              { path: '/admin/import', element: <AdminImportPage /> },
              { path: '/admin/generate', element: <AdminGeneratePage /> },
              { path: '/admin/tests', element: <AdminTestsPage /> },
            ],
          },
        ],
      },
      {
        element: <ExamLayout />,
        children: [{ path: '/exam/:attemptId', element: <ExamPage /> }],
      },
    ],
  },
]);
