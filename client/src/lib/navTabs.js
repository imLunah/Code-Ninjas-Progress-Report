// Bottom nav pill — also drives swipe navigation (Layout cycles these).
export function getMobileNavTabs(user, viewAs) {
  if (!user) return [];
  const isSenseiView = user.role === 'admin' && viewAs === 'sensei';
  const isManager = ['manager', 'admin'].includes(user.role) && !isSenseiView;
  const dashPath = isManager ? '/manager/dashboard' : '/sensei/dashboard';
  return [
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
