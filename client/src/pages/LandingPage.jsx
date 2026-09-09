import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useAuth, hadSession } from '../context/AuthContext';
import { getHomePath } from '../lib/navTabs';
import { useLightOnly } from '../context/ThemeContext';
import Logo from '../components/ui/Logo';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y:  0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

// Each feature card leads with a vignette built from the app's own parts,
// the same way the hero draws its desk. Names are invented. The art answers
// the pointer, so the cards feel like the product rather than a brochure.
const popSpring = { type: 'spring', stiffness: 420, damping: 17 };

function CheckInVignette() {
  const still = useReducedMotion();
  return (
    <div className="flex items-center gap-5 h-28">
      <motion.img
        src="/ninjas/purple-cheer-medium.png"
        alt=""
        className="w-20 h-20 rounded-full bg-ninja-bg object-contain"
        whileHover={still ? undefined : { scale: 1.12, rotate: -6, y: -4 }}
        whileTap={still ? undefined : { scale: 0.94 }}
        transition={popSpring}
      />
      <div className="min-w-0">
        <div className="text-base font-extrabold text-ninja-navy leading-tight whitespace-nowrap">Maya R.</div>
        <div className="flex items-center gap-1.5 text-xs text-ninja-muted font-semibold whitespace-nowrap mt-0.5">
          <img src="/belts/belt-purple.svg" alt="" className="h-4" />
          Purple belt
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 whitespace-nowrap mt-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          In · 4:01 pm
        </div>
      </div>
    </div>
  );
}

const LADDER = [
  { belt: 'white',  cls: 'h-11' },
  { belt: 'yellow', cls: 'h-11' },
  { belt: 'orange', cls: 'h-16 drop-shadow-md' },
  { belt: 'green',  cls: 'h-11 opacity-35' },
  { belt: 'blue',   cls: 'h-11 opacity-35' },
];

function BeltLadderVignette() {
  const still = useReducedMotion();
  return (
    <div className="flex items-center justify-between h-28 px-1">
      {LADDER.map(({ belt, cls }) => (
        <motion.img
          key={belt}
          src={`/belts/belt-${belt}.svg`}
          alt=""
          className={cls}
          whileHover={still ? undefined : { scale: 1.25, y: -5 }}
          whileTap={still ? undefined : { scale: 0.92 }}
          transition={popSpring}
        />
      ))}
    </div>
  );
}

const STICKERS = [
  { src: 'yellow-2', cls: 'h-16 -rotate-6',                  hover: { scale: 1.16, rotate: 0, y: -5 } },
  { src: 'orange-3', cls: 'h-24 rotate-2 drop-shadow-md',     hover: { scale: 1.16, rotate: 0, y: -5 } },
  // The locked one answers the hand but stays locked: a small shake, no colour.
  { src: 'green-1',  cls: 'h-16 rotate-6 opacity-35 grayscale', hover: { scale: 1.05, rotate: [6, -2, 6] } },
];

function StickerVignette() {
  const still = useReducedMotion();
  return (
    <div className="flex items-center justify-center gap-4 h-28">
      {STICKERS.map(({ src, cls, hover }) => (
        <motion.img
          key={src}
          src={`/belt-stickers/${src}.png`}
          alt=""
          className={cls}
          whileHover={still ? undefined : hover}
          whileTap={still ? undefined : { scale: 0.92 }}
          transition={popSpring}
        />
      ))}
    </div>
  );
}

const FEATURES = [
  {
    art: CheckInVignette,
    title: 'Front desk check-in',
    blurb: 'Ninjas check in at the desk, attendance takes itself, and staff can see who is on the floor at a glance.',
  },
  {
    art: BeltLadderVignette,
    title: 'Belt and lesson progress',
    blurb: 'Every lesson checked off moves a ninja up the ladder, so Senseis always know what comes next.',
  },
  {
    art: StickerVignette,
    title: 'A portal for parents',
    blurb: 'Parents follow belts, badges, and milestones from home, without having to catch someone at pickup.',
  },
];

// The hero "screenshot" is drawn in markup with the app's own tokens and
// assets, so it stays crisp at any density and never falls out of step with
// the brand. Names are invented; no real roster ships on a public page.
const DESK_ROWS = [
  { name: 'Ava M.',   belt: 'yellow', avatar: 'yellow-cheer-medium', in: true,  time: '3:58 pm' },
  { name: 'Leo K.',   belt: 'white',  avatar: 'white-wave-light',    in: true,  time: '3:59 pm' },
  { name: 'Priya S.', belt: 'orange', avatar: 'orange-cheer-dark',   in: false },
  { name: 'Mateo R.', belt: 'green',  avatar: 'green-wave-medium',   in: false },
  { name: 'Zoe T.',   belt: 'blue',   avatar: 'blue-cheer-light',    in: true,  time: '4:02 pm' },
];

