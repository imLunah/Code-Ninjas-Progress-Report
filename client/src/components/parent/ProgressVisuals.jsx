import { BELTS } from '../../utils/beltConfig';
import { SUB_PROGRAMS, CURRICULUM } from '../../utils/progressData';

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
        {months.map((m) => (
          <div key={m.key} className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <div className="w-full flex items-end justify-center" style={{ height: `${BAR_H}px` }}>
              <div
                className="w-full rounded-t-lg"
                style={{
                  height: m.count === 0 ? '3px' : `${Math.max((m.count / max) * BAR_H, 8)}px`,
                  backgroundColor: m.count === 0 ? '#e2e8f0' : '#006ADD',
                }}
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
  const { belt_level, belt_sublevel } = enrollment;
  const currentIndex = belt_level ? BELTS.findIndex((b) => b.name === belt_level) : -1;
  const currentBelt = currentIndex >= 0 ? BELTS[currentIndex] : null;
  const maxLevel = currentBelt?.levels ?? null;
  const sublevel = belt_sublevel != null ? parseInt(belt_sublevel) : null;
  const progress = maxLevel && sublevel ? Math.round((sublevel / maxLevel) * 100) : null;

  return (
    <div className="bg-white border border-ninja-border rounded-2xl shadow-sm p-5">
      <h2 className="text-ninja-navy font-ninja font-bold text-lg mb-4">CREATE Belt Journey</h2>

      {belt_level ? (
        <>
          {/* Current belt — large standalone image, no overflow needed */}
          <div className="flex items-center gap-4 mb-5">
            <img
              src={BELT_IMAGES[belt_level]}
              alt={belt_level}
              draggable={false}
              style={{ width: '80px', height: '80px', flexShrink: 0 }}
            />
            <div>
              <p className="text-ninja-navy font-ninja font-bold text-2xl">{belt_level} Belt</p>
              {sublevel && maxLevel ? (
                <p className="text-ninja-muted font-ninja text-sm mt-0.5">
                  Level {sublevel} of {maxLevel}
                </p>
              ) : (
                <p className="text-ninja-muted font-ninja text-sm mt-0.5">No sublevel yet</p>
              )}
            </div>
          </div>

          {/* Sublevel progress bar */}
          {progress !== null && (
            <div className="mb-5">
              <div className="flex justify-between text-xs font-ninja text-ninja-muted mb-1.5">
                <span>Sublevel progress</span>
                <span className="font-bold text-ninja-navy">{progress}%</span>
              </div>
              <div className="h-3 bg-ninja-bg rounded-full overflow-hidden border border-ninja-border">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%`, backgroundColor: currentBelt?.color }}
                />
              </div>
            </div>
          )}

          {/* Belt path — small images with connecting line */}
          <p className="text-ninja-muted font-ninja text-xs font-semibold uppercase tracking-wide mb-2">
            Belt Path
          </p>
          <div className="overflow-x-auto" style={{ margin: '0 -4px', padding: '4px' }}>
            <div className="flex items-start" style={{ minWidth: 'max-content' }}>
              {BELTS.map((belt, i) => {
                const reached = i <= currentIndex;
                const isCurrent = i === currentIndex;
                return (
                  <div key={belt.name} className="flex items-start">
                    {i > 0 && (
                      <div
                        style={{
                          width: '14px',
                          height: '3px',
                          borderRadius: '2px',
                          backgroundColor: reached ? '#006ADD' : '#e2e8f0',
                          flexShrink: 0,
                          marginTop: '17px',
                        }}
                      />
                    )}
                    <div className="flex flex-col items-center" style={{ gap: '5px' }}>
                      <img
                        src={BELT_IMAGES[belt.name]}
                        alt={belt.name}
                        draggable={false}
                        style={{
                          width: '36px',
                          height: '36px',
                          opacity: reached ? 1 : 0.2,
                          filter: reached ? 'none' : 'grayscale(100%)',
                        }}
                      />
                      <span
                        style={{
                          fontSize: '10px',
                          fontFamily: 'Nunito, sans-serif',
                          fontWeight: isCurrent ? 700 : 400,
                          color: isCurrent ? '#006ADD' : reached ? '#506690' : '#cbd5e1',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {belt.name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <p className="text-ninja-muted font-ninja text-sm italic text-center py-4">
          Belt journey starting soon!
        </p>
      )}
    </div>
  );
}

// ─── Module explorer ─────────────────────────────────────────────────────────

function ModuleGrid({ modules, visited }) {
  if (!modules.length) return null;
  const visitedCount = modules.filter((m) => visited.has(m.module)).length;

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-1">
        {modules.map((m) => {
          const done = visited.has(m.module);
          return (
            <div
              key={m.module}
              title={m.module}
              className={`px-2.5 py-1 rounded-lg text-xs font-ninja font-bold border ${
                done
                  ? 'bg-ninja-blue text-white border-ninja-blue'
                  : 'bg-ninja-bg text-ninja-muted border-ninja-border'
              }`}
            >
              {abbrevModule(m.module)}
            </div>
          );
        })}
      </div>
      <p className="text-ninja-muted font-ninja text-xs mt-1">
        {visitedCount} of {modules.length} modules explored
      </p>
    </div>
  );
}

function ModuleProgress({ program, logs }) {
  const subProgramList = SUB_PROGRAMS[program];
  const totalSessions = logs.length;

  if (!subProgramList) {
    const modules = CURRICULUM[program] || [];
    const visited = new Set(logs.map((l) => l.module_name).filter(Boolean));
    return (
      <div className="bg-white border border-ninja-border rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-ninja-navy font-ninja font-bold text-lg">{program}</h2>
          <span className="text-ninja-muted font-ninja text-sm">{totalSessions} sessions</span>
        </div>
        <ModuleGrid modules={modules} visited={visited} />
      </div>
    );
  }

  return (
    <div className="bg-white border border-ninja-border rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-ninja-navy font-ninja font-bold text-lg">{program}</h2>
        <span className="text-ninja-muted font-ninja text-sm">{totalSessions} sessions</span>
      </div>
      <div className="space-y-4">
        {subProgramList.map((sp) => {
          const spLogs = logs.filter((l) => l.sub_program === sp);
          const modules = CURRICULUM[sp] || [];
          const visited = new Set(spLogs.map((l) => l.module_name).filter(Boolean));
          return (
            <div key={sp}>
              <p className="text-ninja-muted font-ninja text-xs font-semibold uppercase tracking-wide mb-2">
                {sp}
                {spLogs.length > 0 && (
                  <span className="ml-2 text-ninja-blue font-bold">{spLogs.length} sessions</span>
                )}
              </p>
              <ModuleGrid modules={modules} visited={visited} />
            </div>
          );
        })}
      </div>
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
          logs={sessionLogs.filter((l) => l.program === p.program)}
        />
      ))}
    </div>
  );
}
