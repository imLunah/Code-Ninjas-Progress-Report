import { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import '../../styles/markdown.css';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { ItalicIcon, LinkIcon } from 'lucide-react';

// WYSIWYG note/log editor. Typing plain text and markdown shortcuts
// (**bold**, *italic*, "- " / "1. " for lists) converts in place. The value is
// stored back as markdown so saved content renders identically wherever it's
// shown. Shared by pinned notes, progress logs, and club logs.
// Two shells. `card` is the standalone editor used on white surfaces. `bare`
// drops the box entirely and inherits the surrounding text color, for editors
// that sit on a colored surface (sticky notes) where a second card inside the
// paper reads as a box in a box — and where `.dark .bg-white` would turn that
// inner box dark on top of a pastel note.
const btn = (active, bare) => {
  const base = 'flex items-center justify-center font-ninja text-sm font-bold rounded-lg transition-colors';
  if (bare) {
    return `${base} w-7 h-7 ${active ? 'bg-black/10 opacity-100' : 'opacity-60 hover:opacity-100'}`;
  }
  return `${base} w-8 h-8 ${active ? 'bg-ninja-blue/15 text-ninja-blue' : 'text-ninja-muted hover:bg-ninja-bg'}`;
};

export default function MarkdownEditor({ value, onChange, placeholder, variant = 'card', bodyClass = '' }) {
  const bare = variant === 'bare';
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkHref, setLinkHref] = useState('');
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        // StarterKit v3 bundles the Link extension, and its default is to OPEN
        // a link on click — so typing "code.org" mid-note and then clicking
        // near it to move the caret navigated away from the form. The editor
        // is for writing: a link here is text that happens to be a link, so it
        // still autolinks (the saved markdown carries it and the rendered log
        // makes it clickable) but never navigates from inside the editor.
        link: { openOnClick: false },
      }),
      Placeholder.configure({ placeholder: placeholder || 'Write a note…' }),
      Markdown.configure({ html: false, transformPastedText: true, transformCopiedText: true }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.storage.markdown.getMarkdown()),
    editorProps: {
      attributes: {
        class: bare
          ? 'tiptap-note tiptap-inherit font-ninja text-sm leading-relaxed focus:outline-none'
          : 'tiptap-note font-ninja text-sm leading-relaxed text-ninja-navy focus:outline-none min-h-[5.5rem]',
      },
    },
  });

  return (
    <div
      className={
        bare
          ? 'flex flex-col h-full min-h-0'
          : 'rounded-xl bg-white border border-ninja-border focus-within:border-ninja-blue transition-colors overflow-hidden'
      }
    >
      {editor && (
        <div
          className={
            bare
              ? 'flex items-center gap-0.5 pb-1.5 mb-1.5 border-b flex-shrink-0'
              : 'flex items-center gap-0.5 px-2 py-1.5 border-b border-ninja-border'
          }
          style={bare ? { borderColor: 'rgba(0,0,0,0.1)' } : undefined}
        >
          <button type="button" title="Bold" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'), bare)}>B</button>
          <button type="button" title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'), bare)}>
            <ItalicIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            title={editor.isActive('link') ? 'Remove link' : 'Link'}
            onClick={() => {
              // On a link the button undoes it; otherwise it opens the URL
              // row. The editor never navigates on click (openOnClick is
              // off), so this is the one way in and out.
              if (editor.isActive('link')) {
                editor.chain().focus().extendMarkRange('link').unsetLink().run();
              } else {
                setLinkHref('');
                setLinkOpen((o) => !o);
              }
            }}
            className={btn(editor.isActive('link') || linkOpen, bare)}
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          <span className={bare ? 'w-px h-4 mx-1 bg-current opacity-20' : 'w-px h-5 bg-ninja-border mx-1'} />
          <button type="button" title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'), bare)}>•</button>
          <button type="button" title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive('orderedList'), bare)}>1.</button>
        </div>
      )}
      {editor && linkOpen && (
        <LinkRow
          bare={bare}
          href={linkHref}
          setHref={setLinkHref}
          onCancel={() => setLinkOpen(false)}
          onApply={() => {
            let url = linkHref.trim();
            if (!url) { setLinkOpen(false); return; }
            if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
            // With text selected the selection becomes the link; with a bare
            // caret the URL itself is inserted as its own link text.
            if (editor.state.selection.empty) {
              editor.chain().focus()
                .insertContent({ type: 'text', text: url, marks: [{ type: 'link', attrs: { href: url } }] })
                .run();
            } else {
              editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
            }
            setLinkOpen(false);
          }}
        />
      )}
      <EditorContent editor={editor} className={`${bare ? 'flex-1 min-h-0 overflow-y-auto' : 'px-3 py-2.5'} ${bodyClass}`.trim()} />
    </div>
  );
}

// The inline URL row the Link button opens: an input plus Add/discard, in the
// same shell language as the toolbar above it. A prompt dialog would be the
// easy version; this keeps the flow inside the editor.
function LinkRow({ bare, href, setHref, onApply, onCancel }) {
  return (
    <div
      className={
        bare
          ? 'flex items-center gap-1.5 pb-1.5 mb-1.5 border-b flex-shrink-0'
          : 'flex items-center gap-1.5 px-3 py-1.5 border-b border-ninja-border bg-ninja-bg/60'
      }
      style={bare ? { borderColor: 'rgba(0,0,0,0.1)' } : undefined}
    >
      <input
        value={href}
        onChange={(e) => setHref(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); onApply(); }
          if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        }}
        placeholder="https://…"
        autoFocus
        className={`flex-1 min-w-0 font-ninja text-sm bg-transparent focus:outline-none ${bare ? '' : 'text-ninja-navy placeholder:text-ninja-muted'}`}
      />
      <button
        type="button"
        onClick={onApply}
        className={`font-ninja text-xs font-bold rounded px-2 py-1 ${bare ? 'opacity-80 hover:opacity-100' : 'text-ninja-blue hover:bg-ninja-blue/10'}`}
      >
        Add
      </button>
      <button
        type="button"
        title="Cancel"
        aria-label="Cancel"
        onClick={onCancel}
        className={`font-ninja text-sm font-bold rounded px-1.5 py-0.5 ${bare ? 'opacity-60 hover:opacity-100' : 'text-ninja-muted hover:text-ninja-navy'}`}
      >
        ×
      </button>
    </div>
  );
}
