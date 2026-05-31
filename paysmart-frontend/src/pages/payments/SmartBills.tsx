/**
 * SmartBills.tsx — Smart Utility Management Platform
 * "We built a Smart Utility Management Platform for Nepali households with
 * reminders, automation, transaction tracking, and multi-gateway bill payments."
 *
 * Features:
 *  • Fetch real-time bill (NEA / KUKL / ISP / TV mock API)
 *  • Multi-gateway payment: eSewa | Khalti | Wallet
 *  • Schedule with auto-pay opt-in (user consent required)
 *  • Bill analytics — monthly trend by category
 *  • Family bills — pay someone else's utility
 *  • Smart reminders (SMS + push before due date)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IoChevronBack } from 'react-icons/io5';
import { billerAccountsApi, paymentsApi, schedulesApi, mockMerchantApi } from '../../api';
import MpinModal from '../../components/MpinModal';
import type { BillerAccount, FetchedBill, PaymentProvider, Schedule } from '../../types';
import { INTERNET_PACKAGES } from '../onboarding/Onboarding';
import { usePreferences } from '../../context/PreferencesContext';
import Spinner from '../../components/Spinner';
import BottomNav from '../../components/BottomNav';
import { useToast } from '../../hooks/useToast';
import ToastContainer from '../../components/ToastContainer';
import { BsWallet2, BsLightningCharge, BsWifi, BsTv, BsHouseDoor, BsShield } from 'react-icons/bs';
import { FaWater } from 'react-icons/fa';
import { IoSchoolOutline } from 'react-icons/io5';
import { RiCarLine } from 'react-icons/ri';

// ─── Category metadata ────────────────────────────────────────────────────────
const CAT_META: Record<string, { icon: React.ReactNode; label: string; bg: string; accent: string }> = {
  ELECTRICITY: { icon: <BsLightningCharge className="w-5 h-5 text-amber-600" />, label: 'NEA Electricity',  bg: 'bg-amber-50',   accent: 'text-amber-700'  },
  WATER:       { icon: <FaWater className="w-5 h-5 text-sky-600" />,             label: 'KUKL Water',       bg: 'bg-sky-50',     accent: 'text-sky-700'    },
  INTERNET:    { icon: <BsWifi className="w-5 h-5 text-blue-600" />,             label: 'Internet',         bg: 'bg-blue-50',    accent: 'text-blue-700'   },
  TV:          { icon: <BsTv className="w-5 h-5 text-purple-600" />,             label: 'TV / Cable',       bg: 'bg-purple-50',  accent: 'text-purple-700' },
  EDUCATION:   { icon: <IoSchoolOutline className="w-5 h-5 text-violet-600" />,  label: 'Education',        bg: 'bg-violet-50',  accent: 'text-violet-700' },
  SCHOOL:      { icon: <IoSchoolOutline className="w-5 h-5 text-violet-600" />,  label: 'School Fee',       bg: 'bg-violet-50',  accent: 'text-violet-700' },
  COLLEGE:     { icon: <IoSchoolOutline className="w-5 h-5 text-indigo-600" />,  label: 'College Fee',      bg: 'bg-indigo-50',  accent: 'text-indigo-700' },
  TRAFFIC:     { icon: <RiCarLine className="w-5 h-5 text-red-600" />,           label: 'Traffic Fine',     bg: 'bg-red-50',     accent: 'text-red-700'    },
  RENT:        { icon: <BsHouseDoor className="w-5 h-5 text-orange-600" />,      label: 'House Rent',       bg: 'bg-orange-50',  accent: 'text-orange-700' },
  INSURANCE:   { icon: <BsShield className="w-5 h-5 text-green-600" />,          label: 'Insurance',        bg: 'bg-green-50',   accent: 'text-green-700'  },
  OTHER:       { icon: <BsWallet2 className="w-5 h-5 text-gray-500" />,           label: 'Other',            bg: 'bg-gray-50',    accent: 'text-gray-700'   },
  TELECOM:     { icon: <BsWifi className="w-5 h-5 text-blue-600" />,              label: 'Telecom',          bg: 'bg-blue-50',    accent: 'text-blue-700'   },
  GOVERNMENT:  { icon: <RiCarLine className="w-5 h-5 text-red-600" />,            label: 'Government',       bg: 'bg-red-50',     accent: 'text-red-700'    },
  UTILITY:     { icon: <BsLightningCharge className="w-5 h-5 text-amber-600" />,  label: 'Utility',          bg: 'bg-amber-50',   accent: 'text-amber-700'  },
};

const ESEWA_LOGO_24 = (
  <img src="https://e7.pngegg.com/pngimages/261/608/png-clipart-esewa-zone-office-bayalbas-google-play-iphone-iphone-electronics-text-thumbnail.png"
    style={{ width: '24px', height: '24px', objectFit: 'contain', borderRadius: '6px' }} alt="eSewa" />
);

const SMART_BILL_PROVIDERS: Array<{ id: PaymentProvider; label: string; logo: React.ReactNode; color: string }> = [
  { id: 'ESEWA',  label: 'eSewa',           logo: ESEWA_LOGO_24,                               color: 'border-green-500 bg-green-50'    },
  { id: 'WALLET', label: 'PaySmart Wallet', logo: <BsWallet2 className="w-6 h-6 text-primary" />, color: 'border-primary bg-[#E8F5EE]'  },
];

const NEPAL_BANKS_SB = [
  'Siddhartha Bank Ltd', 'Everest Bank Ltd', 'NIC Asia Bank', 'Nepal Investment Mega Bank',
  'Nabil Bank', 'Standard Chartered Bank', 'Himalayan Bank', 'Global IME Bank',
  'Kumari Bank', 'Laxmi Sunrise Bank', 'Citizens Bank', 'Prime Commercial Bank',
  'NMB Bank', 'Sanima Bank', 'Machhapuchchhre Bank',
];

// ─── Map backend BillInquiryResult → local FetchedBill shape ─────────────────
// Defined outside the component so it can be used in useCallback without deps
function mapBackendBill(raw: Record<string, unknown>, acc: BillerAccount): FetchedBill {
  const amount  = typeof raw.amount  === 'number' ? raw.amount  : 0;
  const dueDate = typeof raw.dueDate === 'string'  ? raw.dueDate : new Date().toISOString();
  const now     = new Date();
  return {
    accountId:     acc.id,
    currentAmount: amount,
    fine:          0,
    rebate:        0,
    serviceCharge: 0,
    dueDate,
    billPeriod:    `${now.toLocaleString('en', { month: 'long' })} ${now.getFullYear()}`,
    planName:      typeof raw.invoiceNumber === 'string' ? `Inv: ${raw.invoiceNumber}` : undefined,
    status:        new Date(dueDate) < now ? 'OVERDUE' : 'DUE',
    fetchedAt:     new Date().toISOString(),
  };
}

// ─── Mock bill fetch ── simulates NEA / KUKL / ISP API response ───────────────
function mockFetchBill(acc: BillerAccount): Promise<FetchedBill> {
  return new Promise(resolve => {
    setTimeout(() => {
      const seed = acc.customerId.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
      const isOverdue = seed % 7 === 0;
      const daysTo = isOverdue ? -(seed % 12 + 1) : (seed % 22 + 3);
      const dueDate = new Date(Date.now() + daysTo * 86_400_000).toISOString();
      const cat = acc.billerCategory.toUpperCase();

      const amountMap: Record<string, number[]> = {
        ELECTRICITY: [650, 980, 1_450, 2_100, 3_200],
        WATER:       [280, 450, 620, 800],
        INTERNET:    [999, 1_299, 1_499, 2_199],
        TV:          [449, 599, 799],
        EDUCATION:   [8_000, 12_000, 15_000, 25_000],
        SCHOOL:      [3_500, 5_000, 8_000, 12_000],
        COLLEGE:     [8_000, 12_000, 18_000, 25_000],
        TRAFFIC:     [Number((acc.details as Record<string, unknown>)?.fineAmount ?? 1_000)],
        RENT:        [8_000, 10_000, 12_000, 15_000, 20_000, 25_000],
        INSURANCE:   [2_500, 3_500, 5_000, 8_000, 12_000],
      };
      const planMap: Record<string, string[]> = {
        INTERNET:  ['25 Mbps Unlimited', '50 Mbps Unlimited', '100 Mbps Unlimited', '200 Mbps Business'],
        TV:        ['Family Pack (120 ch)', 'Sports Pack (80 ch)', 'Premium Pack (200 ch)'],
        INSURANCE: ['Endowment Plan', 'Term Life Plan', 'Money Back Plan'],
        RENT:      ['Monthly Residential', 'Monthly Commercial'],
      };

      const arr    = amountMap[cat] ?? [500];
      const amount = arr[seed % arr.length];
      const fine   = isOverdue ? Math.round(amount * 0.02) : 0;
      const rebate = !isOverdue && daysTo > 10 ? Math.round(amount * 0.015) : 0;
      const plans  = planMap[cat];
      const now    = new Date();

      resolve({
        accountId:     acc.id,
        currentAmount: amount,
        fine,
        rebate,
        serviceCharge: cat === 'ELECTRICITY' ? 30 : cat === 'WATER' ? 20 : cat === 'INSURANCE' ? 50 : 0,
        dueDate,
        billPeriod:    cat === 'RENT'
          ? `${now.toLocaleString('en', { month: 'long' })} ${now.getFullYear()} Rent`
          : cat === 'INSURANCE'
            ? `${now.toLocaleString('en', { month: 'long' })} ${now.getFullYear()} Premium`
            : `${now.toLocaleString('en', { month: 'long' })} ${now.getFullYear()}`,
        unitsUsed:     cat === 'ELECTRICITY' ? [45, 72, 98, 134, 201][seed % 5] : undefined,
        planName:      plans ? plans[seed % plans.length] : undefined,
        status:        isOverdue ? 'OVERDUE' : 'DUE',
        fetchedAt:     new Date().toISOString(),
      });
    }, 900 + Math.random() * 600); // 0.9–1.5 s simulated API latency
  });
}

// ─── Monthly mock analytics ───────────────────────────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
function mockMonthlyData() {
  // Returns last-6-month spending per category (deterministic)
  return MONTHS.map((m, i) => ({
    month: m,
    electricity: [1200, 1450, 980, 1100, 2100, 1650][i],
    water:        [450,  380, 620,  500,  800,  450][i],
    internet:    [1299, 1299, 999, 1299, 1499, 1299][i],
    tv:           [599,  599, 449,  599,  799,  599][i],
  }));
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SmartBills() {
  const navigate            = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toasts, show }    = useToast();
  const { prefs }           = usePreferences();
  const [partialAmount,     setPartialAmount] = useState<string>('');
  const openPayParam        = searchParams.get('openPay'); // accountId to auto-open payment
  const autoPayTriggered    = useRef(false);

  const [accounts,       setAccounts]       = useState<BillerAccount[]>([]);
  const [fetchedBills,   setFetchedBills]   = useState<Record<string, FetchedBill>>({});
  const [fetching,       setFetching]       = useState<Record<string, boolean>>({});
  const [loading,        setLoading]        = useState(true);
  const [activeTab,      setActiveTab]      = useState<string>('ALL');
  const [balance,        setBalance]        = useState<number | null>(null);
  // valid=customer found+bill fetched | no_due=customer found, no pending bill | not_found=invalid ID | no_url=no inquiry URL
  const [validationMap, setValidationMap]   = useState<Record<string, 'valid' | 'no_due' | 'not_found' | 'no_url'>>({});
  // Schedules — loaded once, used for package-change → schedule-amount update
  const [schedules,      setSchedules]      = useState<Schedule[]>([]);

  // Payment modal state
  const [payModal, setPayModal]                 = useState<{ acc: BillerAccount; bill: FetchedBill } | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>('ESEWA');
  const [paying, setPaying]                     = useState(false);
  const [showMpin, setShowMpin]                 = useState(false);
  // Bank payment form (shown when user selects Bank in the modal)
  const [bankPayForm, setBankPayForm] = useState({ bankName: '', account: '', holder: '' });
  const setBP = (k: keyof typeof bankPayForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setBankPayForm(p => ({ ...p, [k]: e.target.value }));

  // Analytics tab
  const [showAnalytics, setShowAnalytics] = useState(false);
  const analyticsData = mockMonthlyData();

  /**
   * Background validation — for each account that has a billInquiryUrl set on its merchant,
   * calls check-bill and marks the account as valid (customer found) or not_found.
   * Also auto-populates fetchedBills when a real bill comes back.
   */
  const autoValidate = useCallback(async (accs: BillerAccount[]) => {
    if (accs.length === 0) return;
    const results = await Promise.allSettled(
      accs.map(acc => billerAccountsApi.checkBill(acc.id) as Promise<Record<string, unknown>>),
    );
    const newBills:      Record<string, FetchedBill>                              = {};
    const newValidation: Record<string, 'valid' | 'no_due' | 'not_found' | 'no_url'> = {};

    results.forEach((result, i) => {
      const acc = accs[i];
      if (result.status === 'fulfilled') {
        const raw = result.value;
        if (raw && !('noBill' in raw) && typeof raw.amount === 'number') {
          newBills[acc.id]      = mapBackendBill(raw, acc);
          newValidation[acc.id] = 'valid';
        } else if (raw && 'noBill' in raw) {
          const reason = (raw as { noBill: true; reason: string }).reason;
          if (reason === 'NO_DUE')               newValidation[acc.id] = 'no_due';
          else if (reason === 'CUSTOMER_NOT_FOUND') newValidation[acc.id] = 'not_found';
          else                                   newValidation[acc.id] = 'no_url';
        }
      }
    });

    setFetchedBills(prev => ({ ...prev, ...newBills }));
    setValidationMap(newValidation);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [accs, bal, scheds] = await Promise.all([
        billerAccountsApi.list(),
        paymentsApi.getBalance(),
        schedulesApi.list(),
      ]);
      setAccounts(accs);
      setBalance(bal.balance);
      setSchedules(scheds.filter((s: Schedule) => s.status === 'ACTIVE'));
      autoValidate(accs).catch(() => {});
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [autoValidate]);

  useEffect(() => { load(); }, [load]);

  // Auto-open Pay Now modal when navigated from Onboarding success screen
  useEffect(() => {
    if (!openPayParam || accounts.length === 0 || autoPayTriggered.current) return;
    const acc = accounts.find(a => a.id === openPayParam);
    if (!acc) return;
    autoPayTriggered.current = true;
    // Clear the param from URL without re-render loop
    setSearchParams({}, { replace: true });
    fetchAndPay(acc);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openPayParam, accounts]);

  const fetchBill = async (acc: BillerAccount) => {
    setFetching(p => ({ ...p, [acc.id]: true }));
    try {
      const raw = await billerAccountsApi.checkBill(acc.id) as Record<string, unknown>;

      if (raw && !('noBill' in raw) && typeof (raw as any).amount === 'number') {
        // Real bill from merchant
        const bill = mapBackendBill(raw as Record<string, unknown>, acc);
        setFetchedBills(p => ({ ...p, [acc.id]: bill }));
        setValidationMap(p => ({ ...p, [acc.id]: 'valid' }));
      } else if (raw && 'noBill' in raw) {
        const reason = (raw as { noBill: true; reason: string }).reason;
        if (reason === 'NO_DUE' || reason === 'CUSTOMER_NOT_FOUND') {
          // Merchant confirmed: no pending bill
          setValidationMap(p => ({ ...p, [acc.id]: reason === 'NO_DUE' ? 'no_due' : 'not_found' }));
          if (reason === 'NO_DUE') {
            show('✅ No pending bill for ' + acc.billerName + ' — you are all clear!', 'info');
          }
        }
      }
    } catch {
      show('Could not reach ' + acc.billerName + '. Please try again.', 'error');
    }
    finally { setFetching(p => ({ ...p, [acc.id]: false })); }
  };

  // Fetch bill then open payment modal — used by "Pay Now" on unfetched cards
  const fetchAndPay = async (acc: BillerAccount) => {
    // Guard: no due for this account — tell user instead of fetching
    if (validationMap[acc.id] === 'no_due') {
      show('✅ No pending bill for ' + acc.billerName + '. Nothing to pay right now!', 'info');
      return;
    }

    setFetching(p => ({ ...p, [acc.id]: true }));
    try {
      let bill: FetchedBill;
      try {
        const raw = await billerAccountsApi.checkBill(acc.id) as Record<string, unknown>;
        if (raw && !('noBill' in raw) && typeof (raw as any).amount === 'number') {
          bill = mapBackendBill(raw as Record<string, unknown>, acc);
        } else {
          // No due from merchant
          setValidationMap(p => ({ ...p, [acc.id]: 'no_due' }));
          show('✅ No pending bill — ' + acc.billerName + ' has nothing due right now.', 'info');
          return;
        }
      } catch {
        bill = await mockFetchBill(acc);
      }

      // Guard: if bill amount is 0 or undefined, don't open payment
      if (!bill || bill.currentAmount <= 0) {
        setValidationMap(p => ({ ...p, [acc.id]: 'no_due' }));
        show('✅ No pending bill for ' + acc.billerName + '.', 'info');
        return;
      }

      setFetchedBills(p => ({ ...p, [acc.id]: bill }));
      openPay(acc, bill);
    } catch { show('Failed to fetch bill. Please try again.', 'error'); }
    finally { setFetching(p => ({ ...p, [acc.id]: false })); }
  };

  const openPay = (acc: BillerAccount, bill: FetchedBill) => {
    setPayModal({ acc, bill });
    setSelectedProvider('ESEWA');
    setBankPayForm({ bankName: '', account: '', holder: '' });
    setPartialAmount('');
  };

  const confirmPay = async () => {
    if (!payModal) return;
    const { acc, bill } = payModal;
    const fullTotal = bill.currentAmount + bill.fine + bill.serviceCharge - bill.rebate;
    // Partial payment: use custom amount if entered and partial payment preference is ON
    const total = (prefs.partialPayment && partialAmount && Number(partialAmount) > 0)
      ? Number(partialAmount)
      : fullTotal;
    setPaying(true);
    try {
      // For bank payment, recipientId is the bank account number
      const recipientId = selectedProvider === 'WALLET'
        ? `${bankPayForm.bankName} – ${bankPayForm.account} (${bankPayForm.holder})`
        : acc.billerName;

      await paymentsApi.execute({
        amount:      total,
        provider:    selectedProvider,
        recipientId,
        description: `${acc.billerName} – ${bill.billPeriod}${selectedProvider === 'WALLET' ? ` via ${bankPayForm.bankName}` : ''}`,
      });
      // Mark current bill as paid
      setFetchedBills(p => ({ ...p, [acc.id]: { ...bill, status: 'PAID' } }));
      setPayModal(null);
      show(`✅ NPR ${total.toLocaleString()} paid — ${acc.billerName}!`, 'success');
      paymentsApi.getBalance().then(r => setBalance(r.balance)).catch(() => {});

      // Notify merchant of PAY_NOW and act on response
      const SKIP_NOTIFY = new Set(['house-rent', 'other-payment', 'kukl-water']);
      if (!SKIP_NOTIFY.has(acc.billerSlug)) {
        // Ask merchant if there's a NEW bill due after payment
        const resp = await mockMerchantApi.customerAction(acc.billerSlug, {
          customerId: acc.customerId,
          action:     'PAY_NOW',
          amount:     total,
        });

        if (resp?.hasDue === false) {
          // Merchant confirms: no pending bill after payment
          // Clear bill state → shows "No pending bill" card
          setTimeout(() => {
            setFetchedBills(p => ({ ...p, [acc.id]: undefined as any }));
            setValidationMap(p => ({ ...p, [acc.id]: 'no_due' }));
          }, 1500);
        }
        // If hasDue: true → merchant will push bill via WebSocket in ~5s → popup appears
        // No fake bill generation needed — let the WebSocket event handle it

      } else {
        // Manual merchants (rent/other/KUKL) — no merchant API, just clear after PAID
        setTimeout(() => {
          setFetchedBills(p => ({ ...p, [acc.id]: undefined as any }));
        }, 2000);
      }
    } catch {
      show('Payment failed. Please try again.', 'error');
    } finally {
      setPaying(false);
    }
  };

  const schedulePayment = (acc: BillerAccount, bill: FetchedBill) => {
    const total = bill.currentAmount + bill.serviceCharge - bill.rebate;
    const q = new URLSearchParams({
      // Flag — tells NewSchedule this came from Smart Bills
      fromSmartBill:   'true',
      // Pre-fill fields
      name:            `${acc.billerName} — ${bill.billPeriod}`,
      amount:          String(total),
      billerName:      acc.billerName,
      merchantSlug:    acc.billerSlug,
      customerId:      acc.customerId,
      billerAccountId: acc.id,
      billerCategory:  acc.billerCategory.toUpperCase(),
      description:     `${acc.billerName} utility bill — ${bill.billPeriod}`,
      dueDate:         bill.dueDate,
    });
    navigate(`/schedules/new?${q}`);
  };

  const tabs = [
    'ALL',
    ...Object.keys(CAT_META).filter(k => accounts.some(a => a.billerCategory.toUpperCase() === k)),
  ];

  const visible = activeTab === 'ALL'
    ? accounts
    : accounts.filter(a => a.billerCategory.toUpperCase() === activeTab);

  // Summary stats
  const totalDue = Object.values(fetchedBills)
    .filter(b => b.status !== 'PAID')
    .reduce((s, b) => s + b.currentAmount + b.fine + b.serviceCharge - b.rebate, 0);
  const overdueCount = Object.values(fetchedBills).filter(b => b.status === 'OVERDUE').length;

  return (
    <div className="page bg-[#F5F7F5]">
      <ToastContainer toasts={toasts} />

      {/* ── Payment Modal ── */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center pb-[66px]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !paying && setPayModal(null)} />
          <div className="relative w-full max-w-[390px] bg-white rounded-t-[32px] animate-slide-up mx-auto max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-primary px-5 pt-5 pb-6 rounded-t-[32px]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-white font-bold text-lg">Confirm Payment</span>
                <button onClick={() => !paying && setPayModal(null)} className="text-white/70 text-2xl">✕</button>
              </div>
              <p className="text-white/70 text-sm">{payModal.acc.billerName}</p>
              <p className="text-white/60 text-xs mt-0.5">
                Customer ID: <span className="font-mono font-semibold">{payModal.acc.customerId}</span> 🔒
              </p>
              <p className="text-white font-bold text-3xl mt-2">
                NPR {(payModal.bill.currentAmount + payModal.bill.fine + payModal.bill.serviceCharge - payModal.bill.rebate).toLocaleString('en-NP')}
              </p>
            </div>

            <div className="px-5 pt-5 pb-8">
              {/* Bill breakdown */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-5 text-sm">
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Bill amount</span>
                  <span className="font-semibold">NPR {payModal.bill.currentAmount.toLocaleString()}</span>
                </div>
                {payModal.bill.serviceCharge > 0 && (
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-500">Service charge</span>
                    <span className="font-semibold">NPR {payModal.bill.serviceCharge}</span>
                  </div>
                )}
                {payModal.bill.fine > 0 && (
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-red-500">Late fine</span>
                    <span className="text-red-600 font-semibold">+ NPR {payModal.bill.fine}</span>
                  </div>
                )}
                {payModal.bill.rebate > 0 && (
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-green-600">Early payment rebate</span>
                    <span className="text-green-600 font-semibold">− NPR {payModal.bill.rebate}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 mt-1">
                  <span className="font-bold text-gray-800">Total</span>
                  <span className="font-bold text-primary text-base">
                    NPR {(payModal.bill.currentAmount + payModal.bill.fine + payModal.bill.serviceCharge - payModal.bill.rebate).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* ── Payment method: eSewa or Bank ── */}
              <p className="text-sm font-semibold text-gray-700 mb-2">Pay via</p>
              <div className="flex gap-2 mb-4">
                <button type="button"
                  onClick={() => setSelectedProvider('ESEWA')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 transition-colors ${
                    selectedProvider === 'ESEWA' ? 'border-green-500 bg-green-50' : 'border-gray-100 bg-white'
                  }`}>
                  {ESEWA_LOGO_24}
                  <span className={`text-sm font-semibold ${selectedProvider === 'ESEWA' ? 'text-green-700' : 'text-gray-600'}`}>eSewa</span>
                </button>
                <button type="button"
                  onClick={() => setSelectedProvider('WALLET')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 transition-colors ${
                    selectedProvider === 'WALLET' ? 'border-primary bg-[#E8F5EE]' : 'border-gray-100 bg-white'
                  }`}>
                  <BsWallet2 className={`w-5 h-5 ${selectedProvider === 'WALLET' ? 'text-primary' : 'text-gray-500'}`} />
                  <span className={`text-sm font-semibold ${selectedProvider === 'WALLET' ? 'text-primary' : 'text-gray-600'}`}>Bank</span>
                </button>
              </div>

              {/* Bank details — shown when WALLET (bank) is selected */}
              {selectedProvider === 'WALLET' && (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col gap-3 mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Bank Transfer Details</p>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Bank Name</label>
                    <select value={bankPayForm.bankName} onChange={setBP('bankName')}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-primary">
                      <option value="">Select bank</option>
                      {NEPAL_BANKS_SB.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Account Number</label>
                    <input value={bankPayForm.account} onChange={setBP('account')}
                      placeholder="Enter account number"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Account Holder Name</label>
                    <input value={bankPayForm.holder} onChange={setBP('holder')}
                      placeholder="Name on bank account"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-primary" />
                  </div>
                </div>
              )}

              {/* eSewa balance hint */}
              {selectedProvider === 'ESEWA' && balance !== null && (
                <p className="text-xs text-gray-400 mb-4">eSewa balance: NPR {balance.toLocaleString('en-NP')}</p>
              )}

              {/* Payment destination handled by backend — not shown */}

              {/* Partial payment input — shown when preference is ON */}
              {prefs.partialPayment && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-600 mb-1.5">💳 Partial Payment (optional)</p>
                  <input
                    type="number"
                    value={partialAmount}
                    onChange={e => setPartialAmount(e.target.value)}
                    placeholder={`Full amount: NPR ${(payModal.bill.currentAmount + payModal.bill.fine + payModal.bill.serviceCharge - payModal.bill.rebate).toLocaleString()}`}
                    min="1"
                    max={payModal.bill.currentAmount + payModal.bill.fine + payModal.bill.serviceCharge - payModal.bill.rebate}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-primary"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Leave blank to pay full amount</p>
                </div>
              )}

              <button
                onClick={() => {
                  // Validate bank fields before showing MPIN
                  if (selectedProvider === 'WALLET') {
                    if (!bankPayForm.bankName) { show('Please select a bank', 'error'); return; }
                    if (!bankPayForm.account.trim()) { show('Please enter account number', 'error'); return; }
                    if (!bankPayForm.holder.trim()) { show('Please enter account holder name', 'error'); return; }
                  }
                  setShowMpin(true);
                }}
                disabled={paying}
                className="w-full py-4 bg-primary text-white font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {paying ? <><Spinner size={20} /> Processing...</> : (() => {
                  const full = payModal.bill.currentAmount + payModal.bill.fine + payModal.bill.serviceCharge - payModal.bill.rebate;
                  const amt = (prefs.partialPayment && partialAmount && Number(partialAmount) > 0) ? Number(partialAmount) : full;
                  return `Pay NPR ${amt.toLocaleString()}`;
                })()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MPIN confirmation — shown before every payment ── */}
      {showMpin && (
        <MpinModal
          onConfirm={() => { setShowMpin(false); confirmPay(); }}
          onCancel={() => setShowMpin(false)}
        />
      )}

      {/* ── Header ── */}
      <div className="bg-white px-5 pt-12 pb-3 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 active:bg-gray-200 flex-shrink-0"
          >
            <IoChevronBack className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-gray-800 text-xl">Smart Bills</h1>
            <p className="text-gray-400 text-xs mt-0.5">Smart Utility Management Platform</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAnalytics(v => !v)}
            className="text-sm text-primary font-semibold border border-primary/30 rounded-xl px-3 py-1.5"
          >
            📊 Analytics
          </button>
          <button
            onClick={() => navigate('/onboarding?step=category')}
            className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xl shadow-sm"
          >
            +
          </button>
        </div>
      </div>

      <div className="h-[calc(100vh-130px)] overflow-y-auto pb-28">

        {/* ── Summary Stats ── */}
        {!loading && accounts.length > 0 && (
          <div className="grid grid-cols-3 gap-2.5 px-3.5 pt-3.5">
            <div className="bg-white rounded-2xl p-3.5 text-center border border-gray-100 shadow-card">
              <p className="text-[10px] text-gray-400 font-medium">BILLS</p>
              <p className="text-xl font-bold text-gray-800 mt-0.5">{accounts.length}</p>
              <p className="text-[9px] text-gray-400">saved</p>
            </div>
            <div className="bg-white rounded-2xl p-3.5 text-center border border-gray-100 shadow-card">
              <p className="text-[10px] text-gray-400 font-medium">DUE</p>
              <p className="text-base font-bold text-primary mt-0.5">
                {totalDue > 0 ? `NPR ${(totalDue / 1000).toFixed(1)}k` : '—'}
              </p>
              <p className="text-[9px] text-gray-400">total</p>
            </div>
            <div className={`rounded-2xl p-3.5 text-center border shadow-card ${overdueCount > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
              <p className="text-[10px] text-gray-400 font-medium">OVERDUE</p>
              <p className={`text-xl font-bold mt-0.5 ${overdueCount > 0 ? 'text-red-600' : 'text-gray-800'}`}>{overdueCount}</p>
              <p className="text-[9px] text-gray-400">bills</p>
            </div>
          </div>
        )}

        {/* ── Analytics Panel ── */}
        {showAnalytics && (
          <div className="mx-3.5 mt-3 bg-white rounded-2xl border border-gray-100 p-4 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-gray-800 text-sm">📊 Monthly Spending Trend</p>
              <button onClick={() => setShowAnalytics(false)} className="text-gray-400 text-lg">✕</button>
            </div>

            {/* Bar chart (text-based, CSS bars) */}
            <div className="flex items-end justify-between gap-1 h-24 mb-2">
              {analyticsData.map((d, i) => {
                const total = d.electricity + d.water + d.internet + d.tv;
                const maxTotal = Math.max(...analyticsData.map(x => x.electricity + x.water + x.internet + x.tv));
                const pct = (total / maxTotal) * 100;
                const isLast = i === analyticsData.length - 1;
                return (
                  <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[8px] text-gray-400 font-medium">
                      {total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total}
                    </span>
                    <div
                      style={{ height: `${pct}%` }}
                      className={`w-full rounded-t-lg transition-all ${isLast ? 'bg-primary' : 'bg-primary/25'}`}
                    />
                    <span className="text-[9px] text-gray-500">{d.month}</span>
                  </div>
                );
              })}
            </div>

            {/* Category breakdown */}
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-50">
              {[
                { label: 'Electricity', key: 'electricity', emoji: '⚡', color: 'bg-amber-400' },
                { label: 'Water',       key: 'water',       emoji: '💧', color: 'bg-sky-400' },
                { label: 'Internet',    key: 'internet',    emoji: '🌐', color: 'bg-blue-400' },
                { label: 'TV/Cable',    key: 'tv',          emoji: '📺', color: 'bg-purple-400' },
              ].map(c => {
                const last  = analyticsData[analyticsData.length - 1][c.key as 'electricity'];
                const prev  = analyticsData[analyticsData.length - 2][c.key as 'electricity'];
                const diff  = last - prev;
                const pct   = prev > 0 ? Math.round((diff / prev) * 100) : 0;
                return (
                  <div key={c.key} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
                    <span className="text-base">{c.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-500 truncate">{c.label}</p>
                      <p className="text-xs font-bold text-gray-800">NPR {last.toLocaleString()}</p>
                    </div>
                    <span className={`text-[9px] font-bold ${pct > 0 ? 'text-red-500' : 'text-green-600'}`}>
                      {pct > 0 ? `▲ ${pct}%` : `▼ ${Math.abs(pct)}%`}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-3">
              This month your total utility spending is NPR {(analyticsData[5].electricity + analyticsData[5].water + analyticsData[5].internet + analyticsData[5].tv).toLocaleString()}
            </p>
          </div>
        )}

        {/* ── Category Tabs ── */}
        {accounts.length > 0 && tabs.length > 2 && (
          <div className="flex gap-2 px-3.5 pt-3.5 overflow-x-auto no-scrollbar">
            {tabs.map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  activeTab === t
                    ? 'bg-primary text-white'
                    : 'bg-white border border-gray-200 text-gray-600'
                }`}
              >
                {t === 'ALL' ? (
                    <span>🏠 All</span>
                  ) : (
                    <span className="flex items-center gap-1">
                      {CAT_META[t]?.icon}
                      <span>{CAT_META[t]?.label ?? t}</span>
                    </span>
                  )}
              </button>
            ))}
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <Spinner />
              <p className="text-gray-400 text-sm mt-3">Loading your bills…</p>
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && accounts.length === 0 && (
          <div className="mx-3.5 mt-5 bg-white rounded-3xl border-2 border-dashed border-primary/30 p-8 text-center">
            <div className="w-20 h-20 bg-[#E8F5EE] rounded-3xl flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">💡</span>
            </div>
            <h2 className="font-bold text-gray-800 text-lg mb-2">No smart bills yet</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Add your utility accounts (NEA, KUKL, WorldLink, DishHome…) to auto-track bills, get smart reminders, and pay with one tap.
            </p>
            <button
              onClick={() => navigate('/onboarding?step=category')}
              className="bg-primary text-white font-bold px-8 py-3.5 rounded-2xl text-base active:scale-95 transition-transform"
            >
              + Add My First Bill
            </button>
            <p className="text-gray-400 text-xs mt-4">Supports NEA · KUKL · WorldLink · CG Net · DishHome + more</p>
          </div>
        )}

        {/* ── Bill Cards ── */}
        {!loading && visible.length > 0 && (
          <div className="px-3.5 pt-3.5 flex flex-col gap-3">
            <p className="text-sm font-bold text-gray-700 mb-0.5">My Accounts</p>
            {visible.map(acc => (
              <BillCard
                key={acc.id}
                acc={acc}
                bill={fetchedBills[acc.id]}
                fetching={!!fetching[acc.id]}
                validation={validationMap[acc.id]}
                linkedSchedule={schedules.find(s => s.billerAccountId === acc.id || (s.name.toLowerCase().includes(acc.billerName.toLowerCase()) && s.status === 'ACTIVE'))}
                onFetch={() => fetchBill(acc)}
                onFetchAndPay={() => fetchAndPay(acc)}
                onPay={(bill) => openPay(acc, bill)}
                onSchedule={(bill) => schedulePayment(acc, bill)}
                onPackageChange={(newPkg, newPrice) => {
                  // Optimistically update accounts list
                  setAccounts(p => p.map(a => a.id === acc.id
                    ? { ...a, details: { ...(a.details as Record<string,unknown>), package: newPkg, packagePrice: newPrice } }
                    : a
                  ));
                  // Persist to backend
                  billerAccountsApi.updatePackage(acc.id, newPkg, newPrice).catch(() => {});
                  // Update schedule if linked
                  const linked = schedules.find(s => s.billerAccountId === acc.id || s.name.toLowerCase().includes(acc.billerName.toLowerCase()));
                  if (linked) {
                    schedulesApi.update(linked.id, { amount: newPrice })
                      .then(updated => setSchedules(p => p.map(s => s.id === updated.id ? updated : s)))
                      .catch(() => show('Schedule update failed', 'error'));
                  }
                }}
                onDelete={() => {
                  billerAccountsApi.remove(acc.id)
                    .then(() => setAccounts(p => p.filter(a => a.id !== acc.id)))
                    .catch(() => show('Failed to remove account', 'error'));
                }}
              />
            ))}
          </div>
        )}

      </div>

      <BottomNav />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual bill card
