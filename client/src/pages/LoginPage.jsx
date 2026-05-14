import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const stagger = {
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.25 } },
};
const item = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [alphaDismissed, setAlphaDismissed] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(username, password);
      navigate(user.role === 'manager' ? '/manager/dashboard' : '/sensei/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ninja-bg flex items-center justify-center p-4 relative overflow-hidden">

      {/* Soft radial glow behind the card */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 600, height: 600,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(0,106,221,0.07) 0%, transparent 70%)',
        }}
      />

      {/* Very subtle floating CN stars in background */}
      {[
        { size: 180, top: '8%',   left: '-3%',  opacity: 0.04, dur: 45 },
        { size:  90, bottom: '10%', right: '-2%', opacity: 0.05, dur: 30 },
        { size:  55, top: '60%',  left: '8%',   opacity: 0.04, dur: 35 },
      ].map((s, i) => (
        <motion.img
          key={i}
          src="/CodeNinjasIcon.svg"
          alt=""
          className="absolute pointer-events-none select-none"
          style={{ width: s.size, height: s.size, top: s.top, bottom: s.bottom, left: s.left, right: s.right, opacity: s.opacity }}
          animate={{ rotate: 360 }}
          transition={{ duration: s.dur, repeat: Infinity, ease: 'linear' }}
        />
      ))}

      {/* Alpha notice modal */}
      <AnimatePresence>
        {!alphaDismissed && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 12 }}
              animate={{ scale: 1,    opacity: 1, y:  0 }}
              exit={{    scale: 0.94, opacity: 0, y: 12 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center"
            >
              <motion.div
                initial={{ rotate: -15, scale: 0.8 }}
                animate={{ rotate: 0,   scale: 1    }}
                transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                className="text-3xl mb-3"
              >
                🚧
              </motion.div>
              <h2 className="text-lg font-bold font-ninja text-ninja-navy mb-2">Early Alpha</h2>
              <p className="text-ninja-muted font-ninja text-sm leading-relaxed mb-5">
                DojoLink is still in early development. Expect bugs, missing features, and changes as we continue building. John is working very long hours on this. Thanks for your patience!
              </p>
              <button
                onClick={() => setAlphaDismissed(true)}
                className="w-full bg-ninja-blue hover:bg-ninja-blue-hover text-white font-ninja font-bold py-2.5 rounded-lg transition-colors"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login card */}
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0,  scale: 1    }}
        transition={{ type: 'spring', damping: 22, stiffness: 220, delay: 0.05 }}
      >
        <div className="bg-white rounded-2xl shadow-lg p-8">

          {/* Branding */}
          <div className="text-center mb-8">
            <motion.img
              src="/DojoLinkLogoH.png"
              alt="DojoLink"
              className="h-48 mx-auto mb-3"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1    }}
              transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 0.12 }}
            />
            <motion.div
              className="h-0.5 bg-gradient-to-r from-transparent via-ninja-blue to-transparent"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
            />
          </div>

          {/* Form */}
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">

            <motion.h2 variants={item} className="text-xl font-bold font-ninja text-ninja-navy mb-2 text-center">
              Sign In
            </motion.h2>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y:  0, height: 'auto' }}
                  exit={{    opacity: 0, y: -6, height: 0 }}
                  transition={{ duration: 0.22 }}
                  className="bg-red-50 border border-red-200 text-ninja-red rounded-lg p-3 font-ninja text-sm"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div variants={item}>
              <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 tracking-wide uppercase">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-3 font-ninja focus:outline-none focus:border-ninja-blue focus:ring-2 focus:ring-ninja-blue/10 transition-all"
                placeholder="Enter username"
                required
                autoFocus
              />
            </motion.div>

            <motion.div variants={item}>
              <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 tracking-wide uppercase">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-3 font-ninja focus:outline-none focus:border-ninja-blue focus:ring-2 focus:ring-ninja-blue/10 transition-all"
                placeholder="Enter password"
                required
              />
            </motion.div>

            <motion.div variants={item} className="pt-1">
              <motion.button
                type="submit"
                disabled={loading}
                onClick={handleSubmit}
                whileTap={{ scale: 0.98 }}
                className="relative w-full bg-ninja-blue text-white font-ninja font-bold text-lg py-3 rounded-lg transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                style={{ boxShadow: loading ? 'none' : '0 4px 24px rgba(0,106,221,0.25)' }}
              >
                {/* Shimmer on hover */}
                <motion.span
                  className="absolute inset-0 bg-white/10"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                />
                <span className="relative">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.span
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                      />
                      Signing In…
                    </span>
                  ) : 'Enter the Dojo'}
                </span>
              </motion.button>
            </motion.div>

            <motion.div variants={item} className="mt-6 pt-5 border-t border-ninja-border text-center">
              <p className="text-ninja-muted text-sm font-ninja mb-2">Signing in as a parent?</p>
              <a
                href="/parent/login"
                className="inline-block w-full bg-ninja-bg hover:bg-ninja-border border border-ninja-border text-ninja-navy font-ninja font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                Parent Portal →
              </a>
            </motion.div>

          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
