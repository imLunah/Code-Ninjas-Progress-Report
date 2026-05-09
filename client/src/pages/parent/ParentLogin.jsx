import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParentAuth } from '../../context/ParentAuthContext';
import Button from '../../components/ui/Button';

export default function ParentLogin() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { parent, login } = useParentAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (parent) navigate('/parent/dashboard', { replace: true });
  }, [parent]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email.trim());
      navigate('/parent/dashboard');
    } catch (err) {
      setError(err.message || 'No students found linked to that email address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ninja-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/DojoLinkLogoH.svg" alt="DojoLink" className="h-14 mx-auto mb-4" />
          <h1 className="text-2xl font-bold font-ninja text-ninja-navy">Parent Portal</h1>
          <p className="text-ninja-muted font-ninja text-sm mt-1">
            Enter the email address on your child's account
          </p>
        </div>

        <div className="bg-white border border-ninja-border rounded-2xl shadow-sm p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-ninja-red rounded-lg p-3 mb-4 text-sm font-ninja">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="you@email.com"
                className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </div>

        <p className="text-center text-ninja-muted font-ninja text-xs mt-6">
          Staff?{' '}
          <a href="/login" className="text-ninja-blue hover:underline">
            Sign in here
          </a>
        </p>
      </div>
    </div>
  );
}