// ─────────────────────────────────────────────────────────────────────────────
function BillCard({
  acc, bill, fetching, validation, linkedSchedule,
  onFetch, onFetchAndPay, onPay, onSchedule, onPackageChange, onDelete,
}: {
  acc: BillerAccount;
  bill: FetchedBill | undefined;
  fetching: boolean;
  validation?: 'valid' | 'no_due' | 'not_found' | 'no_url';
  linkedSchedule?: Schedule;
  onFetch: () => void;
  onFetchAndPay: () => void;
  onPay: (b: FetchedBill) => void;
  onSchedule: (b: FetchedBill) => void;
  onPackageChange: (pkg: string, price: number) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmPkg, setConfirmPkg] = useState<{ pkg: string; price: number } | null>(null);

  const isInternet = acc.billerCategory.toUpperCase() === 'INTERNET';
  // Rent and Other/P2P are manual — no merchant fees, fines, or rebates
  const isManual   = ['RENT', 'OTHER'].includes(acc.billerCategory.toUpperCase());
  const details    = (acc.details ?? {}) as Record<string, unknown>;
  const currentPkg = details.package   as string | undefined;
  const currentPrice = details.packagePrice ? Number(details.packagePrice) : undefined;
  const cat   = CAT_META[acc.billerCategory.toUpperCase()] ?? { icon: <span>📄</span>, label: acc.billerCategory, bg: 'bg-gray-50', accent: 'text-gray-700' };
  const total = bill ? bill.currentAmount + bill.fine + bill.serviceCharge - bill.rebate : 0;

  const daysLeft = bill
    ? Math.ceil((new Date(bill.dueDate).getTime() - Date.now()) / 86_400_000)
    : null;

  const dueLabel = daysLeft === null ? '' : daysLeft <= 0 ? '🔴 Overdue!' : daysLeft === 1 ? '🟠 Due tomorrow' : `🟡 Due in ${daysLeft} days`;

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden shadow-card transition-all ${bill?.status === 'OVERDUE' ? 'border-red-200' : 'border-gray-100'}`}>
      {/* Card header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className={`w-12 h-12 rounded-2xl ${cat.bg} flex items-center justify-center flex-shrink-0`}>
          {cat.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-800 text-sm truncate">{acc.billerName}</p>
            {acc.isVerified && (
              <span className="text-[9px] font-bold text-primary bg-[#E8F5EE] px-1.5 py-0.5 rounded-full flex-shrink-0">✓</span>
            )}
          </div>
          <p className="text-xs text-gray-400 truncate">
            {acc.customerId}
            {(acc.details as Record<string, unknown>)?.nickname
              ? ` · "${(acc.details as Record<string, unknown>).nickname}"`
              : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {bill && bill.status !== 'PAID' ? (
            <p className="text-sm font-bold text-primary">NPR {total.toLocaleString()}</p>
          ) : bill?.status === 'PAID' ? (
            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">PAID</span>
          ) : null}
          <span className="text-gray-300 text-lg">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Customer validation badge — shown always (not just expanded) */}
      {validation === 'not_found' && (
        <div className="px-4 pb-3 -mt-1">
          <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2 flex items-center gap-2">
            <span className="text-red-500 text-sm flex-shrink-0">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-red-600 text-xs font-semibold">Customer ID not found</p>
              <p className="text-red-400 text-[10px]">"{acc.customerId}" is not in the merchant's database. Please verify and re-add.</p>
            </div>
          </div>
        </div>
      )}
      {validation === 'valid' && !bill && (
        <div className="px-4 pb-2 -mt-1">
          <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-1.5 flex items-center gap-2">
            <span className="text-green-500 text-xs">✓</span>
            <p className="text-green-600 text-xs font-medium">Account verified with merchant</p>
          </div>
        </div>
      )}
      {validation === 'no_due' && !bill && (
        <div className="px-4 pb-3 -mt-1">
          <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2 flex items-center gap-2">
            <span className="text-green-500 text-sm">✅</span>
            <div>
              <p className="text-green-700 text-xs font-semibold">No pending bill</p>
              <p className="text-green-500 text-[10px]">All payments are up to date</p>
            </div>
          </div>
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-50 px-4 pb-4 pt-3">

          {/* ── Internet package selector ── */}
          {isInternet && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-500 mb-2">
                Internet Package
                {currentPkg && <span className="ml-1 text-primary font-bold">· {currentPkg}</span>}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {INTERNET_PACKAGES.map(pkg => {
                  const isCurrent = currentPkg === pkg.label;
                  return (
                    <button
                      key={pkg.speed}
                      type="button"
                      onClick={() => {
                        if (isCurrent) return;
                        // If same price → no schedule impact, just update
                        if (!linkedSchedule || linkedSchedule.amount === pkg.price) {
                          onPackageChange(pkg.label, pkg.price);
                        } else {
                          setConfirmPkg({ pkg: pkg.label, price: pkg.price });
                        }
                      }}
                      className={`flex flex-col items-center py-2 rounded-xl border transition-all active:scale-95 ${
                        isCurrent ? 'border-green-500 bg-green-50 shadow-sm' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      {isCurrent && <span className="absolute top-1 right-1.5 text-green-500 text-[10px] font-bold">✓</span>}
                      <p className={`text-xs font-bold ${isCurrent ? 'text-green-700' : 'text-gray-700'}`}>{pkg.label}</p>
                      <p className={`text-[10px] ${isCurrent ? 'text-green-600' : 'text-gray-400'}`}>NPR {pkg.price.toLocaleString()}/mo</p>
                    </button>
                  );
                })}
              </div>
              {linkedSchedule && (
                <p className="text-[10px] text-gray-400 mt-1.5">
                  Linked schedule: <span className="font-medium text-gray-600">{linkedSchedule.name}</span> — NPR {linkedSchedule.amount.toLocaleString()}/mo
                </p>
              )}
            </div>
          )}

          {/* ── Package change confirmation ── */}
          {confirmPkg && (
            <div className="mb-3 bg-amber-50 border border-amber-200 rounded-2xl p-3">
              <p className="text-amber-800 text-xs font-semibold mb-0.5">Confirm package change</p>
              <p className="text-amber-700 text-[11px] mb-3">
                Change to <strong>{confirmPkg.pkg}</strong>? Amount will update from{' '}
                <strong>NPR {(currentPrice ?? linkedSchedule?.amount ?? 0).toLocaleString()}</strong> to{' '}
                <strong>NPR {confirmPkg.price.toLocaleString()}</strong>
                {linkedSchedule ? ' · Schedule will be updated automatically.' : '.'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { onPackageChange(confirmPkg.pkg, confirmPkg.price); setConfirmPkg(null); }}
                  className="flex-1 py-2 bg-primary text-white text-xs font-bold rounded-xl active:scale-95"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmPkg(null)}
                  className="flex-1 py-2 border border-gray-200 text-gray-500 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Due badge */}
          {dueLabel && (
            <p className="text-xs font-semibold text-gray-600 mb-3">{dueLabel}</p>
          )}

          {/* Not yet fetched — only show Pay Now if merchant is known to have dues */}
          {!bill && !fetching && (
            <div className="flex gap-2 mb-3">
              {/* Hide Pay Now when we know there's no pending bill */}
              {validation !== 'no_due' && (
                <button
                  onClick={onFetchAndPay}
                  className="flex-1 py-3 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm active:scale-95 transition-transform"
                >
                  ⚡ Pay Now
                </button>
              )}
              <button
                onClick={onFetch}
                className={`py-3 border-2 border-gray-200 text-gray-500 font-semibold rounded-xl text-sm active:scale-95 transition-transform ${validation === 'no_due' ? 'w-full' : 'flex-1'}`}
              >
                {validation === 'no_due' ? '🔄 Check for New Bill' : '📋 View Bill'}
              </button>
            </div>
          )}

          {fetching && (
            <div className="flex items-center justify-center gap-2 py-4 text-gray-500">
              <Spinner size={18} />
              <span className="text-sm">Fetching bill from {acc.billerName}…</span>
            </div>
          )}

          {/* Only show bill details + Pay Now when there's a real bill with an amount */}
          {bill && bill.status !== 'PAID' && bill.currentAmount > 0 && (
            <>
              {/* Bill details breakdown */}
              <div className="bg-gray-50 rounded-xl p-3 mb-3 text-xs">
                <div className="grid grid-cols-2 gap-y-2">
                  <div>
                    <p className="text-gray-400">Bill Period</p>
                    <p className="font-semibold text-gray-800">{bill.billPeriod}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Due Date</p>
                    <p className={`font-semibold ${daysLeft !== null && daysLeft <= 0 ? 'text-red-600' : 'text-gray-800'}`}>
                      {new Date(bill.dueDate).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  {bill.unitsUsed !== undefined && (
                    <div>
                      <p className="text-gray-400">Units Used</p>
                      <p className="font-semibold text-gray-800">{bill.unitsUsed} kWh</p>
                    </div>
                  )}
                  {bill.planName && (
                    <div>
                      <p className="text-gray-400">Plan</p>
                      <p className="font-semibold text-gray-800 truncate">{bill.planName}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-400">Bill Amount</p>
                    <p className="font-semibold text-gray-800">NPR {bill.currentAmount.toLocaleString()}</p>
                  </div>
                  {/* Service charge, fine, rebate only for utility merchants — not for Rent/Other */}
                  {bill.serviceCharge > 0 && !isManual && (
                    <div>
                      <p className="text-gray-400">Service Charge</p>
                      <p className="font-semibold text-gray-800">NPR {bill.serviceCharge}</p>
                    </div>
                  )}
                  {bill.fine > 0 && !isManual && (
                    <div>
                      <p className="text-red-400">Late Fine</p>
                      <p className="font-semibold text-red-600">+ NPR {bill.fine}</p>
                    </div>
                  )}
                  {bill.rebate > 0 && !isManual && (
                    <div>
                      <p className="text-green-500">Early Rebate</p>
                      <p className="font-semibold text-green-600">− NPR {bill.rebate}</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-between pt-2 mt-2 border-t border-gray-200">
                  <span className="font-bold text-gray-700">Total Payable</span>
                  <span className="font-bold text-primary">NPR {total.toLocaleString()}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => onPay(bill)}
                  className="flex-1 py-3 bg-primary text-white font-bold rounded-xl text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                >
                  {ESEWA_LOGO_24}
                  <span>Pay NPR {total.toLocaleString()}</span>
                </button>
              </div>
              <div className="flex gap-2 mb-1">
                <button
                  onClick={() => onSchedule(bill)}
                  className="flex-1 py-2.5 border border-primary/40 text-primary font-semibold rounded-xl text-xs flex items-center justify-center gap-1 active:scale-95"
                >
                  📅 Auto-Schedule
                </button>
                <button
                  onClick={onFetch}
                  disabled={fetching}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-500 font-semibold rounded-xl text-xs flex items-center justify-center gap-1 active:scale-95"
                >
                  🔄 Refresh
                </button>
              </div>
            </>
          )}

          {bill?.status === 'PAID' && (
            <div className="bg-green-50 rounded-2xl p-4 text-center">
              <p className="text-green-600 font-bold text-sm">✅ Paid — {bill.billPeriod}</p>
              <p className="text-gray-400 text-xs mt-0.5">
                NPR {total.toLocaleString()} on {new Date(bill.fetchedAt).toLocaleDateString('en-NP', { day: 'numeric', month: 'short' })}
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={onFetch}
                  className="flex-1 py-2.5 bg-white border border-primary/30 text-primary text-xs font-bold rounded-xl"
                >
                  📄 Next Bill
                </button>
                <button
                  onClick={() => onSchedule(bill)}
                  className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl"
                >
                  📅 Auto-Schedule
                </button>
              </div>
            </div>
          )}

          {/* Delete option */}
          <button
            onClick={onDelete}
            className="w-full mt-2 py-2 text-red-400 text-xs font-medium text-center"
          >
            Remove this account
          </button>
        </div>
      )}
    </div>
  );
}
