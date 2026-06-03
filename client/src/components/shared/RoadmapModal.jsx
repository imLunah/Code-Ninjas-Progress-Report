import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../api/client';

const PROGRAM_SUB_PROGRAMS = { JR: ['JR Coding', 'Snap Circuits'] };

export default function RoadmapModal({ open, onClose, student, enrollment, onUpdate }) {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [expandedModules, setExpandedModules] = useState(new Set());
  const [pending, setPending] = useState(new Set());
  // tabSubProgram: only set when user manually picks a JR tab; null means "use enrollment default"
  const [tabSubProgram, setTabSubProgram] = useState(null);

  // Reset tab when modal closes so next open starts fresh
  useEffect(() => {
    if (!open) setTabSubProgram(null);
  }, [open]);

  const subProgramOptions = PROGRAM_SUB_PROGRAMS[enrollment?.program] ?? null;
  // Synchronously computed — no timing race
  const effectiveSubProgram = subProgramOptions
    ? (tabSubProgram ?? enrollment?.last_sub_program ?? subProgramOptions[0])
    : (enrollment?.last_sub_program ?? null);

  useEffect(() => {
    if (!open || !enrollment) return;
    setLoading(true);
    setError(null);
    setPending(new Set());
    const params = new URLSearchParams({ program: enrollment.program });
    if (effectiveSubProgram) params.set('sub_program', effectiveSubProgram);
    api.get(`/students/${student.id}/roadmap?${params}`)
      .then(data => {
        setModules(data);
        const isActiveSub = effectiveSubProgram === enrollment.last_sub_program;
        if (isActiveSub && enrollment.last_module_name) {
          setExpandedModules(new Set([enrollment.last_module_name]));
        } else {
          setExpandedModules(new Set());
        }
      })
      .catch(() => setError('Failed to load roadmap'))
      .finally(() => setLoading(false));
  }, [open, enrollment?.program, effectiveSubProgram]);

  const toggleExpand = (moduleName) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleName)) next.delete(moduleName);
      else next.add(moduleName);
      return next;
    });
  };

  const toggleLesson = (moduleName, lessonName, alreadyCompleted) => {
    if (alreadyCompleted) return;
    const key = `${moduleName}\x00${lessonName}`;
    setPending(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    if (!pending.size) return;
    setSaving(true);
    setError(null);
    try {
      const entries = [...pending].map(key => {
        const idx = key.indexOf('\x00');
        return { module_name: key.slice(0, idx), lesson_name: key.slice(idx + 1) };
      });
      await api.post(`/students/${student.id}/roadmap/complete`, {
        program: enrollment.program,
        sub_program: effectiveSubProgram || undefined,
        entries,
      });
      onUpdate?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const completedCount = modules.reduce((acc, m) => acc + m.lessons.filter(l => l.completed).length, 0);
  const pendingCount = pending.size;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh]"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 32 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-ninja-border flex items-start justify-between flex-shrink-0">
          <div>
            <h2 className="font-ninja font-extrabold text-xl text-ninja-navy">Curriculum Roadmap</h2>
            <p className="text-ninja-muted font-ninja text-sm mt-0.5">
              {enrollment?.program}{effectiveSubProgram ? ` · ${effectiveSubProgram}` : ''}
            </p>
            {totalLessons > 0 && (
              <p className="text-ninja-muted font-ninja text-xs mt-1">
                {completedCount + pendingCount} of {totalLessons} completed
                {pendingCount > 0 && (
                  <span className="text-emerald-600 font-semibold"> (+{pendingCount} unsaved)</span>
                )}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-ninja-muted hover:text-ninja-navy transition-colors p-1 -mr-1 mt-0.5"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Sub-program tabs (JR only) */}
        {PROGRAM_SUB_PROGRAMS[enrollment?.program] && (
          <div className="flex gap-1 px-6 pt-3 pb-2 border-b border-ninja-border flex-shrink-0">
            {PROGRAM_SUB_PROGRAMS[enrollment.program].map(sub => (
              <button
                key={sub}
                onClick={() => { if (sub !== effectiveSubProgram) { setPending(new Set()); setTabSubProgram(sub); } }}
                className={`font-ninja font-semibold text-sm px-3.5 py-1.5 rounded-lg transition-colors ${
                  effectiveSubProgram === sub
                    ? 'bg-ninja-blue text-white'
                    : 'text-ninja-muted hover:text-ninja-navy hover:bg-gray-100'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {loading && (
            <div className="flex items-center justify-center py-16 text-ninja-muted font-ninja text-sm">
              Loading roadmap...
            </div>
          )}
          {error && !loading && (
            <div className="px-6 py-4 text-red-600 font-ninja text-sm">{error}</div>
          )}
          {!loading && !error && modules.map(mod => {
            const expanded = expandedModules.has(mod.module_name);
            const completedInModule = mod.lessons.filter(l => l.completed).length;
            const pendingInModule = mod.lessons.filter(l => pending.has(`${mod.module_name}\x00${l.lesson_name}`)).length;
            const isCurrent = effectiveSubProgram === enrollment?.last_sub_program && mod.module_name === enrollment?.last_module_name;
            const allDone = mod.lessons.length > 0 && (completedInModule === mod.lessons.length);

            return (
              <div key={mod.id} className={`border-b border-ninja-border last:border-0 ${isCurrent ? 'bg-blue-50/30' : ''}`}>
                <button
                  className="w-full flex items-center justify-between px-6 py-3.5 text-left hover:bg-gray-50/80 transition-colors"
                  onClick={() => toggleExpand(mod.module_name)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {allDone ? (
                      <span className="shrink-0 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    ) : (
                      <span className="shrink-0 w-4 h-4 rounded-full border-2 border-gray-300" />
                    )}
                    <span className="font-ninja font-bold text-ninja-navy text-sm truncate">{mod.module_name}</span>
                    {isCurrent && (
                      <span className="shrink-0 text-xs font-ninja font-semibold text-ninja-blue border border-ninja-blue/30 bg-ninja-blue/10 px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-xs font-ninja text-ninja-muted">
                      {completedInModule + pendingInModule}/{mod.lessons.length}
                    </span>
                    <svg
                      className={`w-4 h-4 text-ninja-muted transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      key="lessons"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-3 pt-1 space-y-0.5">
                        {mod.lessons.map(lesson => {
                          const key = `${mod.module_name}\x00${lesson.lesson_name}`;
                          const isPending = pending.has(key);
                          const isCompleted = lesson.completed;
                          const checked = isCompleted || isPending;

                          return (
                            <button
                              key={lesson.id}
                              className={`w-full flex items-start gap-3 py-2 px-3 rounded-lg text-left transition-colors ${
                                isCompleted
                                  ? 'cursor-default opacity-60'
                                  : isPending
                                  ? 'bg-emerald-50 hover:bg-emerald-100/80'
                                  : 'hover:bg-gray-50'
                              }`}
                              onClick={() => toggleLesson(mod.module_name, lesson.lesson_name, isCompleted)}
                            >
                              <span
                                className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-colors ${
                                  checked
                                    ? 'bg-emerald-500 border-emerald-500'
                                    : 'border-gray-300'
                                }`}
                              >
                                {checked && (
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </span>
                              <span className={`font-ninja text-sm leading-snug ${isCompleted ? 'text-ninja-muted line-through' : 'text-ninja-navy'}`}>
                                {lesson.lesson_name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t border-ninja-border bg-white flex-shrink-0 flex items-center justify-between ${pendingCount === 0 ? 'justify-end' : ''}`}>
          {pendingCount > 0 ? (
            <>
              <p className="font-ninja text-sm text-ninja-muted">
                {pendingCount} lesson{pendingCount !== 1 ? 's' : ''} to mark complete
              </p>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-ninja-blue text-white font-ninja font-bold text-sm px-5 py-2 rounded-xl hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="font-ninja text-sm text-ninja-muted hover:text-ninja-navy transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
