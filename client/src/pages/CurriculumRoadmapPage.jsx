import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/layout/Layout';
import { api } from '../api/client';
import { PROGRAM_LOGOS, BELTS } from '../utils/beltConfig';

const BELT_COLOR = Object.fromEntries(BELTS.map(b => [b.name, { color: b.color, text: b.textColor }]));

const PROGRAM_CONFIG = {
  'CREATE': {
    color: '#60a5fa',
    bg: 'rgba(96, 165, 250, 0.07)',
    border: 'rgba(96, 165, 250, 0.18)',
    label: 'CREATE',
  },
  'JR': {
    color: '#a78bfa',
    bg: 'rgba(167, 139, 250, 0.07)',
    border: 'rgba(167, 139, 250, 0.18)',
    label: 'JR',
  },
  'AI Academy': {
    color: '#22d3ee',
    bg: 'rgba(34, 211, 238, 0.07)',
    border: 'rgba(34, 211, 238, 0.18)',
    label: 'AI Academy',
  },
  'Robotics Academy': {
    color: '#38a1ff',
    bg: 'rgba(56, 161, 255, 0.07)',
    border: 'rgba(56, 161, 255, 0.18)',
    label: 'Robotics Academy',
  },
};

const defaultConfig = { color: '#38a1ff', bg: 'rgba(56, 161, 255, 0.07)', border: 'rgba(56, 161, 255, 0.18)', label: '' };

function getConfig(program) {
  return PROGRAM_CONFIG[program] || { ...defaultConfig, label: program };
}

function getProjectPrefix(name, index, total) {
  const lower = name.toLowerCase();
  if (lower.includes('belt-up')) return 'Belt-Up';
  if (lower.startsWith('prove yourself')) return null;
  if (lower.startsWith('debugging')) {
    const solveNum = Math.ceil((index + 1) / 2);
    return `Solve ${solveNum}`;
  }
  return index === total - 1 ? 'Adventure' : `Build ${Math.floor(index / 2) + 1}`;
}

function LessonList({ lessons, isCreate }) {
  return (
    <ul className="mt-3 space-y-1 pl-1">
      {lessons.map((l, i) => {
        const prefix = isCreate ? getProjectPrefix(l.lesson_name, i, lessons.length) : null;
        return (
          <li key={l.id ?? i} className="flex items-start gap-2 text-sm font-ninja text-ninja-navy/80">
            <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-ninja-border" />
            {prefix && (
              <span className="shrink-0 font-ninja font-semibold text-ninja-muted text-xs mt-0.5 min-w-[52px]">{prefix}:</span>
            )}
            {l.lesson_name}
          </li>
        );
      })}
    </ul>
  );
}

