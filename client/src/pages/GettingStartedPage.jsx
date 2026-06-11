import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const ICONS = {
  checkin: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  log: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z',
  progress: 'M3 3v18h18M7 14l3-3 3 3 5-5',
  clubs: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  roster: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 11h-6M19 8v6',
  reports: 'M21 21H3M7 21V11M12 21V5M17 21v-7',
  staff: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6',
};

// Render **bold** spans from our static step strings without dangerouslySetInnerHTML.
function renderBold(text) {
  return text.split(/(\*\*.+?\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>
      : part
  );
}

function Icon({ d }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const SENSEI_SECTIONS = [
  { icon: 'checkin', title: 'Check in your ninjas', steps: ['Open the **Today** tab to see who’s scheduled.', 'Tap a ninja to check them in for the session.', 'Assign them to yourself or another sensei.'] },
  { icon: 'log', title: 'Log a session', steps: ['Open a ninja from **Today** or **Ninjas**.', 'Record the lessons they worked on and any belt advancement.', 'Add a quick note for the next sensei or the parent.'] },
  { icon: 'progress', title: 'Track progress', steps: ['Each ninja’s profile shows their belt, current project, and % complete.', 'Scroll **Recent Progress** to see their session history.', 'Use **View Roadmap** to batch-check completed lessons.'] },
  { icon: 'clubs', title: 'Run clubs', steps: ['Open the **Clubs** tab and pick a club.', 'Start a session, mark who attended, and add notes or resources.'] },
];

const MANAGER_SECTIONS = [
  { icon: 'roster', title: 'Manage the roster', steps: ['Go to **Ninjas** to search, add, or import students from CSV.', 'Open a profile to edit enrollment, pin notes, or archive.'] },
  { icon: 'reports', title: 'See the big picture', steps: ['The **Reports** tab shows enrollment, belt distribution, and inactive students.', 'Track belt advancements over time at a glance.'] },
  { icon: 'staff', title: 'Manage your team', steps: ['Use **Staff** to add or remove senseis.', 'Reset credentials and set profile photos for your team.'] },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } };

function Section({ section, index }) {
  return (
    <motion.div variants={item} className="bg-white border border-ninja-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <span className="flex-shrink-0 w-11 h-11 rounded-xl bg-ninja-blue/10 text-ninja-blue flex items-center justify-center">
          <Icon d={ICONS[section.icon]} />
        </span>
        <div className="min-w-0">
          <h3 className="font-ninja font-bold text-ninja-navy text-lg mb-2">{section.title}</h3>
          <ol className="space-y-2">
            {section.steps.map((s, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full bg-ninja-blue text-white text-[11px] font-ninja font-bold flex items-center justify-center">{i + 1}</span>
                <span className="font-ninja text-sm text-ninja-navy leading-relaxed">{renderBold(s)}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </motion.div>
  );
}

export default function GettingStartedPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [finishing, setFinishing] = useState(false);

  const isManager = ['manager', 'admin'].includes(user?.role);
  const sections = isManager ? [...SENSEI_SECTIONS, ...MANAGER_SECTIONS] : SENSEI_SECTIONS;
  const dashPath = isManager ? '/manager/dashboard' : '/sensei/dashboard';
  const firstName = user?.displayName?.split(' ')[0] || 'there';

  const finish = async () => {
    if (finishing) return;
    setFinishing(true);
    try { await api.post('/onboarding/complete', {}); } catch {}
    if (user && !user.onboarded) setUser({ ...user, onboarded: true });
    navigate(dashPath, { replace: true });
  };

  return (
    <div className="min-h-[100dvh] bg-ninja-bg overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 pb-[max(env(safe-area-inset-bottom),32px)]">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="mb-8">
          <p className="text-ninja-blue font-ninja text-sm font-bold uppercase tracking-wide mb-1">Getting Started</p>
          <h1 className="text-3xl font-black font-ninja text-ninja-navy">Welcome, {firstName} 🥷</h1>
          <p className="text-ninja-muted font-ninja text-sm mt-2 leading-relaxed">
            Here’s a quick look at what you can do in DojoLink{isManager ? ' as a Center Director' : ''}. Takes about a minute.
          </p>
        </motion.div>

        <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
          {sections.map((s, i) => <Section key={s.title} section={s} index={i} />)}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + sections.length * 0.08, duration: 0.4 }} className="mt-8">
          <button onClick={finish} disabled={finishing}
            className="w-full py-3.5 rounded-xl bg-ninja-blue text-white font-ninja font-bold text-sm hover:bg-ninja-blue/90 transition-colors disabled:opacity-60">
            {finishing ? 'Loading…' : 'Get started'}
          </button>
          <p className="text-center text-ninja-muted font-ninja text-xs mt-3">
            You can reopen this anytime from <span className="font-semibold text-ninja-navy">Account</span>.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
