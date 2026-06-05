export function getMobileNavTabs(user, viewAs) {
  if (!user) return [];
  const isSenseiView = user.role === 'admin' && viewAs === 'sensei';
  const isManager = ['manager', 'admin'].includes(user.role) && !isSenseiView;
  const dashPath = isManager ? '/manager/dashboard' : '/sensei/dashboard';
  const tabs = [
    { to: dashPath, label: 'Today', iconId: 'today' },
    { to: '/manager/students', label: 'Ninjas', iconId: 'roster' },
    { to: '/clubs', label: 'Clubs', iconId: 'clubs' },
    { to: '/manager/staff', label: 'Staff', iconId: 'staff' },
  ];
  if (isManager) tabs.push({ to: '/manager/reports', label: 'Reports', iconId: 'report' });
  tabs.push({ to: '/account', label: 'Account', iconId: null });
  return tabs;
}

export function getActiveTabIndex(tabs, pathname) {
  for (let i = 0; i < tabs.length; i++) {
    if (pathname === tabs[i].to || pathname.startsWith(tabs[i].to + '/')) return i;
  }
  return -1;
}
