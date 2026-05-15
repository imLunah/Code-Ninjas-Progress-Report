import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../../components/layout/Layout';
import Button from '../../components/ui/Button';
import { api } from '../../api/client';
import { useCustomPrograms } from '../../context/CustomProgramsContext';

function LessonRow({ lesson, programId, moduleId, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(lesson.name);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!draft.trim() || draft === lesson.name) { setEditing(false); return; }
    setSaving(true);
    try {
      const updated = await api.patch(`/custom-programs/${programId}/modules/${moduleId}/lessons/${lesson.id}`, { name: draft.trim() });
      onUpdate({ ...lesson, name: updated.name });
      setEditing(false);
    } catch {}
    setSaving(false);
  };

  const remove = async () => {
    try {
      await api.delete(`/custom-programs/${programId}/modules/${moduleId}/lessons/${lesson.id}`);
      onDelete(lesson.id);
    } catch {}
  };

  return (
    <div className="flex items-center gap-2 py-1.5 pl-4 border-l-2 border-ninja-border ml-2">
      {editing ? (
        <>
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setDraft(lesson.name); } }}
            className="flex-1 text-sm font-ninja text-ninja-navy border border-ninja-blue rounded-lg px-2 py-1 focus:outline-none"
          />
          <button onClick={save} disabled={saving} className="text-xs font-ninja font-semibold text-ninja-blue hover:underline">{saving ? '...' : 'Save'}</button>
          <button onClick={() => { setEditing(false); setDraft(lesson.name); }} className="text-xs font-ninja text-ninja-muted hover:underline">Cancel</button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm font-ninja text-ninja-navy">{lesson.name}</span>
          <button onClick={() => setEditing(true)} className="text-xs font-ninja text-ninja-muted hover:text-ninja-blue transition-colors">Edit</button>
          {confirming ? (
            <>
              <button onClick={remove} className="text-xs font-ninja font-semibold text-ninja-red hover:underline">Remove</button>
              <button onClick={() => setConfirming(false)} className="text-xs font-ninja text-ninja-muted hover:underline">Cancel</button>
            </>
          ) : (
            <button onClick={() => setConfirming(true)} className="text-xs font-ninja text-ninja-muted hover:text-ninja-red transition-colors">✕</button>
          )}
        </>
      )}
    </div>
  );
}

