import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useParentAuth } from '../../context/ParentAuthContext';
import { useParentPortal } from '../../context/ParentPortalContext';
import { useLightOnly } from '../../context/ThemeContext';
import StaffBadge from '../../components/shared/StaffBadge';
import Logo from '../../components/ui/Logo';

// A parent's first sign-in. The same shape as the staff welcome: a short
// walk, with their ID card beside it printing what they type. Name, then
// phone and relationship, then the card turns over to show the ninjas it
// belongs to. Saving writes the parent_profiles row; having one is what
// lets ParentRoute through to the rest of the portal.
//
// Light only, like the rest of the parent portal.

const STEPS = ['welcome', 'name', 'details', 'done'];
const RELATIONSHIPS = ['Mom', 'Dad', 'Guardian', 'Grandparent', 'Other'];

const slide = {
  enter: (dir) => ({ x: dir > 0 ? 64 : -64, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -64 : 64, opacity: 0 }),
};
const transition = { x: { type: 'spring', stiffness: 360, damping: 34 }, opacity: { duration: 0.2 } };

function splitName(full = '') {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] || '', last: parts.slice(1).join(' ') || '' };
}

// "Ava", "Ava & Max", "Ava, Max & Zoe".
function listNames(names) {
  if (names.length <= 1) return names[0] || '';
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

const INPUT = 'w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-ninja-border text-ninja-navy font-ninja text-sm focus:border-ninja-blue focus:outline-none transition-colors';
const PRIMARY = 'flex-1 py-3.5 rounded-xl bg-ninja-blue text-white font-ninja font-bold text-sm hover:bg-ninja-blue/90 transition-colors disabled:opacity-50';

export default function ParentWelcomePage() {
  useLightOnly();
  const { parent, saveProfile } = useParentAuth();
  const portal = useParentPortal();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);

  const onFile = splitName(parent?.prefill?.name || '');
  const [first, setFirst] = useState(onFile.first);
  const [last, setLast] = useState(onFile.last);
  const [phone, setPhone] = useState(parent?.prefill?.phone || '');
  const [relationship, setRelationship] = useState('');

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fullName = `${first.trim()} ${last.trim()}`.trim();
  const firstName = first.trim() || 'there';
  const kids = (portal?.students || []).map((s) => s.full_name.split(' ')[0]);

  // The card prints the form live: the name as typed, and on the back the
  // ninjas this card is for, with the relationship and phone under them.
  const badgeProps = {
    name: fullName,
    role: 'Parent',
    center: parent?.centerName,
    username: listNames(kids),
    idLabel: kids.length > 1 ? 'Ninjas' : 'Ninja',
    idPlaceholder: 'your ninja',
    details: [
      relationship && { label: 'Relationship', value: relationship },
      phone.trim() && { label: 'Phone', value: phone.trim() },
    ].filter(Boolean),
    side: step === 3 ? 'back' : 'front',
  };

  const go = (delta) => { setError(''); setDir(delta); setStep((s) => Math.min(Math.max(s + delta, 0), STEPS.length - 1)); };

  const confirmName = () => {
    if (!first.trim() || !last.trim()) { setError('Please enter your first and last name.'); return; }
    go(1);
  };

  const finish = async () => {
    setError('');
    setSaving(true);
    try {
      await saveProfile({ first_name: first.trim(), last_name: last.trim(), phone: phone.trim() || null, relationship: relationship || null });
      navigate('/parent/dashboard', { replace: true });
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] bg-ninja-bg flex flex-col lg:items-center lg:justify-center overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/onboarding-bg.webp)' }} />
      <div className="absolute inset-0 bg-gradient-to-b from-ninja-bg/70 via-ninja-bg/85 to-ninja-bg lg:from-ninja-bg/60 lg:via-ninja-bg/70 lg:to-ninja-bg/85" />

      <div className="relative flex-1 lg:flex-none flex flex-col max-w-md lg:max-w-4xl w-full mx-auto px-6 pt-[max(env(safe-area-inset-top),28px)] pb-[max(env(safe-area-inset-bottom),28px)] lg:my-10 lg:px-10 lg:py-10 lg:rounded-3xl lg:border lg:border-ninja-border lg:bg-ninja-bg/75 lg:backdrop-blur-xl lg:shadow-2xl lg:grid lg:grid-cols-[380px,minmax(0,1fr)] lg:gap-10 lg:items-center">
        {/* Desktop keeps the card beside every step, including the flip. */}
        <div className="hidden lg:flex items-center justify-center">
          <StaffBadge {...badgeProps} />
        </div>

        <div className="flex flex-col flex-1 min-h-0 lg:flex-none">
          {/* Progress */}
          <div className="flex items-center gap-1.5 py-2">
            {STEPS.map((name, i) => (
              <motion.span
                key={name}
                className="h-1.5 rounded-full bg-ninja-blue"
                animate={{ width: i === step ? 26 : 8, opacity: i <= step ? 1 : 0.25 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            ))}
          </div>

          {/* Phone: the card shows once the form is done with the keyboard.
              The name and details steps bring it up, and a card plus a
              keyboard plus inputs does not fit a fixed-height shell. */}
          {step === 3 && (
            <div className="lg:hidden flex justify-center">
              <StaffBadge {...badgeProps} scale={0.42} />
            </div>
          )}

          <div className="flex-1 min-h-0 lg:flex-none lg:h-[460px] relative overflow-hidden">
            <AnimatePresence mode="popLayout" custom={dir} initial={false}>
              {step === 0 && (
                <motion.div
                  key="welcome" custom={dir} variants={slide}
                  initial="enter" animate="center" exit="exit" transition={transition}
                  className="absolute inset-0 flex flex-col items-center justify-center text-center"
                >
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.05 }}
                    className="mb-8"
                  >
                    <Logo variant="mark" className="h-28 text-ninja-navy" />
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
                    className="text-ninja-blue font-ninja font-bold text-sm tracking-wide uppercase mb-2"
                  >
                    Welcome to
                  </motion.p>
                  <motion.h1
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}
                    className="mb-3"
                  >
                    <Logo variant="wordmark" className="h-10 text-ninja-navy" />
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
                    className="text-ninja-muted font-ninja text-sm leading-relaxed max-w-xs"
                  >
                    {parent?.centerName ? `Code Ninjas ${parent.centerName}` : 'Your center'} has set up a parent account for you. Let's make it yours. It only takes a minute.
                  </motion.p>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div
                  key="name" custom={dir} variants={slide}
                  initial="enter" animate="center" exit="exit" transition={transition}
                  className="absolute inset-0 flex flex-col justify-center"
                >
                  <h2 className="text-2xl font-black font-ninja text-ninja-navy mb-1.5">What's your name?</h2>
                  <p className="text-ninja-muted font-ninja text-sm mb-7">
                    {onFile.first ? 'The front desk wrote this down. Make sure it looks right.' : 'So the senseis know who they are talking to.'}
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="pw-first" className="block text-ninja-muted font-ninja text-xs font-semibold mb-1.5">First name</label>
                      <input id="pw-first" value={first} onChange={(e) => setFirst(e.target.value)} autoFocus autoComplete="given-name" className={INPUT} />
                    </div>
                    <div>
                      <label htmlFor="pw-last" className="block text-ninja-muted font-ninja text-xs font-semibold mb-1.5">Last name</label>
                      <input id="pw-last" value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" className={INPUT} onKeyDown={(e) => { if (e.key === 'Enter') confirmName(); }} />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="details" custom={dir} variants={slide}
                  initial="enter" animate="center" exit="exit" transition={transition}
                  className="absolute inset-0 flex flex-col justify-center"
                >
                  <h2 className="text-2xl font-black font-ninja text-ninja-navy mb-1.5">Nice to meet you, {firstName}.</h2>
                  <p className="text-ninja-muted font-ninja text-sm mb-7">A couple of things for the front desk. Both are optional.</p>
                  <div className="space-y-5">
                    <div>
                      <label htmlFor="pw-phone" className="block text-ninja-muted font-ninja text-xs font-semibold mb-1.5">Phone number</label>
                      <input id="pw-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="(714) 555-0123" className={INPUT} />
                      <p className="mt-1.5 font-ninja text-[12px] text-ninja-muted">The number the center should call about {kids.length === 1 ? kids[0] : 'your ninjas'}.</p>
                    </div>
                    <div>
                      <p className="block text-ninja-muted font-ninja text-xs font-semibold mb-1.5">I'm {kids.length === 1 && kids[0] ? `${kids[0]}'s` : 'their'}</p>
                      <div className="flex flex-wrap gap-2" role="group" aria-label="Relationship">
                        {RELATIONSHIPS.map((r) => {
                          const on = relationship === r;
                          return (
                            <button
                              key={r}
                              type="button"
                              aria-pressed={on}
                              onClick={() => setRelationship(on ? '' : r)}
                              className={`px-4 py-2 rounded-full font-ninja font-bold text-sm border transition-colors ${
                                on ? 'bg-ninja-blue border-ninja-blue text-white' : 'border-ninja-border text-ninja-navy hover:border-ninja-blue/60'
                              }`}
                            >
                              {r}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="done" custom={dir} variants={slide}
                  initial="enter" animate="center" exit="exit" transition={transition}
                  className="absolute inset-0 flex flex-col justify-center"
                >
                  <h2 className="text-2xl font-black font-ninja text-ninja-navy mb-1.5">You're all set, {firstName}.</h2>
                  <p className="text-ninja-muted font-ninja text-sm mb-6">
                    Here's your card. Inside you'll find {kids.length === 1 && kids[0] ? `${kids[0]}'s` : 'your ninjas\''} belts, classes and progress, and how busy the dojo is right now.
                  </p>
                  <dl className="rounded-2xl border border-ninja-border bg-white/[0.03] px-5 py-4 grid grid-cols-[auto,1fr] gap-x-5 gap-y-2 font-ninja text-sm">
                    <dt className="text-ninja-muted">Name</dt><dd className="text-ninja-navy font-bold">{fullName}</dd>
                    <dt className="text-ninja-muted">Phone</dt><dd className="text-ninja-navy font-bold">{phone.trim() || <span className="text-ninja-muted font-normal">Not given</span>}</dd>
                    <dt className="text-ninja-muted">Relationship</dt><dd className="text-ninja-navy font-bold">{relationship || <span className="text-ninja-muted font-normal">Not given</span>}</dd>
                  </dl>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="text-ninja-red font-ninja text-sm text-center pt-3"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-3 pt-5">
            {step > 0 ? (
              <motion.button
                whileTap={{ scale: 0.96 }} onClick={() => go(-1)} disabled={saving}
                className="px-5 py-3 rounded-xl bg-white/[0.04] border border-ninja-border text-ninja-navy font-ninja font-semibold text-sm hover:border-ninja-blue/60 transition-colors"
              >
                Back
              </motion.button>
            ) : <div className="w-px" />}

            {step === 0 && <motion.button whileTap={{ scale: 0.97 }} onClick={() => go(1)} className={PRIMARY}>Let's go</motion.button>}
            {step === 1 && <motion.button whileTap={{ scale: 0.97 }} onClick={confirmName} className={PRIMARY}>Continue</motion.button>}
            {step === 2 && <motion.button whileTap={{ scale: 0.97 }} onClick={() => go(1)} className={PRIMARY}>{phone.trim() || relationship ? 'Continue' : 'Skip for now'}</motion.button>}
            {step === 3 && (
              <motion.button whileTap={{ scale: 0.97 }} onClick={finish} disabled={saving} className={PRIMARY}>
                {saving ? 'Saving…' : 'Go to my portal'}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
