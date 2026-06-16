import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { today } from '../../utils/dateUtils';
import ProgramBadge from '../ui/ProgramBadge';
import { isBirthdayToday } from '../shared/BirthdayConfetti';

export default function TodayBoard({ assignments, onRemove, statusFilter = 'unlogged' }) {
  const { isReadOnly } = useAuth();
  const navigate = useNavigate();
  const [confirmId, setConfirmId] = useState(null);
  const todayStr = today();

  const handleRemove = async (id) => {
    try {
      await api.delete(`/daily/${id}`);
    } catch (err) {
      if (!err.message?.toLowerCase().includes('not found')) {
        console.error('Failed to remove:', err);
        setConfirmId(null);
        return;
      }
    }
    onRemove && onRemove(id);
    setConfirmId(null);
  };

  if (assignments.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-16 text-ninja-muted font-ninja"
      >
        <img src="/CodeNinjasLaptop.png" alt="Code Ninjas" className="h-28 mx-auto mb-4 opacity-80" />
        <p className="text-lg font-semibold text-ninja-navy">No ninjas added for today yet.</p>
        <p className="text-sm mt-1">Use the "+ Check In Ninja" button to get started.</p>
      </motion.div>
    );
  }

  const completedCount = assignments.filter((a) => a.completed).length;

  // Pick the base set per status filter, then group by student_id (one card each).
  const isPast = (a) => a.session_date && String(a.session_date).split('T')[0] < todayStr;
  const base =
    statusFilter === 'logged'  ? assignments.filter((a) => a.completed)
    : statusFilter === 'all'     ? assignments
    : statusFilter === 'overdue' ? assignments.filter((a) => !a.completed && isPast(a))
    : statusFilter === 'pending' ? assignments.filter((a) => !a.completed && !isPast(a))
    : assignments.filter((a) => !a.completed); // 'unlogged' (default)

  const groupedMap = base.reduce((acc, a) => {
    if (!acc[a.student_id]) acc[a.student_id] = { ...a, assignments: [] };
    acc[a.student_id].assignments.push(a);
    return acc;
  }, {});

  const groups = Object.values(groupedMap).sort((a, b) => {
    const aOver = a.assignments.some((x) => !x.completed && x.session_date && String(x.session_date).split('T')[0] < todayStr);
    const bOver = b.assignments.some((x) => !x.completed && x.session_date && String(x.session_date).split('T')[0] < todayStr);
    if (aOver === bOver) return 0;
    return aOver ? -1 : 1;
  });

  if (groups.length === 0) {
    const celebratory = statusFilter === 'unlogged' || statusFilter === 'pending';
    const msg = celebratory
      ? 'All ninjas logged!'
      : statusFilter === 'logged' ? 'Nothing logged yet.'
      : statusFilter === 'overdue' ? 'Nothing overdue 🎉'
      : 'No classes to show.';
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-16 font-ninja"
      >
        <img src="/CodeNinjasCelebrate.webp" alt="" className="h-28 mx-auto mb-4" />
        <p className="text-xl font-bold text-ninja-navy">{msg}</p>
        {celebratory && <p className="text-sm mt-1 text-ninja-muted">Great session today.</p>}
      </motion.div>
    );
  }

  const buildLogUrl = (group) => {
    const programInfo = {};
    group.assignments.forEach((a) => {
      const d = a.session_date ? String(a.session_date).split('T')[0] : null;
      if (!programInfo[a.program]) programInfo[a.program] = { date: d, count: 0 };
      programInfo[a.program].count++;
    });
    const uniquePrograms = [...new Set(group.assignments.map((a) => a.program))];
    const datesStr = Object.entries(programInfo).map(([p, { date }]) => `${p}:${date}`).join(',');
    const countsStr = Object.entries(programInfo).map(([p, { count }]) => `${p}:${count}`).join(',');
    return (
      `/sensei/student/${group.student_id}` +
      `?programs=${encodeURIComponent(uniquePrograms.join(','))}` +
      `&dates=${encodeURIComponent(datesStr)}` +
      `&counts=${encodeURIComponent(countsStr)}`
    );
  };

  return (
    <>
      {/* ── Mobile layout ── */}
      <div className="sm:hidden space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 font-ninja text-sm text-ninja-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
              Pending
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
              Overdue
            </span>
          </div>
          <span className="font-ninja font-bold text-sm text-ninja-navy">
            {completedCount} / {assignments.length} logged
          </span>
        </div>

        <div className="space-y-3">
          {groups.map((group, i) => {
            const allDone = group.assignments.every((a) => a.completed);
            const isOverdue = group.assignments.some(
              (a) => !a.completed && a.session_date && String(a.session_date).split('T')[0] < todayStr
            );
            const borderColor = allDone ? '#4ade80' : isOverdue ? '#f87171' : '#fde047';
            const dotClass = allDone ? 'bg-green-500' : isOverdue ? 'bg-red-400' : 'bg-yellow-400';
            const sessionCount = group.assignments.length;
            const uniquePrograms = [...new Set(group.assignments.map((a) => a.program))];
            const removeId = group.assignments[0].id;

            return (
              <motion.div
                key={group.student_id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.25, ease: 'easeOut' }}
                className="bg-white rounded-2xl p-4 cursor-pointer"
                style={{ border: `2px solid ${borderColor}` }}
                onClick={() => navigate(`/manager/students/${group.student_id}`)}
              >
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-ninja-navy font-ninja font-bold text-lg leading-tight">
                      {group.student_name}{isBirthdayToday(group.birthday) && <span className="ml-1.5">🎂</span>}
                    </span>
                    {sessionCount > 1 && (
                      <span className="text-xs font-ninja font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                        {sessionCount} sessions
                      </span>
                    )}
                    {isOverdue && (
                      <span className="text-xs font-ninja font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">
                        Overdue
                      </span>
                    )}
                    {allDone && (
                      <span className="text-xs font-ninja font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-300">
                        Logged ✓
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${dotClass}`} />
                    {!isReadOnly && (
                      confirmId === group.student_id ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleRemove(removeId)}
                            className="text-xs font-ninja font-semibold text-white bg-red-500 px-2 py-0.5 rounded-lg"
                          >
                            Remove
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="text-xs font-ninja font-semibold text-ninja-muted bg-ninja-bg border border-ninja-border px-2 py-0.5 rounded-lg"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmId(group.student_id); }}
                          className="text-ninja-muted hover:text-red-400 transition-colors text-sm leading-none"
                          title="Remove from board"
                        >
                          ✕
                        </button>
                      )
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {uniquePrograms.map((p) => <ProgramBadge key={p} program={p} size="sm" />)}
                </div>
                {group.assignments[0].sensei_name && (
                  <p className="text-ninja-muted font-ninja text-xs mt-1">
                    Sensei: {group.assignments[0].sensei_name}
                  </p>
                )}
                {!isReadOnly && !allDone && (
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(buildLogUrl(group)); }}
                    className="mt-3 w-full text-sm font-ninja font-bold text-ninja-blue border-2 border-ninja-blue rounded-xl py-2 hover:bg-ninja-blue hover:text-white transition-colors"
                  >
                    Log Progress
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Tablet + Desktop layout (sm+) ── */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group, i) => {
          const allDone = group.assignments.every((a) => a.completed);
          const isOverdue = group.assignments.some(
            (a) => !a.completed && a.session_date && String(a.session_date).split('T')[0] < todayStr
          );
          const borderClass = allDone ? 'border-green-400' : isOverdue ? 'border-red-400' : 'border-yellow-300';
          const dotClass = allDone ? 'bg-green-500' : isOverdue ? 'bg-red-400' : 'bg-yellow-400';
          const sessionCount = group.assignments.length;
          const uniquePrograms = [...new Set(group.assignments.map((a) => a.program))];
          const removeId = group.assignments[0].id;

          return (
            <motion.div
              key={group.student_id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.28, ease: 'easeOut' }}
              className={`bg-white border-2 ${borderClass} rounded-2xl p-4 shadow-sm flex flex-col gap-3`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => navigate(`/manager/students/${group.student_id}`)}
                    className="text-ninja-navy font-ninja font-bold text-lg leading-tight hover:text-ninja-blue transition-colors text-left"
                  >
                    {group.student_name}{isBirthdayToday(group.birthday) && <span className="ml-1.5">🎂</span>}
                  </button>
                  {sessionCount > 1 && (
                    <span className="text-xs font-ninja font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                      {sessionCount} sessions
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                  <div className={`w-3 h-3 rounded-full ${dotClass}`} />
                  {!isReadOnly && (
                    confirmId === group.student_id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleRemove(removeId)}
                          className="text-xs font-ninja font-semibold text-white bg-red-500 px-2 py-0.5 rounded-lg"
                        >
                          Remove
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="text-xs font-ninja font-semibold text-ninja-muted bg-ninja-bg border border-ninja-border px-2 py-0.5 rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmId(group.student_id)}
                        className="text-ninja-muted hover:text-red-400 transition-colors text-sm leading-none"
                      >
                        ✕
                      </button>
                    )
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {uniquePrograms.map((p) => <ProgramBadge key={p} program={p} size="sm" />)}
              </div>
              {allDone ? (
                <p className="text-green-600 font-ninja font-semibold text-xs">Logged ✓</p>
              ) : isOverdue ? (
                <p className="text-red-600 font-ninja font-semibold text-xs">Overdue</p>
              ) : (
                <p className="text-yellow-700 font-ninja font-semibold text-xs">Not logged yet</p>
              )}
              {!isReadOnly && !allDone && (
                <button
                  onClick={() => navigate(buildLogUrl(group))}
                  className="mt-auto w-full text-sm font-ninja font-bold text-ninja-blue border-2 border-ninja-blue rounded-xl py-2 hover:bg-ninja-blue hover:text-white transition-colors"
                >
                  Log Progress
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </>
  );
}
