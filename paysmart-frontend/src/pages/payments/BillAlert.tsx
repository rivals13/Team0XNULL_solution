import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paymentsApi } from '../../api';
import type { PaymentProvider, BankAccount } from '../../types';
import Spinner from '../../components/Spinner';

const ALL_PROVIDERS: Array<{ id: PaymentProvider | 'BANK'; label: string; logo: string; color: string }> = [
  { id: 'ESEWA',  label: 'eSewa',           logo: '🟢', color: 'border-green-500  bg-green-50'  },
  { id: 'KHALTI', label: 'Khalti',          logo: '🟣', color: 'border-purple-500 bg-purple-50' },
  { id: 'WALLET', label: 'PaySmart Wallet', logo: '💚', color: 'border-primary bg-[#E8F5EE]'     },
  { id: 'BANK',   label: 'Bank Transfer',   logo: '🏦', color: 'border-blue-500  bg-blue-50'    },
];

export default function BillAlert() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const biller      = params.get('biller')      ?? 'Unknown Biller';
  const amount      = Number(params.get('amount') ?? 0);
  const dueDate     = params.get('dueDate')     ?? '';
  const description = params.get('description') ?? '';
  const billId      = params.get('billId')      ?? '';
  const accountId   = params.get('accountId')   ?? '';   // non-editable recipient ref
  const category    = params.get('category')    ?? '';
  // Merchant payment methods (passed from notification metadata)
  const esewaId     = params.get('esewaId')     ?? '';
  const khaltiId    = params.get('khaltiId')    ?? '';
  const banksParam  = params.get('banks')       ?? '[]';
  const merchantBanks: BankAccount[] = (() => { try { return JSON.parse(banksParam); } catch { return []; } })();
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(
    merchantBanks.length > 0 ? merchantBanks[0] : null
  );

  // Auto-select the first provider the merchant actually has configured
  const [provider, setProvider] = useState<PaymentProvider | 'BANK'>(
    esewaId ? 'ESEWA' : khaltiId ? 'KHALTI' : merchantBanks.length > 0 ? 'BANK' : 'WALLET'
  );
  const [paying,   setPaying]   = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState('');

  const daysLeft  = dueDate
    ? Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000)
    : null;

  const urgency     = daysLeft === null ? '' : daysLeft <= 0 ? 'OVERDUE' : daysLeft === 1 ? 'DUE TOMORROW' : `DUE IN ${daysLeft} DAYS`;
  const headerColor = daysLeft !== null && daysLeft <= 0 ? 'bg-red-500' : 'bg-primary';

  const categoryEmoji = (() => {
    const c = category.toUpperCase();
    if (c === 'ELECTRICITY') return '⚡';
    if (c === 'WATER')       return '💧';
    if (c === 'INTERNET')    return '🌐';
    if (c === 'TV')          return '📺';
    if (c === 'TRAFFIC')     return '🚔';
    if (c === 'EDUCATION')   return '🎓';
    return '🏫';
  })();

  // ── Pay Now ──────────────────────────────────────────────────────────────
  const payNow = async () => {
    if (provider === 'BANK' && !selectedBank) {
      setError('Please select a bank account to pay via bank transfer.');
      return;
    }
    setPaying(true);
    setError('');
    try {
      await paymentsApi.execute({
        amount,
        provider: provider === 'BANK' ? 'ESEWA' : provider, // map BANK → ESEWA in backend for now
        recipientId: provider === 'BANK' && selectedBank
          ? selectedBank.accountNumber
          : (esewaId && provider === 'ESEWA' ? esewaId : (khaltiId && provider === 'KHALTI' ? khaltiId : biller)),
        description: description || `${biller} bill payment`,
        ...(billId ? { billId } : {}),
      });
      setSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Payment failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    const providerInfo = ALL_PROVIDERS.find(p => p.id === provider)!;
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center px-8 text-center">
        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-5 animate-bounce">
          <span className="text-5xl">✅</span>
        </div>
        <h2 className="text-white font-bold text-2xl mb-2">Payment Successful!</h2>
        <p className="text-white/80 text-base">NPR {amount.toLocaleString()} paid to</p>
        <p className="text-white font-bold text-lg">{biller}</p>
        <p className="text-white/60 text-sm mt-1">via {providerInfo.label}</p>
        <p className="text-white/60 text-sm mt-2">An SMS confirmation has been sent to your registered number.</p>

        <div className="bg-white/10 rounded-2xl p-4 mt-6 w-full text-left">
          <div className="flex justify-between py-2 border-b border-white/10">
            <span className="text-white/60 text-sm">Amount</span>
            <span className="text-white font-semibold">NPR {amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-white/10">
            <span className="text-white/60 text-sm">Paid to</span>
            <span className="text-white font-semibold">{biller}</span>
          </div>
          {accountId && (
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-white/60 text-sm">Account</span>
              <span className="text-white font-semibold">{accountId}</span>
            </div>
          )}
          <div className="flex justify-between py-2">
            <span className="text-white/60 text-sm">Paid via</span>
            <span className="text-white font-semibold">{providerInfo.logo} {providerInfo.label}</span>
          </div>
        </div>

        <button onClick={() => navigate('/dashboard')}
          className="mt-6 bg-white text-primary font-bold px-10 py-4 rounded-2xl w-full">
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Alert header */}
      <div className={`${headerColor} px-5 pt-14 pb-10 rounded-b-[40px]`}>
        <div className="text-center">
          {urgency && (
            <span className="inline-block text-white/90 text-xs font-bold tracking-widest px-3 py-1 bg-white/20 rounded-full mb-4">
              {urgency}
            </span>
          )}
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">{categoryEmoji}</span>
          </div>
          <h2 className="text-white font-bold text-2xl">{biller}</h2>
          {description && <p className="text-white/80 text-sm mt-1">{description}</p>}
        </div>
      </div>

      <div className="flex-1 px-5 pt-6 pb-10 overflow-y-auto">
        {/* ── Bill details ── */}
        <div className="bg-gray-50 rounded-3xl p-5 mb-5">
          <div className="text-center mb-5">
            <p className="text-gray-400 text-sm">Amount Due</p>
            <p className="text-4xl font-bold text-gray-800 mt-1">NPR {amount.toLocaleString()}</p>
          </div>
          <div className="flex flex-col gap-2.5">
            {dueDate && (
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Due Date</span>
                <span className="text-gray-700 font-semibold text-sm">
                  {new Date(dueDate).toLocaleDateString('en-NP', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            )}
            {/* Non-editable merchant account — locked */}
            <div className="flex justify-between items-center border-t border-gray-100 pt-2.5 mt-1">
              <span className="text-gray-400 text-sm">Paying to</span>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-700 font-semibold text-sm">{biller}</span>
                <span className="text-gray-300 text-xs">🔒</span>
              </div>
            </div>
            {accountId && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Account</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-600 font-medium text-sm font-mono">{accountId}</span>
                  <span className="text-gray-300 text-xs">🔒</span>
                </div>
              </div>
            )}
          </div>
          {(biller || accountId) && (
            <p className="text-gray-400 text-[10px] text-center mt-3">
              🔒 Payment recipient is set by the merchant and cannot be changed
            </p>
          )}
        </div>

        {/* ── Merchant payment accounts (locked) ── */}
        {(esewaId || khaltiId || merchantBanks.length > 0) && (
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3.5 mb-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">
              🔒 Merchant payment accounts (cannot be changed)
            </p>
            {esewaId  && <div className="flex items-center gap-2 mb-1.5"><span>🟢</span><div><p className="text-[9px] text-gray-400">eSewa</p><p className="text-sm font-bold text-gray-800">{esewaId}</p></div></div>}
            {khaltiId && <div className="flex items-center gap-2 mb-1.5"><span>🟣</span><div><p className="text-[9px] text-gray-400">Khalti</p><p className="text-sm font-bold text-gray-800">{khaltiId}</p></div></div>}
            {merchantBanks.map((b, i) => (
              <div key={i} className="flex items-start gap-2 mb-1.5">
                <span className="mt-0.5">🏦</span>
                <div>
                  <p className="text-[9px] text-gray-400">{b.bankName}</p>
                  <p className="text-xs font-bold text-gray-800 font-mono">{b.accountNumber}</p>
                  <p className="text-[10px] text-gray-500">{b.accountHolder}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Payment provider selection ── */}
        <p className="text-sm font-bold text-gray-700 mb-3">Choose Payment Method</p>
        <div className="flex flex-col gap-2.5 mb-3">
          {ALL_PROVIDERS
            // Only show eSewa if merchant has eSewa ID (or no merchant accounts set)
            // Only show Khalti if merchant has Khalti ID (or no merchant accounts set)
            // Always show Wallet and Bank if merchant has bank accounts
            .filter(p => {
              const hasAccounts = esewaId || khaltiId || merchantBanks.length > 0;
              if (!hasAccounts) return p.id !== 'BANK' || merchantBanks.length > 0;
              if (p.id === 'ESEWA')  return !!esewaId;
              if (p.id === 'KHALTI') return !!khaltiId;
              if (p.id === 'BANK')   return merchantBanks.length > 0;
              return true; // WALLET always available
            })
            .map(p => (
              <button
                key={p.id}
                onClick={() => setProvider(p.id as PaymentProvider | 'BANK')}
                className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border-2 transition-all active:scale-[0.99] ${
                  provider === p.id ? p.color : 'border-gray-100 bg-white'
                }`}
              >
                <span className="text-2xl">{p.logo}</span>
                <div className="flex-1 text-left">
                  <span className={`font-semibold text-sm ${provider === p.id ? 'text-gray-800' : 'text-gray-600'}`}>
                    {p.label}
                  </span>
                  {p.id === 'ESEWA'  && esewaId  && <p className="text-[10px] text-gray-400">Account: {esewaId}</p>}
                  {p.id === 'KHALTI' && khaltiId  && <p className="text-[10px] text-gray-400">Account: {khaltiId}</p>}
                  {p.id === 'BANK'   && selectedBank && (
                    <p className="text-[10px] text-gray-400">{selectedBank.bankName}</p>
                  )}
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  provider === p.id ? 'border-primary' : 'border-gray-300'
                }`}>
                  {provider === p.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
              </button>
            ))}
        </div>

        {/* Bank account selector — shown when bank transfer is selected */}
        {provider === 'BANK' && merchantBanks.length > 1 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">Select bank account</p>
            <div className="flex flex-col gap-2">
              {merchantBanks.map((b, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedBank(b)}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                    selectedBank?.accountNumber === b.accountNumber
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-100 bg-white'
                  }`}
                >
                  <span className="text-xl mt-0.5">🏦</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-800">{b.bankName}</p>
                    <p className="text-xs font-mono text-gray-600">{b.accountNumber}</p>
                    <p className="text-[10px] text-gray-500">{b.accountHolder}</p>
                    {b.branchCode && <p className="text-[10px] text-gray-400">{b.branchCode}</p>}
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 mt-1 flex-shrink-0 ${
                    selectedBank?.accountNumber === b.accountNumber ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                  }`} />
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl mb-4">{error}</div>
        )}

        {/* ── Actions ── */}
        <div className="flex flex-col gap-3">
          <button
            onClick={payNow}
            disabled={paying}
            className="w-full py-4 bg-primary text-white font-bold rounded-2xl text-base flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {paying ? <><Spinner size={20} /> Processing...</> : `⚡ Pay NPR ${amount.toLocaleString()}`}
          </button>
          <button
            onClick={() => {
              const q = new URLSearchParams({
                name:           `${biller} Payment`,
                amount:         String(amount),
                recipientId:    biller,                          // merchant display name
                paymentAccount: accountId || biller,             // actual eSewa / bank account no.
                description:    description || `${biller} bill payment`,
                dueDate:        dueDate,
              });
              navigate(`/schedules/new?${q}`);
            }}
            className="w-full py-4 border-2 border-primary text-primary font-bold rounded-2xl text-base">
            📅 Schedule for Later
          </button>
          <button onClick={() => navigate(-1)}
            className="w-full py-3 text-gray-400 font-medium rounded-2xl text-sm">
            🔔 Remind Me Tomorrow
          </button>
        </div>
      </div>
    </div>
  );
}
