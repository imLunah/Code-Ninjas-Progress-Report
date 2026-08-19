import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import ParentLayout, { ChildSwitcher } from '../../components/layout/ParentLayout';
import { useParentPortal } from '../../context/ParentPortalContext';
import { PageHeader } from '../../components/parent/ParentUI';
import { Pin, MARKDOWN_COMPONENTS } from '../../components/shared/PinnedNote';
import LazyMarkdownEditor from '../../components/shared/LazyMarkdownEditor';
import { SkeletonProfile } from '../../components/ui/Skeleton';

// The parent's note to the senseis, as its own page.
//
// Same pinned-note look the staff see it in, same editor, same markdown
// rendering with images blocked (MARKDOWN_COMPONENTS keeps img: () => null;
// this is parent-authored text rendered in staff context). Moving it out of
// the child profile gives it a tab of its own, because it is the one thing
// in the portal a parent writes rather than reads.

export default function ParentNote() {
  const { students, active, detail, detailLoading, saveNote } = useParentPortal();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const text = detail?.special_instructions || '';

  useEffect(() => { setEditing(false); setDraft(text); }, [active?.id, text]);

  const handleSave = async () => {
    if (!active) return;
    setSaving(true); setError('');
    try { await saveNote(active.id, draft); setEditing(false); }
    catch { setError('Could not save the note. Try again.'); }
    finally { setSaving(false); }
  };

  const header = (
    <PageHeader
      eyebrow={active ? `${active.full_name.split(' ')[0]} · what the senseis should know` : ''}
      title="Note"
      right={<div className="lg:hidden"><ChildSwitcher size="sm" layoutId="parent-child-mobile" /></div>}
    />
  );

  if (students === null || (active && detailLoading && !detail)) {
    return <ParentLayout><div className="space-y-5">{header}<SkeletonProfile label="Loading" /></div></ParentLayout>;
  }

  return (
    <ParentLayout>
      <div className="space-y-4 max-w-2xl">
        {header}
        <div className="tint-amber rounded-[24px]">
          <div className="px-5 py-4">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2" style={{ color: 'var(--tint-ink)' }}>
                <Pin className="w-4 h-4 -rotate-12" />
                <h2 className="font-ninja font-extrabold text-[15px]" style={{ color: 'var(--tint-ink)' }}>Note for Senseis</h2>
              </div>
              {!editing && (
                <button type="button" onClick={() => { setDraft(text); setEditing(true); }}
                  className="font-ninja text-xs font-extrabold hover:underline" style={{ color: 'var(--tint-ink)' }}>
                  {text.trim() ? 'Edit' : 'Add note'}
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-2.5">
                <LazyMarkdownEditor value={draft} onChange={setDraft}
                  placeholder="Allergies, pickup notes, learning style, or anything else the senseis should know." />
                {error && <p className="text-ninja-red font-ninja text-xs">{error}</p>}
                <div className="flex items-center gap-1">
                  <button type="button" onClick={handleSave} disabled={saving}
                    className="font-ninja text-xs font-extrabold bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                    {saving ? 'Saving…' : 'Save note'}
                  </button>
                  <button type="button" onClick={() => { setEditing(false); setDraft(text); }}
                    className="font-ninja text-xs font-extrabold px-3 py-1.5" style={{ color: 'var(--tint-ink)' }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : text.trim() ? (
              <div className="font-ninja text-sm leading-relaxed text-ninja-navy">
                <ReactMarkdown components={MARKDOWN_COMPONENTS} urlTransform={(url) => (/^(https?:|mailto:)/i.test(url) ? url : '')}>
                  {text}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="font-ninja text-sm leading-relaxed" style={{ color: 'var(--tint-ink-soft)' }}>
                Nothing pinned yet. Anything you write here shows on {active?.full_name.split(' ')[0]}'s profile for every sensei at the center.
              </p>
            )}
          </div>
        </div>
      </div>
    </ParentLayout>
  );
}
