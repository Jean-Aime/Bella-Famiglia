import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';

export function AdminLoginPage() {
  const { signIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      setError(error);
      setLoading(false);
    } else {
      navigate('/admin/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-charcoal-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-12 text-center">
          <Logo light className="justify-center" />
          <p className="mt-4 text-xs uppercase tracking-[0.3em] text-sand-400">Administration</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs uppercase tracking-wider text-sand-400 mb-2">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-charcoal-900 border border-sand-100/15 text-sand-50 px-4 py-3.5 text-sm focus:outline-none focus:border-sand-100/40 transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-sand-400 mb-2">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-charcoal-900 border border-sand-100/15 text-sand-50 px-4 py-3.5 text-sm focus:outline-none focus:border-sand-100/40 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-clay-900/30 border border-clay-700/30 text-clay-200 text-sm px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-3 bg-sand-50 text-charcoal-900 text-sm font-medium uppercase tracking-[0.15em] py-4 transition-all duration-500 ease-out-expo hover:bg-sand-200 disabled:opacity-50"
          >
            <Lock size={16} />
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-xs text-sand-400 hover:text-sand-200 transition-colors">
            <ArrowLeft size={14} /> Back to website
          </Link>
        </div>
      </div>
    </div>
  );
}
