import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const ICONS = {
  wave: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01',
  checkin: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  log: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z',
  progress: 'M3 3v18h18M7 14l3-3 3 3 5-5',
  clubs: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  roster: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 11h-6M19 8v6',
  reports: 'M21 21H3M7 21V11M12 21V5M17 21v-7',
  staff: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6',
  rocket: 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z',
};

// Each screen: media is tried first; falls back to the icon if the asset is missing.
// Drop real clips/animations in client/public/onboarding/ and fill `src` (e.g. media:{type:'video',src:'/onboarding/checkin.webm'}).
const WELCOME = { icon: 'wave', media: { type: 'lottie', src: '/onboarding/welcome.json' }, title: 'Welcome to DojoLink', body: 'A quick tour of the basics — swipe through, takes about a minute.' };
const FINISH = { icon: 'rocket', media: { type: 'lottie', src: '/onboarding/celebrate.json' }, title: 'You’re all set 🥷', body: 'You can reopen this anytime from your Account page. Let’s go!' };

const SENSEI = [
  { icon: 'checkin', media: { type: 'video', src: '/onboarding/checkin.webm' }, title: 'Check in your ninjas', body: 'Open the Today tab, tap a ninja to check them in, and assign them to a sensei.' },
  { icon: 'log', media: { type: 'video', src: '/onboarding/log.webm' }, title: 'Log a session', body: 'Open a ninja, record the lessons they worked on, any belt advancement, and a quick note.' },
  { icon: 'progress', media: { type: 'video', src: '/onboarding/progress.webm' }, title: 'Track progress', body: 'Each profile shows belt, current project, % complete, and full session history.' },
  { icon: 'clubs', media: { type: 'video', src: '/onboarding/clubs.webm' }, title: 'Run clubs', body: 'In Clubs, start a session, mark attendance, and add notes or resources.' },
];

const MANAGER = [
  { icon: 'roster', media: { type: 'video', src: '/onboarding/roster.webm' }, title: 'Manage the roster', body: 'In Ninjas, search, add, or import students from CSV — and edit or archive any profile.' },
  { icon: 'reports', media: { type: 'video', src: '/onboarding/reports.webm' }, title: 'See the big picture', body: 'Reports shows enrollment, belt distribution, inactive students, and belt advancements.' },
  { icon: 'staff', media: { type: 'video', src: '/onboarding/staff.webm' }, title: 'Manage your team', body: 'Use Staff to add or remove senseis, reset credentials, and set profile photos.' },
];

function FallbackIcon({ name }) {
  return (
    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-ninja-blue">
      <path d={ICONS[name] || ICONS.rocket} />
    </svg>
  );
}

function OnboardingMedia({ screen }) {
  const { media, icon } = screen;
  const [failed, setFailed] = useState(false);
  const [lottieData, setLottieData] = useState(null);

  useEffect(() => {
    setFailed(false); setLottieData(null);
    if (media?.type === 'lottie' && media.src) {
      let alive = true;
      fetch(media.src)
        .then((r) => { if (!r.ok) throw new Error('missing'); return r.json(); })
        .then((d) => { if (alive) setLottieData(d); })
        .catch(() => { if (alive) setFailed(true); });
      return () => { alive = false; };
    }
  }, [media?.type, media?.src]);

  const showFallback = !media || media.type === 'none' || failed || (media.type === 'lottie' && !lottieData);

  return (
    <div className="w-full aspect-[4/3] rounded-3xl bg-ninja-blue/[0.06] border border-ninja-border flex items-center justify-center overflow-hidden">
      {!showFallback && media.type === 'video' && (
        <video src={media.src} autoPlay loop muted playsInline onError={() => setFailed(true)} className="w-full h-full object-cover" />
      )}
      {!showFallback && media.type === 'lottie' && lottieData && (
        <Lottie animationData={lottieData} loop className="w-3/4 h-3/4" />
      )}
      {showFallback && <FallbackIcon name={icon} />}
    </div>
  );
}

