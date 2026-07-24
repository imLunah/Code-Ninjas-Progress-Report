import { Link } from 'react-router-dom';
import { getMobileNavTabs, getTopNavTabs } from '../../lib/navTabs';

// Revealed underneath the peel. Solid surface so it reads as a layer behind the
// page, with the app's main destinations as a quick jump list.
export default function PeelNav({ user, viewAs }) {
  const top = getTopNavTabs(user, viewAs);
  const links = [...getMobileNavTabs(user, viewAs), top.left, top.right].filter(Boolean);

  return (
    <div className="h-full w-full bg-ninja-bg flex flex-col justify-center gap-1 pl-10 pr-4">
      <p className="text-ninja-muted font-ninja text-xs font-bold uppercase tracking-wider mb-3">Jump to</p>
      {links.map((l) => (
        <Link
          key={l.to}
          to={l.to}
          className="font-ninja font-black text-ninja-navy text-xl py-1.5 w-fit hover:text-ninja-blue transition-colors"
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}
