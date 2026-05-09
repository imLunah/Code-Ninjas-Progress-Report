import { useState } from 'react';
import { formatDate } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import BeltBadge from '../ui/BeltBadge';
import ProgramBadge from '../ui/ProgramBadge';
import Button from '../ui/Button';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    try {
      const comment = await api.post(`/progress/${logId}/comments`, { body: body.trim() });
      onAdded(comment);
      setBody('');
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-3">
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
  );
}

export default function ProgressHistory({ logs = [], onLogUpdated }) {
  const { user } = useAuth();
  const isManager = user?.role === 'manager';

  const programs = [...new Set(logs.map((l) => l.program).filter(Boolean))];
  const multiProgram = programs.length > 1;
  const [filter, setFilter] = useState('');
  const [localComments, setLocalComments] = useState({});

  const visible = filter ? logs.filter((l) => l.program === filter) : logs;

  const handleCommentAdded = (logId, comment) => {
    setLocalComments((prev) => ({
      ...prev,
      [logId]: [...(prev[logId] || []), comment],
    }));
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

      {visible.map((log) => {
        const allComments = [...(log.comments || []), ...(localComments[log.id] || [])];
        return (
          <div key={log.id} className="bg-ninja-bg border border-ninja-border rounded-xl p-4">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-ninja-blue font-ninja font-semibold text-sm">{formatDate(log.session_date)}</span>
                {log.sensei_name && <span className="text-ninja-muted text-sm font-ninja">by {log.sensei_name}</span>}
                {log.program && <ProgramBadge program={log.program} size="xs" />}
              </div>
              <div className="flex flex-wrap items-center gap-2">
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

            <p className="text-ninja-navy font-ninja text-sm leading-relaxed">{log.notes}</p>

            {/* Manager comments */}
            {allComments.length > 0 && (
              <div className="mt-3 space-y-1 border-t border-ninja-border pt-3">
                {allComments.map((c) => <LogComment key={c.id} comment={c} />)}
              </div>
            )}
            <CommentBox logId={log.id} onAdded={(c) => handleCommentAdded(log.id, c)} />
          </div>
        );
      })}
    </div>
  );
}
