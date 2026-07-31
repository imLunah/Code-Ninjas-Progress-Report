import { useState, useEffect } from 'react';
import '../../styles/markdown.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileTextIcon, ChevronRightIcon } from 'lucide-react';
import { api } from '../../api/client';
import Modal from '../ui/Modal';
import { SkeletonList } from '../ui/Skeleton';

// Reference documents for a program: passcodes today, whatever the curriculum
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

  // No overflow wrapper: the tables are fixed-layout so they always fit, and an
  // overflow-x container here would become the nearest scrollport and kill the
  // sticky column header, which needs the dialog's own scroller to stick to.
  return (
    <div className="md-view">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(url) => (/^(https?:|mailto:)/i.test(url) ? url : '')}
      >
        {doc.body || ''}
      </ReactMarkdown>
    </div>
  );
}

export default function CurriculumResources({ program }) {
  const [docs, setDocs] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);

  useEffect(() => {
    let alive = true;
    setDocs(null);
    setError('');
    api.get(`/curriculum/resources?program=${encodeURIComponent(program)}`)
      .then((d) => { if (alive) setDocs(d || []); })
      .catch(() => { if (alive) setError('Could not load resources.'); });
    return () => { alive = false; };
  }, [program]);

  if (error) return <p className="font-ninja text-sm text-ninja-red py-6 text-center">{error}</p>;
  if (!docs) return <SkeletonList rows={2} label="Loading resources" />;

  if (docs.length === 0) {
    return (
      <p className="font-ninja text-sm text-ninja-muted py-12 text-center text-pretty">
        Nothing filed under {program} yet.
      </p>
    );
  }

  return (
    <>
      {/* Same divided-row list as the modules, so the two tabs read as one page
          rather than two designs. */}
      <div>
        {docs.map((d) => (
          <button
            key={d.slug}
            onClick={() => setOpen(d)}
            className="w-full flex items-center gap-3 py-3.5 text-left border-b border-ninja-border last:border-b-0 group"
          >
            <FileTextIcon className="w-4 h-4 shrink-0 text-ninja-muted group-hover:text-ninja-navy transition-colors" />
            <span className="flex-1 min-w-0">
              <span className="block font-ninja font-bold text-sm text-ninja-navy">{d.title}</span>
              {d.description && (
                <span className="block font-ninja text-xs text-ninja-muted mt-0.5">{d.description}</span>
              )}
            </span>
            <ChevronRightIcon className="w-4 h-4 shrink-0 text-ninja-muted group-hover:text-ninja-navy transition-colors" />
          </button>
        ))}
      </div>

      <Modal
        isOpen={!!open}
        onClose={() => setOpen(null)}
        title={open ? `${open.program}: ${open.title}` : ''}
        width="max-w-2xl"
      >
        {open && <DocBody slug={open.slug} />}
      </Modal>
    </>
  );
}
