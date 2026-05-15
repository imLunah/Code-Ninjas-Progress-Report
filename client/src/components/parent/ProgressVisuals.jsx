import React from 'react';
import { BELTS } from '../../utils/beltConfig';
import { SUB_PROGRAMS, CURRICULUM } from '../../utils/progressData';
import { formatDate } from '../../utils/dateUtils';

const PROGRAM_BAR_COLORS = {
  'Robotics Academy': '#7c3aed',
  'AI Academy': '#4338ca',
  'JR': '#16a34a',
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
    <div className="rounded-2xl shadow-lg overflow-hidden" style={{ background: 'linear-gradient(135deg, #006ADD 0%, #004fa8 100%)' }}>
      <div className="p-5 relative">
        {/* belt image — dead space top-right; scales up on wider screens */}
        <div className="absolute pointer-events-none" style={{ right: -8, top: -8, opacity: 0.42 }}>
          <img src={BELT_IMAGES[belt_level]} alt="" draggable={false} className="w-[110px] h-[110px] sm:w-40 sm:h-40 md:w-52 md:h-52" />
        </div>

        {/* Label */}
        <p className="font-ninja text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.75)' }}>
          Current Belt
        </p>

        {/* Belt name + sublevel */}
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

        {/* Belt path */}
        {/* Belt path — images and labels in separate rows so lines stay centered */}
        <div className="overflow-x-auto" style={{ margin: '0 -4px', padding: '4px' }}>
          {/* Row 1: images + connecting lines, all vertically centered */}
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
                  <img
                    src={BELT_IMAGES[belt.name]}
                    alt={belt.name}
                    draggable={false}
                    style={{
                      width: imgSize, height: imgSize, display: 'block',
                      opacity: reached ? 1 : 0.45,
                      filter: isCurrent
                        ? 'drop-shadow(0 0 6px rgba(255,255,255,0.55))'
                        : reached ? 'none' : 'grayscale(100%)',
                      transition: 'all 0.2s',
                    }}
                  />
                </React.Fragment>
              );
            })}
          </div>
          {/* Row 2: labels, widths match image widths so they stay aligned */}
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

      {/* Sublevel progress bar */}
      {progress !== null && (
        <div className="px-5 pb-5">
          <div className="flex justify-between font-ninja mb-1.5" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
            <span>Sublevel progress</span>
            <span className="font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>{progress}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${progress}%`, backgroundColor: 'rgba(255,255,255,0.8)' }}
            />
          </div>
          {maxLevel && sublevel && (
            <p className="font-ninja mt-1" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)' }}>
              Level {sublevel} of {maxLevel}
            </p>
          )}
        </div>
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

function ModuleProgress({ program, enrollment, logs }) {
  const subProgramList = SUB_PROGRAMS[program];
  const totalSessions = logs.length;
  const lastDate = enrollment?.last_session_date;

  // ── AI Academy: lesson-level progress within current module ──────────────────
  if (program === 'AI Academy') {
    const currentModule = enrollment?.last_module_name;
    const aiCurriculum = CURRICULUM['AI Academy'] || [];
    const moduleEntry = aiCurriculum.find((m) => m.module === currentModule);
    const totalLessons = moduleEntry?.lessons.length ?? 0;
    const visitedLessons = currentModule
      ? new Set(
          logs
            .filter((l) => l.module_name === currentModule)
            .map((l) => l.lesson_name)
            .filter(Boolean)
        ).size
      : 0;
    const pct = totalLessons > 0 ? Math.round((visitedLessons / totalLessons) * 100) : 0;
    const visitedModules = new Set(logs.map((l) => l.module_name).filter(Boolean));

    return (
      <div className="bg-white border border-ninja-border rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-ninja-navy font-ninja font-bold text-lg">AI Academy</h2>
          {lastDate && (
            <span className="text-ninja-muted font-ninja text-xs">Last: {formatDate(lastDate)}</span>
          )}
        </div>

        {currentModule ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 min-w-0">
                <p className="text-ninja-navy font-ninja font-bold text-xl">{currentModule}</p>
                <p className="text-ninja-muted font-ninja text-sm mt-0.5">
                  Lesson {visitedLessons} of {totalLessons}
                </p>
              </div>
            </div>
            <div className="mb-5">
              <div className="flex justify-between text-xs font-ninja text-ninja-muted mb-1.5">
                <span>Module progress</span>
                <span className="font-bold text-ninja-navy">{pct}%</span>
              </div>
              <div className="h-3 bg-ninja-bg rounded-full overflow-hidden border border-ninja-border">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: '#4338ca' }}
                />
              </div>
            </div>
          </>
        ) : (
          <p className="text-ninja-muted font-ninja text-sm italic mb-4">No modules started yet.</p>
        )}

        <p className="text-ninja-muted font-ninja text-xs font-semibold uppercase tracking-wide mb-2">
          Module Path
        </p>
        <ModuleGrid modules={aiCurriculum} visited={visitedModules} />
      </div>
    );
  }

  // ── JR: sequential project progress per kit ─────────────────────────────────
  if (program === 'JR') {
    const JR_CODING_MODULES = ['Module 1','Module 2','Module 3','Module 4','Module 5','Module 6','Module 7','Module 8','Module 9','Module 10'];
    const SNAP_CIRCUITS_TOTAL = 24;

    // JR Coding: highest module index reached (sequential — all prior counted as done)
    const jrCodingLogs = logs.filter((l) => l.sub_program === 'JR Coding');
    const jrCodingHighestIdx = Math.max(-1, ...jrCodingLogs
      .map((l) => JR_CODING_MODULES.indexOf(l.module_name))
      .filter((i) => i >= 0));
    const jrCodingDone = jrCodingHighestIdx + 1;
    const jrCodingPct = jrCodingDone > 0 ? Math.round((jrCodingDone / JR_CODING_MODULES.length) * 100) : 0;

    // Snap Circuits: highest project number reached
    const snapLogs = logs.filter((l) => l.sub_program === 'Snap Circuits');
    const snapNums = snapLogs.map((l) => { const m = l.lesson_name?.match(/Project\s+(\d+)/i); return m ? parseInt(m[1], 10) : 0; });
    const snapHighest = snapNums.length > 0 ? Math.max(0, ...snapNums) : 0;
    const snapPct = snapHighest > 0 ? Math.min(100, Math.round((snapHighest / SNAP_CIRCUITS_TOTAL) * 100)) : 0;

    const hasJrCoding = jrCodingLogs.length > 0;
    const hasSnap = snapLogs.length > 0;

    return (
      <div className="bg-white border border-ninja-border rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-ninja-navy font-ninja font-bold text-lg">JR</h2>
          <span className="text-ninja-muted font-ninja text-sm">{totalSessions} sessions</span>
        </div>
        {lastDate && (
          <p className="text-ninja-muted font-ninja text-xs mb-4">Last: {formatDate(lastDate)}</p>
        )}

        <div className="space-y-5">
          {/* JR Coding sequential progress */}
          {hasJrCoding && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-ninja-muted font-ninja text-xs font-semibold uppercase tracking-wide">JR Coding</p>
                <span className="text-ninja-navy font-ninja text-xs font-bold">
                  {jrCodingDone > 0 ? `Module ${jrCodingDone} of ${JR_CODING_MODULES.length}` : 'Not started'}
                </span>
              </div>
              <div className="flex justify-between text-xs font-ninja text-ninja-muted mb-1.5">
                <span>Progress</span>
                <span className="font-bold text-ninja-navy">{jrCodingPct}%</span>
              </div>
              <div className="h-3 bg-ninja-bg rounded-full overflow-hidden border border-ninja-border mb-3">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${jrCodingPct}%`, backgroundColor: '#16a34a' }}
                />
              </div>
              {/* Module dots — all up to highest shown as done */}
              <div className="flex flex-wrap gap-1.5">
                {JR_CODING_MODULES.map((mod, i) => {
                  const done = i < jrCodingDone;
                  const isCurrent = i === jrCodingHighestIdx;
                  return (
                    <div
                      key={mod}
                      title={mod}
                      className={`px-2 py-0.5 rounded-lg text-xs font-ninja font-bold border transition-colors ${
                        done
                          ? isCurrent
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-ninja-bg text-ninja-muted border-ninja-border'
                      }`}
                    >
                      M{i + 1}
                    </div>
                  );
                })}
              </div>
              <p className="text-ninja-muted font-ninja text-xs mt-1.5">
                {jrCodingDone} of {JR_CODING_MODULES.length} modules complete
                {jrCodingDone > 0 && jrCodingHighestIdx > 0 ? ' (includes all prior modules)' : ''}
              </p>
            </div>
          )}

          {/* Snap Circuits sequential progress */}
          {hasSnap && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-ninja-muted font-ninja text-xs font-semibold uppercase tracking-wide">Snap Circuits</p>
                <span className="text-ninja-navy font-ninja text-xs font-bold">
                  {snapHighest > 0 ? `Project ${snapHighest} of ${SNAP_CIRCUITS_TOTAL}` : 'Not started'}
                </span>
              </div>
              <div className="flex justify-between text-xs font-ninja text-ninja-muted mb-1.5">
                <span>Progress</span>
                <span className="font-bold text-ninja-navy">{snapPct}%</span>
              </div>
              <div className="h-3 bg-ninja-bg rounded-full overflow-hidden border border-ninja-border mb-1">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${snapPct}%`, backgroundColor: '#16a34a' }}
                />
              </div>
              <p className="text-ninja-muted font-ninja text-xs mt-1">
                {snapHighest} of {SNAP_CIRCUITS_TOTAL} projects complete
              </p>
            </div>
          )}

          {!hasJrCoding && !hasSnap && (
            <p className="text-ninja-muted font-ninja text-sm italic">No sessions logged yet.</p>
          )}
        </div>
      </div>
    );
  }

  // ── Robotics Academy: module-level progress within current kit ──────────────
  if (program === 'Robotics Academy') {
    const KIT_ORDER = ['LEGO Spike Essentials', 'LEGO Spike Prime', 'VEX GO'];
    const KIT_SHORT  = { 'LEGO Spike Essentials': 'Essentials', 'LEGO Spike Prime': 'Prime', 'VEX GO': 'VEX GO' };
    const KIT_TOTALS = { 'LEGO Spike Essentials': 8, 'LEGO Spike Prime': 4, 'VEX GO': 4 };

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
      <div className="bg-white border border-ninja-border rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-ninja-navy font-ninja font-bold text-lg">Robotics Academy</h2>
          {lastDate && (
            <span className="text-ninja-muted font-ninja text-xs">Last: {formatDate(lastDate)}</span>
          )}
        </div>

        {currentKit ? (
          <>
            <div className="mb-4">
              <p className="text-ninja-navy font-ninja font-bold text-xl">{currentKit}</p>
              <p className="text-ninja-muted font-ninja text-sm mt-0.5">
                Module {visitedModules} of {totalModules}
              </p>
            </div>
            <div className="mb-5">
              <div className="flex justify-between text-xs font-ninja text-ninja-muted mb-1.5">
                <span>Kit progress</span>
                <span className="font-bold text-ninja-navy">{pct}%</span>
              </div>
              <div className="h-3 bg-ninja-bg rounded-full overflow-hidden border border-ninja-border">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: '#7c3aed' }}
                />
              </div>
            </div>
          </>
        ) : (
          <p className="text-ninja-muted font-ninja text-sm italic mb-4">No kit started yet.</p>
        )}

        <p className="text-ninja-muted font-ninja text-xs font-semibold uppercase tracking-wide mb-2">
          Kit Path
        </p>
        <div className="overflow-x-auto mb-5" style={{ margin: '0 -4px 20px', padding: '4px' }}>
          <div className="flex items-start" style={{ minWidth: 'max-content' }}>
            {KIT_ORDER.map((kit, i) => {
              const reached = i <= currentKitIndex;
              const isCurrent = i === currentKitIndex;
              return (
                <div key={kit} className="flex items-start">
                  {i > 0 && (
                    <div style={{
                      width: '24px', height: '3px', borderRadius: '2px',
                      backgroundColor: reached ? '#7c3aed' : '#e2e8f0',
                      flexShrink: 0, marginTop: '13px',
                    }} />
                  )}
                  <div className="flex flex-col items-center" style={{ gap: '5px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                      backgroundColor: isCurrent ? '#7c3aed' : reached ? '#c4b5fd' : '#e2e8f0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ color: reached ? 'white' : '#cbd5e1', fontSize: '11px', fontWeight: 700 }}>
                        {i + 1}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '10px', fontFamily: 'Nunito, sans-serif',
                      fontWeight: isCurrent ? 700 : 400,
                      color: isCurrent ? '#7c3aed' : reached ? '#506690' : '#cbd5e1',
                      whiteSpace: 'nowrap',
                    }}>
                      {KIT_SHORT[kit]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {currentKit && (
          <>
            <p className="text-ninja-muted font-ninja text-xs font-semibold uppercase tracking-wide mb-2">
              Module Path
            </p>
            <ModuleGrid modules={currentKitModules} visited={visitedModuleNames} />
          </>
        )}
      </div>
    );
  }

  // ── Fallback (any future programs) ───────────────────────────────────────────
  const pct = enrollment?.percent_complete ?? 0;
  const barColor = PROGRAM_BAR_COLORS[program] || '#006ADD';
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
      <div className="mb-4">
        <div className="flex justify-between text-xs font-ninja text-ninja-muted mb-1.5">
          <span>Progress</span>
          <span className="font-bold text-ninja-navy">{pct}%</span>
        </div>
        <div className="h-3 bg-ninja-bg rounded-full overflow-hidden border border-ninja-border">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: barColor }} />
        </div>
      </div>
      <ModuleGrid modules={modules} visited={visited} />
    </div>
  );
}

