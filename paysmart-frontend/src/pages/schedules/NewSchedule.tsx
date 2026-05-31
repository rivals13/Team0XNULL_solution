import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { schedulesApi, merchantListApi, mockMerchantApi } from '../../api';
import { usePreferences } from '../../context/PreferencesContext';
import Spinner from '../../components/Spinner';
import {
  BsLightningCharge, BsWifi, BsTv, BsHouseDoor, BsShield, BsBank2, BsChevronDown, BsChevronUp,
} from 'react-icons/bs';
import { IoChevronBack } from 'react-icons/io5';
import { FaWater } from 'react-icons/fa';
import { IoSchoolOutline } from 'react-icons/io5';
import { RiCarLine } from 'react-icons/ri';
import { MdOutlineSend } from 'react-icons/md';

// Inline — avoids cross-file import issues with Onboarding
const INTERNET_PACKAGES = [
  { label: '25 Mbps',  speed: '25',  price: 1500 },
  { label: '50 Mbps',  speed: '50',  price: 2500 },
  { label: '100 Mbps', speed: '100', price: 4000 },
  { label: '200 Mbps', speed: '200', price: 6000 },
];

const NEPAL_BANKS = [
  'Siddhartha Bank Ltd', 'Everest Bank Ltd', 'NIC Asia Bank',
  'Nepal Investment Mega Bank', 'Nabil Bank', 'Standard Chartered Bank',
  'Himalayan Bank', 'Global IME Bank', 'Kumari Bank', 'Laxmi Sunrise Bank',
  'Citizens Bank', 'Prime Commercial Bank', 'NMB Bank', 'Sanima Bank',
  'Machhapuchchhre Bank',
];

// ── Bill categories — 2-col colored grid (same style as onboarding) ──────────
const BILL_CATEGORIES = [
  { id: 'ELECTRICITY', label: 'Electricity', emoji: '⚡', color: 'bg-amber-50 border-amber-200',
    icon: <BsLightningCharge className="w-8 h-8 text-amber-500" />,
    defaultName: 'NEA Electricity Bill',
    idLabel: 'SC Number', idPlaceholder: 'e.g. SC-001',
    accountLabel: 'NEA Payment ID', accountPlaceholder: 'NEA eSewa-linked number', showAccount: false },
  { id: 'WATER', label: 'Khanepani', emoji: '💧', color: 'bg-sky-50 border-sky-200',
    icon: <FaWater className="w-8 h-8 text-sky-500" />,
    defaultName: 'KUKL Water Bill',
    idLabel: 'Client Code', idPlaceholder: 'e.g. KUKL-1234',
    accountLabel: 'KUKL Payment ID', accountPlaceholder: 'KUKL payment number', showAccount: false },
  { id: 'INTERNET', label: 'Internet', emoji: '🌐', color: 'bg-blue-50 border-blue-200',
    icon: <BsWifi className="w-8 h-8 text-blue-500" />,
    defaultName: 'Internet Bill',
    idLabel: 'Customer ID', idPlaceholder: 'e.g. WL-12345',
    accountLabel: 'ISP Account', accountPlaceholder: 'Provider payment number', showAccount: false },
  { id: 'TV', label: 'TV / Cable', emoji: '📺', color: 'bg-purple-50 border-purple-200',
    icon: <BsTv className="w-8 h-8 text-purple-500" />,
    defaultName: 'TV / Cable Bill',
    idLabel: 'Smart Card No.', idPlaceholder: 'e.g. DH-001234',
    accountLabel: 'Provider eSewa No.', accountPlaceholder: 'DishHome / TataPlay', showAccount: false },
  { id: 'EDUCATION', label: 'Education Fee', emoji: '🎓', color: 'bg-violet-50 border-violet-200',
    icon: <IoSchoolOutline className="w-8 h-8 text-violet-500" />,
    defaultName: 'School / College Fee',
    idLabel: 'Student ID', idPlaceholder: 'e.g. 2024001',
    accountLabel: 'Institution Account', accountPlaceholder: 'School payment no.', showAccount: false },
  { id: 'TRAFFIC', label: 'Traffic Fine', emoji: '🚔', color: 'bg-red-50 border-red-200',
    icon: <RiCarLine className="w-8 h-8 text-red-500" />,
    defaultName: 'Traffic Fine Payment',
    idLabel: 'Chit Number', idPlaceholder: 'e.g. KTM-2026-100',
    accountLabel: 'Traffic Police eSewa', accountPlaceholder: 'Nepal Traffic Police', showAccount: false },
  { id: 'RENT', label: 'House Rent', emoji: '🏠', color: 'bg-orange-50 border-orange-200',
    icon: <BsHouseDoor className="w-8 h-8 text-orange-500" />,
    defaultName: 'Monthly House Rent',
    idLabel: 'Landlord Name', idPlaceholder: 'e.g. Ram Sharma',
    accountLabel: "Landlord's eSewa / Bank A/C", accountPlaceholder: 'Landlord payment number', showAccount: true },
  { id: 'INSURANCE', label: 'Insurance', emoji: '🛡️', color: 'bg-green-50 border-green-200',
    icon: <BsShield className="w-8 h-8 text-green-500" />,
    defaultName: 'Insurance Premium',
    idLabel: 'Policy Number', idPlaceholder: 'e.g. NLI-001',
    accountLabel: 'Insurance Co. eSewa No.', accountPlaceholder: 'Nepal Life / Prime Life', showAccount: false },
  { id: 'CUSTOM', label: 'Other / P2P', emoji: '💸', color: 'bg-gray-50 border-gray-200',
    icon: <MdOutlineSend className="w-8 h-8 text-gray-500" />,
    defaultName: '',
    idLabel: 'Pay To (name)', idPlaceholder: 'Recipient name',
    accountLabel: 'eSewa / Bank Account', accountPlaceholder: 'Recipient payment number', showAccount: true },
];

