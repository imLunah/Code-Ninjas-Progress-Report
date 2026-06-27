import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// A real thumbtack glyph instead of an emoji — keeps the card on-brand and
// crisp at any size / dark mode.
function Pin({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M15.5 2.5a1 1 0 0 0 0 1.4l.3.3-4.2 4.2-2.6-.5a1 1 0 0 0-.9.27l-.7.7a1 1 0 0 0 0 1.42l3 3-3.9 3.9a1 1 0 1 0 1.4 1.42l3.9-3.9 3 3a1 1 0 0 0 1.42 0l.7-.7a1 1 0 0 0 .27-.9l-.5-2.6 4.2-4.2.3.3a1 1 0 0 0 1.4-1.42l-6-6a1 1 0 0 0-1.4 0z" />
    </svg>
  );
}

// Markdown rendered inside the note. Constrained set of elements so a sensei's
// quick formatting (bullets, bold, line breaks) reads cleanly without letting
// arbitrary HTML/headings blow up the card.
const MARKDOWN_COMPONENTS = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc marker:text-amber-400 pl-5 mb-2 last:mb-0 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal marker:text-amber-400 pl-5 mb-2 last:mb-0 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed pl-0.5">{children}</li>,
  strong: ({ children }) => <strong className="font-bold text-amber-950">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="underline decoration-amber-400 underline-offset-2">{children}</a>,
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
    <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200/80 shadow-sm">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2 text-amber-700">
            <Pin className="w-4 h-4 -rotate-12" />
            <h3 className="font-ninja font-bold text-[15px] text-amber-900">Pinned note</h3>
          </div>
          {!isReadOnly && !editing && (
            <button
              onClick={() => { setDraft(note); setEditing(true); }}
              className="font-ninja text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors"
            >
              {hasNote ? 'Edit' : 'Add note'}
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={5}
              placeholder={"What should every sensei know before class?\n\n- Prefers step-by-step instructions\n- Responds well to encouragement\n- **Avoid** rushing between projects"}
              className="w-full bg-white/80 border border-amber-200 text-ninja-navy rounded-xl px-3 py-2.5 font-ninja text-sm leading-relaxed placeholder:text-amber-400/70 focus:outline-none focus:border-amber-400 focus:bg-white transition-colors resize-y"
              autoFocus
            />
            <p className="text-[11px] font-ninja text-amber-600/90">
              Use <span className="font-mono text-amber-700">-</span> for a list, <span className="font-mono text-amber-700">**bold**</span> for emphasis, and a blank line to start a new paragraph.
            </p>
            {error && <p className="text-ninja-red text-xs font-ninja">{error}</p>}
            <div className="flex items-center gap-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="font-ninja text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save note'}
              </button>
              <button
                onClick={handleCancel}
                className="font-ninja text-xs font-bold text-amber-700 hover:text-amber-900 px-3 py-1.5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : hasNote ? (
          <div className="font-ninja text-sm leading-relaxed text-amber-900">
            <ReactMarkdown
              components={MARKDOWN_COMPONENTS}
              urlTransform={(url) => (/^(https?:|mailto:)/i.test(url) ? url : '')}
            >
              {note}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="font-ninja text-sm leading-relaxed text-amber-700/70">
            Nothing pinned yet — jot down learning style or anything the next sensei should know.
          </p>
        )}
      </div>
    </div>
  );
}
