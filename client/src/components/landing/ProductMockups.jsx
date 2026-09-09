import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  BookOpenIcon, UsersIcon, CalendarIcon, ChevronDownIcon,
  ChevronRightIcon, ChevronLeftIcon, LogOutIcon,
} from 'lucide-react';
import Logo from '../ui/Logo';

// The landing page's product shots are drawn in markup from the app's own
// tokens and art, so they stay crisp at any density and never fall out of step
// with the brand. Every name here is invented; no real roster ships publicly.

// Belt ribbon colours, for the ring a CREATE ninja's belt icon sits in. These are
// the swatches the belt art is cut from, and they have no token because
// nothing else in the app draws a belt as a bare colour.
const BELT_HEX = {
  white: '#cbd5e1', yellow: '#eab308', orange: '#f97316', green: '#22c55e',
  blue: '#3b82f6', purple: '#8b5cf6', brown: '#92400e', black: '#1f2937',
};

const NAV = [
  { id: 'today',      label: "Today's Board", icon: '/icons/today.png' },
  { id: 'ninjas',     label: 'Ninjas',        icon: '/icons/roster.png' },
  { id: 'clubs',      label: 'Clubs',         icon: '/icons/clubs.png' },
  { id: 'staff',      label: 'Staff',         icon: '/icons/staff.png' },
  { id: 'curriculum', label: 'Curriculum',    Glyph: BookOpenIcon },
];

const TITLES = {
  today:      ["Today's ", 'Ninjas'],
  ninjas:     ['The ', 'Roster'],
  clubs:      ['Clubs ', 'Today'],
  staff:      ['The ', 'Team'],
  curriculum: ['The ', 'Curriculum'],
};

const STATS = [
  { label: 'CHECKED IN', value: 6, dot: 'bg-ninja-blue' },
  { label: 'LOGGED',     value: 2, dot: 'bg-emerald-500' },
  { label: 'NOT LOGGED', value: 3, dot: 'bg-amber-500', lead: true },
  { label: 'OVERDUE',    value: 1, dot: 'bg-red-500' },
];

const FILTERS = ['All', 'CREATE', 'JR', 'Robotics Academy', 'AI Academy'];

// status drives the card's edge: green is logged, amber still owes a log,
// red has been owing one since a past session.
const BOARD = [
  { name: 'Mason Rivera',   belt: 'purple',             program: 'CREATE · Purple L3', status: 'logged',  note: 'Logged ✓',             action: 'Edit Log' },
  { name: 'Ava Chen',       logo: 'jr_logo.webp',       program: 'JR',                 status: 'todo',    note: 'Not logged yet',       action: 'Log Progress' },
  { name: 'Liam Patel',     logo: 'robotics_logo.png',  program: 'Robotics Academy',   status: 'overdue', note: 'Overdue · Sat, Sep 5', action: 'Log Progress' },
  { name: 'Sofia Martinez', belt: 'green',              program: 'CREATE · Green L2',  status: 'todo',    note: 'Not logged yet',       action: 'Log Progress' },
  { name: 'Noah Kim',       logo: 'ai_logo.png',        program: 'AI Academy',         status: 'logged',  note: 'Logged ✓',             action: 'Edit Log' },
  { name: 'Emma Johnson',   belt: 'yellow',             program: 'CREATE · Yellow L1', status: 'todo',    note: 'Not logged yet',       action: 'Log Progress' },
];

const EDGE = {
  logged:  'border-emerald-400',
  todo:    'border-amber-400',
  overdue: 'border-red-400',
};
const NOTE_DOT = {
  logged:  'bg-emerald-500',
  todo:    'bg-amber-500',
  overdue: 'bg-red-500',
};
const NOTE_TEXT = {
  logged:  'text-emerald-600',
  todo:    'text-amber-600',
  overdue: 'text-red-600',
};

