import React from 'react';
import { motion } from 'framer-motion';
import { BELTS, PROGRAM_LOGOS } from '../../utils/beltConfig';
import { useCurriculum } from '../../context/CurriculumContext';
import { formatDate } from '../../utils/dateUtils';

const PROGRAM_GRADIENTS = {
  'Robotics Academy': 'linear-gradient(135deg, #060d1a 0%, #0a1e3d 55%, #0d3070 100%)',
  'AI Academy':       'linear-gradient(135deg, #060c1f 0%, #091840 55%, #0e2a7a 100%)',
  'JR':               'linear-gradient(135deg, #1a0533 0%, #2d1267 55%, #4c1d95 100%)',
};

const PROGRAM_BAR_COLORS = {
  'Robotics Academy': '#2563eb',
  'AI Academy':       '#1d4ed8',
  'JR':               '#7c3aed',
};

const BELT_IMAGES = {
  White:  '/belts/belt-white.png',
  Yellow: '/belts/belt-yellow.png',
  Orange: '/belts/belt-orange.png',
  Green:  '/belts/belt-green.png',
  Blue:   '/belts/belt-blue.png',
  Purple: '/belts/belt-purple.png',
  Brown:  '/belts/belt-brown.png',
  Red:    '/belts/belt-red.png',
  Black:  '/belts/belt-black.png',
};

function abbrevModule(name) {
  return name
    .replace(/^Module (\d+)$/, 'M$1')
    .replace(/^([A-Z]+) (\d+)$/, '$1$2')
    .replace(/^(\d+)\..+$/, '$1');
}

function toMonthKey(dateStr) {
  if (!dateStr) return '';
  const s = typeof dateStr === 'string' ? dateStr : new Date(dateStr).toISOString();
  return s.substring(0, 7);
}

// ─── Animation variants ───────────────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

const dotContainerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.35 } },
};

const dotVariants = {
  hidden: { opacity: 0, scale: 0.4 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 380, damping: 18 } },
};

const nodeVariants = {
  hidden: { opacity: 0, scale: 0.3 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 320, damping: 16 } },
};

// ─── Program card banner ──────────────────────────────────────────────────────

function ProgramCardBanner({ program, lastDate, sessions }) {
  const gradient = PROGRAM_GRADIENTS[program];
  const logo = PROGRAM_LOGOS[program];

  return (
    <div style={{ background: gradient, padding: '20px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <motion.div
        style={{ flex: 1, minWidth: 0 }}
        initial={{ opacity: 0, x: -14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
      >
        <p style={{
          color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.13em', marginBottom: 4,
          fontFamily: 'Nunito, sans-serif',
        }}>
          Code Ninjas
        </p>
        <h2 style={{
          color: 'white', fontWeight: 800, fontSize: 21, lineHeight: 1.1,
          marginBottom: (lastDate || sessions !== undefined) ? 5 : 0,
          fontFamily: 'Nunito, sans-serif',
        }}>
          {program}
        </h2>
        {lastDate && (
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'Nunito, sans-serif' }}>
            Last: {formatDate(lastDate)}
          </p>
        )}
        {sessions !== undefined && (
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'Nunito, sans-serif' }}>
            {sessions} session{sessions !== 1 ? 's' : ''}
          </p>
        )}
      </motion.div>
      {logo && (
        <motion.img
          src={logo}
          alt={program}
          initial={{ opacity: 0, scale: 0.7, x: 16 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
          style={{
            width: 76, height: 76,
            objectFit: 'contain',
            flexShrink: 0,
            filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))',
          }}
        />
      )}
    </div>
  );
}

// ─── Animated progress bar ────────────────────────────────────────────────────

function ProgressBar({ pct, color, delay = 0.3, label, value }) {
  return (
    <div className="mb-5">
      <div className="flex justify-between text-xs font-ninja text-ninja-muted mb-1.5">
        <span>{label}</span>
        <motion.span
          className="font-bold text-ninja-navy"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.1 }}
        >
          {value}
        </motion.span>
      </div>
      <div className="h-3 bg-ninja-bg rounded-full overflow-hidden border border-ninja-border">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay }}
        />
      </div>
    </div>
  );
}

