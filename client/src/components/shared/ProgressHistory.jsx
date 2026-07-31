import { useState } from 'react';
import { PencilIcon } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import BeltBadge from '../ui/BeltBadge';
import ProgramBadge from '../ui/ProgramBadge';
import Button from '../ui/Button';
import ActionMenu, { MenuItem } from '../ui/ActionMenu';
import { TrashIcon } from '../ui/icons';
import { ReactionPicker, ReactionChips, RowActions, IN_STRIP_MENU, toggleLocally } from '../ui/Reactions';
import LazyMarkdownEditor from './LazyMarkdownEditor';
import MarkdownView from './MarkdownView';

function LogComment({ comment }) {
  return (
    <div className="flex gap-2 mt-2">
      <div className="flex-shrink-0 w-1 rounded-full bg-ninja-blue" />
      <div>
        <p className="text-ninja-navy font-ninja text-sm">{comment.body}</p>
        <p className="text-ninja-muted font-ninja text-xs mt-0.5">
          {comment.user_name} · {new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>
    </div>
  );
}

function CommentBox({ logId, onAdded }) {
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    setError('');
    try {
      const comment = await api.post(`/progress/${logId}/comments`, { body: body.trim() });
      onAdded(comment);
      setBody('');
    } catch (err) {
      setError(err.message || 'Failed to post comment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 bg-white border border-ninja-border text-ninja-navy rounded-lg px-3 py-1.5 font-ninja text-sm focus:outline-none focus:border-ninja-blue transition-colors"
        />
        <Button type="submit" size="sm" disabled={saving || !body.trim()}>
          {saving ? '...' : 'Reply'}
        </Button>
      </form>
      {error && <p className="text-ninja-red font-ninja text-xs mt-1">{error}</p>}
    </div>
  );
}

export default function ProgressHistory({ logs = [], onLogUpdated, onLogDeleted }) {
  const { user, isReadOnly } = useAuth();
  const isManager = ['manager', 'admin'].includes(user?.role);

  const programs = [...new Set(logs.map((l) => l.program).filter(Boolean))];
  const multiProgram = programs.length > 1;
  const [filter, setFilter] = useState('');
  const [localComments, setLocalComments] = useState({});

  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [commentErrors, setCommentErrors] = useState({});
  const [reactionErrors, setReactionErrors] = useState({});

  // Optimistic, then corrected by the server's own count. A failure puts the
  // chips back rather than leaving a reaction that was never stored.
  const react = async (log, emoji) => {
    if (isReadOnly || !onLogUpdated) return;
    const before = log.reactions || [];
    onLogUpdated(log.id, { reactions: toggleLocally(before, emoji) });
    setReactionErrors((prev) => ({ ...prev, [log.id]: '' }));
    try {
      const { reactions } = await api.post(`/progress/${log.id}/reactions`, { emoji });
      onLogUpdated(log.id, { reactions });
    } catch (err) {
      onLogUpdated(log.id, { reactions: before });
      setReactionErrors((prev) => ({ ...prev, [log.id]: err.message || 'Could not save that reaction.' }));
    }
  };

  const visible = filter ? logs.filter((l) => l.program === filter) : logs;

  const handleCommentAdded = (logId, comment) => {
    setLocalComments((prev) => ({
      ...prev,
      [logId]: [...(prev[logId] || []), comment],
    }));
  };

  const startEdit = (log) => {
    setEditingId(log.id);
    setEditDraft(log.notes || '');
    setConfirmDeleteId(null);
  };

  const saveEdit = async (logId) => {
    if (!editDraft.trim()) return;
    setSavingEdit(true);
    setEditError('');
    try {
      await api.patch(`/progress/${logId}`, { notes: editDraft.trim() });
      onLogUpdated && onLogUpdated(logId, { notes: editDraft.trim() });
      setEditingId(null);
    } catch (err) {
      setEditError(err.message || 'Failed to save. Try again.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (logId) => {
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/progress/${logId}`);
      onLogDeleted && onLogDeleted(logId);
      setConfirmDeleteId(null);
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete. Try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-ninja-muted font-ninja">
        No progress logs yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {multiProgram && (
        <div className="flex flex-wrap gap-2 pb-1">
          <button
            onClick={() => setFilter('')}
            className={`px-3 py-1 rounded-lg text-sm font-ninja font-semibold transition-colors ${
              filter === '' ? 'bg-ninja-blue text-white' : 'bg-ninja-bg border border-ninja-border text-ninja-navy hover:border-ninja-blue'
            }`}
          >
            All
          </button>
          {programs.map((p) => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={`px-3 py-1 rounded-lg text-sm font-ninja font-semibold transition-colors ${
                filter === p ? 'bg-ninja-blue text-white' : 'bg-ninja-bg border border-ninja-border text-ninja-navy hover:border-ninja-blue'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 && (
        <div className="text-center py-6 text-ninja-muted font-ninja text-sm">No logs for this program yet.</div>
      )}

      {(() => {
        // Group logs by session_date
        const groups = visible.reduce((acc, log) => {
          const key = log.session_date;
          if (!acc[key]) acc[key] = [];
          acc[key].push(log);
          return acc;
        }, {});
        const dates = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a));

        return dates.map((date) => {
          const dayLogs = groups[date];
          const sharedSensei = dayLogs.every((l) => l.sensei_name === dayLogs[0].sensei_name)
            ? dayLogs[0].sensei_name
            : null;

          return (
            <div key={date} className="bg-ninja-bg border border-ninja-border rounded-xl p-4">
              {/* Day header */}
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="text-ninja-blue font-ninja font-semibold text-sm">{formatDate(date)}</span>
                {sharedSensei && <span className="text-ninja-muted text-sm font-ninja">by {sharedSensei}</span>}
              </div>

              {/* Individual log entries */}
              <div className="space-y-3">
                {dayLogs.map((log, i) => {
                  const allComments = [...(log.comments || []), ...(localComments[log.id] || [])];
                  const isEditing = editingId === log.id;
                  const isConfirmingDelete = confirmDeleteId === log.id;

                  const canEdit = !isReadOnly && (isManager || log.sensei_id === user?.id);

                  return (
                    // The tint bleeds past the text so the entry reads as one
                    // object under the pointer, and is an alpha over whatever is
                    // behind it rather than a bg-* swap that the dark overrides
                    // would fight.
                    <div
                      key={log.id}
                      className={`group -mx-2 px-2 rounded-lg transition-colors duration-150 hover:bg-ninja-navy/[0.04] dark:hover:bg-white/[0.05] ${
                        i > 0 ? 'border-t border-ninja-border/60 pt-3' : ''
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {log.program && <ProgramBadge program={log.program} size="xs" />}
                          {!sharedSensei && log.sensei_name && (
                            <span className="text-ninja-muted text-xs font-ninja">by {log.sensei_name}</span>
                          )}
                          {log.belt_level_at && <BeltBadge belt={log.belt_level_at} sublevel={log.belt_sublevel_at} size="xs" />}
                          {log.project_at && (
                            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-ninja font-semibold">{log.project_at}</span>
                          )}
                          {log.status_at && (
                            <span className={`text-xs px-2 py-0.5 rounded-md font-ninja font-semibold ${
                              log.status_at === 'Completed' ? 'bg-green-100 text-green-700'
                              : log.status_at === 'Working On' ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                            }`}>{log.status_at}</span>
                          )}
                        </div>
                        {!isEditing && (!isReadOnly || canEdit) && (
                          // bg-white, not the default: this card is already
                          // ninja-bg, so a ninja-bg strip would vanish into it.
                          <RowActions surface="bg-white" className="self-center">
                            {!isReadOnly && <ReactionPicker onPick={(emoji) => react(log, emoji)} />}
                            {canEdit && (
                              <ActionMenu
                                label="Log actions"
                                className={`flex-shrink-0 ${IN_STRIP_MENU}`}
                                onClosed={() => { setConfirmDeleteId(null); setDeleteError(''); }}
                              >
                                {({ close }) =>
                                  isConfirmingDelete ? (
                                    // The confirm keeps the word "Delete" while
                                    // everything around it is a glyph. Icons are
                                    // fine for reversible actions.
                                    <div className="p-1.5 w-48">
                                      <p className="font-ninja text-xs text-ninja-muted mb-2">Delete this log entry?</p>
                                      <div className="flex items-center gap-1.5">
                                        <Button variant="danger" size="sm" onClick={() => handleDelete(log.id)} disabled={deleting}>
                                          {deleting ? 'Deleting…' : 'Delete'}
                                        </Button>
                                        <Button variant="secondary" size="sm" onClick={() => setConfirmDeleteId(null)}>Keep</Button>
                                      </div>
                                      {deleteError && <p className="text-ninja-red font-ninja text-xs mt-1.5">{deleteError}</p>}
                                    </div>
                                  ) : (
                                    <>
                                      <MenuItem icon={PencilIcon} onSelect={() => { startEdit(log); close(); }}>Edit</MenuItem>
                                      <MenuItem icon={TrashIcon} danger onSelect={() => { setConfirmDeleteId(log.id); setEditingId(null); }}>
                                        Delete
                                      </MenuItem>
                                    </>
                                  )
                                }
                              </ActionMenu>
                            )}
                          </RowActions>
                        )}
                      </div>

                      {(log.sub_program || log.module_name || log.lesson_name) && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {log.sub_program && (
                            <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md font-ninja font-semibold">{log.sub_program}</span>
                          )}
                          {log.module_name && (
                            <span className="text-xs bg-ninja-bg border border-ninja-border text-ninja-navy px-2 py-0.5 rounded-md font-ninja">{log.module_name}</span>
                          )}
                          {log.lesson_name && (
                            <span className="text-xs bg-ninja-bg border border-ninja-border text-ninja-muted px-2 py-0.5 rounded-md font-ninja">{log.lesson_name}</span>
                          )}
                        </div>
                      )}

                      {isEditing ? (
                        <div className="space-y-2 mt-1">
                          <LazyMarkdownEditor value={editDraft} onChange={setEditDraft} placeholder="Update the session notes…" />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveEdit(log.id)} disabled={savingEdit || !editDraft.trim()}>
                              {savingEdit ? 'Saving...' : 'Save'}
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
                          </div>
                          {editError && <p className="text-ninja-red font-ninja text-xs mt-1">{editError}</p>}
                        </div>
                      ) : (
                        log.notes && <MarkdownView className="text-ninja-navy font-ninja text-sm leading-relaxed">{log.notes}</MarkdownView>
                      )}

                      <ReactionChips
                        reactions={log.reactions}
                        canReact={!isReadOnly}
                        onToggle={(emoji) => react(log, emoji)}
                      />
                      {reactionErrors[log.id] && (
                        <p className="text-ninja-red font-ninja text-xs mt-1">{reactionErrors[log.id]}</p>
                      )}

                      {allComments.length > 0 && (
                        <div className="mt-3 space-y-1 border-t border-ninja-border pt-3">
                          {allComments.map((c) => <LogComment key={c.id} comment={c} />)}
                        </div>
                      )}
                      {!isReadOnly && <CommentBox logId={log.id} onAdded={(c) => handleCommentAdded(log.id, c)} />}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        });
      })()}
    </div>
  );
}