function ModuleCard({ mod, programId, onUpdate, onDelete }) {
  const [addingLesson, setAddingLesson] = useState(false);
  const [lessonDraft, setLessonDraft] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(mod.name);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const saveName = async () => {
    if (!nameDraft.trim() || nameDraft === mod.name) { setEditingName(false); return; }
    setSaving(true);
    try {
      const updated = await api.patch(`/custom-programs/${programId}/modules/${mod.id}`, { name: nameDraft.trim() });
      onUpdate({ ...mod, name: updated.name });
      setEditingName(false);
    } catch {}
    setSaving(false);
  };

  const addLesson = async () => {
    if (!lessonDraft.trim()) return;
    setSaving(true);
    try {
      const newLesson = await api.post(`/custom-programs/${programId}/modules/${mod.id}/lessons`, { name: lessonDraft.trim() });
      onUpdate({ ...mod, lessons: [...mod.lessons, newLesson] });
      setLessonDraft('');
      setAddingLesson(false);
    } catch {}
    setSaving(false);
  };

  const updateLesson = (updated) => {
    onUpdate({ ...mod, lessons: mod.lessons.map((l) => l.id === updated.id ? updated : l) });
  };

  const deleteLesson = (id) => {
    onUpdate({ ...mod, lessons: mod.lessons.filter((l) => l.id !== id) });
  };

  const remove = async () => {
    try {
      await api.delete(`/custom-programs/${programId}/modules/${mod.id}`);
      onDelete(mod.id);
    } catch {}
  };

  return (
    <div className="border border-ninja-border rounded-xl p-3 bg-ninja-bg space-y-2">
      <div className="flex items-center gap-2">
        {editingName ? (
          <>
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setEditingName(false); setNameDraft(mod.name); } }}
              className="flex-1 text-sm font-ninja font-semibold text-ninja-navy border border-ninja-blue rounded-lg px-2 py-1 focus:outline-none"
            />
            <button onClick={saveName} disabled={saving} className="text-xs font-ninja font-semibold text-ninja-blue hover:underline">{saving ? '...' : 'Save'}</button>
            <button onClick={() => { setEditingName(false); setNameDraft(mod.name); }} className="text-xs font-ninja text-ninja-muted hover:underline">Cancel</button>
          </>
        ) : (
          <>
            <span className="flex-1 text-sm font-ninja font-semibold text-ninja-navy">{mod.name}</span>
            <button onClick={() => setEditingName(true)} className="text-xs font-ninja text-ninja-muted hover:text-ninja-blue transition-colors">Rename</button>
            {confirming ? (
              <>
                <button onClick={remove} className="text-xs font-ninja font-semibold text-ninja-red hover:underline">Remove</button>
                <button onClick={() => setConfirming(false)} className="text-xs font-ninja text-ninja-muted hover:underline">Cancel</button>
              </>
            ) : (
              <button onClick={() => setConfirming(true)} className="text-xs font-ninja text-ninja-muted hover:text-ninja-red transition-colors">✕</button>
            )}
          </>
        )}
      </div>

      <div className="space-y-0.5">
        {mod.lessons.map((lesson) => (
          <LessonRow
            key={lesson.id}
            lesson={lesson}
            programId={programId}
            moduleId={mod.id}
            onUpdate={updateLesson}
            onDelete={deleteLesson}
          />
        ))}
      </div>

      {addingLesson ? (
        <div className="flex items-center gap-2 pl-6">
          <input
            autoFocus
            value={lessonDraft}
            onChange={(e) => setLessonDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addLesson(); if (e.key === 'Escape') { setAddingLesson(false); setLessonDraft(''); } }}
            placeholder="Lesson name..."
            className="flex-1 text-sm font-ninja text-ninja-navy border border-ninja-border rounded-lg px-2 py-1 focus:outline-none focus:border-ninja-blue"
          />
          <button onClick={addLesson} disabled={saving} className="text-xs font-ninja font-semibold text-ninja-blue hover:underline">{saving ? '...' : 'Add'}</button>
          <button onClick={() => { setAddingLesson(false); setLessonDraft(''); }} className="text-xs font-ninja text-ninja-muted hover:underline">Cancel</button>
        </div>
      ) : (
        <button
          onClick={() => setAddingLesson(true)}
          className="text-xs font-ninja text-ninja-muted hover:text-ninja-blue transition-colors pl-6"
        >
          + Add Lesson
        </button>
      )}
    </div>
  );
}