const ROSTER = [
  { name: 'Mason Rivera',   belt: 'purple', program: 'CREATE',           meta: '48 sessions', seen: 'Today' },
  { name: 'Sofia Martinez', belt: 'green',  program: 'CREATE',           meta: '31 sessions', seen: 'Today' },
  { name: 'Emma Johnson',   belt: 'yellow', program: 'CREATE · Clubs',   meta: '12 sessions', seen: 'Today' },
  { name: 'Ava Chen',       belt: 'white',  program: 'JR',               meta: '9 sessions',  seen: 'Yesterday' },
  { name: 'Liam Patel',     belt: 'blue',   program: 'Robotics Academy', meta: '22 sessions', seen: 'Sat, Sep 5' },
  { name: 'Noah Kim',       belt: 'orange', program: 'AI Academy',       meta: '17 sessions', seen: 'Today' },
];

const CLUBS = [
  { art: 'dragon.png',   name: 'Minecraft Club', when: 'Tuesday · 4:30 pm', count: '8 ninjas' },
  { art: 'robot.png',    name: 'Robotics Lab',   when: 'Thursday · 5:00 pm', count: '6 ninjas' },
  { art: 'unicorn.png',  name: 'Roblox Studio',  when: 'Saturday · 11:00 am', count: '11 ninjas' },
];

const STAFF = [
  { initials: 'KN', name: 'Kai Nakamura',  role: 'Sensei',          meta: '12 logged today' },
  { initials: 'RM', name: 'Rosa Medina',   role: 'Center Director', meta: '4 logged today' },
  { initials: 'DO', name: 'Dev Okonkwo',   role: 'Sensei',          meta: '9 logged today' },
  { initials: 'HT', name: 'Hana Tran',     role: 'Sensei',          meta: '6 logged today' },
];

const LADDER = [
  { belt: 'white',  levels: 4 }, { belt: 'yellow', levels: 5 }, { belt: 'orange', levels: 5 },
  { belt: 'green',  levels: 5 }, { belt: 'blue',   levels: 6 }, { belt: 'purple', levels: 6, here: true },
  { belt: 'brown',  levels: 10 }, { belt: 'black',  levels: 2 },
];

function Avatar({ belt, logo, size = 'w-10 h-10' }) {
  if (logo) {
    return <img src={`/programs/${logo}`} alt="" className={`${size} rounded-full object-contain shrink-0`} />;
  }
  return (
    <span
      className={`${size} rounded-full p-[2.5px] shrink-0`}
      style={{ background: BELT_HEX[belt] }}
    >
      <img src={`/belts/belt-${belt}.svg`} alt="" className="w-full h-full rounded-full bg-white object-contain p-0.5" />
    </span>
  );
}