const variants = {
  enter: (dir) => ({ x: dir > 0 ? 340 : -340, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -340 : 340, opacity: 0 }),
};
const SWIPE_THRESHOLD = 60;

export default function GettingStartedPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [dir, setDir] = useState(1);
  const [finishing, setFinishing] = useState(false);

  const isManager = ['manager', 'admin'].includes(user?.role);
  const screens = [WELCOME, ...SENSEI, ...(isManager ? MANAGER : []), FINISH];
  const dashPath = isManager ? '/manager/dashboard' : '/sensei/dashboard';
  const screen = screens[page];
  const isLast = page === screens.length - 1;

  const paginate = (delta) => {
    const nextPage = page + delta;
    if (nextPage < 0 || nextPage >= screens.length) return;
    setDir(delta); setPage(nextPage);
  };

  const finish = async () => {
    if (finishing) return;
    setFinishing(true);
    try { await api.post('/onboarding/complete', {}); } catch {}
    if (user && !user.onboarded) setUser({ ...user, onboarded: true });
    navigate(dashPath, { replace: true });
  };

  const next = () => { isLast ? finish() : paginate(1); };

  return (
    <div className="min-h-[100dvh] bg-ninja-bg flex flex-col">
      <div className="flex-1 flex flex-col max-w-md w-full mx-auto px-5 pt-[max(env(safe-area-inset-top),20px)] pb-[max(env(safe-area-inset-bottom),24px)]">
        {/* Top: progress dots + skip */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-1.5">
            {screens.map((_, i) => (
              <motion.span key={i} className="h-1.5 rounded-full bg-ninja-blue"
                animate={{ width: i === page ? 22 : 7, opacity: i === page ? 1 : 0.3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
            ))}
          </div>
          {!isLast && (
            <button onClick={finish} className="text-ninja-muted hover:text-ninja-navy font-ninja text-sm font-semibold transition-colors">Skip</button>
          )}
        </div>

        {/* Swipeable screen */}
        <div className="flex-1 min-h-0 relative overflow-hidden">
          <AnimatePresence mode="popLayout" custom={dir} initial={false}>
            <motion.div
              key={page}
              custom={dir}
              variants={variants}
              initial="enter" animate="center" exit="exit"
              transition={{ x: { type: 'spring', stiffness: 320, damping: 32 }, opacity: { duration: 0.2 } }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragEnd={(e, { offset, velocity }) => {
                const swipe = offset.x + velocity.x * 0.2;
                if (swipe < -SWIPE_THRESHOLD) paginate(1);
                else if (swipe > SWIPE_THRESHOLD) paginate(-1);
              }}
              className="absolute inset-0 flex flex-col items-center justify-center text-center cursor-grab active:cursor-grabbing"
            >
              <div className="w-full mb-7"><OnboardingMedia screen={screen} /></div>
              <h1 className="text-2xl font-black font-ninja text-ninja-navy mb-2 px-2">{screen.title}</h1>
              <p className="text-ninja-muted font-ninja text-sm leading-relaxed px-3 max-w-sm">{screen.body}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom: back / next */}
        <div className="flex items-center gap-3 pt-5">
          {page > 0 ? (
            <motion.button onClick={() => paginate(-1)} whileTap={{ scale: 0.96 }}
              className="px-5 py-3 rounded-xl bg-white border border-ninja-border text-ninja-navy font-ninja font-semibold text-sm hover:border-ninja-blue transition-colors">
              Back
            </motion.button>
          ) : <div className="w-px" />}
          <motion.button onClick={next} whileTap={{ scale: 0.97 }} disabled={finishing}
            className="flex-1 py-3.5 rounded-xl bg-ninja-blue text-white font-ninja font-bold text-sm hover:bg-ninja-blue/90 transition-colors disabled:opacity-60">
            {isLast ? (finishing ? 'Loading…' : 'Get started') : 'Next'}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
