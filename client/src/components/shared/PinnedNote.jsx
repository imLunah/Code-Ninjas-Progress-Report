import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// Markdown rendered inside the note. Constrained set of elements so a sensei's
// quick formatting (bullets, bold, line breaks) reads cleanly without letting
// arbitrary HTML/headings blow up the card.
const MARKDOWN_COMPONENTS = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 last:mb-0 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 last:mb-0 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-bold text-amber-950">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="underline">{children}</a>,
  h1: ({ children }) => <p className="font-bold mb-2">{children}</p>,
  h2: ({ children }) => <p className="font-bold mb-2">{children}</p>,
  h3: ({ children }) => <p className="font-bold mb-2">{children}</p>,
};

export default function PinnedNote({ studentId, initialNote, onUpdated }) {
  const { isReadOnly } = useAuth();
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(initialNote || '');
  const [draft, setDraft] = useState(initialNote || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await api.patch(`/students/${studentId}/note`, { pinned_note: draft });
      setNote(draft);
      onUpdated && onUpdated(updated.pinned_note);
      setEditing(false);
    } catch (err) {
      setError(err.message || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(note);
    setError('');
    setEditing(false);
  };

  const hasNote = Boolean(note && note.trim());

  return (
    <div className={`rounded-2xl border-2 p-5 ${hasNote ? 'border-amber-300 bg-amber-50 shadow-sm ring-1 ring-amber-200' : 'border-amber-200 border-dashed bg-amber-50/50'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-amber-500 text-lg leading-none" aria-hidden>📌</span>
          <h3 className="text-sm font-ninja font-bold text-amber-800 uppercase tracking-wide">Pinned Note</h3>
        </div>
        {!isReadOnly && !editing && (
          <button
            onClick={() => { setDraft(note); setEditing(true); }}
            className="text-xs font-ninja font-bold text-amber-600 hover:text-amber-800 transition-colors"
          >
            {hasNote ? 'Edit' : '+ Add Note'}
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            placeholder={"Prefers step-by-step instructions.\n\n- Responds well to encouragement\n- **Avoid** rushing between projects"}
            className="w-full bg-white border border-amber-300 text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-amber-500 transition-colors resize-y"
            autoFocus
          />
          <p className="text-[11px] font-ninja text-amber-600">
            Formatting: <span className="font-mono">- item</span> for bullets, <span className="font-mono">**bold**</span>, blank line for a new paragraph.
          </p>
          {error && <p className="text-ninja-red text-xs font-ninja">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-xs font-ninja font-semibold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              className="text-xs font-ninja font-semibold text-amber-700 hover:text-amber-900 px-3 py-1.5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : hasNote ? (
        <div className="font-ninja text-sm leading-relaxed text-amber-900">
          <ReactMarkdown components={MARKDOWN_COMPONENTS}>{note}</ReactMarkdown>
        </div>
      ) : (
        <p className="font-ninja text-sm leading-relaxed text-amber-500 italic">
          No pinned note yet. Add learning-style notes or parent requests so every sensei sees them.
        </p>
      )}
    </div>
  );
}
