import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import Spinner from '../../components/Spinner';

export default function Register() {
  const [form, setForm]       = useState({ name: '', phone: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const { setAuth }           = useAuthStore();
  const navigate              = useNavigate();

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.register(form);
      setAuth(data.user, data.accessToken, data.refreshToken);
      navigate('/onboarding');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Registration failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="bg-primary px-6 pt-16 pb-10 rounded-b-[40px]">
        <h1 className="text-3xl font-bold text-white">Create Account</h1>
        <p className="text-white/70 mt-1">Start managing your bills smartly</p>
      </div>

      <div className="flex-1 px-6 pt-6 pb-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-2xl mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handle} className="flex flex-col gap-4">
          {[
            { label: 'Full Name',     key: 'name',     type: 'text',     placeholder: 'Ram Prasad Sharma', minLength: undefined },
            { label: 'Phone Number',  key: 'phone',    type: 'tel',      placeholder: '9801234567',         minLength: undefined },
            { label: 'Email',         key: 'email',    type: 'email',    placeholder: 'ram@example.com',    minLength: undefined },
            { label: 'Password',      key: 'password', type: 'password', placeholder: '••••••••',           minLength: 8 },
          ].map(({ label, key, type, placeholder, minLength }) => (
            <div key={key}>
              <label className="text-sm font-medium text-gray-600 mb-1 block">{label}</label>
              <input
                type={type}
                value={form[key as keyof typeof form]}
                onChange={set(key as keyof typeof form)}
                placeholder={placeholder}
                required={key !== 'phone'}
                minLength={minLength}
                className="w-full px-4 py-4 rounded-2xl border border-gray-200 bg-gray-50 text-base focus:outline-none focus:border-primary focus:bg-white"
              />
            </div>
          ))}

          <button
            type="submit" disabled={loading}
            className="w-full py-4 bg-primary text-white font-bold rounded-2xl mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Spinner size={20} /> : null}
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-semibold">Login</Link>
        </p>
      </div>
    </div>
  );
}
