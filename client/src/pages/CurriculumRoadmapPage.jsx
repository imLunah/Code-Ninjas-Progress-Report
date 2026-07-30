import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { api } from '../api/client';
import { PROGRAM_LOGOS, BELTS } from '../utils/beltConfig';
import BeltIcon from '../components/ui/BeltIcon';
import { SkeletonList } from '../components/ui/Skeleton';
import CurriculumResources from '../components/shared/CurriculumResources';

// Program colour is used as a 2px rule under the active tab and nowhere else.
// It marks which program you are in without filling a control with brand colour,
// which is what made every control on this page read as a tinted chip.
const PROGRAM_COLOR = {
  'CREATE': '#60a5fa',
  'JR': '#a78bfa',
  'AI Academy': '#22d3ee',
  'Robotics Academy': '#38a1ff',
  'VR Coding': '#2dd4bf',
};
const DEFAULT_COLOR = '#38a1ff';
const colorFor = (program) => PROGRAM_COLOR[program] || DEFAULT_COLOR;

const BELT_NAMES = new Set(BELTS.map((b) => b.name));

const SECTIONS = [
  { key: 'modules', label: 'Modules' },
  { key: 'resources', label: 'Resources' },
];

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

// One tab treatment for the whole page: text carries the state, a rule under the
// active one carries the position. No filled backgrounds, no chips.
//
// The rule is the tab's own bottom border rather than a bar positioned against
// the container, so a row that wraps to a second line still underlines the right
// tab instead of leaving the marker floating on the row below.
function Tab({ active, color = 'rgb(var(--ninja-navy))', onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-2 px-1 pb-2 border-b-2 font-ninja text-sm transition-colors ${
        active
          ? 'font-bold text-ninja-navy'
          : 'font-semibold text-ninja-muted hover:text-ninja-navy border-transparent'
      }`}
      style={active ? { borderBottomColor: color } : undefined}
    >
      {children}
    </button>
  );
}

function LessonList({ lessons, isCreate }) {
  return (
    <ol className="mt-1 mb-1">
      {lessons.map((l, i) => {
        const prefix = isCreate ? getProjectPrefix(l.lesson_name, i, lessons.length) : null;
        return (
          <li
            key={l.id ?? i}
            className="flex items-baseline gap-3 py-1.5 font-ninja text-sm text-ninja-navy"
          >
            {/* The lesson's own number, not a decorative bullet. */}
            <span className="shrink-0 w-6 text-right tabular-nums text-xs text-ninja-muted">{i + 1}</span>
            {prefix && (
              <span className="shrink-0 min-w-[56px] font-semibold text-xs text-ninja-muted">{prefix}</span>
            )}
            <span className="text-pretty">{l.lesson_name}</span>
          </li>
        );
      })}
    </ol>
  );
}

// A module is a row in a list, not a card. Cards on every module turned a
// reference index into twenty stacked boxes.
function ModuleRow({ mod, isCreate }) {
  const [open, setOpen] = useState(false);
  const count = mod.lessons.length;

  return (
    <div className="border-b border-ninja-border last:border-b-0">
      <button
        className="w-full flex items-center gap-3 py-3.5 text-left group"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <motion.span
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="shrink-0 text-ninja-muted group-hover:text-ninja-navy transition-colors"
        >
          <ChevronDownIcon className="w-4 h-4" />
        </motion.span>
        <span className="flex-1 min-w-0 font-ninja font-bold text-sm text-ninja-navy text-pretty">
          {mod.module_name}
        </span>
        <span className="shrink-0 font-ninja text-xs text-ninja-muted tabular-nums">
          {count} {isCreate ? 'project' : 'lesson'}{count === 1 ? '' : 's'}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-3 pl-7">
              {mod.description && (
                <p className="font-ninja text-sm text-ninja-muted leading-relaxed mb-1 max-w-[65ch] text-pretty">
                  {mod.description}
                </p>
              )}
              {count > 0 && <LessonList lessons={mod.lessons} isCreate={isCreate} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ModuleList({ modules, subPrograms, program, color }) {
  const [activeSub, setActiveSub] = useState(subPrograms?.[0] ?? null);
  const isCreate = program === 'CREATE';

  const visible = activeSub ? modules.filter((m) => m.sub_program === activeSub) : modules;

  return (
    <div>
      {subPrograms?.length > 0 && (
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-ninja-border mb-1">
          {subPrograms.map((sub) => (
            <Tab
              key={sub}
              active={activeSub === sub}
              color={color}
              onClick={() => setActiveSub(sub)}
            >
              {/* CREATE's sub-programs are belts, so the belt's own icon does the
                  identifying instead of a colour swatch. */}
              {isCreate && BELT_NAMES.has(sub) && <BeltIcon belt={sub} size={18} />}
              {sub}
            </Tab>
          ))}
        </div>
      )}

      {visible.length > 0 ? (
        <div>
          {visible.map((mod) => (
            <ModuleRow key={mod.id} mod={mod} isCreate={isCreate} />
          ))}
        </div>
      ) : (
        <p className="font-ninja text-sm text-ninja-muted py-10 text-center">No modules yet.</p>
      )}
    </div>
  );
}

export default function CurriculumRoadmapPage() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeProgram, setActiveProgram] = useState(null);
  const [section, setSection] = useState('modules');

  useEffect(() => {
    api.get('/curriculum/roadmap')
      .then((data) => {
        setPrograms(data);
        if (data.length > 0) setActiveProgram(data[0].program);
      })
      .catch(() => setError('Failed to load curriculum'))
      .finally(() => setLoading(false));
  }, []);

  const current = programs.find((p) => p.program === activeProgram);
  const color = colorFor(activeProgram);

  const moduleCount = current?.modules.length ?? 0;
  const lessonCount = current?.modules.reduce((n, m) => n + m.lessons.length, 0) ?? 0;
  const unit = current?.program === 'CREATE' ? 'project' : 'lesson';

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <h1 className="font-ninja font-extrabold text-2xl text-ninja-navy">Curriculum</h1>
        <p className="font-ninja text-sm text-ninja-muted mt-1">
          Every program, module and lesson, plus the reference material for each.
        </p>

        {loading && <div className="mt-8"><SkeletonList rows={6} label="Loading curriculum" /></div>}
        {error && <p className="font-ninja text-sm text-ninja-red py-12 text-center">{error}</p>}

        {!loading && !error && programs.length > 0 && (
          <>
            {/* Program tabs. Logo identifies the program, the rule marks the one
                you are in. Scrolls sideways on a phone rather than wrapping into
                a block of buttons. */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 border-b border-ninja-border mt-7">
              {programs.map((p) => (
                <Tab
                  key={p.program}
                  active={p.program === activeProgram}
                  color={colorFor(p.program)}
                  onClick={() => { setActiveProgram(p.program); setSection('modules'); }}
                >
                  {PROGRAM_LOGOS[p.program] && (
                    <img
                      src={PROGRAM_LOGOS[p.program]}
                      alt=""
                      className={`w-5 h-5 object-contain transition-opacity ${
                        p.program === activeProgram ? '' : 'opacity-50'
                      }`}
                    />
                  )}
                  {p.program}
                </Tab>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {current && (
                <motion.div
                  key={current.program}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* What used to be a tinted strip is now a line of text. The
                      program name is already in the active tab above it. */}
                  <div className="flex items-baseline justify-between gap-4 flex-wrap pt-5 pb-4">
                    <p className="font-ninja text-sm text-ninja-muted tabular-nums">
                      {moduleCount} module{moduleCount === 1 ? '' : 's'}
                      <span className="px-2 text-ninja-border">/</span>
                      {lessonCount} {unit}{lessonCount === 1 ? '' : 's'}
                    </p>

                    <div className="flex gap-5">
                      {SECTIONS.map((s) => (
                        <Tab
                          key={s.key}
                          active={section === s.key}
                          color={color}
                          onClick={() => setSection(s.key)}
                        >
                          {s.label}
                        </Tab>
                      ))}
                    </div>
                  </div>

                  {section === 'modules' ? (
                    <ModuleList
                      modules={current.modules}
                      subPrograms={current.sub_programs.length > 0 ? current.sub_programs : null}
                      program={current.program}
                      color={color}
                    />
                  ) : (
                    <CurriculumResources program={current.program} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </Layout>
  );
}
