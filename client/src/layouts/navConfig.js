// Only show student destinations that are implemented and usable.
export const NAV_ITEMS = [
  { label: 'Dashboard', to: '/dashboard', icon: 'home' },
  { label: 'Tests', to: '/tests', icon: 'clipboard' },
  { label: 'History', to: '/history', icon: 'history' },
];

// Shown only to administrators.
export const ADMIN_NAV_ITEMS = [
  { label: 'Question bank', to: '/admin/questions', icon: 'book' },
  { label: 'AI generator', to: '/admin/generate', icon: 'sparkles' },
  { label: 'Import', to: '/admin/import', icon: 'layers' },
  { label: 'Manage tests', to: '/admin/tests', icon: 'clipboard' },
];
