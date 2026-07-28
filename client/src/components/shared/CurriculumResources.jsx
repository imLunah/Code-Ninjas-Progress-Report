import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileTextIcon, TriangleAlertIcon } from 'lucide-react';
import { api } from '../../api/client';
import Modal from '../ui/Modal';
import { SkeletonList } from '../ui/Skeleton';

// Reference documents for a program — passcodes today, whatever the curriculum
// hands over next. The listing carries no document bodies, so opening the tab
// doesn't pull down the answers; a body is fetched only when a doc is opened.
// Both endpoints are staff-only.

function DocBody({ slug }) {
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setDoc(null);
    setError('');
    api.get(`/curriculum/resources/${slug}`)
      .then((d) => { if (alive) setDoc(d); })
      .catch(() => { if (alive) setError('Could not load this document.'); });
    return () => { alive = false; };
  }, [slug]);

  if (error) return <p className="font-ninja text-sm text-ninja-red py-6 text-center">{error}</p>;
  if (!doc) return <SkeletonList rows={6} label="Loading document" />;

  return (
    <div>
      {doc.note && (
        <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-3 mb-4">
          <TriangleAlertIcon className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="font-ninja text-sm text-ninja-navy leading-snug">{doc.note}</p>
        </div>
      )}
      {/* The doc is mostly wide tables: they scroll inside this box rather than
          pushing the page sideways. */}
      <div className="md-view overflow-x-auto">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          urlTransform={(url) => (/^(https?:|mailto:)/i.test(url) ? url : '')}
        >
          {doc.body || ''}
        </ReactMarkdown>
      </div>
    </div>
  );
}

export default function CurriculumResources({ program, accentColor }) {
  const [docs, setDocs] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);

  useEffect(() => {
    let alive = true;
    setDocs(null);
    setError('');
    api.get(`/curriculum/resources?program=${encodeURIComponent(program)}`)
      .then((d) => { if (alive) setDocs(d || []); })
      .catch(() => { if (alive) setError('Could not load resources.'); })
    return () => { alive = false; };
  }, [program]);

  if (error) return <p className="font-ninja text-sm text-ninja-red py-6 text-center">{error}</p>;
  if (!docs) return <SkeletonList rows={2} label="Loading resources" />;

  if (docs.length === 0) {
    return (
      <p className="text-ninja-muted font-ninja text-sm py-8 text-center text-pretty">
        No resources for {program} yet.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {docs.map((d) => (
          <button
            key={d.slug}
            onClick={() => setOpen(d)}
            className="w-full flex items-center gap-3 text-left rounded-xl border border-ninja-border bg-ninja-border/10 hover:bg-ninja-border/20 px-4 py-3.5 transition-colors"
          >
            <span
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${accentColor}22` }}
            >
              <FileTextIcon className="w-4 h-4" style={{ color: accentColor }} />
            </span>
            <span className="min-w-0">
              <span className="block font-ninja font-bold text-sm text-ninja-navy truncate">{d.title}</span>
              {d.description && (
                <span className="block font-ninja text-xs text-ninja-muted truncate">{d.description}</span>
              )}
            </span>
          </button>
        ))}
      </div>

      <Modal
        isOpen={!!open}
        onClose={() => setOpen(null)}
        title={open ? `${open.program} — ${open.title}` : ''}
        width="max-w-2xl"
      >
        {open && <DocBody slug={open.slug} />}
      </Modal>
    </>
  );
}