function TodayView() {
  return (
    <>
      <div className="grid grid-cols-4 gap-3 mb-4">
        {STATS.map(({ label, value, dot, lead }) => (
          <div
            key={label}
            className={`bg-white rounded-xl px-3.5 py-3 border ${lead ? 'border-ninja-blue' : 'border-ninja-border'}`}
          >
            <div className="text-[9px] font-extrabold tracking-[0.12em] text-ninja-muted">{label}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-ninja-navy leading-none">{value}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4">
        {FILTERS.map((f, i) => (
          <span
            key={f}
            className={`text-[11px] font-bold rounded-full px-3 py-1.5 ${
              i === 0 ? 'bg-ninja-blue text-white' : 'bg-white border border-ninja-border text-ninja-navy'
            }`}
          >
            {f}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {BOARD.map((n) => (
          <div key={n.name} className={`bg-white rounded-xl border-2 ${EDGE[n.status]} p-3`}>
            <div className="flex items-center gap-2.5">
              <Avatar {...n} />
              <div className="min-w-0">
                <div className="text-[13px] font-extrabold text-ninja-navy leading-tight truncate">{n.name}</div>
                <div className="text-[11px] font-semibold text-ninja-blue truncate">{n.program}</div>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 text-[11px] font-bold mt-2.5 ${NOTE_TEXT[n.status]}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${NOTE_DOT[n.status]}`} />
              {n.note}
            </div>
            <div className="mt-2.5 w-full text-center text-[11px] font-bold text-ninja-blue border-[1.5px] border-ninja-blue/60 rounded-lg py-2">
              {n.action}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function RosterView() {
  return (
    <div className="bg-white rounded-xl border border-ninja-border overflow-hidden">
      {ROSTER.map((n) => (
        <div key={n.name} className="flex items-center gap-3 px-4 py-3 border-b border-ninja-border/70 last:border-0">
          <Avatar {...n} />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-extrabold text-ninja-navy leading-tight">{n.name}</div>
            <div className="text-[11px] font-semibold text-ninja-blue">{n.program}</div>
          </div>
          <div className="text-[11px] font-semibold text-ninja-muted w-24 text-right">{n.meta}</div>
          <div className="text-[11px] font-bold text-ninja-navy w-24 text-right">{n.seen}</div>
        </div>
      ))}
    </div>
  );
}

function ClubsView() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {CLUBS.map((c) => (
        <div key={c.name} className="bg-white rounded-xl border border-ninja-border p-4">
          <img src={`/stickers/${c.art}`} alt="" className="w-12 h-12 object-contain" />
          <div className="text-[13px] font-extrabold text-ninja-navy mt-2.5">{c.name}</div>
          <div className="text-[11px] font-semibold text-ninja-muted mt-0.5">{c.when}</div>
          <div className="text-[11px] font-bold text-ninja-blue mt-0.5">{c.count}</div>
          <div className="mt-3 w-full text-center text-[11px] font-bold text-white bg-ninja-blue rounded-lg py-2">
            Check in club
          </div>
        </div>
      ))}
    </div>
  );
}

function StaffView() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {STAFF.map((s) => (
        <div key={s.name} className="bg-white rounded-xl border border-ninja-border p-4 flex items-center gap-3">
          <span className="w-11 h-11 rounded-full bg-ninja-blue text-white font-black text-sm flex items-center justify-center shrink-0">
            {s.initials}
          </span>
          <div className="min-w-0">
            <div className="text-[13px] font-extrabold text-ninja-navy leading-tight">{s.name}</div>
            <div className="text-[11px] font-semibold text-ninja-blue">{s.role}</div>
          </div>
          <div className="ml-auto text-[11px] font-semibold text-ninja-muted whitespace-nowrap">{s.meta}</div>
        </div>
      ))}
    </div>
  );
}

function CurriculumView() {
  return (
    <div className="bg-white rounded-xl border border-ninja-border p-5">
      <div className="text-[13px] font-extrabold text-ninja-navy mb-4">CREATE belt ladder</div>
      <div className="flex items-end justify-between gap-2">
        {LADDER.map(({ belt, levels, here }) => (
          <div key={belt} className="flex flex-col items-center gap-1.5 min-w-0">
            <img
              src={`/belts/belt-${belt}.svg`}
              alt=""
              className={here ? 'h-12 drop-shadow-md' : 'h-8 opacity-60'}
            />
            <div className={`text-[11px] font-extrabold capitalize ${here ? 'text-ninja-navy' : 'text-ninja-muted'}`}>
              {belt}
            </div>
            <div className="text-[10px] font-semibold text-ninja-muted">{levels} levels</div>
          </div>
        ))}
      </div>
      <div className="mt-5 pt-4 border-t border-ninja-border text-[11px] font-semibold text-ninja-muted">
        276 stickers across CREATE, JR, Robotics and AI Academy.
      </div>
    </div>
  );
}

const VIEWS = {
  today: TodayView, ninjas: RosterView, clubs: ClubsView,
  staff: StaffView, curriculum: CurriculumView,
};

// The desktop shot is the app, not a picture of it: the sidebar really
// navigates, so a visitor can look around before they ever sign in.
export function DeskMockup() {
  const [tab, setTab] = useState('today');
  const still = useReducedMotion();
  const View = VIEWS[tab];
  const [head, tail] = TITLES[tab];
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div
      className="rounded-2xl bg-white border border-ninja-border overflow-hidden select-none text-left"
      style={{ boxShadow: '0 30px 80px rgb(9 30 66 / 0.28)' }}
    >
      <div className="flex">
        {/* Sidebar */}
        <div className="w-48 shrink-0 bg-white border-r border-ninja-border p-4 flex flex-col">
          <Logo variant="lockup" className="h-6 text-ninja-navy mb-4" title="" />

          <div className="flex items-center justify-between border border-ninja-border rounded-lg px-3 py-2 mb-4">
            <span className="text-xs font-bold text-ninja-navy">Yorba Linda</span>
            <ChevronDownIcon className="w-3.5 h-3.5 text-ninja-muted" aria-hidden="true" />
          </div>

          <nav className="flex flex-col gap-1">
            {NAV.map(({ id, label, icon, Glyph }) => {
              const on = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  aria-pressed={on}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    on ? 'bg-ninja-blue/10 text-ninja-blue' : 'text-ninja-navy hover:bg-ninja-bg'
                  }`}
                >
                  {icon
                    ? <img src={icon} alt="" className={`w-6 h-6 object-contain ${on ? '' : 'opacity-60'}`} />
                    : <Glyph className="w-6 h-6" strokeWidth={2} aria-hidden="true" />}
                  <span className="text-[13px] font-bold">{label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto pt-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-ninja-muted">Appearance</span>
              <span className="w-9 h-5 rounded-full bg-ninja-border p-0.5">
                <span className="block w-4 h-4 rounded-full bg-white" />
              </span>
            </div>
            <div className="flex items-center gap-2.5 pt-3 border-t border-ninja-border">
              <span className="w-8 h-8 rounded-full bg-ninja-blue text-white font-black text-[11px] flex items-center justify-center">
                KN
              </span>
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-ninja-navy leading-tight">Kai Nakamura</div>
                <div className="text-[10px] font-semibold text-ninja-muted">Sensei</div>
              </div>
              <LogOutIcon className="w-4 h-4 text-ninja-muted ml-auto" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Panel */}
        <div className="flex-1 min-w-0 bg-ninja-bg p-6 min-h-[780px] lg:min-h-[630px]">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-3xl font-black tracking-tight leading-none">
                <span className="text-ninja-navy">{head}</span>
                <span className="text-ninja-blue">{tail}</span>
              </h3>
              <div className="text-xs font-semibold text-ninja-muted mt-1.5">{today}</div>
              <div className="text-xs font-bold text-ninja-navy mt-0.5">Welcome Sensei Kai</div>
            </div>
            <div className="flex items-center gap-2" aria-hidden="true">
              <span className="relative w-9 h-9 rounded-xl bg-white border border-ninja-border flex items-center justify-center">
                <UsersIcon className="w-4 h-4 text-ninja-navy" />
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-ninja-blue text-white text-[9px] font-black flex items-center justify-center">6</span>
              </span>
              <span className="w-9 h-9 rounded-xl bg-white border border-ninja-border flex items-center justify-center">
                <BookOpenIcon className="w-4 h-4 text-ninja-navy" />
              </span>
              <span className="w-9 h-9 rounded-xl bg-white border border-ninja-border flex items-center justify-center">
                <CalendarIcon className="w-4 h-4 text-ninja-navy" />
              </span>
            </div>
          </div>

          <motion.div
            key={tab}
            initial={still ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <View />
          </motion.div>

          {tab === 'today' && (
            <div className="bg-white rounded-xl border border-ninja-border px-4 py-3 mt-3 flex items-center justify-between">
              <span className="text-sm font-extrabold text-ninja-navy">Clubs today</span>
              <span className="text-[11px] font-bold text-white bg-ninja-blue rounded-lg px-3 py-2">+ Check In Club</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// The parent portal, on the phone it was drawn for.
const ROAD = ['white', 'yellow', 'orange', 'green', 'blue', 'purple', 'brown', 'black'];
const BOOK = [
  '/impact/purple-3-array-of-sunshine.png',
  '/impact/blue-2-comment-like-and-subscribe.png',
  '/impact/green-4-gps.png',
  '/impact/orange-1-x-and-y-marks-the-spot.png',
];

export function PhoneMockup() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto w-full max-w-[300px] rounded-[2.5rem] bg-ninja-navy p-2.5 select-none pointer-events-none text-left"
      style={{ boxShadow: '0 30px 80px rgb(9 30 66 / 0.35)' }}
    >
      <div className="rounded-[2rem] overflow-hidden bg-ninja-bg">
        {/* Blue hero */}
        <div className="relative bg-ninja-blue px-5 pt-3 pb-8">
          <div className="flex items-center justify-between text-[11px] font-bold text-white">
            <span>9:41</span>
            <span className="flex items-center gap-1">
              <span className="w-1 h-2.5 rounded-sm bg-white/80" />
              <span className="w-1 h-3 rounded-sm bg-white/80" />
              <span className="ml-0.5 w-5 h-2.5 rounded-[3px] border border-white/70 p-[1.5px]">
                <span className="block h-full w-2/3 rounded-[1px] bg-white/80" />
              </span>
            </span>
          </div>

          <span className="mt-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <ChevronLeftIcon className="w-4 h-4 text-white" />
          </span>

          <div className="relative z-10 mt-3 max-w-[62%]">
            <div className="text-[10px] font-extrabold tracking-[0.14em] text-white/75">CREATE · AGE 10</div>
            <div className="text-[34px] font-black text-white leading-[1.05] mt-1">Mason<br />Rivera</div>
            <div className="flex items-end gap-5 mt-3">
              <div>
                <div className="text-xl font-black text-white leading-none">48</div>
                <div className="text-[9px] font-extrabold tracking-[0.12em] text-white/70 mt-1">SESSIONS</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <img src="/belts/belt-purple.svg" alt="" className="h-5" />
                  <span className="text-lg font-black text-white leading-none">Purple</span>
                </div>
                <div className="text-[9px] font-extrabold tracking-[0.12em] text-white/70 mt-1">LEVEL 3</div>
              </div>
            </div>
          </div>

          <img
            src="/ninjas/purple-wave-medium.png"
            alt=""
            className="absolute right-0 top-8 w-36 h-36 object-contain"
          />
        </div>

        {/* Sheet */}
        <div className="bg-ninja-bg rounded-t-3xl -mt-5 relative z-10 px-4 pt-4 pb-5">
          {/* Belt card */}
          <div className="relative rounded-2xl bg-ninja-blue overflow-hidden p-4">
            <img
              src="/belts/belt-purple.svg"
              alt=""
              className="absolute -right-6 -top-4 h-28 opacity-25"
            />
            <div className="relative">
              <div className="text-[9px] font-extrabold tracking-[0.12em] text-white/70">CREATE · MASON</div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xl font-black text-white leading-tight">Purple belt</span>
                <ChevronRightIcon className="w-4 h-4 text-white/80" />
              </div>
              <div className="text-[11px] font-semibold text-white/80 mt-0.5">Level 3 · 3 of 6</div>
              <div className="flex items-center justify-between mt-3">
                {ROAD.map((b, i) => (
                  <img
                    key={b}
                    src={`/belts/belt-${b}.svg`}
                    alt=""
                    className={i === 5 ? 'h-7 drop-shadow' : i < 5 ? 'h-4' : 'h-4 opacity-40'}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Level chips */}
          <div className="flex items-center gap-2 mt-3 overflow-hidden">
            <span className="flex items-center gap-1.5 bg-white border border-ninja-border rounded-full px-3 py-2 whitespace-nowrap">
              <img src="/levels/purple-1.png" alt="" className="w-4 h-4 object-contain" />
              <span className="text-[11px] font-bold text-ninja-navy">Level 1</span>
            </span>
            <span className="flex items-center gap-1.5 bg-white border border-ninja-border rounded-full px-3 py-2 whitespace-nowrap">
              <img src="/levels/purple-2.png" alt="" className="w-4 h-4 object-contain" />
              <span className="text-[11px] font-bold text-ninja-navy">Level 2</span>
            </span>
            <span className="bg-ninja-blue rounded-full px-3.5 py-2 text-[11px] font-bold text-white whitespace-nowrap">
              Level 3
            </span>
            <span className="bg-white border border-ninja-border rounded-full px-3.5 py-2 text-[11px] font-bold text-ninja-navy whitespace-nowrap">
              Level 4
            </span>
          </div>

          {/* Sticker book */}
          <div className="bg-white rounded-2xl border border-ninja-border p-4 mt-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[9px] font-extrabold tracking-[0.12em] text-ninja-muted">STICKER BOOK</div>
                <div className="text-xl font-black text-ninja-navy leading-tight mt-0.5">17 of 48</div>
              </div>
              <span className="text-[11px] font-bold text-ninja-blue">Open ›</span>
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              {BOOK.map((src) => (
                <img key={src} src={src} alt="" className="w-11 h-11 object-contain" />
              ))}
              <img
                src="/impact/purple-4-arrays-all-the-way-down.png"
                alt=""
                className="w-11 h-11 object-contain opacity-30 grayscale"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
