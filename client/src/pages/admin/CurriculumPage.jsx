import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../../components/layout/Layout';
import { api } from '../../api/client';
import { useCurriculum, invalidateCurriculumCache } from '../../context/CurriculumContext';

const PROGRAMS = ['CREATE', 'AI Academy', 'Robotics Academy', 'JR'];

function AdminNav() {
  return (
    <div className="flex items-center gap-4 mb-6 border-b border-ninja-border pb-4">
      <a href="/admin/locations" className="text-ninja-muted hover:text-ninja-navy font-ninja text-sm transition-colors">Locations</a>
      <a href="/admin/curriculum" className="text-ninja-navy font-ninja text-sm font-semibold border-b-2 border-ninja-blue pb-0.5">Curriculum</a>
    </div>
  );
}

function LessonRow({ lesson, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(lesson.lesson_name);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    if (!name.trim() || name.trim() === lesson.lesson_name) { setEditing(false); return; }
    setSaving(true);
    try { await onRename(lesson.id, name.trim()); setEditing(false); }
    catch { setName(lesson.lesson_name); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex items-center gap-2 py-1 pl-4 group">
      <span className="text-ninja-muted text-xs">·</span>
      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setName(lesson.lesson_name); setEditing(false); } }}
          className="flex-1 bg-white border border-ninja-blue rounded px-2 py-0.5 font-ninja text-sm text-ninja-navy focus:outline-none"
          disabled={saving}
        />
      ) : (
        <span
          className="flex-1 font-ninja text-sm text-ninja-navy cursor-pointer hover:text-ninja-blue transition-colors"
          onClick={() => setEditing(true)}
        >
          {lesson.lesson_name}
        </span>
      )}
      {!editing && (
        confirmDelete ? (
          <span className="flex items-center gap-1">
            <button onClick={() => onDelete(lesson.id)} className="text-[10px] font-ninja font-semibold text-white bg-ninja-red rounded px-2 py-0.5 hover:opacity-90">Delete</button>
            <button onClick={() => setConfirmDelete(false)} className="text-[10px] font-ninja text-ninja-muted hover:text-ninja-navy">Cancel</button>
          </span>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="opacity-0 group-hover:opacity-100 text-[10px] font-ninja text-ninja-muted hover:text-ninja-red transition-all">✕</button>
        )
      )}
    </div>
  );
}

