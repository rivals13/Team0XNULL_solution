import { IoChevronBack } from 'react-icons/io5';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paymentsApi } from '../../api';
import Spinner from '../../components/Spinner';

export default function PaymentConfirm() {
  const [params]    = useSearchParams();
  const navigate    = useNavigate();
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [jobId,    setJobId]    = useState('');
  const [error,    setError]    = useState('');

  const payee       = params.get('payee')       ?? 'Recipient';
  const amount      = Number(params.get('amount') ?? 0);
  const provider    = params.get('provider')    ?? 'ESEWA';
  const description = params.get('description') ?? '';

  const confirm = async () => {
    setError('');
    setLoading(true);
    try {
      const job = await paymentsApi.queue({ amount, provider, recipientId: payee, description });
      setJobId(job.jobId);
      setSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center px-8 text-center">
        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6">
          <span className="text-5xl">✅</span>
        </div>
        <h2 className="text-white font-bold text-2xl mb-2">Payment Queued!</h2>
        <p className="text-white/80">NPR {amount.toLocaleString()} to {payee}</p>
        <p className="text-white/60 text-xs mt-2">Job ID: {jobId}</p>
        <p className="text-white/60 text-sm mt-1">You'll receive a notification when it completes.</p>
        <button onClick={() => navigate('/dashboard')} className="mt-8 bg-white text-primary font-bold px-8 py-4 rounded-2xl">
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-primary px-5 pt-12 pb-6 rounded-b-[32px]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white flex items-center justify-center w-8 h-8 rounded-xl bg-white/15 active:bg-white/25"><IoChevronBack className="w-5 h-5" /></button>
          <h1 className="text-white font-bold text-xl">Confirm Payment</h1>
        </div>
      </div>

      <div className="px-5 pt-8">
        {/* Summary card */}
        <div className="bg-gray-50 rounded-3xl p-6 mb-6">
          <div className="text-center mb-6">
            <p className="text-gray-400 text-sm">You're paying</p>
            <p className="text-4xl font-bold text-gray-800 mt-1">NPR {amount.toLocaleString()}</p>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Recipient',  value: payee },
              { label: 'Provider',   value: provider },
              { label: 'Description', value: description || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-gray-400 text-sm">{label}</span>
                <span className="text-gray-700 font-medium text-sm">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl mb-4">{error}</div>}

        <button
          onClick={confirm} disabled={loading}
          className="w-full py-4 bg-primary text-white font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <><Spinner size={20} /> Processing...</> : '🔒 Confirm & Pay'}
        </button>
        <button onClick={() => navigate(-1)} className="w-full py-3 text-gray-400 text-sm mt-2">
          Cancel
        </button>
      </div>
    </div>
  );
}
