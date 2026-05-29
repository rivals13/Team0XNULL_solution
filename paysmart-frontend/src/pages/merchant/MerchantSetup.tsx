import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MerchantSetup() {
  const [key,    setKey]    = useState('');
  const [error,  setError]  = useState('');
  const navigate = useNavigate();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) { setError('Enter your merchant API key'); return; }
    localStorage.setItem('merchantApiKey', key.trim());
    navigate('/merchant');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="bg-primary px-6 pt-16 pb-12 rounded-b-[40px]">
        <h1 className="text-3xl font-bold text-white">Merchant Access</h1>
        <p className="text-white/70 mt-1">Enter your API key to continue</p>
      </div>

      <div className="flex-1 px-6 pt-8">
        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl mb-4">{error}</div>}
        <form onSubmit={save} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600 mb-1 block">Merchant API Key</label>
            <input
              type="text" value={key} onChange={e => setKey(e.target.value)}
              placeholder="Your API key from admin registration"
              className="w-full px-4 py-4 rounded-2xl border border-gray-200 bg-gray-50 text-base focus:outline-none focus:border-primary font-mono text-sm"
            />
          </div>
          <button type="submit" className="w-full py-4 bg-primary text-white font-bold rounded-2xl">
            Continue →
          </button>
        </form>
        <p className="text-xs text-gray-400 text-center mt-4">
          API key is provided by PaySmart admin when your institution is registered.
        </p>
      </div>
    </div>
  );
}
