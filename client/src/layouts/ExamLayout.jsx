import { Outlet } from 'react-router-dom';

/**
 * Distraction-free shell for the CBT screen: no site navigation, fixed to the viewport.
 * Each exam page supplies its own header, question area and palette.
 */
export default function ExamLayout() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-white text-ink-900">
      <Outlet />
    </div>
  );
}
