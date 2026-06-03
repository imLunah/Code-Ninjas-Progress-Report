import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/layout/Layout';
import { api } from '../api/client';

const PROGRAM_CONFIG = {
  'CREATE': {
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    dot: '#2563eb',
    label: 'CREATE',
  },
  'JR': {
    color: '#7c3aed',
    bg: '#faf5ff',
    border: '#e9d5ff',
    dot: '#7c3aed',
    label: 'JR',
  },
  'AI Academy': {
    color: '#0e7490',
    bg: '#ecfeff',
    border: '#a5f3fc',
    dot: '#0e7490',
    label: 'AI Academy',
  },
  'Robotics Academy': {
    color: '#1d4ed8',
    bg: '#eff6ff',
    border: '#bfdbfe',
    dot: '#1d4ed8',
    label: 'Robotics Academy',
  },
};

const defaultConfig = { color: '#006ADD', bg: '#eff6ff', border: '#bfdbfe', dot: '#006ADD', label: '' };

function getConfig(program) {
  return PROGRAM_CONFIG[program] || { ...defaultConfig, label: program };
}

function LessonList({ lessons }) {
  return (
    <ul className="mt-3 space-y-1 pl-1">
      {lessons.map((l, i) => (
        <li key={l.id ?? i} className="flex items-start gap-2.5 text-sm font-ninja text-ninja-navy/80">
          <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-ninja-border" />
          {l.lesson_name}
        </li>
      ))}
    </ul>
  );
}

function ModuleCard({ mod, accentColor }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="border border-ninja-border rounded-xl overflow-hidden bg-white"
      style={{ borderLeftColor: accentColor, borderLeftWidth: 3 }}
    >
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-ninja-bg/60 transition-colors group"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <motion.svg
            animate={{ rotate: open ? 90 : 0 }}
            transition={{ duration: 0.18 }}
            className="shrink-0 w-3.5 h-3.5 text-ninja-muted"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </motion.svg>
          <span className="font-ninja font-bold text-sm text-ninja-navy truncate">{mod.module_name}</span>
        </div>
        <span className="shrink-0 text-xs font-ninja text-ninja-muted ml-3">
          {mod.lessons.length} lesson{mod.lessons.length !== 1 ? 's' : ''}
        </span>
      </button>

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
              {mod.lessons.length > 0 && <LessonList lessons={mod.lessons} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SubProgramView({ modules, subPrograms, accentColor }) {
  const [activeTab, setActiveTab] = useState(subPrograms?.[0] ?? null);

  const visibleModules = activeTab
    ? modules.filter(m => m.sub_program === activeTab)
    : modules;

  return (
    <div>
      {subPrograms?.length > 0 && (
        <div className="flex gap-1.5 mb-4">
          {subPrograms.map(sub => (
            <button
              key={sub}
              onClick={() => setActiveTab(sub)}
              className={`font-ninja font-semibold text-sm px-3.5 py-1.5 rounded-lg transition-colors ${
                activeTab === sub
                  ? 'text-white'
                  : 'text-ninja-muted hover:text-ninja-navy bg-ninja-bg border border-ninja-border hover:border-ninja-blue/40'
              }`}
              style={activeTab === sub ? { background: accentColor } : {}}
            >
              {sub}
            </button>
          ))}
        </div>
      )}
      <div className="space-y-2">
        {visibleModules.map(mod => (
          <ModuleCard key={mod.id} mod={mod} accentColor={accentColor} />
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
                return (
                  <button
                    key={p.program}
                    onClick={() => setActiveProgram(p.program)}
                    className={`font-ninja font-bold text-sm px-4 py-2 rounded-xl border transition-all ${
                      isActive
                        ? 'text-white border-transparent shadow-sm'
                        : 'bg-white border-ninja-border text-ninja-navy hover:border-ninja-blue/40'
                    }`}
                    style={isActive ? { background: c.color, borderColor: c.color } : {}}
                  >
                    {p.program}
                  </button>
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
                    className="rounded-2xl px-5 py-4 mb-5 border"
                    style={{ background: cfg.bg, borderColor: cfg.border }}
                  >
                    <h2 className="font-ninja font-extrabold text-lg" style={{ color: cfg.color }}>
                      {current.program}
                    </h2>
                    <p className="text-sm font-ninja mt-0.5" style={{ color: cfg.color, opacity: 0.7 }}>
                      {current.modules.length} module{current.modules.length !== 1 ? 's' : ''}
                      {' · '}
                      {current.modules.reduce((n, m) => n + m.lessons.length, 0)} total lessons
                    </p>
                  </div>

                  <SubProgramView
                    modules={current.modules}
                    subPrograms={current.sub_programs.length > 0 ? current.sub_programs : null}
                    accentColor={cfg.color}
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