function ProgramCard({ program, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [addingModule, setAddingModule] = useState(false);
  const [moduleDraft, setModuleDraft] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(program.name);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(program.description || '');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalLessons = program.modules.reduce((n, m) => n + m.lessons.length, 0);

  const saveName = async () => {
    if (!nameDraft.trim() || nameDraft === program.name) { setEditingName(false); return; }
    setSaving(true);
    try {
      const updated = await api.patch(`/custom-programs/${program.id}`, { name: nameDraft.trim(), description: program.description });
      onUpdate({ ...program, name: updated.name });
      setEditingName(false);
    } catch {}
    setSaving(false);
  };

  const saveDesc = async () => {
    setSaving(true);
    try {
      await api.patch(`/custom-programs/${program.id}`, { name: program.name, description: descDraft.trim() || null });
      onUpdate({ ...program, description: descDraft.trim() || null });
      setEditingDesc(false);
    } catch {}
    setSaving(false);
  };

  const addModule = async () => {
    if (!moduleDraft.trim()) return;
    setSaving(true);
    try {
      const newMod = await api.post(`/custom-programs/${program.id}/modules`, { name: moduleDraft.trim() });
      onUpdate({ ...program, modules: [...program.modules, newMod] });
      setModuleDraft('');
      setAddingModule(false);
    } catch {}
    setSaving(false);
  };

  const updateModule = (updated) => {
    onUpdate({ ...program, modules: program.modules.map((m) => m.id === updated.id ? updated : m) });
  };

  const deleteModule = (id) => {
    onUpdate({ ...program, modules: program.modules.filter((m) => m.id !== id) });
  };

  const archive = async () => {
    try {
      await api.delete(`/custom-programs/${program.id}`);
      onDelete(program.id);
    } catch {}
  };

  return (
    <motion.div
      layout
      className="bg-white border border-ninja-border rounded-2xl shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setEditingName(false); setNameDraft(program.name); } }}
                  className="flex-1 text-lg font-ninja font-bold text-ninja-navy border border-ninja-blue rounded-lg px-3 py-1 focus:outline-none"
                />
                <button onClick={saveName} disabled={saving} className="text-sm font-ninja font-semibold text-ninja-blue hover:underline">{saving ? '...' : 'Save'}</button>
                <button onClick={() => { setEditingName(false); setNameDraft(program.name); }} className="text-sm font-ninja text-ninja-muted hover:underline">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-ninja font-bold text-ninja-navy">{program.name}</h2>
                <button onClick={() => setEditingName(true)} className="text-xs font-ninja text-ninja-muted hover:text-ninja-blue transition-colors">Rename</button>
              </div>
            )}

            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs font-ninja text-ninja-muted">
                {program.modules.length} module{program.modules.length !== 1 ? 's' : ''} · {totalLessons} lesson{totalLessons !== 1 ? 's' : ''}
              </span>
              <span className="text-xs font-ninja font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-md">
                custom_{program.id}
              </span>
            </div>

            {!editingDesc && (
              <div className="mt-2">
                {program.description ? (
                  <p className="text-sm font-ninja text-ninja-muted">{program.description}</p>
                ) : null}
                <button onClick={() => { setDescDraft(program.description || ''); setEditingDesc(true); }} className="text-xs font-ninja text-ninja-muted hover:text-ninja-blue transition-colors">
                  {program.description ? 'Edit description' : '+ Add description'}
                </button>
              </div>
            )}
            {editingDesc && (
              <div className="mt-2 space-y-1.5">
                <textarea
                  autoFocus
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  rows={2}
                  placeholder="Short description of this class..."
                  className="w-full text-sm font-ninja text-ninja-navy border border-ninja-border rounded-lg px-3 py-2 focus:outline-none focus:border-ninja-blue resize-none"
                />
                <div className="flex gap-2">
                  <button onClick={saveDesc} disabled={saving} className="text-xs font-ninja font-semibold text-ninja-blue hover:underline">{saving ? '...' : 'Save'}</button>
                  <button onClick={() => setEditingDesc(false)} className="text-xs font-ninja text-ninja-muted hover:underline">Cancel</button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {confirming ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-ninja text-ninja-muted">Archive class?</span>
                <button onClick={archive} className="text-xs font-ninja font-semibold text-ninja-red hover:underline">Yes</button>
                <button onClick={() => setConfirming(false)} className="text-xs font-ninja text-ninja-muted hover:underline">No</button>
              </div>
            ) : (
              <button onClick={() => setConfirming(true)} className="text-xs font-ninja text-ninja-muted hover:text-ninja-red transition-colors">Archive</button>
            )}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-ninja-muted hover:text-ninja-blue transition-colors"
              title={expanded ? 'Collapse' : 'Edit curriculum'}
            >
              <svg className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Expanded curriculum editor */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-ninja-border p-5 space-y-3">
              <p className="text-xs font-ninja font-semibold text-ninja-muted uppercase tracking-wide">Curriculum</p>

              {program.modules.length === 0 && (
                <p className="text-sm font-ninja text-ninja-muted italic">No modules yet. Add one below.</p>
              )}

              {program.modules.map((mod) => (
                <ModuleCard
                  key={mod.id}
                  mod={mod}
                  programId={program.id}
                  onUpdate={updateModule}
                  onDelete={deleteModule}
                />
              ))}

              {addingModule ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={moduleDraft}
                    onChange={(e) => setModuleDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addModule(); if (e.key === 'Escape') { setAddingModule(false); setModuleDraft(''); } }}
                    placeholder="Module name..."
                    className="flex-1 text-sm font-ninja text-ninja-navy border border-ninja-border rounded-lg px-3 py-2 focus:outline-none focus:border-ninja-blue"
                  />
                  <button onClick={addModule} disabled={saving} className="text-sm font-ninja font-semibold text-ninja-blue hover:underline">{saving ? '...' : 'Add'}</button>
                  <button onClick={() => { setAddingModule(false); setModuleDraft(''); }} className="text-sm font-ninja text-ninja-muted hover:underline">Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingModule(true)}
                  className="w-full py-2 rounded-xl border-2 border-dashed border-ninja-border text-ninja-muted hover:border-ninja-blue hover:text-ninja-blue font-ninja font-semibold text-sm transition-colors"
                >
                  + Add Module
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function CustomProgramsPage() {
  const { programs, setPrograms } = useCustomPrograms();
  const [creating, setCreating] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const createProgram = async () => {
    if (!nameDraft.trim()) return;
    setSaving(true);
    setError('');
    try {
      const newProg = await api.post('/custom-programs', { name: nameDraft.trim() });
      setPrograms((prev) => [...prev, newProg]);
      setNameDraft('');
      setCreating(false);
    } catch (err) {
      setError(err.message || 'Failed to create class');
    }
    setSaving(false);
  };

  const updateProgram = (updated) => {
    setPrograms((prev) => prev.map((p) => p.id === updated.id ? updated : p));
  };

  const deleteProgram = (id) => {
    setPrograms((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-ninja font-bold text-ninja-navy">Custom Classes</h1>
            <p className="text-ninja-muted font-ninja text-sm mt-1">Define your own programs with custom modules and lessons.</p>
          </div>
          {!creating && (
            <Button onClick={() => setCreating(true)}>+ New Class</Button>
          )}
        </div>

        {/* Create form */}
        <AnimatePresence>
          {creating && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-white border border-ninja-border rounded-2xl shadow-sm p-5 space-y-3"
            >
              <p className="font-ninja font-semibold text-ninja-navy text-sm">New Class</p>
              {error && <p className="text-ninja-red text-sm font-ninja">{error}</p>}
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') createProgram(); if (e.key === 'Escape') { setCreating(false); setNameDraft(''); } }}
                placeholder="Class name (e.g. Scratch Club, Python 101)"
                className="w-full border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
              />
              <div className="flex gap-2">
                <Button onClick={createProgram} disabled={saving || !nameDraft.trim()}>
                  {saving ? 'Creating...' : 'Create Class'}
                </Button>
                <Button variant="secondary" onClick={() => { setCreating(false); setNameDraft(''); setError(''); }}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {programs.length === 0 && !creating && (
          <div className="bg-white border border-ninja-border rounded-2xl shadow-sm p-10 text-center">
            <p className="text-ninja-muted font-ninja text-lg font-semibold mb-2">No custom classes yet</p>
            <p className="text-ninja-muted font-ninja text-sm mb-4">Create a class to define your own curriculum with modules and lessons.</p>
            <Button onClick={() => setCreating(true)}>+ New Class</Button>
          </div>
        )}

        <div className="space-y-4">
          {programs.map((prog) => (
            <ProgramCard
              key={prog.id}
              program={prog}
              onUpdate={updateProgram}
              onDelete={deleteProgram}
            />
          ))}
        </div>
      </div>
    </Layout>
  );
}