// ─── Activity bar chart ───────────────────────────────────────────────────────

function ActivityChart({ logs }) {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      count: 0,
    });
  }
  logs.forEach((log) => {
    const bucket = months.find((m) => m.key === toMonthKey(log.session_date));
    if (bucket) bucket.count++;
  });

  const max = Math.max(...months.map((m) => m.count), 1);
  const BAR_H = 56;

  return (
    <div className="bg-white border border-ninja-border rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-ninja-navy font-ninja font-bold text-lg">Activity</h2>
        <span className="text-ninja-blue font-ninja font-bold text-sm">{logs.length} total sessions</span>
      </div>

      <div className="flex items-end gap-2">
        {months.map((m, i) => (
          <div key={m.key} className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <div className="w-full flex items-end justify-center" style={{ height: `${BAR_H}px` }}>
              <motion.div
                className="w-full rounded-t-lg"
                style={{ backgroundColor: m.count === 0 ? '#e2e8f0' : '#006ADD' }}
                initial={{ height: 0 }}
                animate={{ height: m.count === 0 ? '3px' : `${Math.max((m.count / max) * BAR_H, 8)}px` }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.06 + 0.15 }}
              />
            </div>
            <span className="text-xs font-ninja text-ninja-muted">{m.label}</span>
            <span className="text-xs font-ninja font-bold text-ninja-navy h-4">
              {m.count > 0 ? m.count : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Belt journey (CREATE only) ───────────────────────────────────────────────

function BeltJourney({ enrollment }) {
  const { belt_level, belt_sublevel, last_session_date, current_project, project_status } = enrollment;
  const currentIndex = belt_level ? BELTS.findIndex((b) => b.name === belt_level) : -1;
  const currentBelt = currentIndex >= 0 ? BELTS[currentIndex] : null;
  const maxLevel = currentBelt?.levels ?? null;
  const sublevel = belt_sublevel != null ? parseInt(belt_sublevel) : null;
  const progress = maxLevel && sublevel ? Math.round((sublevel / maxLevel) * 100) : null;

  if (!belt_level) {
    return (
      <div className="bg-white border border-ninja-border rounded-2xl shadow-sm p-5">
        <h2 className="text-ninja-navy font-ninja font-bold text-lg mb-1">CREATE</h2>
        <p className="text-ninja-muted font-ninja text-sm italic text-center py-4">
          Belt journey starting soon!
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className="rounded-2xl shadow-lg overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #006ADD 0%, #004fa8 100%)' }}
      variants={cardVariants}
      initial="hidden"
      animate="show"
    >
      <div className="p-5 relative">
        <div className="absolute pointer-events-none" style={{ right: -8, top: -8, opacity: 0.42 }}>
          <img src={BELT_IMAGES[belt_level]} alt="" draggable={false} className="w-[110px] h-[110px] sm:w-40 sm:h-40 md:w-52 md:h-52" />
        </div>

        <p className="font-ninja text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.75)' }}>
          Current Belt
        </p>

        <div className="flex items-baseline gap-2 mb-1">
          <p className="text-white font-ninja font-black" style={{ fontSize: '28px', lineHeight: 1 }}>{belt_level}</p>
          {sublevel && <p className="font-ninja font-bold text-xl" style={{ color: 'rgba(255,255,255,0.85)' }}>#{sublevel}</p>}
        </div>

        {(current_project || last_session_date) && (
          <p className="font-ninja text-xs mb-5" style={{ color: 'rgba(255,255,255,0.65)' }}>
            {current_project ? `${current_project}${project_status ? ` · ${project_status}` : ''}` : ''}
            {current_project && last_session_date ? ' · ' : ''}
            {last_session_date ? `Last: ${formatDate(last_session_date)}` : ''}
          </p>
        )}
        {!current_project && !last_session_date && <div className="mb-5" />}

        <div className="overflow-x-auto" style={{ margin: '0 -4px', padding: '4px' }}>
          <div className="flex items-center" style={{ minWidth: 'max-content' }}>
            {BELTS.map((belt, i) => {
              const reached = i <= currentIndex;
              const isCurrent = i === currentIndex;
              const imgSize = isCurrent ? 34 : 26;
              return (
                <React.Fragment key={belt.name}>
                  {i > 0 && (
                    <div style={{
                      width: '12px', height: '2px', flexShrink: 0,
                      backgroundColor: reached ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.22)',
                    }} />
                  )}
                  <motion.img
                    src={BELT_IMAGES[belt.name]}
                    alt={belt.name}
                    draggable={false}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: reached ? 1 : 0.45, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 340, damping: 18, delay: i * 0.04 + 0.2 }}
                    style={{
                      width: imgSize, height: imgSize, display: 'block',
                      filter: isCurrent
                        ? 'drop-shadow(0 0 6px rgba(255,255,255,0.55))'
                        : reached ? 'none' : 'grayscale(100%)',
                    }}
                  />
                </React.Fragment>
              );
            })}
          </div>
          <div className="flex" style={{ minWidth: 'max-content', marginTop: '5px' }}>
            {BELTS.map((belt, i) => {
              const reached = i <= currentIndex;
              const isCurrent = i === currentIndex;
              const imgSize = isCurrent ? 34 : 26;
              return (
                <React.Fragment key={belt.name}>
                  {i > 0 && <div style={{ width: '12px', flexShrink: 0 }} />}
                  <div style={{ width: imgSize, textAlign: 'center' }}>
                    <span style={{
                      fontSize: '9px', fontFamily: 'Nunito, sans-serif',
                      fontWeight: isCurrent ? 700 : 400,
                      color: reached ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)',
                      whiteSpace: 'nowrap', display: 'block',
                    }}>
                      {belt.name}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {progress !== null && (
        <div className="px-5 pb-5">
          <div className="flex justify-between font-ninja mb-1.5" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
            <span>Sublevel progress</span>
            <motion.span
              className="font-bold"
              style={{ color: 'rgba(255,255,255,0.9)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {progress}%
            </motion.span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
            />
          </div>
          {maxLevel && sublevel && (
            <p className="font-ninja mt-1" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)' }}>
              Level {sublevel} of {maxLevel}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Module explorer ─────────────────────────────────────────────────────────

function ModuleGrid({ modules, visited, accentColor, dotDelay = 0 }) {
  if (!modules.length) return null;
  const visitedCount = modules.filter((m) => visited.has(m.module)).length;
  const color = accentColor || '#006ADD';

  return (
    <div>
      <motion.div
        className="flex flex-wrap gap-1.5 mb-1"
        variants={dotContainerVariants}
        initial="hidden"
        animate="show"
      >
        {modules.map((m) => {
          const done = visited.has(m.module);
          return (
            <motion.div
              key={m.module}
              title={m.module}
              variants={dotVariants}
              className="px-2.5 py-1 rounded-lg text-xs font-ninja font-bold border"
              style={done
                ? { backgroundColor: color, color: 'white', borderColor: color }
                : { backgroundColor: '#f8fafc', color: '#94a3b8', borderColor: '#e2e8f0' }
              }
            >
              {abbrevModule(m.module)}
            </motion.div>
          );
        })}
      </motion.div>
      <p className="text-ninja-muted font-ninja text-xs mt-1">
        {visitedCount} of {modules.length} modules explored
      </p>
    </div>
  );
}

// ─── Animated kit path ────────────────────────────────────────────────────────

function KitPath({ kitOrder, kitShort, currentKitIndex, barColor }) {
  return (
    <div className="overflow-x-auto mb-5" style={{ margin: '0 -4px 20px', padding: '4px' }}>
      <div className="flex items-start" style={{ minWidth: 'max-content' }}>
        {kitOrder.map((kit, i) => {
          const reached = i <= currentKitIndex;
          const isCurrent = i === currentKitIndex;
          return (
            <div key={kit} className="flex items-start">
              {i > 0 && (
                <motion.div
                  style={{
                    width: '24px', height: '3px', borderRadius: '2px',
                    backgroundColor: reached ? barColor : '#e2e8f0',
                    flexShrink: 0, marginTop: '13px',
                  }}
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.4, ease: 'easeOut', delay: i * 0.12 + 0.2 }}
                />
              )}
              <div className="flex flex-col items-center" style={{ gap: '5px' }}>
                <motion.div
                  style={{
                    width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                    backgroundColor: isCurrent ? barColor : reached ? '#c4b5fd' : '#e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  variants={nodeVariants}
                  initial="hidden"
                  animate="show"
                  transition={{ delay: i * 0.12 + 0.15 }}
                >
                  <span style={{ color: reached ? 'white' : '#cbd5e1', fontSize: '11px', fontWeight: 700 }}>
                    {i + 1}
                  </span>
                </motion.div>
                <span style={{
                  fontSize: '10px', fontFamily: 'Nunito, sans-serif',
                  fontWeight: isCurrent ? 700 : 400,
                  color: isCurrent ? barColor : reached ? '#506690' : '#cbd5e1',
                  whiteSpace: 'nowrap',
                }}>
                  {kitShort[kit]}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModuleProgress({ program, enrollment, logs }) {
  const { curriculum: CURRICULUM } = useCurriculum();
  const totalSessions = logs.length;
  const lastDate = enrollment?.last_session_date;
  const barColor = PROGRAM_BAR_COLORS[program] || '#006ADD';

  // ── AI Academy ───────────────────────────────────────────────────────────────
  if (program === 'AI Academy') {
    const currentModule = enrollment?.last_module_name;
    const aiCurriculum = CURRICULUM['AI Academy'] || [];
    const moduleEntry = aiCurriculum.find((m) => m.module === currentModule);
    const totalLessons = moduleEntry?.lessons.length ?? 0;
    const visitedLessons = currentModule
      ? new Set(
          logs.filter((l) => l.module_name === currentModule).map((l) => l.lesson_name).filter(Boolean)
        ).size
      : 0;
    const pct = totalLessons > 0 ? Math.round((visitedLessons / totalLessons) * 100) : 0;
    const visitedModules = new Set(logs.map((l) => l.module_name).filter(Boolean));

    return (
      <motion.div
        className="rounded-2xl overflow-hidden border border-ninja-border shadow-sm"
        variants={cardVariants}
        initial="hidden"
        animate="show"
      >
        <ProgramCardBanner program="AI Academy" lastDate={lastDate} />
        <div className="bg-white p-5">
          {currentModule ? (
            <>
              <motion.div
                className="flex items-center gap-3 mb-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.35 }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-ninja-navy font-ninja font-bold text-xl">{currentModule}</p>
                  <p className="text-ninja-muted font-ninja text-sm mt-0.5">
                    Lesson {visitedLessons} of {totalLessons}
                  </p>
                </div>
              </motion.div>
              <ProgressBar pct={pct} color={barColor} delay={0.3} label="Module progress" value={`${pct}%`} />
            </>
          ) : (
            <p className="text-ninja-muted font-ninja text-sm italic mb-4">No modules started yet.</p>
          )}

          <p className="text-ninja-muted font-ninja text-xs font-semibold uppercase tracking-wide mb-2">
            Module Path
          </p>
          <ModuleGrid modules={aiCurriculum} visited={visitedModules} accentColor={barColor} />
        </div>
      </motion.div>
    );
  }

  // ── JR ───────────────────────────────────────────────────────────────────────
  if (program === 'JR') {
    const JR_CODING_MODULES = ['Module 1','Module 2','Module 3','Module 4','Module 5','Module 6','Module 7','Module 8','Module 9','Module 10'];
    const SNAP_CIRCUITS_TOTAL = 24;

    const jrCodingLogs = logs.filter((l) => l.sub_program === 'JR Coding');
    const jrCodingHighestIdx = Math.max(-1, ...jrCodingLogs
      .map((l) => JR_CODING_MODULES.indexOf(l.module_name)).filter((i) => i >= 0));
    const jrCodingDone = jrCodingHighestIdx + 1;
    const jrCodingPct = jrCodingDone > 0 ? Math.round((jrCodingDone / JR_CODING_MODULES.length) * 100) : 0;

    const snapLogs = logs.filter((l) => l.sub_program === 'Snap Circuits');
    const snapNums = snapLogs.map((l) => { const m = l.lesson_name?.match(/Project\s+(\d+)/i); return m ? parseInt(m[1], 10) : 0; });
    const snapHighest = snapNums.length > 0 ? Math.max(0, ...snapNums) : 0;
    const snapPct = snapHighest > 0 ? Math.min(100, Math.round((snapHighest / SNAP_CIRCUITS_TOTAL) * 100)) : 0;

    const hasJrCoding = jrCodingLogs.length > 0;
    const hasSnap = snapLogs.length > 0;

    return (
      <motion.div
        className="rounded-2xl overflow-hidden border border-ninja-border shadow-sm"
        variants={cardVariants}
        initial="hidden"
        animate="show"
      >
        <ProgramCardBanner program="JR" lastDate={lastDate} sessions={totalSessions} />
        <div className="bg-white p-5 space-y-5">
          {hasJrCoding && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-ninja-muted font-ninja text-xs font-semibold uppercase tracking-wide">JR Coding</p>
                <span className="text-ninja-navy font-ninja text-xs font-bold">
                  {jrCodingDone > 0 ? `Module ${jrCodingDone} of ${JR_CODING_MODULES.length}` : 'Not started'}
                </span>
              </div>
              <ProgressBar pct={jrCodingPct} color={barColor} delay={0.3} label="Progress" value={`${jrCodingPct}%`} />
              <motion.div
                className="flex flex-wrap gap-1.5"
                variants={dotContainerVariants}
                initial="hidden"
                animate="show"
              >
                {JR_CODING_MODULES.map((mod, i) => {
                  const done = i < jrCodingDone;
                  const isCurrent = i === jrCodingHighestIdx;
                  return (
                    <motion.div
                      key={mod}
                      title={mod}
                      variants={dotVariants}
                      className="px-2 py-0.5 rounded-lg text-xs font-ninja font-bold border"
                      style={done
                        ? isCurrent
                          ? { backgroundColor: '#16a34a', color: 'white', borderColor: '#16a34a' }
                          : { backgroundColor: '#dcfce7', color: '#15803d', borderColor: '#bbf7d0' }
                        : { backgroundColor: '#f8fafc', color: '#94a3b8', borderColor: '#e2e8f0' }
                      }
                    >
                      M{i + 1}
                    </motion.div>
                  );
                })}
              </motion.div>
              <p className="text-ninja-muted font-ninja text-xs mt-1.5">
                {jrCodingDone} of {JR_CODING_MODULES.length} modules complete
                {jrCodingDone > 0 && jrCodingHighestIdx > 0 ? ' (includes all prior modules)' : ''}
              </p>
            </motion.div>
          )}

          {hasSnap && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: hasJrCoding ? 0.25 : 0.15 }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-ninja-muted font-ninja text-xs font-semibold uppercase tracking-wide">Snap Circuits</p>
                <span className="text-ninja-navy font-ninja text-xs font-bold">
                  {snapHighest > 0 ? `Project ${snapHighest} of ${SNAP_CIRCUITS_TOTAL}` : 'Not started'}
                </span>
              </div>
              <ProgressBar pct={snapPct} color={barColor} delay={hasJrCoding ? 0.45 : 0.3} label="Progress" value={`${snapPct}%`} />
              <p className="text-ninja-muted font-ninja text-xs mt-1">
                {snapHighest} of {SNAP_CIRCUITS_TOTAL} projects complete
              </p>
            </motion.div>
          )}

          {!hasJrCoding && !hasSnap && (
            <p className="text-ninja-muted font-ninja text-sm italic">No sessions logged yet.</p>
          )}
        </div>
      </motion.div>
    );
  }

  // ── Robotics Academy ─────────────────────────────────────────────────────────
  if (program === 'Robotics Academy') {
    const KIT_ORDER  = ['LEGO Spike Essentials', 'LEGO Spike Prime', 'VEX GO', 'Ozobot Evo'];
    const KIT_SHORT  = { 'LEGO Spike Essentials': 'Essentials', 'LEGO Spike Prime': 'Prime', 'VEX GO': 'VEX GO', 'Ozobot Evo': 'Ozobot' };
    const KIT_TOTALS = { 'LEGO Spike Essentials': 8, 'LEGO Spike Prime': 4, 'VEX GO': 4, 'Ozobot Evo': 2 };

    const currentKit = enrollment?.last_sub_program;
    const currentKitIndex = currentKit ? KIT_ORDER.indexOf(currentKit) : -1;
    const totalModules = currentKit ? (KIT_TOTALS[currentKit] ?? 0) : 0;
    const visitedModules = currentKit
      ? new Set(logs.filter((l) => l.sub_program === currentKit).map((l) => l.module_name).filter(Boolean)).size
      : 0;
    const pct = totalModules > 0 ? Math.round((visitedModules / totalModules) * 100) : 0;
    const currentKitModules = currentKit ? (CURRICULUM[currentKit] || []) : [];
    const visitedModuleNames = currentKit
      ? new Set(logs.filter((l) => l.sub_program === currentKit).map((l) => l.module_name).filter(Boolean))
      : new Set();

    return (
      <motion.div
        className="rounded-2xl overflow-hidden border border-ninja-border shadow-sm"
        variants={cardVariants}
        initial="hidden"
        animate="show"
      >
        <ProgramCardBanner program="Robotics Academy" lastDate={lastDate} />
        <div className="bg-white p-5">
          {currentKit ? (
            <>
              <motion.div
                className="mb-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.35 }}
              >
                <p className="text-ninja-navy font-ninja font-bold text-xl">{currentKit}</p>
                <p className="text-ninja-muted font-ninja text-sm mt-0.5">
                  Module {visitedModules} of {totalModules}
                </p>
              </motion.div>
              <ProgressBar pct={pct} color={barColor} delay={0.3} label="Kit progress" value={`${pct}%`} />
            </>
          ) : (
            <p className="text-ninja-muted font-ninja text-sm italic mb-4">No kit started yet.</p>
          )}

          <p className="text-ninja-muted font-ninja text-xs font-semibold uppercase tracking-wide mb-2">
            Kit Path
          </p>
          <KitPath
            kitOrder={KIT_ORDER}
            kitShort={KIT_SHORT}
            currentKitIndex={currentKitIndex}
            barColor={barColor}
          />

          {currentKit && (
            <>
              <p className="text-ninja-muted font-ninja text-xs font-semibold uppercase tracking-wide mb-2">
                Module Path
              </p>
              <ModuleGrid modules={currentKitModules} visited={visitedModuleNames} accentColor={barColor} />
            </>
          )}
        </div>
      </motion.div>
    );
  }

  // ── Fallback ─────────────────────────────────────────────────────────────────
  const pct = enrollment?.percent_complete ?? 0;
  const modules = CURRICULUM[program] || [];
  const visited = new Set(logs.map((l) => l.module_name).filter(Boolean));

  return (
    <div className="bg-white border border-ninja-border rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-ninja-navy font-ninja font-bold text-lg">{program}</h2>
        <span className="text-ninja-muted font-ninja text-sm">{totalSessions} sessions</span>
      </div>
      {lastDate && (
        <p className="text-ninja-muted font-ninja text-xs mb-3">Last: {formatDate(lastDate)}</p>
      )}
      <ProgressBar pct={pct} color={barColor} delay={0.2} label="Progress" value={`${pct}%`} />
      <ModuleGrid modules={modules} visited={visited} accentColor={barColor} />
    </div>
  );
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export default function ProgressVisuals({ programs, sessionLogs }) {
  const create = programs.find((p) => p.program === 'CREATE');
  const others = programs.filter((p) => p.program !== 'CREATE');

  return (
    <div className="space-y-4">
      <ActivityChart logs={sessionLogs} />
      {create && <BeltJourney enrollment={create} />}
      {others.map((p) => (
        <ModuleProgress
          key={p.program}
          program={p.program}
          enrollment={p}
          logs={sessionLogs.filter((l) => l.program === p.program)}
        />
      ))}
    </div>
  );
}
