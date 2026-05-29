import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { schedulesApi } from '../../api';
import Spinner from '../../components/Spinner';
import { BsWallet2 } from 'react-icons/bs';
import {
  BsLightningCharge, BsWifi, BsTv, BsHouseDoor,
} from 'react-icons/bs';
import { FaWater } from 'react-icons/fa';
import { IoSchoolOutline } from 'react-icons/io5';
import { RiCarLine } from 'react-icons/ri';
import { MdOutlineSend } from 'react-icons/md';

// ── Bill categories for manual schedule creation ──────────────────────────────
const BILL_CATEGORIES = [
  { id: 'ELECTRICITY', label: 'Electricity', icon: <BsLightningCharge className="w-5 h-5" />,
    defaultName: 'NEA Electricity Bill',
    idLabel: 'SC Number', idPlaceholder: 'e.g. SC-1234567',
    accountLabel: 'NEA Payment ID / eSewa No.', accountPlaceholder: 'NEA eSewa-linked number' },
  { id: 'WATER', label: 'Water', icon: <FaWater className="w-5 h-5" />,
    defaultName: 'KUKL Water Bill',
    idLabel: 'Client Code', idPlaceholder: 'e.g. KUKL-12345',
    accountLabel: 'KUKL eSewa No. / Bank A/C', accountPlaceholder: 'KUKL payment number' },
  { id: 'INTERNET', label: 'Internet', icon: <BsWifi className="w-5 h-5" />,
    defaultName: 'Internet Bill',
    idLabel: 'Customer ID / Username', idPlaceholder: 'e.g. WL-12345',
    accountLabel: 'ISP eSewa No. / Account', accountPlaceholder: 'Provider payment number' },
  { id: 'TV', label: 'TV / Cable', icon: <BsTv className="w-5 h-5" />,
    defaultName: 'TV / Cable Bill',
    idLabel: 'Smart Card No.', idPlaceholder: 'e.g. 1234567890',
    accountLabel: 'Provider eSewa No.', accountPlaceholder: 'DishHome / TataPlay number' },
  { id: 'EDUCATION', label: 'Education', icon: <IoSchoolOutline className="w-5 h-5" />,
    defaultName: 'School / College Fee',
    idLabel: 'Student ID / Roll No.', idPlaceholder: 'e.g. STU-2026-001',
    accountLabel: 'Institution eSewa / Bank A/C', accountPlaceholder: 'School / college payment no.' },
  { id: 'TRAFFIC', label: 'Traffic Fine', icon: <RiCarLine className="w-5 h-5" />,
    defaultName: 'Traffic Fine Payment',
    idLabel: 'Chit Number', idPlaceholder: 'e.g. TC-2082-001',
    accountLabel: 'Traffic Police eSewa No.', accountPlaceholder: 'Nepal Traffic Police number' },
  { id: 'CUSTOM', label: 'Other', icon: <MdOutlineSend className="w-5 h-5" />,
    defaultName: '',
    idLabel: 'Pay To', idPlaceholder: 'Merchant name or phone number',
    accountLabel: 'eSewa / Bank Account No.', accountPlaceholder: 'Recipient payment number' },
];

const ESEWA_LOGO = (
  <img
    src="https://e7.pngegg.com/pngimages/261/608/png-clipart-esewa-zone-office-bayalbas-google-play-iphone-iphone-electronics-text-thumbnail.png"
    style={{ width: '22px', height: '22px', objectFit: 'contain', borderRadius: '5px' }}
    alt="eSewa"
  />
);

const PROVIDERS: Array<{ id: string; label: string; logo: React.ReactNode }> = [
  { id: 'ESEWA',  label: 'eSewa',           logo: ESEWA_LOGO },
  { id: 'WALLET', label: 'PaySmart Wallet', logo: <BsWallet2 className="w-5 h-5 text-primary" /> },
];

const FREQUENCIES = ['ONCE', 'MONTHLY', 'QUARTERLY', 'WEEKLY', 'BIWEEKLY', 'YEARLY'];

