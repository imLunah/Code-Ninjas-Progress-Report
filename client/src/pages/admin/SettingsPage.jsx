import Layout from '../../components/layout/Layout';

function AdminNav() {
  const path = window.location.pathname;
  const links = [
    { to: '/admin/locations', label: 'Locations' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/curriculum', label: 'Curriculum' },
    { to: '/admin/settings', label: 'Settings' },
  ];
  return (
    <div className="flex items-center gap-4 mb-6 border-b border-ninja-border pb-4">
      {links.map((l) => (
        <a
          key={l.to}
          href={l.to}
          className={`font-ninja text-sm font-semibold transition-colors ${
            path === l.to
              ? 'text-ninja-navy border-b-2 border-ninja-blue pb-0.5'
              : 'text-ninja-muted hover:text-ninja-navy'
          }`}
        >
          {l.label}
        </a>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <AdminNav />
        <h1 className="text-ninja-navy font-ninja font-bold text-2xl mb-1">Settings</h1>
        <p className="text-ninja-muted font-ninja text-sm">No settings configured.</p>
      </div>
    </Layout>
  );
}
