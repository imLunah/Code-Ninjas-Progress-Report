import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const STARS = [
  { w: 220, top: '-6%',  left: '-5%',  opacity: 0.05, dur: 40 },
  { w: 100, top: '12%',  right: '6%',  opacity: 0.07, dur: 25 },
  { w:  70, top: '55%',  left: '5%',   opacity: 0.06, dur: 30 },
  { w: 150, bottom: '-5%', right: '-3%', opacity: 0.04, dur: 50 },
  { w:  50, top: '40%',  right: '20%', opacity: 0.05, dur: 20 },
];

function FloatingStar({ w, dur, opacity, ...pos }) {
  return (
    <motion.img
      src="/CodeNinjasIcon.svg"
      alt=""
      className="absolute pointer-events-none select-none"
      style={{ width: w, height: w, opacity, ...pos }}
      animate={{ rotate: 360 }}
      transition={{ duration: dur, repeat: Infinity, ease: 'linear' }}
    />
  );
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y:  0 },
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
    <div className="min-h-screen bg-ninja-navy flex items-center justify-center p-4 relative overflow-hidden">
      {/* Floating CN stars */}
      {STARS.map((s, i) => <FloatingStar key={i} {...s} />)}

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '48px 48px' }}
      />

      {/* Alpha notice */}
      <AnimatePresence>
        {!alphaDismissed && (
          <motion.div
            key="alpha-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', damping: 24, stiffness: 280 }}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center"
            >
              <img src="/CodeNinjasIcon.svg" alt="" className="w-10 h-10 mx-auto mb-3 opacity-80" />
              <h2 className="text-lg font-bold font-ninja text-ninja-navy mb-2">Early Alpha</h2>
              <p className="text-ninja-muted font-ninja text-sm leading-relaxed mb-5">
                DojoLink is still in early development. Expect bugs, missing features, and changes as we continue building. John is working very long hours on this. Thanks for your patience!
              </p>
              <button
                onClick={() => setAlphaDismissed(true)}
                className="w-full bg-ninja-blue hover:bg-ninja-blue-hover text-white font-ninja font-bold py-2.5 rounded-xl transition-colors"
              >
                Got it, let's go →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login card */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 240, delay: 0.05 }}
        className="w-full max-w-sm"
      >
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Navy header with logo */}
          <div className="relative bg-ninja-navy px-8 pt-8 pb-7 text-center overflow-hidden">
            <img src="/CodeNinjasIcon.svg" alt="" className="absolute right-3 top-3 w-14 opacity-[0.08] pointer-events-none" />
            <img src="/CodeNinjasIcon.svg" alt="" className="absolute left-2 bottom-2 w-10 opacity-[0.06] pointer-events-none" />
            <motion.img
              src="/DojoLinkLogoH.png"
              alt="DojoLink"
              className="h-14 mx-auto relative z-10"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            />
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-white/50 font-ninja text-xs mt-2 uppercase tracking-widest"
            >
              Staff Portal
            </motion.p>
          </div>

          {/* Form */}
          <motion.div
            className="px-8 py-7 space-y-4"
            variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } } }}
            initial="hidden"
            animate="show"
          >
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-50 border border-red-200 text-ninja-red rounded-xl p-3 font-ninja text-sm"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div variants={itemVariants}>
              <label className="block text-ninja-muted text-xs font-ninja font-semibold mb-1.5 uppercase tracking-wide">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-xl px-4 py-3 font-ninja focus:outline-none focus:border-ninja-blue focus:ring-2 focus:ring-ninja-blue/10 transition-all"
                placeholder="Enter username"
                required
                autoFocus
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <label className="block text-ninja-muted text-xs font-ninja font-semibold mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-xl px-4 py-3 font-ninja focus:outline-none focus:border-ninja-blue focus:ring-2 focus:ring-ninja-blue/10 transition-all"
                placeholder="Enter password"
                required
              />
            </motion.div>

            <motion.div variants={itemVariants} className="pt-1">
              <button
                type="submit"
                form="login-form"
                disabled={loading}
                onClick={handleSubmit}
                className="w-full bg-ninja-blue hover:bg-ninja-blue-hover text-white font-ninja font-bold text-base py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-ninja-blue/20"
              >
                {loading ? 'Signing in…' : 'Enter the Dojo →'}
              </button>
            </motion.div>

            <motion.div variants={itemVariants} className="pt-2 border-t border-ninja-border text-center">
              <p className="text-ninja-muted text-xs font-ninja mb-2">Signing in as a parent?</p>
              <a
                href="/parent/login"
                className="inline-block w-full bg-ninja-bg hover:bg-ninja-border border border-ninja-border text-ninja-navy font-ninja font-semibold py-2.5 rounded-xl transition-colors text-sm"
              >
                Parent Portal →
              </a>
            </motion.div>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-white/30 font-ninja text-xs mt-4"
        >
          Code Ninjas · DojoLink
        </motion.p>
      </motion.div>
    </div>
  );
}
