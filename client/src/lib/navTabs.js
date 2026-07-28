// Four rounded squares — matches the Dashboard entry in the desktop sidebar.
const DASHBOARD_GLYPH =
  'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z';

// Where a signed-in user lands, and what "back to my dashboard" means from the
// pages that sit outside the app shell. Directors land on the overview; the
// check-in board is a destination they choose, not the front door.
export function getHomePath(user, viewAs) {
  const isSenseiView = user?.role === 'admin' && viewAs === 'sensei';
  const isManager = ['manager', 'admin'].includes(user?.role) && !isSenseiView;
  return isManager ? '/manager/overview' : '/sensei/dashboard';
}

// Bottom nav pill — also drives swipe navigation (Layout cycles these).
export function getMobileNavTabs(user, viewAs) {
  if (!user) return [];
  const isSenseiView = user.role === 'admin' && viewAs === 'sensei';
  const isManager = ['manager', 'admin'].includes(user.role) && !isSenseiView;
  const dashPath = isManager ? '/manager/dashboard' : '/sensei/dashboard';
  return [
    // Directors get a sixth tab. There is no PNG for it — the nav renders the
    // path inline, the same glyph the desktop sidebar uses.
    ...(isManager ? [{ to: '/manager/overview', label: 'Dashboard', iconId: null, svg: DASHBOARD_GLYPH }] : []),
    { to: dashPath, label: 'Today', iconId: 'today' },
    { to: '/manager/students', label: 'Ninjas', iconId: 'roster' },
    { to: '/clubs', label: 'Clubs', iconId: 'clubs' },
    { to: '/manager/staff', label: 'Staff', iconId: 'staff' },
    { to: '/account', label: 'Account', iconId: null },
  ];
}

// Top bar — occasional/reference destinations, in the screen corners (IG-style).
export function getTopNavTabs(user, viewAs) {
  const isSenseiView = user?.role === 'admin' && viewAs === 'sensei';
  const isManager = ['manager', 'admin'].includes(user?.role) && !isSenseiView;
  return {
    // CDs get the Dashboard here; senseis (no dashboard) keep Reports.
    left: isManager
      ? { to: '/manager/overview', label: 'Dashboard', iconId: 'dashboard' }
      : { to: '/manager/reports', label: 'Reports', iconId: 'report' },
    right: { to: '/curriculum-roadmap', label: 'Roadmap', iconId: 'roadmap' },
  };
}

export function getActiveTabIndex(tabs, pathname) {
  for (let i = 0; i < tabs.length; i++) {
    if (pathname === tabs[i].to || pathname.startsWith(tabs[i].to + '/')) return i;
  }
  return -1;
}