const CHART_BARS = [34, 52, 40, 68, 58, 82, 64];

// The mini sidebar carries the app's real nav art, so the window in the hero
// is the same product a director signs into rather than a set of grey squares.
const DESK_NAV = ['today', 'roster', 'clubs', 'staff'];

function DeskMockup() {
  return (
    <div
      aria-hidden="true"
      className="rounded-2xl bg-white border border-ninja-border overflow-hidden select-none pointer-events-none text-left"
      style={{ boxShadow: '0 30px 80px rgb(9 30 66 / 0.28)' }}
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-5 h-11 bg-ninja-bg border-b border-ninja-border">
        <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        <span className="mx-auto bg-white border border-ninja-border rounded-full px-6 py-1 text-xs text-ninja-muted font-bold">
          dojolink.app
        </span>
        <span className="w-[68px]" />
      </div>

      <div className="flex">
        {/* Mini sidebar */}
        <div className="w-20 flex flex-col items-center gap-2.5 py-5 border-r border-ninja-border bg-ninja-bg">
          <Logo variant="mark" className="h-7 text-ninja-navy" title="" />
          {DESK_NAV.map((id, i) => (
            <span
              key={id}
              className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                i === 0 ? 'mt-2 bg-ninja-blue/15 border border-ninja-blue/20' : 'bg-ninja-border/40'
              }`}
            >
              <img src={`/icons/${id}.png`} alt="" className={`w-6 h-6 object-contain ${i === 0 ? '' : 'opacity-45'}`} />
            </span>
          ))}
        </div>

        {/* Front desk panel */}
        <div className="flex-1 p-7">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-2xl font-extrabold text-ninja-navy leading-tight">Front desk</div>
              <div className="text-sm text-ninja-muted font-semibold mt-0.5">Tuesday · 4:00 pm session</div>
            </div>
            <span className="bg-emerald-100 text-emerald-700 rounded-full px-4 py-1.5 text-xs font-bold whitespace-nowrap">
              3 on the floor
            </span>
          </div>

          <div>
            {DESK_ROWS.map((r) => (
              <div key={r.name} className="flex items-center gap-4 py-3 border-b border-ninja-border/70 last:border-0">
                <img src={`/ninjas/${r.avatar}.png`} alt="" className="w-12 h-12 rounded-full bg-ninja-bg object-contain shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-extrabold text-ninja-navy leading-tight">{r.name}</div>
                  <div className="flex items-center gap-1.5 text-[13px] text-ninja-muted font-semibold capitalize mt-0.5">
                    <img src={`/belts/belt-${r.belt}.svg`} alt="" className="h-4" />
                    {r.belt} Belt
                  </div>
                </div>
                {r.in ? (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 rounded-full px-4 py-2 whitespace-nowrap">
                    In · {r.time}
                  </span>
                ) : (
                  <span className="text-xs font-bold text-white bg-ninja-blue rounded-full px-5 py-2 whitespace-nowrap">
                    Check in
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// On a phone the hero shows the phone: the same front desk in the app's own
// mobile shell, large title and floating tab bar included, rather than a
// desktop window shrunk down to where nothing in it can be read.
function PhoneMockup() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto w-full max-w-[300px] rounded-[2.25rem] bg-white border border-ninja-border overflow-hidden select-none pointer-events-none text-left"
      style={{ boxShadow: '0 30px 80px rgb(9 30 66 / 0.32)' }}
    >
      {/* Status bar */}
      <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-bold text-ninja-navy">
        <span>4:00</span>
        <span className="flex items-center gap-1">
          <span className="w-1 h-2.5 rounded-sm bg-ninja-navy/70" />
          <span className="w-1 h-3 rounded-sm bg-ninja-navy/70" />
          <span className="ml-1 w-5 h-2.5 rounded-[3px] border border-ninja-navy/60 p-[1.5px]">
            <span className="block h-full w-2/3 rounded-[1px] bg-ninja-navy/70" />
          </span>
        </span>
      </div>

      <div className="px-5 pt-3">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="text-[26px] font-black text-ninja-navy leading-tight">Front desk</div>
            <div className="text-[11px] text-ninja-muted font-semibold mt-0.5">Tuesday · 4:00 pm</div>
          </div>
          <span className="bg-emerald-100 text-emerald-700 rounded-full px-2.5 py-1 text-[10px] font-bold whitespace-nowrap mt-1">
            3 in
          </span>
        </div>

        {DESK_ROWS.slice(0, 4).map((r) => (
          <div key={r.name} className="flex items-center gap-2.5 py-2.5 border-b border-ninja-border/70 last:border-0">
            <img src={`/ninjas/${r.avatar}.png`} alt="" className="w-9 h-9 rounded-full bg-ninja-bg object-contain shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-extrabold text-ninja-navy leading-tight">{r.name}</div>
              <div className="flex items-center gap-1 text-[10px] text-ninja-muted font-semibold capitalize">
                <img src={`/belts/belt-${r.belt}.svg`} alt="" className="h-3" />
                {r.belt} Belt
              </div>
            </div>
            {r.in ? (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 rounded-full px-2.5 py-1.5 whitespace-nowrap">
                {r.time}
              </span>
            ) : (
              <span className="text-[10px] font-bold text-white bg-ninja-blue rounded-full px-3 py-1.5 whitespace-nowrap">
                Check in
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Floating glass tab bar, the way the app wears it */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-around rounded-full bg-white/70 backdrop-blur border border-ninja-border px-2 py-2"
             style={{ boxShadow: '0 8px 24px rgb(9 30 66 / 0.12)' }}>
          {DESK_NAV.map((id, i) => (
            <span
              key={id}
              className={`w-9 h-9 rounded-full flex items-center justify-center ${i === 0 ? 'bg-ninja-blue/15' : ''}`}
            >
              <img src={`/icons/${id}.png`} alt="" className={`w-5 h-5 object-contain ${i === 0 ? '' : 'opacity-40'}`} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  // Only someone who has signed in before is worth holding a spinner for. A first-time
  // visitor gets the hero on the first frame instead of waiting out /auth/me.
  const [maybeSignedIn] = useState(hadSession);
  // The public face of the product is light, full stop — a staff member's dark
  // preference waits for them past the sign-in door.
  useLightOnly();

  useEffect(() => {
    if (!loading && user) {
      navigate(getHomePath(user), { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSignIn = () => setLeaving(true);

  // ── Scroll-linked 3D ─────────────────────────────────────────────────
  // The product window loads leaning back in perspective and stands up as
  // the visitor scrolls, while the floating cards ride the scroll at
  // different speeds. The speed differences are what make the group read
  // as layers in space instead of a flat picture.
  const { scrollY } = useScroll();
  const still = useReducedMotion();
  const windowTilt  = useTransform(scrollY, [0, 420], still ? [0, 0] : [16, 0]);
  const windowLift  = useTransform(scrollY, [0, 600], still ? [0, 0] : [0, -70]);
  const farCardLift = useTransform(scrollY, [0, 600], still ? [0, 0] : [0, -55]);
  const nearCardLift = useTransform(scrollY, [0, 600], still ? [0, 0] : [0, -120]);

  if ((loading && maybeSignedIn) || user) {
    return (
      <div className="theme-locked min-h-[100dvh] bg-ninja-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-ninja-blue border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      className="theme-locked min-h-[100dvh] bg-ninja-bg text-ninja-navy font-ninja"
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      onAnimationComplete={() => { if (leaving) navigate('/login', { state: { fromLanding: true } }); }}
    >
      {/* ── Hero: a full-bleed brand-blue block the product rises out of ── */}
      <div>
        <section className="relative rounded-b-3xl sm:rounded-b-[40px]">
          {/* Background layer clips to the rounded shape; content may overflow it */}
          <div className="absolute inset-0 rounded-[inherit] overflow-hidden bg-ninja-blue">
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse 60% 55% at 50% 0%, rgba(255,255,255,0.14) 0%, transparent 65%), ' +
                  'radial-gradient(ellipse 45% 45% at 12% 85%, rgba(255,255,255,0.07) 0%, transparent 70%)',
              }}
            />
          </div>

          {/* Top bar */}
          <motion.header
            className="relative z-10 flex items-center justify-between px-5 sm:px-10 pt-5 sm:pt-7"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Logo variant="lockup" className="h-7 sm:h-9 text-white" accent="currentColor" />
            <div className="flex items-center gap-3 sm:gap-5">
              <button
                onClick={handleSignIn}
                className="font-ninja font-bold text-sm text-white/80 hover:text-white transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={handleSignIn}
                className="hidden sm:block bg-white text-ninja-blue font-ninja font-bold text-sm px-5 py-2 rounded-full hover:bg-blue-50 transition-colors"
              >
                Get Started
              </button>
            </div>
          </motion.header>

          {/* Centered copy */}
          <motion.div
            className="relative z-10 text-center max-w-3xl mx-auto px-5 sm:px-6 pt-12 sm:pt-16"
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            <motion.h1
              variants={fadeUp}
              className="font-black tracking-tight text-white mb-5"
              style={{ fontSize: 'clamp(32px, 5.2vw, 58px)', lineHeight: 1.1 }}
            >
              TEACH. TRACK. REPORT.
              <span className="block">All from one app.</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="text-white/85 text-base sm:text-lg leading-relaxed max-w-xl mx-auto mb-8 sm:mb-10"
            >
              Link check-ins, student progress, and operations tracker all together.
            </motion.p>
            <motion.div variants={fadeUp} className="flex justify-center">
              <motion.button
                onClick={handleSignIn}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="bg-white text-ninja-blue font-ninja font-bold text-lg px-12 py-4 rounded-2xl w-full sm:w-auto"
                style={{ boxShadow: '0 12px 36px rgb(9 30 66 / 0.28)' }}
              >
                <span className="flex items-center justify-center gap-2.5">
                  Get Started
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    →
                  </motion.span>
                </span>
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Product window, rising out of the hero's bottom edge */}
          <motion.div
            className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 mt-10 sm:mt-14 -mb-16 sm:-mb-36"
            style={{ perspective: 1200 }}
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              className="relative"
              style={{ rotateX: windowTilt, y: windowLift, transformStyle: 'preserve-3d' }}
            >
              <div className="sm:hidden"><PhoneMockup /></div>
              <div className="hidden sm:block"><DeskMockup /></div>

              {/* Floating cards hang off the window's edges without covering the
                  row endings, and only at widths where they have room to. Each
                  layer rides the scroll at its own speed. */}
              <motion.div className="hidden 2xl:block absolute -left-40 top-10" style={{ y: farCardLift }} aria-hidden="true">
              <motion.div
                className="w-44 bg-white rounded-2xl border border-ninja-border p-4 -rotate-3"
                style={{ boxShadow: '0 18px 44px rgb(9 30 66 / 0.18)' }}
                animate={{ y: [0, -7, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="text-[10px] font-extrabold tracking-widest text-ninja-muted mb-1">TODAY</div>
                <div className="text-2xl font-black text-ninja-navy leading-none">23 check-ins</div>
                <div className="flex items-end gap-1 h-9 mt-3">
                  {CHART_BARS.map((h, i) => (
                    <span
                      key={i}
                      className={`flex-1 rounded-sm ${i === 5 ? 'bg-ninja-blue' : 'bg-ninja-blue/20'}`}
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </motion.div>
              </motion.div>

              <motion.div className="hidden 2xl:block absolute -right-44 top-20" style={{ y: nearCardLift }} aria-hidden="true">
              <motion.div
                className="w-48 bg-white rounded-2xl border border-ninja-border p-4 rotate-2"
                style={{ boxShadow: '0 18px 44px rgb(9 30 66 / 0.18)' }}
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <img src="/belts/belt-yellow.svg" alt="" className="h-5" />
                  <div className="text-xs font-extrabold text-ninja-navy">Belt progress</div>
                </div>
                <div className="text-[11px] text-ninja-muted font-semibold mb-2">7 of 9 lessons</div>
                <div className="h-1.5 rounded-full bg-ninja-bg overflow-hidden">
                  <div className="h-full w-[78%] rounded-full bg-ninja-blue" />
                </div>
              </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>
      </div>

      {/* ── Features ── */}
      <motion.section
        className="max-w-5xl mx-auto px-5 sm:px-6 pt-32 sm:pt-52 pb-10 text-center"
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
      >
        <motion.h2 variants={fadeUp} className="font-black tracking-tight text-3xl sm:text-4xl mb-3">
          Everything the dojo runs on
        </motion.h2>
        <motion.p variants={fadeUp} className="text-ninja-muted max-w-xl mx-auto leading-relaxed mb-10 sm:mb-12">
          Built for the day-to-day: fewer tabs at the front desk, clearer progress on the floor,
          and parents who never have to ask how it went.
        </motion.p>
        <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 text-left">
          {FEATURES.map(({ art: Art, title, blurb }) => (
            <motion.div
              key={title}
              variants={fadeUp}
              className="bg-white border border-ninja-border rounded-2xl shadow-sm p-5 sm:p-6"
            >
              <div aria-hidden="true" className="select-none">
                <Art />
              </div>
              <h3 className="font-extrabold text-ninja-navy mt-4 mb-1.5">{title}</h3>
              <p className="text-sm text-ninja-muted leading-relaxed">{blurb}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="flex items-center justify-center flex-wrap gap-3 pb-8 px-6 text-xs text-ninja-muted">
        <Link to="/privacy" className="hover:text-ninja-blue transition-colors">Privacy Policy</Link>
        <span className="opacity-40">·</span>
        <Link to="/terms" className="hover:text-ninja-blue transition-colors">Terms</Link>
        <span className="opacity-40">·</span>
        <Link to="/accessibility" className="hover:text-ninja-blue transition-colors">Accessibility</Link>
      </footer>
    </motion.div>
  );
}
