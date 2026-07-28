import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { ItalicIcon } from 'lucide-react';

// WYSIWYG note/log editor. Typing plain text and markdown shortcuts
// (**bold**, *italic*, "- " / "1. " for lists) converts in place. The value is
// stored back as markdown so saved content renders identically wherever it's
// shown. Shared by pinned notes, progress logs, and club logs.
const btn = (active) =>
  `flex items-center justify-center font-ninja text-sm font-bold w-8 h-8 rounded-lg transition-colors ${
    active ? 'bg-ninja-blue/15 text-ninja-blue' : 'text-ninja-muted hover:bg-ninja-bg'
  }`;

export default function MarkdownEditor({ value, onChange, placeholder }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Placeholder.configure({ placeholder: placeholder || 'Write a note…' }),
      Markdown.configure({ html: false, transformPastedText: true, transformCopiedText: true }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.storage.markdown.getMarkdown()),
    editorProps: {
      attributes: {
        class: 'tiptap-note font-ninja text-sm leading-relaxed text-ninja-navy focus:outline-none min-h-[5.5rem]',
      },
    },
  });

  return (
    <div className="rounded-xl bg-white border border-ninja-border focus-within:border-ninja-blue transition-colors overflow-hidden">
      {editor && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-ninja-border">
          <button type="button" title="Bold" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))}>B</button>
          <button type="button" title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))}>
            <ItalicIcon className="w-4 h-4" />
          </button>
          <span className="w-px h-5 bg-ninja-border mx-1" />
          <button type="button" title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'))}>•</button>
          <button type="button" title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive('orderedList'))}>1.</button>
        </div>
      )}
      <EditorContent editor={editor} className="px-3 py-2.5" />
    </div>
  );
}
