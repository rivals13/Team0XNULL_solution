/**
 * MerchantDashboard — for any institution / merchant (school, hospital, ISP, utility…)
 * Features:
 *  • Push bill to any user by phone number
 *  • Payment Methods settings: eSewa ID, Khalti ID, multiple bank accounts
 *  • Bank account selector (Nepal banks)
 *  • Bill history with status
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { merchantApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import type { Bill, BankAccount, MerchantPaymentMethods } from '../../types';
import Spinner from '../../components/Spinner';

// ── Nepal banks ───────────────────────────────────────────────────────────────
export const NEPAL_BANKS = [
  'Nepal Bank Limited (NBL)',
  'Rastriya Banijya Bank (RBB)',
  'Agricultural Development Bank (ADBL)',
  'Nabil Bank',
  'NIC Asia Bank',
  'Nepal Investment Bank (NIB)',
  'Everest Bank',
  'Himalayan Bank',
  'Global IME Bank',
  'Citizens Bank International',
  'Sunrise Bank',
  'Laxmi Sunrise Bank',
  'Prime Commercial Bank',
  'Sanima Bank',
  'NMB Bank',
  'Kumari Bank',
  'Machhapuchchhre Bank',
  'Mega Bank Nepal',
  'Century Commercial Bank',
  'Civil Bank',
  'Siddhartha Bank',
  'Bank of Kathmandu',
  'Nepal Credit & Commerce Bank',
  'Prabhu Bank',
  'Muktinath Bikas Bank',
  'Standard Chartered Bank Nepal',
];

const STATUS_STYLE: Record<string, { label: string; style: string }> = {
  PENDING:  { label: 'Pending',  style: 'bg-yellow-100 text-yellow-700' },
  PAID:     { label: 'Paid',     style: 'bg-green-100 text-green-700'   },
  OVERDUE:  { label: 'Overdue',  style: 'bg-red-100 text-red-600'       },
  DISPUTED: { label: 'Disputed', style: 'bg-purple-100 text-purple-700' },
};

type Tab = 'push' | 'settings' | 'bills';

export default function MerchantDashboard() {
  const navigate      = useNavigate();
  const { clearAuth } = useAuthStore();
  const apiKey        = localStorage.getItem('merchantApiKey') ?? '';

  const [tab,        setTab]        = useState<Tab>('push');
  const [bills,      setBills]      = useState<Bill[]>([]);
  const [profile,    setProfile]    = useState<{ name: string; slug: string; category: string; paymentMethods?: MerchantPaymentMethods } | null>(null);
  const [loading,    setLoading]    = useState(true);

  // ── Push Bill form ─────────────────────────────────────────────────────────
  const [pushForm,     setPushForm]     = useState({ student_phone: '', amount: '', due_date: '', description: '' });
  const [submitting,   setSubmitting]   = useState(false);
  const [pushSuccess,  setPushSuccess]  = useState('');
  const [pushError,    setPushError]    = useState('');

  // ── Payment Methods form ──────────────────────────────────────────────────
  const [pm,         setPm]         = useState<{
    esewaId:  string; khaltiId: string;
    banks: Array<BankAccount & { _id: number }>;
  }>({ esewaId: '', khaltiId: '', banks: [] });
  const [pmSaving,   setPmSaving]   = useState(false);
  const [pmSuccess,  setPmSuccess]  = useState('');
  const [pmError,    setPmError]    = useState('');
  const [addingBank, setAddingBank] = useState(false);
  const [newBank,    setNewBank]    = useState<BankAccount>({
    bankName: '', accountNumber: '', accountHolder: '', branchCode: '',
  });

  useEffect(() => {
    if (!apiKey) { navigate('/merchant/setup'); return; }
    Promise.all([
      merchantApi.getBills(apiKey),
      merchantApi.getProfile(apiKey),
    ]).then(([b, p]) => {
      setBills(b.data);
      setProfile(p);
      // Pre-fill payment methods form from profile
      const methods = (p as typeof p & { paymentMethods?: MerchantPaymentMethods }).paymentMethods;
      if (methods) {
        setPm({
          esewaId:  methods.esewa  ?? '',
          khaltiId: methods.khalti ?? '',
          banks:    (methods.banks ?? []).map((b, i) => ({ ...b, _id: i })),
        });
      }
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, [apiKey, navigate]);

  // ── Push bill ──────────────────────────────────────────────────────────────
  const pushBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setPushError(''); setPushSuccess('');
    if (!pushForm.amount || Number(pushForm.amount) <= 0) {
      setPushError('Amount must be greater than NPR 0.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await merchantApi.pushBill(apiKey, {
        student_phone: pushForm.student_phone,
        amount:        Number(pushForm.amount),
        due_date:      pushForm.due_date,
        description:   pushForm.description,
      });
      setPushSuccess(` Bill sent! ID: ${result.billId}`);
      setPushForm({ student_phone: '', amount: '', due_date: '', description: '' });
      merchantApi.getBills(apiKey).then(b => setBills(b.data)).catch(() => {});
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPushError(msg ?? 'Failed to push bill');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Save payment methods ──────────────────────────────────────────────────
  const savePaymentMethods = async () => {
    setPmError(''); setPmSuccess('');
    setPmSaving(true);
    try {
      await merchantApi.updatePaymentMethods(apiKey, {
        esewaId:      pm.esewaId  || undefined,
        khaltiId:     pm.khaltiId || undefined,
        bankAccounts: pm.banks.length
          ? pm.banks.map(({ _id: _,  ...rest }) => rest)
          : undefined,
      });
      setPmSuccess(' Payment methods saved successfully!');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPmError(msg ?? 'Failed to save payment methods');
    } finally {
      setPmSaving(false);
    }
  };

  const addBank = () => {
    if (!newBank.bankName || !newBank.accountNumber || !newBank.accountHolder) {
      setPmError('Fill in all bank account fields'); return;
    }
    setPm(p => ({
      ...p,
      banks: [...p.banks, { ...newBank, _id: Date.now() }],
    }));
    setNewBank({ bankName: '', accountNumber: '', accountHolder: '', branchCode: '' });
    setAddingBank(false);
    setPmError('');
  };

  const removeBank = (id: number) =>
    setPm(p => ({ ...p, banks: p.banks.filter(b => b._id !== id) }));

  const logout = () => {
    clearAuth();
    localStorage.removeItem('merchantApiKey');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary px-5 pt-12 pb-4 rounded-b-[32px]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/70 text-xs uppercase tracking-wide">Merchant Portal</p>
            <h1 className="text-white font-bold text-xl">{profile?.name ?? '—'}</h1>
            <span className="text-white/60 text-xs capitalize">{profile?.category?.toLowerCase()}</span>
          </div>
          <button onClick={logout}
            className="text-white/70 text-sm bg-white/10 px-3 py-1.5 rounded-xl">
            Logout
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 bg-white/10 p-1 rounded-2xl">
          {([
            { id: 'push',     label: '📤 Push Bill' },
            { id: 'settings', label: '⚙️ Payment' },
            { id: 'bills',    label: '📋 History' },
          ] as { id: Tab; label: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                tab === t.id ? 'bg-white text-primary' : 'text-white/70'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-5 pb-10">

        {/* ════════════════════════════ PUSH BILL TAB ══════════════════════ */}
        {tab === 'push' && (
          <div className="bg-white rounded-2xl p-5 shadow-card">
            <h2 className="font-bold text-gray-800 mb-1">📤 Push Bill to User</h2>
            <p className="text-gray-400 text-xs mb-4">
              Send a bill to any PaySmart user by their registered phone number. Works for any institution — school, hospital, ISP, utility…
            </p>

            {pushSuccess && <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-xl mb-4 font-medium">{pushSuccess}</div>}
            {pushError   && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">{pushError}</div>}

            {/* Show payment methods summary so merchant can verify */}
            {(pm.esewaId || pm.khaltiId || pm.banks.length > 0) && (
              <div className="bg-[#E8F5EE] border border-primary/20 rounded-xl p-3 mb-4">
                <p className="text-xs font-bold text-primary mb-1.5">📲 Your payment methods (sent with bill)</p>
                {pm.esewaId  && <p className="text-xs text-gray-600">🟢 eSewa: <strong>{pm.esewaId}</strong></p>}
                {pm.khaltiId && <p className="text-xs text-gray-600">🟣 Khalti: <strong>{pm.khaltiId}</strong></p>}
                {pm.banks.map((b, i) => (
                  <p key={i} className="text-xs text-gray-600">
                    🏦 {b.bankName}: <strong>{b.accountNumber}</strong> ({b.accountHolder})
                  </p>
                ))}
              </div>
            )}

            {!pm.esewaId && !pm.khaltiId && pm.banks.length === 0 && (
              <button
                onClick={() => setTab('settings')}
                className="w-full mb-4 py-2.5 border-2 border-dashed border-amber-300 text-amber-600 text-xs font-semibold rounded-xl"
              >
                ⚠️ No payment methods set — tap to add eSewa/bank →
              </button>
            )}

            <form onSubmit={pushBill} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">User's Registered Phone</label>
                <input
                  type="tel"
                  value={pushForm.student_phone}
                  onChange={e => setPushForm(p => ({ ...p, student_phone: e.target.value }))}
                  placeholder="9841234567"
                  required
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-primary"
                />
                <p className="text-gray-400 text-[10px] mt-1 px-1">
                  User must be registered on PaySmart with this phone number
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Amount (NPR)</label>
                <input
                  type="number"
                  value={pushForm.amount}
                  onChange={e => {
                    const v = e.target.value;
                    if (v !== '' && Number(v) <= 0) return;
                    setPushForm(p => ({ ...p, amount: v }));
                  }}
                  placeholder="5500"
                  required min="1" step="1"
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Due Date</label>
                <input
                  type="date"
                  value={pushForm.due_date}
                  onChange={e => setPushForm(p => ({ ...p, due_date: e.target.value }))}
                  required
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Description</label>
                <input
                  type="text"
                  value={pushForm.description}
                  onChange={e => setPushForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Second semester fee — 2026"
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <button
                type="submit" disabled={submitting}
                className="w-full py-4 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? <><Spinner size={18} /> Sending…</> : '📤 Push Bill'}
              </button>
            </form>
          </div>
        )}

        {/* ════════════════════════ PAYMENT SETTINGS TAB ══════════════════ */}
        {tab === 'settings' && (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-card">
              <h2 className="font-bold text-gray-800 mb-1">⚙️ Payment Settings</h2>
              <p className="text-gray-400 text-xs mb-4 leading-relaxed">
                Add your payment accounts. When you push a bill, users see these as <strong>locked</strong> payment targets — they cannot be changed by the user, ensuring payment always reaches the right account.
              </p>

              {pmSuccess && <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-xl mb-4 font-medium">{pmSuccess}</div>}
              {pmError   && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">{pmError}</div>}

              {/* eSewa */}
              <div className="mb-4">
                <label className="text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-2 block">
                  <span className="text-xl">🟢</span> eSewa ID
                </label>
                <input
                  type="tel"
                  value={pm.esewaId}
                  onChange={e => setPm(p => ({ ...p, esewaId: e.target.value }))}
                  placeholder="eSewa-registered phone (e.g. 9841234567)"
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-primary"
                />
                <p className="text-gray-400 text-[10px] mt-1 px-1">Your organisation's eSewa-linked phone number</p>
              </div>

              {/* Khalti */}
              <div className="mb-5">
                <label className="text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-2 block">
                  <span className="text-xl">🟣</span> Khalti ID
                </label>
                <input
                  type="tel"
                  value={pm.khaltiId}
                  onChange={e => setPm(p => ({ ...p, khaltiId: e.target.value }))}
                  placeholder="Khalti-registered phone (e.g. 9841234567)"
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              {/* Bank accounts */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <span className="text-xl">🏦</span> Bank Accounts
                  </label>
                  <button
                    onClick={() => { setAddingBank(true); setPmError(''); }}
                    className="text-xs text-primary font-bold border border-primary/30 rounded-xl px-3 py-1.5"
                  >
                    + Add Bank
                  </button>
                </div>

                {pm.banks.length === 0 && !addingBank && (
                  <p className="text-gray-400 text-xs text-center py-3 border border-dashed border-gray-200 rounded-xl">
                    No bank accounts added yet
                  </p>
                )}

                {/* Saved bank cards */}
                <div className="flex flex-col gap-2 mb-3">
                  {pm.banks.map((b) => (
                    <div key={b._id} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-bold text-gray-800">{b.bankName}</p>
                          <p className="text-xs font-mono text-gray-600 mt-0.5">{b.accountNumber}</p>
                          <p className="text-xs text-gray-500">{b.accountHolder}</p>
                          {b.branchCode && <p className="text-[10px] text-gray-400">{b.branchCode}</p>}
                        </div>
                        <button onClick={() => removeBank(b._id)} className="text-red-400 text-sm mt-0.5">✕</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add bank form */}
                {addingBank && (
                  <div className="border-2 border-primary/20 rounded-2xl p-4 bg-[#F8FFF9]">
                    <p className="text-xs font-bold text-primary mb-3">New Bank Account</p>

                    <div className="mb-3">
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Select Bank *</label>
                      <select
                        value={newBank.bankName}
                        onChange={e => setNewBank(b => ({ ...b, bankName: e.target.value }))}
                        className="w-full px-3 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-primary"
                      >
                        <option value="">— Choose bank —</option>
                        {NEPAL_BANKS.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Account Number *</label>
                      <input
                        type="text"
                        value={newBank.accountNumber}
                        onChange={e => setNewBank(b => ({ ...b, accountNumber: e.target.value }))}
                        placeholder="e.g. 0110100123456701"
                        className="w-full px-3 py-3 rounded-xl border border-gray-200 bg-white text-sm font-mono focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="mb-3">
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Account Holder Name *</label>
                      <input
                        type="text"
                        value={newBank.accountHolder}
                        onChange={e => setNewBank(b => ({ ...b, accountHolder: e.target.value }))}
                        placeholder="e.g. Himalayan College Pvt. Ltd."
                        className="w-full px-3 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Branch (optional)</label>
                      <input
                        type="text"
                        value={newBank.branchCode}
                        onChange={e => setNewBank(b => ({ ...b, branchCode: e.target.value }))}
                        placeholder="e.g. Baneshwor, Kathmandu"
                        className="w-full px-3 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={addBank}
                        className="flex-1 py-2.5 bg-primary text-white font-bold rounded-xl text-sm"
                      >
                        Add Account
                      </button>
                      <button
                        onClick={() => { setAddingBank(false); setNewBank({ bankName: '', accountNumber: '', accountHolder: '', branchCode: '' }); }}
                        className="flex-1 py-2.5 border border-gray-200 text-gray-500 font-medium rounded-xl text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={savePaymentMethods}
                disabled={pmSaving}
                className="w-full py-4 bg-primary text-white font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {pmSaving ? <><Spinner size={18} /> Saving…</> : '💾 Save Payment Settings'}
              </button>
            </div>

            {/* Info card */}
            <div className="bg-white rounded-2xl p-4 shadow-card">
              <p className="text-xs font-bold text-gray-600 mb-2">🔒 How it works</p>
              <div className="flex flex-col gap-1.5">
                {[
                  'You add your eSewa/Khalti number and bank accounts here',
                  'When you push a bill, these accounts are embedded in the notification',
                  'The student sees them as locked — they cannot be changed',
                  'Payment goes directly to your verified account',
                  'Works for any organisation: school, hospital, ISP, municipality…',
                ].map((t, i) => <p key={i} className="text-xs text-gray-500">• {t}</p>)}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════ BILL HISTORY TAB ═══════════════════ */}
        {tab === 'bills' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-800">Bill History</h2>
              <span className="text-xs text-gray-400">{bills.length} total</span>
            </div>
            {bills.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl shadow-card">
                <p className="text-3xl mb-3">📋</p>
                <p className="text-gray-400 text-sm">No bills pushed yet</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {bills.map(b => {
                  const st = STATUS_STYLE[b.status] ?? { label: b.status, style: 'bg-gray-100 text-gray-500' };
                  return (
                    <div key={b.id} className="bg-white rounded-2xl p-4 shadow-card">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 mr-3">
                          <p className="font-semibold text-gray-800 text-sm truncate">
                            {b.user?.name ?? 'User'}
                          </p>
                          <p className="text-gray-400 text-xs truncate">
                            📱 {b.user?.phone} · {b.description}
                          </p>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${st.style}`}>
                          {st.label}
                        </span>
                      </div>
                      <div className="flex justify-between mt-3 pt-3 border-t border-gray-50">
                        <span className="text-primary font-bold text-sm">NPR {b.amount.toLocaleString()}</span>
                        <span className="text-gray-400 text-xs">
                          Due: {new Date(b.dueDate).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
