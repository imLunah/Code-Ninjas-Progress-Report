import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useParentAuth } from '../context/ParentAuthContext';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y:  0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

function EyeIcon({ open }) {
  return open ? (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/>
    </svg>
  );
}

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') === 'parent' ? 'parent' : 'staff');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [alphaDismissed, setAlphaDismissed] = useState(false);
  const { login } = useAuth();
  const { login: parentLogin } = useParentAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'parent') {
        await parentLogin(parentEmail.trim());
        navigate('/parent/dashboard');
      } else {
        const user = await login(username, password);
        navigate(user.role === 'manager' ? '/manager/dashboard' : '/sensei/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-start sm:justify-center px-5 sm:px-6 py-8 sm:py-12">

      {/* Alpha notice */}
      <AnimatePresence>
        {!alphaDismissed && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 14 }}
              animate={{ scale: 1,    opacity: 1, y:  0 }}
              exit={{    scale: 0.94, opacity: 0, y: 14 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center"
            >
              <motion.div
                initial={{ rotate: -15, scale: 0.7 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                className="text-3xl mb-3"
              >🚧</motion.div>
              <h2 className="text-lg font-bold font-ninja text-ninja-navy mb-2">Early Alpha</h2>
              <p className="text-ninja-muted font-ninja text-sm leading-relaxed mb-5">
                DojoLink is still in early development. Expect bugs, missing features, and changes as we continue building. John is working very long hours on this. Thanks for your patience!
              </p>
              <button
                onClick={() => setAlphaDismissed(true)}
                className="w-full bg-ninja-blue hover:bg-ninja-blue-hover text-white font-ninja font-bold py-2.5 rounded-xl transition-colors"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="w-full max-w-lg"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {/* DojoLink logo — big and prominent */}
        <motion.div variants={fadeUp} className="mb-5 sm:mb-8">
          <img src="/DojoLinkLogoH.png" alt="DojoLink" className="h-11 sm:h-16 w-auto" />
        </motion.div>

        {/* Hero copy */}
        <motion.p variants={fadeUp} className="text-ninja-blue font-ninja font-bold text-xs sm:text-sm uppercase tracking-widest mb-1.5 sm:mb-2">
          Welcome back, Ninja
        </motion.p>
        <motion.h1 variants={fadeUp} className="text-ninja-navy font-ninja font-black text-3xl sm:text-4xl lg:text-5xl leading-tight mb-2 sm:mb-3">
          Sign in to your dojo.
        </motion.h1>
        <AnimatePresence mode="wait">
          {tab === 'parent' && (
            <motion.p
              key="parent-sub"
              variants={fadeUp}
              initial="hidden" animate="show" exit="hidden"
              className="text-ninja-muted font-ninja text-sm sm:text-base leading-relaxed mb-5 sm:mb-8"
            >
              Enter the email address linked to your child's account.
            </motion.p>
          )}
          {tab === 'staff' && (
            <motion.div key="staff-spacer" className="mb-5 sm:mb-8" />
          )}
        </AnimatePresence>

        {/* Tab switcher */}
        <motion.div variants={fadeUp} className="relative flex bg-ninja-bg border border-ninja-border rounded-2xl p-1 mb-4 sm:mb-6">
          <motion.div
            className="absolute top-1 bottom-1 bg-white rounded-xl shadow-sm"
            layout
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            style={{ width: 'calc(50% - 4px)', left: tab === 'staff' ? 4 : 'calc(50%)' }}
          />
          {[{ id: 'staff', label: 'Sensei / Director' }, { id: 'parent', label: 'Parent' }].map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setError(''); }}
              className={`relative z-10 flex-1 py-2.5 font-ninja font-bold text-sm rounded-xl transition-colors duration-200 ${
                tab === t.id ? 'text-ninja-navy' : 'text-ninja-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </motion.div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          <AnimatePresence mode="wait">
            {tab === 'staff' ? (
              <motion.div
                key="staff-form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{    opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="space-y-4"
              >
                {/* Username */}
                <div>
                  <label className="block text-ninja-navy font-ninja font-bold text-xs uppercase tracking-widest mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. sensei_alex"
                    required
                    autoFocus
                    className="w-full border border-ninja-border text-ninja-navy rounded-xl px-4 py-3 sm:py-3.5 font-ninja text-base focus:outline-none focus:border-ninja-blue focus:ring-2 focus:ring-ninja-blue/10 transition-all bg-white"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-ninja-navy font-ninja font-bold text-xs uppercase tracking-widest mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••"
                      required
                      className="w-full border border-ninja-border text-ninja-navy rounded-xl px-4 py-3 sm:py-3.5 pr-12 font-ninja text-base focus:outline-none focus:border-ninja-blue focus:ring-2 focus:ring-ninja-blue/10 transition-all bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-ninja-muted hover:text-ninja-navy transition-colors"
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>
                </div>

                {/* Keep me signed in */}
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={keepSignedIn}
                      onChange={(e) => setKeepSignedIn(e.target.checked)}
                      className="sr-only"
                    />
                    <motion.div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                        keepSignedIn ? 'bg-ninja-blue border-ninja-blue' : 'border-ninja-border bg-white'
                      }`}
                      whileTap={{ scale: 0.85 }}
                    >
                      <AnimatePresence>
                        {keepSignedIn && (
                          <motion.svg
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{   scale: 0, opacity: 0 }}
                            transition={{ type: 'spring', damping: 16, stiffness: 400 }}
                            className="w-3 h-3 text-white"
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                          </motion.svg>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </div>
                  <span className="font-ninja text-sm text-ninja-navy group-hover:text-ninja-blue transition-colors">
                    Keep me signed in on this device
                  </span>
                </label>
              </motion.div>
            ) : (
              <motion.div
                key="parent-form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{    opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <label className="block text-ninja-navy font-ninja font-bold text-xs uppercase tracking-widest mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                  autoFocus
                  className="w-full border border-ninja-border text-ninja-navy rounded-xl px-4 py-3 sm:py-3.5 font-ninja text-base focus:outline-none focus:border-ninja-blue focus:ring-2 focus:ring-ninja-blue/10 transition-all bg-white"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{    opacity: 0, height: 0 }}
                className="bg-red-50 border border-red-200 text-ninja-red rounded-xl px-4 py-3 font-ninja text-sm"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* CTA */}
          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.985 }}
            className="relative w-full bg-ninja-blue text-white font-ninja font-bold text-lg py-4 rounded-2xl overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ boxShadow: '0 6px 32px rgba(0,106,221,0.28)' }}
          >
            <motion.span
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              initial={{ x: '-100%' }}
              whileHover={{ x: '100%' }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            />
            <span className="relative flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <motion.span
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                  />
                  Signing in…
                </>
              ) : (
                <>
                  {tab === 'parent' ? 'Go to Parent Portal' : 'Enter the dojo'} →
                </>
              )}
            </span>
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