function ModuleBlock({ mod, onRenameModule, onDeleteModule, onAddLesson, onRenameLesson, onDeleteLesson }) {
  const [expanded, setExpanded] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [moduleName, setModuleName] = useState(mod.module);
  const [saving, setSaving] = useState(false);
  const [newLesson, setNewLesson] = useState('');
  const [addingLesson, setAddingLesson] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveModuleName = async () => {
    if (!moduleName.trim() || moduleName.trim() === mod.module) { setEditingName(false); return; }
    setSaving(true);
    try { await onRenameModule(mod.id, moduleName.trim()); setEditingName(false); }
    catch { setModuleName(mod.module); }
    finally { setSaving(false); }
  };

  const submitLesson = async (e) => {
    e.preventDefault();
    if (!newLesson.trim()) return;
    setAddingLesson(true);
    try { await onAddLesson(mod.id, newLesson.trim()); setNewLesson(''); }
    finally { setAddingLesson(false); }
  };

  const lessons = mod._lessons || [];

  return (
    <div className="border border-ninja-border rounded-xl overflow-hidden mb-2">
      <div
        className="flex items-center gap-2 px-3 py-2.5 bg-ninja-bg cursor-pointer select-none group"
        onClick={() => !editingName && setExpanded(e => !e)}
      >
        <span className="text-ninja-muted text-xs">{expanded ? '▾' : '▸'}</span>
        {editingName ? (
          <input
            autoFocus
            value={moduleName}
            onChange={(e) => setModuleName(e.target.value)}
            onBlur={saveModuleName}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveModuleName(); } if (e.key === 'Escape') { setModuleName(mod.module); setEditingName(false); } }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-white border border-ninja-blue rounded px-2 py-0.5 font-ninja text-sm font-semibold text-ninja-navy focus:outline-none"
            disabled={saving}
          />
        ) : (
          <span className="flex-1 font-ninja text-sm font-semibold text-ninja-navy">{mod.module}</span>
        )}
        <span className="text-ninja-muted font-ninja text-xs">{lessons.length} lesson{lessons.length !== 1 ? 's' : ''}</span>
        {!editingName && !confirmDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); setEditingName(true); }}
            className="opacity-0 group-hover:opacity-100 text-[10px] font-ninja text-ninja-muted hover:text-ninja-blue transition-all px-1"
          >
            Edit
          </button>
        )}
        {!editingName && (
          confirmDelete ? (
            <span className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <button onClick={() => onDeleteModule(mod.id)} className="text-[10px] font-ninja font-semibold text-white bg-ninja-red rounded px-2 py-0.5">Delete</button>
              <button onClick={() => setConfirmDelete(false)} className="text-[10px] font-ninja text-ninja-muted">Cancel</button>
            </span>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
              className="opacity-0 group-hover:opacity-100 text-[10px] font-ninja text-ninja-muted hover:text-ninja-red transition-all"
            >
              ✕
            </button>
          )
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white px-3 py-2 space-y-0.5">
              {lessons.map(l => (
                <LessonRow
                  key={l.id}
                  lesson={l}
                  onRename={onRenameLesson}
                  onDelete={onDeleteLesson}
                />
              ))}
              <form onSubmit={submitLesson} className="flex gap-2 mt-2 pl-4">
                <input
                  value={newLesson}
                  onChange={(e) => setNewLesson(e.target.value)}
                  placeholder="Add lesson…"
                  className="flex-1 bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-3 py-1.5 font-ninja text-xs focus:outline-none focus:border-ninja-blue"
                  disabled={addingLesson}
                />
                <button
                  type="submit"
                  disabled={!newLesson.trim() || addingLesson}
                  className="bg-ninja-blue text-white font-ninja font-semibold rounded-lg px-3 py-1.5 text-xs hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  Add
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CurriculumPage() {
  const { subPrograms, curriculum } = useCurriculum();

  const [selectedProgram, setSelectedProgram] = useState('AI Academy');
  const [selectedSubProgram, setSelectedSubProgram] = useState(null);
  const [localCurriculum, setLocalCurriculum] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState('');
  const [newModuleName, setNewModuleName] = useState('');
  const [addingModule, setAddingModule] = useState(false);
  const [error, setError] = useState('');

  // Sync from context when it updates
  useEffect(() => {
    setLocalCurriculum(curriculum);
  }, [curriculum]);

  const subs = subPrograms[selectedProgram];
  const activeKey = selectedSubProgram || (subs ? subs[0] : selectedProgram);
  const modules = localCurriculum?.[activeKey] || [];

  const handleSeed = async () => {
    setSeedError('');
    setSeeding(true);
    try {
      await api.post('/curriculum/seed', {});
      invalidateCurriculumCache();
      window.location.reload();
    } catch (err) {
      setSeedError(err?.message || 'Failed to initialize curriculum.');
    } finally {
      setSeeding(false);
    }
  };

  const refetch = async () => {
    invalidateCurriculumCache();
    const res = await fetch('/api/curriculum', { credentials: 'include' });
    if (res.status === 204) return;
    const data = await res.json();
    if (data?.curriculum) setLocalCurriculum(data.curriculum);
  };

  const handleAddModule = async (e) => {
    e.preventDefault();
    if (!newModuleName.trim()) return;
    setAddingModule(true);
    setError('');
    try {
      await api.post('/curriculum/modules', {
        program: subs ? (selectedSubProgram ? subPrograms[selectedProgram][subPrograms[selectedProgram].indexOf(selectedSubProgram)] : subPrograms[selectedProgram][0]) : selectedProgram,
        sub_program: subs ? activeKey : null,
        module_name: newModuleName.trim(),
      });
      setNewModuleName('');
      await refetch();
    } catch (err) {
      setError(err?.message || 'Failed to add module.');
    } finally {
      setAddingModule(false);
    }
  };

  const handleRenameModule = async (id, name) => {
    await api.patch(`/curriculum/modules/${id}`, { module_name: name });
    await refetch();
  };

  const handleDeleteModule = async (id) => {
    await api.delete(`/curriculum/modules/${id}`);
    await refetch();
  };

  const handleAddLesson = async (moduleId, name) => {
    await api.post(`/curriculum/modules/${moduleId}/lessons`, { lesson_name: name });
    await refetch();
  };

  const handleRenameLesson = async (id, name) => {
    await api.patch(`/curriculum/lessons/${id}`, { lesson_name: name });
    await refetch();
  };

  const handleDeleteLesson = async (id) => {
    await api.delete(`/curriculum/lessons/${id}`);
    await refetch();
  };

  const notSeeded = localCurriculum && Object.keys(localCurriculum).length === 0;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <AdminNav />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-ninja-navy font-ninja font-bold text-2xl">Curriculum</h1>
            <p className="text-ninja-muted font-ninja text-sm mt-0.5">Edit modules and lessons for each program</p>
          </div>
        </div>

        {notSeeded && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 mb-6">
            <p className="text-ninja-navy font-ninja font-semibold text-sm mb-1">Curriculum not initialized</p>
            <p className="text-ninja-muted font-ninja text-xs mb-3">Click below to populate from the built-in defaults.</p>
            {seedError && <p className="text-ninja-red font-ninja text-xs mb-2">{seedError}</p>}
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="bg-ninja-blue text-white font-ninja font-semibold rounded-xl px-4 py-2 text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {seeding ? 'Initializing…' : 'Initialize from Defaults'}
            </button>
          </div>
        )}

        {/* Program tabs */}
        <div className="flex gap-2 flex-wrap mb-4">
          {PROGRAMS.map(p => (
            <button
              key={p}
              onClick={() => { setSelectedProgram(p); setSelectedSubProgram(null); }}
              className="px-3 py-1.5 rounded-xl font-ninja text-sm font-semibold transition-colors"
              style={{
                background: selectedProgram === p ? 'rgb(0,106,221)' : 'transparent',
                color: selectedProgram === p ? '#fff' : 'var(--ninja-muted, #6b7280)',
                border: selectedProgram === p ? 'none' : '1px solid var(--ninja-border, #e5e7eb)',
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Sub-program tabs */}
        {subs && (
          <div className="flex gap-2 flex-wrap mb-4">
            {subs.map(sp => (
              <button
                key={sp}
                onClick={() => setSelectedSubProgram(sp)}
                className="px-3 py-1 rounded-lg font-ninja text-xs font-semibold transition-colors"
                style={{
                  background: activeKey === sp ? 'rgba(0,106,221,0.1)' : 'transparent',
                  color: activeKey === sp ? 'rgb(0,106,221)' : 'var(--ninja-muted, #6b7280)',
                  border: '1px solid',
                  borderColor: activeKey === sp ? 'rgb(0,106,221)' : 'var(--ninja-border, #e5e7eb)',
                }}
              >
                {sp}
              </button>
            ))}
          </div>
        )}

        {/* Modules */}
        <div>
          {modules.map(mod => (
            <ModuleBlock
              key={mod.id || mod.module}
              mod={mod}
              onRenameModule={handleRenameModule}
              onDeleteModule={handleDeleteModule}
              onAddLesson={handleAddLesson}
              onRenameLesson={handleRenameLesson}
              onDeleteLesson={handleDeleteLesson}
            />
          ))}

          {error && <p className="text-ninja-red font-ninja text-xs mb-2">{error}</p>}

          <form onSubmit={handleAddModule} className="flex gap-2 mt-3">
            <input
              value={newModuleName}
              onChange={(e) => setNewModuleName(e.target.value)}
              placeholder="New module name…"
              className="flex-1 bg-white border border-ninja-border text-ninja-navy rounded-xl px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue"
              disabled={addingModule}
            />
            <button
              type="submit"
              disabled={!newModuleName.trim() || addingModule}
              className="bg-ninja-blue text-white font-ninja font-semibold rounded-xl px-4 py-2 text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {addingModule ? '…' : '+ Module'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