// ─── Custom program progress card ────────────────────────────────────────────

function CustomProgramProgress({ enrollment, logs }) {
  const name = enrollment.program;
  const pct = enrollment.percent_complete ?? 0;
  const totalSessions = logs.length;
  const lastDate = enrollment.last_session_date;
  const lastModule = enrollment.last_module_name;

  return (
    <div className="bg-white border border-ninja-border rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-ninja-navy font-ninja font-bold text-lg">{name}</h2>
        <span className="text-ninja-muted font-ninja text-sm">{totalSessions} session{totalSessions !== 1 ? 's' : ''}</span>
      </div>
      {lastDate && (
        <p className="text-ninja-muted font-ninja text-xs mb-3">Last: {formatDate(lastDate)}</p>
      )}
      {lastModule && (
        <p className="text-ninja-muted font-ninja text-sm mb-3">
          Working on: <span className="text-ninja-navy font-semibold">{lastModule}</span>
        </p>
      )}
      <div>
        <div className="flex justify-between text-xs font-ninja text-ninja-muted mb-1.5">
          <span>Curriculum progress</span>
          <span className="font-bold text-ninja-navy">{pct}%</span>
        </div>
        <div className="h-3 bg-ninja-bg rounded-full overflow-hidden border border-ninja-border">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: '#ea580c' }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export default function ProgressVisuals({ programs, sessionLogs }) {
  const create = programs.find((p) => p.program === 'CREATE');
  const others = programs.filter((p) => p.program !== 'CREATE' && !p.is_custom);
  const customs = programs.filter((p) => p.is_custom);

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
      {customs.map((p) => (
        <CustomProgramProgress
          key={p.program}
          enrollment={p}
          logs={sessionLogs.filter((l) => l.program === p.program)}
        />
      ))}
    </div>
  );
}
