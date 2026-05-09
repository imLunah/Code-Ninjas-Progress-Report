import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
      if (user.role === 'manager') {
        navigate('/manager/dashboard');
      } else {
        navigate('/sensei/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ninja-bg flex items-center justify-center p-4">
      {/* Alpha notice modal */}
      {!alphaDismissed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
            <div className="text-3xl mb-3">🚧</div>
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
          </div>
        </div>
      )}
      <div className="w-full max-w-md">
        {/* White Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Branding */}
          <div className="text-center mb-8">
            <img src="/DojoLinkLogoH.svg" alt="Code Ninjas" className="h-48 mx-auto mb-3" />
            <div className="mt-4 h-0.5 bg-gradient-to-r from-transparent via-ninja-blue to-transparent" />
          </div>

          <h2 className="text-xl font-bold font-ninja text-ninja-navy mb-6 text-center">
            Sign In
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-ninja-red rounded-lg p-3 mb-4 font-ninja text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 tracking-wide uppercase">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-3 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
                placeholder="Enter username"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 tracking-wide uppercase">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-3 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
                placeholder="Enter password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ninja-blue hover:bg-ninja-blue-hover text-white font-ninja font-bold text-lg py-3 rounded-lg transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing In...' : 'Enter the Dojo'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-ninja-border text-center">
            <p className="text-ninja-muted text-sm font-ninja mb-2">Signing in as a parent?</p>
            <a
              href="/parent/login"
              className="inline-block w-full bg-ninja-bg hover:bg-ninja-border border border-ninja-border text-ninja-navy font-ninja font-semibold py-2.5 rounded-lg transition-colors text-sm"
            >
              Parent Portal →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
