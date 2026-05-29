import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import Spinner from '../../components/Spinner';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const { setAuth }             = useAuthStore();
  const navigate                = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.login({ email, password });
      setAuth(data.user, data.accessToken, data.refreshToken);
      if (data.user.role === 'MERCHANT') {
        navigate('/merchant');
      } else {
        // First-time PaySmart user → show onboarding welcome screen
        const onboarded = localStorage.getItem('paysmart_onboarded') === 'true';
        navigate(onboarded ? '/dashboard' : '/onboarding');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Login failed. Check your credentials.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-primary px-6 pt-16 pb-12 rounded-b-[40px]">
        <h1 className="text-3xl font-bold text-white">Welcome back 👋</h1>
        <p className="text-white/70 mt-1">Sign in to your PaySmart account</p>
      </div>

      <div className="flex-1 px-6 pt-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-2xl mb-5">
            {error}
          </div>
        )}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600 mb-1 block">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required
              className="w-full px-4 py-4 rounded-2xl border border-gray-200 bg-gray-50 text-base focus:outline-none focus:border-primary focus:bg-white"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 mb-1 block">Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
              className="w-full px-4 py-4 rounded-2xl border border-gray-200 bg-gray-50 text-base focus:outline-none focus:border-primary focus:bg-white"
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full py-4 bg-primary text-white font-bold rounded-2xl mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Spinner size={20} /> : null}
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary font-semibold">Register</Link>
        </p>

        {/* Demo hint */}
        <div className="mt-8 p-4 bg-green-50 rounded-2xl border border-green-100">
          <p className="text-xs text-gray-500 font-medium mb-1">🧪 Demo Credentials</p>
          <p className="text-xs text-gray-400">Email: demo@paysmart.com</p>
          <p className="text-xs text-gray-400">Password: demo1234</p>
        </div>
      </div>
    </div>
  );
}
