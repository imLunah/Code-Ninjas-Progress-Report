import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';

// WYSIWYG note editor. Senseis type plain text and markdown shortcuts
// (**bold**, *italic*, "- " / "1. " for lists) convert in place. The value is
// stored back as markdown so saved notes render identically on the profile and
// the check-in popover.
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
        class: 'tiptap-note font-ninja text-sm leading-relaxed text-amber-900 focus:outline-none min-h-[7rem]',
      },
    },
  });

  const btn = (active) =>
    `font-ninja text-sm font-bold w-8 h-8 rounded-lg transition-colors ${
      active ? 'bg-amber-200 text-amber-900' : 'text-amber-700 hover:bg-amber-100'
    }`;

  return (
    <div className="rounded-xl bg-white border border-amber-200 focus-within:border-amber-400 transition-colors overflow-hidden">
      {editor && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-amber-100 bg-amber-50/40">
          <button type="button" title="Bold" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))}>B</button>
          <button type="button" title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} className={`${btn(editor.isActive('italic'))} italic`}>I</button>
          <span className="w-px h-5 bg-amber-200 mx-1" />
          <button type="button" title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'))}>•</button>
          <button type="button" title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive('orderedList'))}>1.</button>
        </div>
      )}
      <EditorContent editor={editor} className="px-3 py-2.5" />
    </div>
  );
}
