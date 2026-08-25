import { useEditor, EditorContent } from '@tiptap/react';
import '../../styles/markdown.css';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { ItalicIcon } from 'lucide-react';

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
          <span className={bare ? 'w-px h-4 mx-1 bg-current opacity-20' : 'w-px h-5 bg-ninja-border mx-1'} />
          <button type="button" title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'), bare)}>•</button>
          <button type="button" title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive('orderedList'), bare)}>1.</button>
        </div>
      )}
      <EditorContent editor={editor} className={`${bare ? 'flex-1 min-h-0 overflow-y-auto' : 'px-3 py-2.5'} ${bodyClass}`.trim()} />
    </div>
  );
}
