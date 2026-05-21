import { useState, useRef } from 'react';
import { api } from '../../api/client';

const CATEGORIES = [
  'Login Issue',
  'Student Progress',
  'Check-In Issue',
  'Parent Portal',
  'UI / Visual Bug',
  'Slow Performance',
  'Other',
];

// Capture recent console errors to include in bug reports
const recentConsoleErrors = [];
const _origConsoleError = console.error;
console.error = (...args) => {
  recentConsoleErrors.push(
    `[${new Date().toISOString()}] ${args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')}`
  );
  if (recentConsoleErrors.length > 20) recentConsoleErrors.shift();
  _origConsoleError(...args);
};

export default function BugReportButton({ reporter }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('File must be under 5MB.');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => setScreenshot(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post('/bugs', {
        category: category || 'Other',
        description: description.trim(),
        screenshot: screenshot || undefined,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}×${window.innerHeight}`,
        timestamp: new Date().toISOString(),
        consoleErrors: recentConsoleErrors.slice(),
        reporter,
      });
      setDone(true);
    } catch {
      setError('Failed to send. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setCategory('');
    setDescription('');
    setScreenshot(null);
    setError('');
    setDone(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-40 bg-white border border-ninja-border text-ninja-muted hover:text-ninja-navy shadow-lg rounded-full px-3 py-2 font-ninja text-xs font-semibold flex items-center gap-1.5 transition-all hover:shadow-xl"
        title="Report a bug"
      >
        <BugIcon />
        <span>Report Bug</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold font-ninja text-ninja-navy flex items-center gap-2">
                <BugIcon /> Report a Bug
              </h2>
              <button onClick={handleClose} className="text-ninja-muted hover:text-ninja-navy text-xl leading-none">✕</button>
            </div>

            {done ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-4xl">✓</p>
                <p className="font-ninja font-bold text-ninja-navy text-lg">Report sent!</p>
                <p className="text-ninja-muted font-ninja text-sm">Thanks — we'll look into it soon.</p>
                <button onClick={handleClose} className="mt-2 text-ninja-blue font-ninja text-sm font-semibold hover:underline">Close</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">

                <div>
                  <label className="block text-ninja-muted text-xs font-ninja font-semibold uppercase tracking-wide mb-1.5">
                    Category <span className="text-ninja-red">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    className="w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-xl px-3 py-2.5 font-ninja text-sm focus:outline-none focus:border-ninja-blue"
                  >
                    <option value="" disabled>Select a category</option>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-ninja-muted text-xs font-ninja font-semibold uppercase tracking-wide mb-1.5">
                    What happened? <span className="text-ninja-red">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    required
                    className="w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-xl px-3 py-2.5 font-ninja text-sm focus:outline-none focus:border-ninja-blue resize-none"
                  />
                  <p className="text-right text-ninja-muted font-ninja text-xs mt-0.5">{description.length}/2000</p>
                </div>

                <div>
                  <label className="block text-ninja-muted text-xs font-ninja font-semibold uppercase tracking-wide mb-1.5">
                    Screenshot <span className="font-normal normal-case text-ninja-muted">(optional)</span>
                  </label>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
                  {screenshot ? (
                    <div className="relative rounded-xl overflow-hidden border border-ninja-border bg-ninja-bg">
                      <img src={screenshot} alt="Preview" className="w-full max-h-48 object-contain" />
                      <button
                        type="button"
                        onClick={() => { setScreenshot(null); if (fileRef.current) fileRef.current.value = ''; }}
                        className="absolute top-2 right-2 bg-white rounded-full w-6 h-6 flex items-center justify-center text-ninja-muted hover:text-ninja-red text-sm shadow border border-ninja-border"
                      >✕</button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current.click()}
                      className="w-full border border-ninja-border rounded-xl py-4 text-ninja-muted font-ninja text-sm hover:border-ninja-blue hover:text-ninja-blue transition-colors flex items-center justify-center gap-2"
                    >
                      Attach a screenshot
                    </button>
                  )}
                </div>

                {error && <p className="text-ninja-red font-ninja text-sm">{error}</p>}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 border border-ninja-border text-ninja-muted font-ninja font-semibold text-sm py-2.5 rounded-xl hover:border-ninja-navy transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !description.trim() || !category}
                    className="flex-1 bg-ninja-blue text-white font-ninja font-bold text-sm py-2.5 rounded-xl disabled:opacity-50 hover:bg-ninja-blue-hover transition-colors"
                  >
                    {submitting ? 'Sending…' : 'Send Report'}
                  </button>
                </div>

                <p className="text-ninja-muted font-ninja text-xs text-center leading-relaxed">
                  We'll automatically include your current page, browser, screen size, and account info.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function BugIcon() {
  return (
    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