const FREQUENCIES = ['ONCE', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY'];

export default function NewSchedule() {
  const navigate   = useNavigate();
  const [params]   = useSearchParams();
  const { prefs }  = usePreferences();

  // ── Smart Bills pre-fill detection ───────────────────────────────────────
  const fromSmartBill    = params.get('fromSmartBill') === 'true';
  const fromMerchant     = fromSmartBill || !!params.get('amount');
  const merchantName     = params.get('billerName') ?? params.get('recipientId') ?? params.get('name') ?? '';
  const merchantSlug     = params.get('merchantSlug') ?? '';
  const customerIdParam  = params.get('customerId')  ?? '';
  const billerCategory   = params.get('billerCategory') ?? '';
  const paymentAccount   = params.get('paymentAccount') ?? merchantName;  // legacy (non-SmartBill) path

  // ── Category selection (manual mode only) ──────────────────────────────────
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const catMeta = BILL_CATEGORIES.find(c => c.id === selectedCat);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    name:           params.get('name')   ?? '',
    amount:         params.get('amount') ?? '',
    provider:       'ESEWA',
    accountId:      '',   // landlord name / SC no. / client code / student ID
    recipientId:    params.get('fromSmartBill') === 'true'
      ? (params.get('billerName') ?? '')
      : paymentAccount,
    rentAddress:    '',   // property address — only used when category = RENT
    maxOccurrences: '',   // empty — user must enter 1–10 before submitting
    frequency:      'MONTHLY',
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

  // Local override of preferences for this schedule (starts from global prefs)
  const [localPrefs, setLocalPrefs] = useState({
    autoPayEnabled:   prefs.autoPayEnabled,
    smsReminder:      prefs.smsReminder,
    pushNotification: prefs.pushNotification,
    partialPayment:   prefs.partialPayment,
  });
  // Sync when global prefs load (first render might be before fetch completes)
  useEffect(() => {
    setLocalPrefs({
      autoPayEnabled:   prefs.autoPayEnabled,
      smsReminder:      prefs.smsReminder,
      pushNotification: prefs.pushNotification,
      partialPayment:   prefs.partialPayment,
    });
  }, [prefs.autoPayEnabled, prefs.smsReminder, prefs.pushNotification, prefs.partialPayment]);

  // Merchant payment details (fetched when fromSmartBill=true)
  const [merchantDetails, setMerchantDetails] = useState<{
    esewaId: string | null;
    banks: Array<{ bankName: string; accountNumber: string; accountHolder: string }>;
  } | null>(null);

  // Fetch merchant by slug when coming from Smart Bills
  useEffect(() => {
    if (!fromSmartBill || !merchantSlug) return;
    merchantListApi.getBySlug(merchantSlug)
      .then(m => setMerchantDetails({ esewaId: m.esewaId, banks: m.banks }))
      .catch(() => setMerchantDetails(null));
  }, [fromSmartBill, merchantSlug]);

  // ── Optional backup bank account ─────────────────────────────────────────
  const [showBackupBank, setShowBackupBank] = useState(false);
  const [backupBank,     setBackupBank]     = useState({ bankName: '', account: '', holder: '' });
  const setB = (k: keyof typeof backupBank) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setBackupBank(p => ({ ...p, [k]: e.target.value }));

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState('');

  const set = (k: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm(p => ({ ...p, [k]: e.target.value }));

  const togglePref = (k: keyof typeof localPrefs) =>
    setLocalPrefs(p => ({ ...p, [k]: !p[k] }));

  // Category-specific extra fields (matches Onboarding DetailsForm fields)
  const [catDetails, setCatDetails] = useState<Record<string, string>>({});
  const setCD = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setCatDetails(p => ({ ...p, [k]: e.target.value }));

  // Pick a category (manual mode) — auto-fills name, resets category fields
  const pickCategory = (catId: string) => {
    setSelectedCat(catId);
    const cat = BILL_CATEGORIES.find(c => c.id === catId)!;
    setForm(p => ({
      ...p,
      name: p.name || cat.defaultName,
      accountId:   '',
      recipientId: '',
    }));
    setCatDetails({});
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

    // Payment always goes through eSewa by default
    // recipientId = merchant name or SC/customer ID (routing handled by backend)
    const billRef = catDetails.accountId || catDetails.customerId || catDetails.clientCode
                 || catDetails.chitNumber || catDetails.studentId || catDetails.recipientAccount
                 || form.accountId;
    let finalRecipientId = fromSmartBill
      ? (form.recipientId || merchantName)
      : (form.recipientId || billRef || form.accountId || '');

    if (!finalRecipientId) {
      setError('Please enter the bill account ID (SC number, client code, etc.).');
      return;
    }

    const finalProvider = 'ESEWA';

    setLoading(true);
    try {
      // maxOccurrences: required for repeating schedules
      if (form.frequency !== 'ONCE' && !form.maxOccurrences) {
        setError('Please enter how many times (1–10).');
        return;
      }
      const maxOcc = form.frequency === 'ONCE' ? 1 : Math.min(10, Math.max(1, Number(form.maxOccurrences)));
      const newSchedule = await schedulesApi.create({
        name:           form.name,
        amount:         Number(form.amount),
        provider:       finalProvider,
        recipientId:    finalRecipientId,
        frequency:      form.frequency,
        nextRunAt:      chosen.toISOString(),
        maxOccurrences: maxOcc,
        description: [
          form.description,
          fromSmartBill && merchantSlug    ? `[merchant:${merchantSlug}]`    : '',
          fromSmartBill && customerIdParam ? `[customerId:${customerIdParam}]` : '',
          catDetails.accountId    ? `[id:${catDetails.accountId}]`    : '',
          catDetails.officeCode   ? `[office:${catDetails.officeCode}]`  : '',
          catDetails.phone        ? `[phone:${catDetails.phone}]`       : '',
          catDetails.package      ? `[pkg:${catDetails.package}]`       : '',
          catDetails.chitNumber   ? `[chit:${catDetails.chitNumber}]`   : '',
          catDetails.propertyAddress ? `Property:${catDetails.propertyAddress}` : '',
          localPrefs.autoPayEnabled   ? '[AUTO-PAY]' : '',
          localPrefs.smsReminder      ? '[SMS]'       : '',
          localPrefs.pushNotification ? '[PUSH]'      : '',
        ].filter(Boolean).join(' '),
      });
      window.dispatchEvent(new CustomEvent('scheduleCreated', { detail: newSchedule }));

      // Notify merchant of SCHEDULED action (if from SmartBills with a known merchant)
      if (fromSmartBill && merchantSlug && customerIdParam) {
        mockMerchantApi.customerAction(merchantSlug, {
          customerId:    customerIdParam,
          action:        'SCHEDULED',
          amount:        Number(form.amount),
          scheduledDate: form.nextRunAt,
        });
      }

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
        {localPrefs.autoPayEnabled && (
          <p className="text-white/90 text-sm bg-white/15 rounded-xl px-4 py-2 mb-2">⚡ Auto-pay is ON</p>
        )}
        {localPrefs.smsReminder && (
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
          <button onClick={() => navigate(-1)} className="text-white flex items-center justify-center w-8 h-8 rounded-xl bg-white/15 active:bg-white/25">
            <IoChevronBack className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-white font-bold text-xl">
              {fromSmartBill ? '📅 Schedule Smart Bill' : fromMerchant ? 'Schedule Payment' : 'New Schedule'}
            </h1>
            {fromSmartBill && (
              <p className="text-white/70 text-xs mt-0.5">Pre-filled from Smart Bills — {merchantName}</p>
            )}
            {fromMerchant && !fromSmartBill && (
              <p className="text-white/70 text-xs mt-0.5">Bill from {merchantName}</p>
            )}
          </div>
        </div>
      </div>

      {/* Reminder banner — single tight line */}
      <div className="mx-5 mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg">
        <span className="text-[11px]">⏰</span>
        <p className="text-blue-500 text-[10px]">SMS + push reminder <strong>1 day</strong> &amp; <strong>1 hour</strong> before • Enable auto-pay below</p>
      </div>

      <form onSubmit={submit} className="px-5 pt-5 pb-10 flex flex-col gap-5">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl">{error}</div>
        )}

        {/* Smart Bills — small info chip, all fields pre-filled silently */}
        {fromSmartBill && merchantName && (
          <div className="flex items-center gap-2 bg-[#E8F5EE] rounded-xl px-3 py-2">
            <span className="text-primary text-sm">📌</span>
            <p className="text-primary text-xs font-semibold flex-1">{merchantName}</p>
            {customerIdParam && (
              <span className="text-primary/70 text-xs font-mono bg-white/50 px-2 py-0.5 rounded-lg">
                ID: {customerIdParam}
              </span>
            )}
          </div>
        )}

        {/* Legacy merchant mode — show merchant name only, no payment destination */}
        {fromMerchant && !fromSmartBill && merchantName && (
          <div className="bg-gray-50 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-gray-400 text-sm">Scheduling for</span>
            <span className="flex-1 font-semibold text-gray-800 text-sm">{merchantName}</span>
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
            <div className="grid grid-cols-2 gap-3">
              {BILL_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => pickCategory(cat.id)}
                  className={`flex flex-col items-center gap-3 py-6 rounded-3xl border-2 transition-all active:scale-95 ${
                    selectedCat === cat.id ? 'border-primary bg-[#E8F5EE]' : cat.color
                  }`}
                >
                  <span className="text-4xl">{cat.emoji}</span>
                  <span className={`text-sm font-bold text-center leading-tight ${
                    selectedCat === cat.id ? 'text-primary' : 'text-gray-800'
                  }`}>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Manual: full category-specific fields (same as Onboarding) */}
        {!fromMerchant && selectedCat && catMeta && (
          <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-3 border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <span>{catMeta.icon}</span> {catMeta.label} Details
            </p>

            {/* ── ELECTRICITY ── */}
            {selectedCat === 'ELECTRICITY' && <>
              <F label="Customer ID / SC No." required><I value={catDetails.accountId ?? ''} onChange={setCD('accountId')} ph="e.g. SC-001, 123456" /></F>
              <F label="Office Code" required><I value={catDetails.officeCode ?? ''} onChange={setCD('officeCode')} ph="e.g. 01" /></F>
            </>}

            {/* ── WATER ── */}
            {selectedCat === 'WATER' && <>
              <F label="Client Code" required><I value={catDetails.accountId ?? ''} onChange={setCD('accountId')} ph="e.g. KUKL-1234" /></F>
              <F label="Area Code" required><I value={catDetails.areaCode ?? ''} onChange={setCD('areaCode')} ph="e.g. 02" /></F>
            </>}

            {/* ── INTERNET ── */}
            {selectedCat === 'INTERNET' && <>
              <F label="Customer ID / Username" required><I value={catDetails.accountId ?? ''} onChange={setCD('accountId')} ph="e.g. WL-12345, VNT-001" /></F>
              <F label="Registered Phone Number" required><I value={catDetails.phone ?? ''} onChange={setCD('phone')} ph="e.g. 9801234567" /></F>
              <F label="Internet Package">
                <div className="grid grid-cols-2 gap-2">
                  {INTERNET_PACKAGES.map(pkg => {
                    const active = catDetails.package === pkg.label;
                    return (
                    <button key={pkg.speed} type="button"
                      onClick={() => { setCatDetails(p => ({ ...p, package: pkg.label, packagePrice: String(pkg.price) })); setForm(p => ({ ...p, amount: String(pkg.price) })); }}
                      className={`relative flex flex-col items-center py-2.5 rounded-xl border-2 transition-all active:scale-95 ${active ? 'border-green-500 bg-green-50 shadow-sm' : 'border-gray-200 bg-white'}`}>
                      {active && <span className="absolute top-1 right-1.5 text-green-500 text-[10px] font-bold">✓</span>}
                      <p className={`text-xs font-bold ${active ? 'text-green-700' : 'text-gray-700'}`}>{pkg.label}</p>
                      <p className={`text-[10px] ${active ? 'text-green-600' : 'text-gray-400'}`}>NPR {pkg.price.toLocaleString()}/mo</p>
                    </button>
                    );
                  })}
                </div>
              </F>
            </>}

            {/* ── TV / CABLE ── */}
            {selectedCat === 'TV' && <>
              <F label="Smart Card No. / Subscriber ID" required><I value={catDetails.accountId ?? ''} onChange={setCD('accountId')} ph="e.g. DH-001234 (on set-top box)" /></F>
              <F label="Registered Phone Number"><I value={catDetails.phone ?? ''} onChange={setCD('phone')} ph="e.g. 9801234567 (optional)" /></F>
              <F label="TV Package">
                <S value={catDetails.package ?? ''} onChange={setCD('package')} ph="Select package (optional)"
                  opts={['Family Pack', 'Sports Pack', 'Premium Pack', 'Basic Pack', 'Other']} />
              </F>
            </>}

            {/* ── EDUCATION ── */}
            {selectedCat === 'EDUCATION' && <>
              <F label="School / College Name" required><I value={catDetails.institutionName ?? ''} onChange={setCD('institutionName')} ph="e.g. Himalayan College" /></F>
              <F label="Student ID / Registration No." required><I value={catDetails.accountId ?? ''} onChange={setCD('accountId')} ph="e.g. 2024001" /></F>
              <F label="Program / Class" required><I value={catDetails.classOrProgram ?? ''} onChange={setCD('classOrProgram')} ph="e.g. BSc IT, BBA, Grade 10" /></F>
            </>}

            {/* ── TRAFFIC ── */}
            {selectedCat === 'TRAFFIC' && <>
              <F label="Chit Number / Slip Number" required><I value={catDetails.accountId ?? ''} onChange={setCD('accountId')} ph="e.g. KTM-2026-100" /></F>
              <F label="Fiscal Year" required>
                <S value={catDetails.fiscalYear ?? ''} onChange={setCD('fiscalYear')} ph="Select fiscal year"
                  opts={['2080/81', '2081/82', '2082/83']} />
              </F>
              <F label="Province" required>
                <S value={catDetails.province ?? ''} onChange={setCD('province')} ph="Select province"
                  opts={['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim']} />
              </F>
            </>}

            {/* ── RENT ── */}
            {selectedCat === 'RENT' && <>
              <div className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 flex gap-2 items-start">
                <span className="text-orange-500">🏠</span>
                <p className="text-orange-700 text-xs">Reminder 3 days before rent due each month.</p>
              </div>
              <F label="Landlord Name" required><I value={catDetails.accountId ?? ''} onChange={setCD('accountId')} ph="e.g. Ram Prasad Sharma" /></F>
              <F label="Property Address" required><I value={catDetails.propertyAddress ?? ''} onChange={setCD('propertyAddress')} ph="e.g. Baluwatar-4, Kathmandu" /></F>
              <F label="Landlord's eSewa / Bank No." required>
                <I value={form.recipientId} onChange={e => setForm(p => ({ ...p, recipientId: e.target.value }))} ph="Landlord payment number" />
              </F>
            </>}

            {/* ── INSURANCE ── */}
            {selectedCat === 'INSURANCE' && <>
              <F label="Policy Number" required><I value={catDetails.accountId ?? ''} onChange={setCD('accountId')} ph="e.g. NLI-2026-001234" /></F>
              <F label="Plan Name" required><I value={catDetails.planName ?? ''} onChange={setCD('planName')} ph="e.g. Endowment Plan, Term Life" /></F>
              <F label="Premium Frequency" required>
                <S value={catDetails.premiumFrequency ?? ''} onChange={setCD('premiumFrequency')} ph="Select frequency"
                  opts={['Monthly', 'Quarterly', 'Half-yearly', 'Annually']} />
              </F>
              <F label="Phone Number"><I value={catDetails.phone ?? ''} onChange={setCD('phone')} ph="e.g. 9801234567 (optional)" /></F>
            </>}

            {/* ── OTHER / P2P ── */}
            {selectedCat === 'CUSTOM' && <>
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex gap-2 items-start">
                <span>💸</span><p className="text-gray-600 text-xs">Send to anyone — P2P, freelance, loan repayment.</p>
              </div>
              <F label="Recipient Name" required><I value={catDetails.accountId ?? ''} onChange={setCD('accountId')} ph="e.g. Ram Sharma" /></F>
              <F label="Their eSewa / Bank Account" required>
                <I value={form.recipientId} onChange={e => setForm(p => ({ ...p, recipientId: e.target.value }))} ph="eSewa number or bank account" />
              </F>
              <F label="Purpose" required><I value={catDetails.purpose ?? ''} onChange={setCD('purpose')} ph="e.g. Loan repayment, Freelance" /></F>
            </>}
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

            {/* ── Default payment: eSewa notice ── */}
            <div className="bg-[#E8F5EE] border border-primary/20 rounded-2xl px-4 py-3 flex items-center gap-3">
              <img
                src="https://e7.pngegg.com/pngimages/261/608/png-clipart-esewa-zone-office-bayalbas-google-play-iphone-iphone-electronics-text-thumbnail.png"
                style={{ width: 22, height: 22, objectFit: 'contain', borderRadius: 5 }}
                alt="eSewa"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-primary">Paying via eSewa</p>
                <p className="text-[11px] text-gray-500">Payment is processed through your eSewa account</p>
              </div>
            </div>

            {/* ── Backup bank account (optional, collapsible) ── */}
            <div>
              <button type="button"
                onClick={() => setShowBackupBank(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-600 font-medium">
                <div className="flex items-center gap-2">
                  <BsBank2 className="w-4 h-4 text-gray-400" />
                  <span>Backup Bank Account</span>
                  <span className="text-[10px] text-gray-400 font-normal">(optional)</span>
                </div>
                {showBackupBank
                  ? <BsChevronUp className="w-4 h-4 text-gray-400" />
                  : <BsChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {showBackupBank && (
                <div className="mt-2 bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col gap-3">
                  <p className="text-[11px] text-gray-500 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                    💡 Used automatically if eSewa balance is insufficient on payment day
                  </p>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Bank Name</label>
                    <select value={backupBank.bankName} onChange={setB('bankName')}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-primary">
                      <option value="">Select bank (optional)</option>
                      {NEPAL_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Account Number</label>
                    <input value={backupBank.account} onChange={setB('account')}
                      placeholder="Enter account number"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Account Holder Name</label>
                    <input value={backupBank.holder} onChange={setB('holder')}
                      placeholder="Name on bank account"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-primary" />
                  </div>
                </div>
              )}
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
                    {f === 'ONCE' ? 'One-time' : f === 'BIWEEKLY' ? 'Bi-weekly' : f === 'DAILY' ? 'Daily' : f.charAt(0) + f.slice(1).toLowerCase()}
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

            {/* Max occurrences — required for repeating frequencies, min 1 max 10 */}
            {form.frequency !== 'ONCE' && (
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">
                  How many times? <span className="text-red-500 text-xs">*</span>
                  <span className="text-gray-400 text-xs font-normal ml-1">(1–10)</span>
                </label>
                <input
                  type="number"
                  value={form.maxOccurrences}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '') { setForm(p => ({ ...p, maxOccurrences: '' })); return; }
                    const n = Number(v);
                    if (isNaN(n) || n > 10) return;   // block >10
                    setForm(p => ({ ...p, maxOccurrences: v }));
                  }}
                  min="1" max="10"
                  placeholder="Enter 1–10"
                  className={`w-full px-4 py-4 rounded-2xl border bg-gray-50 text-base focus:outline-none focus:border-primary ${
                    !form.maxOccurrences ? 'border-red-200' : 'border-gray-200'
                  }`}
                />
                <p className="text-gray-400 text-[11px] mt-1 px-1">
                  {{
                    DAILY:    `Runs for ${form.maxOccurrences} day${form.maxOccurrences !== '1' ? 's' : ''}`,
                    WEEKLY:   `Runs for ${form.maxOccurrences} week${form.maxOccurrences !== '1' ? 's' : ''}`,
                    BIWEEKLY: `${form.maxOccurrences} bi-weekly payments`,
                    MONTHLY:  `Runs for ${form.maxOccurrences} month${form.maxOccurrences !== '1' ? 's' : ''}`,
                    YEARLY:   `Runs for ${form.maxOccurrences} year${form.maxOccurrences !== '1' ? 's' : ''}`,
                  }[form.frequency] ?? `${form.maxOccurrences} payments`}
                </p>
              </div>
            )}

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
                        localPrefs[item.key] ? 'bg-primary' : 'bg-gray-200'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        localPrefs[item.key] ? 'translate-x-5' : 'translate-x-0.5'
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
            {localPrefs.autoPayEnabled && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex gap-2.5 items-start">
                <span className="text-amber-500 text-lg">⚠</span>
                <p className="text-amber-700 text-xs leading-relaxed">
                  <strong>Auto-pay is ON.</strong> NPR {form.amount || '—'} will be automatically deducted via eSewa on the scheduled date. Ensure sufficient balance.
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

// ─── Tiny reusable form helpers (keeps JSX above clean) ───────────────────────
function F({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
        {label}{required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
function I({ value, onChange, ph }: { value: string; onChange: React.ChangeEventHandler<HTMLInputElement>; ph?: string }) {
  return (
    <input value={value} onChange={onChange} placeholder={ph}
      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-primary" />
  );
}
function S({ value, onChange, ph, opts }: { value: string; onChange: React.ChangeEventHandler<HTMLSelectElement>; ph: string; opts: string[] }) {
  return (
    <select value={value} onChange={onChange}
      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-primary">
      <option value="">{ph}</option>
      {opts.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
