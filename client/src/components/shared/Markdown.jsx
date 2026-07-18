import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Shared markdown styling. react-markdown does NOT render raw HTML by default,
// so user input is safe — no extra sanitizer needed.
const mdComponents = {
  h1: ({ children }) => <h1 className="text-lg font-bold font-ninja text-ninja-navy mt-3 mb-2 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-bold font-ninja text-ninja-navy mt-3 mb-1.5 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-bold font-ninja text-ninja-navy mt-2 mb-1 first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  // list-outside + padding: with list-inside, a loose list (blank line between
  // items) wraps li content in a block <p>, shoving the text onto the line
  // BELOW its bullet. Outside markers sit in the gutter regardless.
  ul: ({ children }) => <ul className="list-disc list-outside pl-5 mb-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-outside pl-5 mb-2 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed [&>p]:mb-1 [&>p:last-child]:mb-0">{children}</li>,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-ninja-blue hover:underline">{children}</a>,
  code: ({ children }) => <code className="bg-ninja-border/20 px-1 rounded font-mono text-xs">{children}</code>,
  blockquote: ({ children }) => <blockquote className="border-l-2 border-ninja-blue/50 pl-3 italic text-ninja-muted my-2">{children}</blockquote>,
  hr: () => <hr className="border-ninja-border my-3" />,
};

export default function Markdown({ children }) {
  return (
    <div className="font-ninja text-sm text-ninja-navy">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{children || ''}</ReactMarkdown>
    </div>
  );
}