function ModuleCard({ mod, accentColor, isCreate, index }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index, 8) * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-xl overflow-hidden border transition-colors duration-150 ${
        open
          ? 'border-ninja-border bg-ninja-border/20'
          : 'border-ninja-border bg-ninja-border/10 hover:bg-ninja-border/20'
      }`}
    >
      <motion.button
        className="w-full flex items-center justify-between px-4 py-3.5 text-left"
        onClick={() => setOpen(o => !o)}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <motion.div
            animate={{ rotate: open ? 90 : 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: open ? accentColor + '28' : 'transparent' }}
          >
            <svg
              className="w-3.5 h-3.5"
              style={{ color: open ? accentColor : '#8a9bb8' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </motion.div>
          <span className="font-ninja font-bold text-sm text-ninja-navy truncate">{mod.module_name}</span>
        </div>
        <span
          className="shrink-0 text-xs font-ninja font-semibold px-2.5 py-1 rounded-full ml-3 transition-colors duration-150"
          style={{
            backgroundColor: open ? accentColor + '22' : 'rgba(44, 55, 82, 0.7)',
            color: open ? accentColor : '#8a9bb8',
          }}
        >
          {mod.lessons.length} {isCreate ? 'project' : 'lesson'}{mod.lessons.length !== 1 ? 's' : ''}
        </span>
      </motion.button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-ninja-border/50">
              {mod.description && (
                <p className="text-sm font-ninja text-ninja-muted leading-relaxed mb-2">{mod.description}</p>
              )}
              {mod.lessons.length > 0 && <LessonList lessons={mod.lessons} isCreate={isCreate} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SubProgramView({ modules, subPrograms, accentColor, program }) {
  const [activeTab, setActiveTab] = useState(subPrograms?.[0] ?? null);

  const visibleModules = activeTab
    ? modules.filter(m => m.sub_program === activeTab)
    : modules;

  const isCreate = program === 'CREATE';

  return (
    <div>
      {subPrograms?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {subPrograms.map(sub => {
            const isActive = activeTab === sub;
            const beltC = isCreate ? BELT_COLOR[sub] : null;
            const activeBg = isCreate && beltC ? beltC.color : accentColor;
            const activeText = isCreate && beltC ? beltC.text : '#fff';
            return (
              <button
                key={sub}
                onClick={() => setActiveTab(sub)}
                className={`font-ninja font-semibold text-sm px-3.5 py-1.5 rounded-lg transition-colors ${
                  isActive
                    ? ''
                    : 'text-ninja-muted hover:text-ninja-navy bg-ninja-border/20 border border-ninja-border hover:border-ninja-border'
                }`}
                style={isActive ? { background: activeBg, color: activeText } : {}}
              >
                {sub}
              </button>
            );
          })}
        </div>
      )}
      <div className="space-y-2">
        {visibleModules.map((mod, i) => (
          <ModuleCard key={mod.id} mod={mod} accentColor={accentColor} isCreate={isCreate} index={i} />
        ))}
        {visibleModules.length === 0 && (
          <p className="text-ninja-muted font-ninja text-sm py-4 text-center">No modules yet.</p>
        )}
      </div>
    </div>
  );
}

export default function CurriculumRoadmapPage() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeProgram, setActiveProgram] = useState(null);

  useEffect(() => {
    api.get('/curriculum/roadmap')
      .then(data => {
        setPrograms(data);
        if (data.length > 0) setActiveProgram(data[0].program);
      })
      .catch(() => setError('Failed to load curriculum'))
      .finally(() => setLoading(false));
  }, []);

  const current = programs.find(p => p.program === activeProgram);
  const cfg = current ? getConfig(current.program) : defaultConfig;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-ninja font-extrabold text-ninja-navy">Curriculum Roadmap</h1>
          <p className="text-ninja-muted font-ninja text-sm mt-1">All programs, modules, and lessons</p>
        </div>

        {loading && (
          <p className="text-ninja-muted font-ninja text-sm py-12 text-center">Loading…</p>
        )}
        {error && (
          <p className="text-ninja-red font-ninja text-sm py-12 text-center">{error}</p>
        )}

        {!loading && !error && programs.length > 0 && (
          <>
            {/* Program selector tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {programs.map(p => {
                const c = getConfig(p.program);
                const isActive = p.program === activeProgram;
                const logo = PROGRAM_LOGOS[p.program];
                return (
                  <motion.button
                    key={p.program}
                    onClick={() => setActiveProgram(p.program)}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className={`font-ninja font-bold text-sm px-4 py-2 rounded-xl border transition-all flex items-center gap-2 ${
                      isActive
                        ? 'text-white border-transparent shadow-sm'
                        : 'bg-ninja-border/20 border-ninja-border text-ninja-navy hover:border-ninja-border'
                    }`}
                    style={isActive ? { background: c.color, borderColor: c.color } : {}}
                  >
                    {logo && <img src={logo} alt="" className="w-5 h-5 object-contain rounded" />}
                    {p.program}
                  </motion.button>
                );
              })}
            </div>

            {/* Program body */}
            <AnimatePresence mode="wait">
              {current && (
                <motion.div
                  key={current.program}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  {/* Program header strip */}
                  <div
                    className="rounded-2xl px-5 py-4 mb-5 border flex items-center gap-3"
                    style={{ background: cfg.bg, borderColor: cfg.border }}
                  >
                    {PROGRAM_LOGOS[current.program] && (
                      <img src={PROGRAM_LOGOS[current.program]} alt="" className="w-10 h-10 object-contain shrink-0" />
                    )}
                    <div>
                      <h2 className="font-ninja font-extrabold text-lg" style={{ color: cfg.color }}>
                        {current.program}
                      </h2>
                      <p className="text-sm font-ninja mt-0.5" style={{ color: cfg.color, opacity: 0.7 }}>
                        {current.modules.length} module{current.modules.length !== 1 ? 's' : ''}
                        {' · '}
                        {current.modules.reduce((n, m) => n + m.lessons.length, 0)} total {current.program === 'CREATE' ? 'projects' : 'lessons'}
                      </p>
                    </div>
                  </div>

                  <SubProgramView
                    modules={current.modules}
                    subPrograms={current.sub_programs.length > 0 ? current.sub_programs : null}
                    accentColor={cfg.color}
                    program={current.program}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </Layout>
  );
}
