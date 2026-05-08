import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

          <p className="text-ninja-muted text-xs font-ninja text-center mt-6">
            Code Ninjas Dojo Management System
          </p>
        </div>
      </div>
    </div>
  );
}