export default function NewSchedule() {
  const navigate   = useNavigate();
  const [params]   = useSearchParams();

  // ── Is this pre-filled from a merchant bill? ──────────────────────────────
  const fromMerchant     = !!params.get('amount');
  const merchantName     = params.get('recipientId') ?? params.get('name') ?? '';  // display only
  const paymentAccount   = params.get('paymentAccount') ?? merchantName;            // actual eSewa/bank no.

  // ── Category selection (manual mode only) ──────────────────────────────────
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const catMeta = BILL_CATEGORIES.find(c => c.id === selectedCat);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    name:        params.get('name')        ?? '',
    amount:      params.get('amount')      ?? '',
    provider:    'ESEWA',
    accountId:   '',          // SC no. / client code / student ID (for manual)
    recipientId: paymentAccount,  // actual payment identifier (eSewa / bank no.)
    frequency:   'MONTHLY',
    nextRunAt: (() => {
      const due = params.get('dueDate');
      if (!due) return '';
      const d = new Date(due);
      if (d.getTime() <= Date.now() + 10 * 60 * 1000) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        return tomorrow.toISOString().slice(0, 16);
      }
      return d.toISOString().slice(0, 16);
    })(),
    description: params.get('description') ?? '',
  });

  const [prefs, setPrefs] = useState({
    autoPayEnabled:   false,
    smsReminder:      true,
    pushNotification: true,
    partialPayment:   false,
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState('');

  const set = (k: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm(p => ({ ...p, [k]: e.target.value }));

  const togglePref = (k: keyof typeof prefs) =>
    setPrefs(p => ({ ...p, [k]: !p[k] }));

  // Pick a category (manual mode) — auto-fills name
  const pickCategory = (catId: string) => {
    setSelectedCat(catId);
    const cat = BILL_CATEGORIES.find(c => c.id === catId)!;
    setForm(p => ({
      ...p,
      name: p.name || cat.defaultName,
      accountId:   '',
      recipientId: '',
    }));
    setError('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // In manual mode, require category
    if (!fromMerchant && !selectedCat) {
      setError('Please select a bill type first.');
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      setError('Amount must be greater than NPR 0.');
      return;
    }
    if (!form.nextRunAt) {
      setError('Please select a date and time for the payment.');
      return;
    }
    const chosen = new Date(form.nextRunAt);
    if (isNaN(chosen.getTime())) {
      setError('Please select a valid date and time.');
      return;
    }
    if (chosen.getTime() <= Date.now() + 2 * 60 * 1000) {
      setError('Please choose a date/time at least 2 minutes in the future.');
      return;
    }

    // Build final recipientId: for manual, use accountId as the payment ID
    const finalRecipientId = fromMerchant
      ? form.recipientId
      : (form.recipientId || form.accountId || '');

    if (!finalRecipientId) {
      setError('Please enter a payment account number or the bill ID.');
      return;
    }

    setLoading(true);
    try {
      await schedulesApi.create({
        name:        form.name,
        amount:      Number(form.amount),
        provider:    form.provider,
        recipientId: finalRecipientId,
        frequency:   form.frequency,
        nextRunAt:   chosen.toISOString(),
        description: [
          form.description,
          prefs.autoPayEnabled   ? '[AUTO-PAY]' : '',
          prefs.smsReminder      ? '[SMS]'       : '',
          prefs.pushNotification ? '[PUSH]'      : '',
        ].filter(Boolean).join(' '),
      });
      setSuccess(true);
      setTimeout(() => navigate('/schedules'), 2500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })
        ?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to create schedule'));
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center px-8 text-center">
        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-5">
          <span className="text-4xl">✅</span>
        </div>
        <h2 className="text-white font-bold text-2xl mb-2">Schedule Created!</h2>
        {prefs.autoPayEnabled && (
          <p className="text-white/90 text-sm bg-white/15 rounded-xl px-4 py-2 mb-2">⚡ Auto-pay is ON</p>
        )}
        {prefs.smsReminder && (
          <p className="text-white/80 text-sm">📱 SMS reminder will be sent before each payment</p>
        )}
        <p className="text-white/60 text-xs mt-3">Redirecting to schedules…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-primary px-5 pt-12 pb-6 rounded-b-[32px]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white text-xl">←</button>
          <div>
            <h1 className="text-white font-bold text-xl">
              {fromMerchant ? 'Schedule Payment' : 'New Schedule'}
            </h1>
            {fromMerchant && (
              <p className="text-white/70 text-xs mt-0.5">Bill from {merchantName}</p>
            )}
          </div>
        </div>
      </div>

      {/* Reminder banner */}
      <div className="mx-5 mt-5 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex gap-3 items-start">
        <span className="text-xl">⏰</span>
        <div>
          <p className="text-blue-700 text-sm font-semibold">Auto reminders included</p>
          <p className="text-blue-500 text-xs mt-0.5">
            SMS + push notification <strong>1 day before</strong> and <strong>1 hour before</strong>. Enable auto-pay below to pay automatically.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="px-5 pt-5 pb-10 flex flex-col gap-5">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl">{error}</div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            MERCHANT BILL MODE — company name + payment account both locked
            ═══════════════════════════════════════════════════════════════════ */}
        {fromMerchant && (
          <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Paying To</p>

            {/* Company / merchant name — locked */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Company / Merchant Name</label>
              <div className="flex items-center gap-2 px-4 py-3.5 rounded-xl bg-white border border-gray-200">
                <span className="flex-1 text-gray-800 font-semibold text-sm">{merchantName}</span>
                <span className="text-gray-300 text-sm">🔒</span>
              </div>
            </div>

            {/* Payment account number — locked */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Payment Account (eSewa / Bank No.)
              </label>
              <div className="flex items-center gap-2 px-4 py-3.5 rounded-xl bg-white border border-gray-200">
                <span className={`flex-1 font-mono text-sm ${paymentAccount ? 'text-gray-800 font-semibold' : 'text-gray-400 italic'}`}>
                  {paymentAccount || 'Not provided by merchant'}
                </span>
                <span className="text-gray-300 text-sm">🔒</span>
              </div>
              <p className="text-gray-400 text-[10px] mt-1 px-1">
                Set by the merchant — cannot be changed for security
              </p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            MANUAL MODE — category picker first, then relevant ID fields
            ═══════════════════════════════════════════════════════════════════ */}
        {!fromMerchant && (
          <div>
            <label className="text-sm font-bold text-gray-700 mb-3 block">
              What do you want to schedule?
            </label>
            <div className="grid grid-cols-4 gap-2">
              {BILL_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => pickCategory(cat.id)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all active:scale-95 ${
                    selectedCat === cat.id
                      ? 'border-primary bg-[#E8F5EE] text-primary'
                      : 'border-gray-100 bg-gray-50 text-gray-500'
                  }`}
                >
                  <span className="flex items-center justify-center">{cat.icon}</span>
                  <span className={`text-[10px] font-semibold text-center leading-tight ${
                    selectedCat === cat.id ? 'text-primary' : 'text-gray-600'
                  }`}>
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Manual: category-specific fields (shown after category pick) */}
        {!fromMerchant && selectedCat && catMeta && (
          <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-3 border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <span className="text-gray-400">{catMeta.icon}</span> {catMeta.label} Details
            </p>

            {/* Bill account ID (SC no. / client code / student ID etc.) */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{catMeta.idLabel}</label>
              <input
                type="text"
                value={form.accountId}
                onChange={e => setForm(p => ({ ...p, accountId: e.target.value }))}
                placeholder={catMeta.idPlaceholder}
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-primary"
              />
            </div>

            {/* Payment account number (eSewa / bank) */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                {catMeta.accountLabel}
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <input
                type="text"
                value={form.recipientId}
                onChange={e => setForm(p => ({ ...p, recipientId: e.target.value }))}
                placeholder={catMeta.accountPlaceholder}
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-primary"
              />
              <p className="text-gray-400 text-[10px] mt-1 px-1">
                If blank, your {catMeta.idLabel.toLowerCase()} is used as the payment ID
              </p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            SHARED FIELDS — shown in both modes (after category picked in manual)
            ═══════════════════════════════════════════════════════════════════ */}
        {(fromMerchant || selectedCat) && (
          <>
            {/* Schedule name */}
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Schedule Name</label>
              <input
                type="text" value={form.name} onChange={set('name')} required
                placeholder="e.g. NEA Home Electricity"
                className="w-full px-4 py-4 rounded-2xl border border-gray-200 bg-gray-50 text-base focus:outline-none focus:border-primary"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Amount (NPR)</label>
              <input
                type="number" value={form.amount}
                onChange={e => {
                  const v = e.target.value;
                  // Allow empty string (user clearing field) but reject anything ≤ 0
                  if (v !== '' && Number(v) <= 0) return;
                  setForm(p => ({ ...p, amount: v }));
                }}
                required min="1" step="1"
                placeholder="1450"
                className="w-full px-4 py-4 rounded-2xl border border-gray-200 bg-gray-50 text-base focus:outline-none focus:border-primary"
              />
            </div>

            {/* Payment provider */}
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">Pay via</label>
              <div className="flex gap-2">
                {PROVIDERS.map(p => (
                  <button
                    key={p.id} type="button"
                    onClick={() => setForm(f => ({ ...f, provider: p.id }))}
                    className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition-colors ${
                      form.provider === p.id
                        ? 'border-primary bg-[#E8F5EE]'
                        : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <span className="flex items-center justify-center w-6 h-6">{p.logo}</span>
                    <span className={`text-[11px] font-semibold ${form.provider === p.id ? 'text-primary' : 'text-gray-500'}`}>
                      {p.label === 'PaySmart Wallet' ? 'Wallet' : p.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Frequency */}
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Frequency</label>
              <div className="grid grid-cols-3 gap-2">
                {FREQUENCIES.map(f => (
                  <button
                    key={f} type="button"
                    onClick={() => setForm(p => ({ ...p, frequency: f }))}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      form.frequency === f
                        ? 'bg-primary text-white'
                        : 'bg-gray-50 border border-gray-200 text-gray-600'
                    }`}
                  >
                    {f === 'ONCE' ? 'One-time' : f === 'BIWEEKLY' ? 'Bi-weekly' : f.charAt(0) + f.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Date/time */}
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">
                {form.frequency === 'ONCE' ? 'Payment Date & Time' : 'First Payment Date'}
              </label>
              <input
                type="datetime-local" value={form.nextRunAt} onChange={set('nextRunAt')} required
                min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)}
                className="w-full px-4 py-4 rounded-2xl border border-gray-200 bg-gray-50 text-base focus:outline-none focus:border-primary"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Note (optional)</label>
              <textarea
                value={form.description} onChange={set('description') as never}
                placeholder="Second semester fee 2026…"
                rows={2}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-base focus:outline-none focus:border-primary resize-none"
              />
            </div>

            {/* Auto-pay opt-in */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
              <p className="text-sm font-bold text-gray-700 mb-1">⚙️ Payment Preferences</p>
              <p className="text-xs text-gray-400 mb-3">These are off by default. You are in control.</p>

              <div className="flex flex-col gap-3.5">
                {[
                  { key: 'autoPayEnabled'   as const, title: 'Enable Auto-Payment',      desc: 'Pays automatically at scheduled time without manual confirmation.',   icon: '⚡' },
                  { key: 'smsReminder'      as const, title: 'SMS Reminder',              desc: 'Get an SMS 3 days before due date on your registered number.',        icon: '📱' },
                  { key: 'pushNotification' as const, title: 'Due-Date Notifications',    desc: 'Push alerts 1 day before and 1 hour before payment.',                 icon: '🔔' },
                  { key: 'partialPayment'   as const, title: 'Allow Partial Payment',     desc: 'Pay minimum amount first — useful for NEA electricity bills.',         icon: '💳' },
                ].map(item => (
                  <div key={item.key} className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => togglePref(item.key)}
                      className={`w-11 h-6 rounded-full relative flex-shrink-0 mt-0.5 transition-colors ${
                        prefs[item.key] ? 'bg-primary' : 'bg-gray-200'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        prefs[item.key] ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </button>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{item.icon} {item.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Warning when auto-pay is on */}
            {prefs.autoPayEnabled && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex gap-2.5 items-start">
                <span className="text-amber-500 text-lg">⚠</span>
                <p className="text-amber-700 text-xs leading-relaxed">
                  <strong>Auto-pay is ON.</strong> NPR {form.amount || '—'} will be automatically deducted from {PROVIDERS.find(p => p.id === form.provider)?.label ?? form.provider} on the scheduled date. Ensure sufficient balance.
                </p>
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-4 bg-primary text-white font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <><Spinner size={20} /> Scheduling…</> : '📅 Create Schedule'}
            </button>

            <p className="text-center text-xs text-gray-400">
              You can pause or cancel this schedule anytime from the Schedules tab
            </p>
          </>
        )}

        {/* Prompt to pick a category if none selected yet (manual mode) */}
        {!fromMerchant && !selectedCat && (
          <p className="text-center text-gray-400 text-sm pt-4">
            ☝️ Pick a bill type above to continue
          </p>
        )}
      </form>
    </div>
  );
}
