import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { useLang } from '../../store/lang';
import { schedulesApi, syncApi, notificationsApi, usersApi, paymentsApi, billerAccountsApi } from '../../api';
import type { BillerAccount } from '../../types';
import { useSocket } from '../../hooks/useSocket';
import { useToast } from '../../hooks/useToast';
import ToastContainer from '../../components/ToastContainer';
import Spinner from '../../components/Spinner';
import BottomNav from '../../components/BottomNav';
import type { Schedule, Suggestion, Notification, Bill } from '../../types';
import {
  BsLightningCharge, BsWifi, BsTv, BsShield, BsWallet2, BsBell, BsHouseDoor,
} from 'react-icons/bs';
import { FaWater } from 'react-icons/fa';
import { IoSchoolOutline } from 'react-icons/io5';
import { RiCarLine } from 'react-icons/ri';
import { MdOutlinePhoneAndroid, MdFlight, MdLocalMovies, MdMoreHoriz } from 'react-icons/md';
// BillerAccount type imported above with the api

const UTILITIES = [
  { label: 'Topup',       icon: <MdOutlinePhoneAndroid className="w-5 h-5" />, path: '/pay/mobile' },
  { label: 'Electricity', icon: <BsLightningCharge className="w-5 h-5" />,     path: '/pay/electricity' },
  { label: 'Water',       icon: <FaWater className="w-5 h-5" />,               path: '/pay/water' },
  { label: 'Internet',    icon: <BsWifi className="w-5 h-5" />,                path: '/pay/internet' },
  { label: 'Television',  icon: <BsTv className="w-5 h-5" />,                  path: '/pay/tv' },
  { label: 'Airlines',    icon: <MdFlight className="w-5 h-5" />,              path: '/pay/airlines' },
  { label: 'Movies',      icon: <MdLocalMovies className="w-5 h-5" />,         path: '/pay/movies' },
  { label: 'More',        icon: <MdMoreHoriz className="w-5 h-5" />,           path: '/more' },
];

const QUICK_ACTIONS = [
  { label: 'Load Money',    emoji: '➕', path: '/load' },
  { label: 'Send Money',    emoji: '📤', path: '/payments' },
  { label: 'Bank Transfer', emoji: '🏦', path: '/bank' },
  { label: 'Remittance',   emoji: '💸', path: '/remittance' },
];

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

export default function Dashboard() {
  const { user, accessToken } = useAuthStore();
  const navigate              = useNavigate();
  const { toasts, show }      = useToast();
  const { lang, toggle: toggleLang, t } = useLang();

  const [schedules,      setSchedules]      = useState<Schedule[]>([]);
  const [suggestions,    setSuggestions]    = useState<Suggestion[]>([]);
  const [bills,          setBills]          = useState<Bill[]>([]);
  const [billerAccounts, setBillerAccounts] = useState<BillerAccount[]>([]);
  const [balance,        setBalance]        = useState<number | null>(null);
  const [balanceHidden,  setBalanceHidden]  = useState(false);
  const [unread,         setUnread]         = useState(0);
  const [liveNotif,      setLiveNotif]      = useState<Notification | null>(null);
  const [billAlert,      setBillAlert]      = useState<Notification | null>(null); // full-screen bill popup
  const [loadingBills,   setLoadingBills]   = useState(true);
  const [activeSugIdx,   setActiveSugIdx]   = useState(0);

  const refreshBalance = useCallback(() => {
    paymentsApi.getBalance().then(r => setBalance(r.balance)).catch(() => {});
  }, []);

  // Live WebSocket notifications
  useSocket(accessToken, {
    onNotification: useCallback((n: Notification) => {
      setUnread(p => p + 1);
      if (n.type === 'BILL_DUE') {
        // Show full-screen bill alert popup
        setBillAlert(n);
        usersApi.getMyBills().then(setBills).catch(() => {});
      } else {
        // Other notifications: small banner for 6 s
        setLiveNotif(n);
        show(n.title, 'info');
        setTimeout(() => setLiveNotif(null), 6000);
      }
    }, [show]),
    onPaymentSuccess: useCallback((d: { amount: number }) => {
      show(`✓ NPR ${d.amount.toLocaleString()} payment successful!`, 'success');
      refreshBalance();
    }, [show, refreshBalance]),
    onPaymentFailed: useCallback((d: { error: string }) =>
      show(`✗ Payment failed: ${d.error}`, 'error'), [show]),
  });

  // Refresh data when tab becomes visible again (e.g. returning from BillAlert / Onboarding)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        usersApi.getMyBills().then(setBills).catch(() => {});
        paymentsApi.getBalance().then(r => setBalance(r.balance)).catch(() => {});
        schedulesApi.list().then(s => setSchedules(s.filter((sc: Schedule) => sc.status === 'ACTIVE').slice(0, 3))).catch(() => {});
        billerAccountsApi.list().then(setBillerAccounts).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    (async () => {
      try {
        const [s, u, b, bal, ba] = await Promise.all([
          schedulesApi.list(),
          notificationsApi.unreadCount(),
          usersApi.getMyBills(),
          paymentsApi.getBalance(),
          billerAccountsApi.list(),
        ]);
        setSchedules(s.filter((sc: Schedule) => sc.status === 'ACTIVE').slice(0, 3));
        setUnread(u.count);
        setBills(b);
        setBalance(bal.balance);
        setBillerAccounts(ba);
      } catch { /* silent */ }
      finally { setLoadingBills(false); }

      try {
        const s = await syncApi.getSuggestions();
        setSuggestions(s.slice(0, 3));
      } catch { /* FastAPI may be down */ }
    })();
  }, [user, navigate]);

  const currentSug  = suggestions[activeSugIdx];
  const dismissSug  = () => {
    setSuggestions(p => p.filter((_, i) => i !== activeSugIdx));
    setActiveSugIdx(0);
  };

  const navigateToBill = (bill: Bill) => {
    const q = new URLSearchParams({
      biller:         bill.merchant?.name ?? 'Unknown',
      amount:         String(bill.amount),
      dueDate:        bill.dueDate,
      description:    bill.description ?? '',
      billId:         bill.id,
      category:       bill.merchant?.category ?? '',
      // accountId: merchant's eSewa/bank number — would come from real API
      accountId:      bill.billerAccountId ?? '',
    });
    navigate(`/bill-alert?${q}`);
  };

  const navigateFromNotif = (n: Notification) => {
    const meta = n.metadata as Record<string, unknown> | undefined;
    if (n.type === 'BILL_DUE' && meta?.billId) {
      const q = new URLSearchParams({
        biller:    String(meta.merchantName ?? 'Merchant'),
        amount:    String(meta.amount ?? 0),
        dueDate:   String(meta.dueDate ?? ''),
        description: n.body,
        billId:    String(meta.billId),
        accountId: String(meta.paymentAccount ?? meta.merchantPhone ?? ''),
        esewaId:   String(meta.esewaId  ?? ''),
        khaltiId:  String(meta.khaltiId ?? ''),
        banks:     JSON.stringify(meta.banks ?? []),
      });
      navigate(`/bill-alert?${q}`);
    } else {
      navigate('/notifications');
    }
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning,';
    if (h < 17) return 'Good afternoon,';
    return 'Good evening,';
  };

  // ── Bill Alert Popup handlers ─────────────────────────────────────────────
  const [billAlertPaying, setBillAlertPaying] = useState(false);

  const payBillAlert = async () => {
    if (!billAlert) return;
    const meta   = billAlert.metadata as Record<string, unknown> | undefined;
    const amount = Number(meta?.amount ?? 0);
    const biller = String(meta?.merchantName ?? 'Merchant');
    const billId = meta?.billId ? String(meta.billId) : undefined;
    if (!amount) { setBillAlert(null); navigateFromNotif(billAlert); return; }
    const esewaId    = meta?.esewaId  ? String(meta.esewaId)  : '';
    const khaltiId   = meta?.khaltiId ? String(meta.khaltiId) : '';
    const recipientId = esewaId || khaltiId || biller;
    const provider    = (esewaId ? 'ESEWA' : khaltiId ? 'KHALTI' : 'WALLET') as 'ESEWA' | 'KHALTI' | 'WALLET';
    setBillAlertPaying(true);
    try {
      await paymentsApi.execute({ amount, provider, recipientId, description: billAlert.body, billId });
      refreshBalance();
      usersApi.getMyBills().then(setBills).catch(() => {});
      setBillAlert(null);
      show(`✅ NPR ${amount.toLocaleString()} paid to ${biller}!`, 'success');
    } catch { show('Payment failed. Please try again.', 'error'); }
    finally { setBillAlertPaying(false); }
  };

  const scheduleBillAlert = () => {
    if (!billAlert) return;
    const meta = billAlert.metadata as Record<string, unknown> | undefined;
    const name = String(meta?.merchantName ?? 'Bill Payment');
    const q = new URLSearchParams({
      name:           name,
      amount:         String(meta?.amount ?? ''),
      recipientId:    name,                                    // merchant display name
      paymentAccount: String(meta?.esewaId ?? meta?.khaltiId ?? meta?.merchantPhone ?? meta?.paymentAccount ?? name), // eSewa/bank no.
      description:    billAlert.body,
      dueDate:        String(meta?.dueDate ?? ''),
    });
    setBillAlert(null);
    navigate(`/schedules/new?${q}`);
  };

  return (
    <div className="page bg-[#F5F7F5]">
      <ToastContainer toasts={toasts} />

      {/* ── Full-screen Bill Alert Popup ── */}
      {billAlert && (() => {
        const meta     = billAlert.metadata as Record<string, unknown> | undefined;
        const amount   = Number(meta?.amount ?? 0);
        const biller   = String(meta?.merchantName ?? 'Merchant');
        const dueDate  = meta?.dueDate ? String(meta.dueDate) : null;
        const daysLeft = dueDate ? Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000) : null;
        const urgency  = daysLeft === null ? '' : daysLeft <= 0 ? '🔴 OVERDUE' : daysLeft === 1 ? '🟠 DUE TOMORROW' : `🟡 DUE IN ${daysLeft} DAYS`;

        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setBillAlert(null)} />

            {/* Sheet — mobile-sized, centered, max 390px */}
            <div className="relative w-full max-w-[390px] bg-white rounded-t-[32px] overflow-hidden animate-slide-up shadow-2xl mx-auto">
              {/* Colored top strip */}
              <div className={`${daysLeft !== null && daysLeft <= 1 ? 'bg-red-500' : 'bg-primary'} px-5 pt-6 pb-8`}>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-white/0 text-sm">·</span>
                  {urgency && (
                    <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full tracking-wide">
                      {urgency}
                    </span>
                  )}
                  <button onClick={() => setBillAlert(null)} className="text-white/70 text-2xl leading-none">✕</button>
                </div>
                <div className="text-center">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <span className="text-3xl">🏫</span>
                  </div>
                  <p className="text-white font-bold text-xl">{biller}</p>
                  <p className="text-white/70 text-sm mt-0.5">New bill received</p>
                </div>
              </div>

              {/* Content */}
              <div className="px-5 pt-5 pb-8">
                <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                  <p className="text-gray-400 text-xs text-center mb-1">{t('Amount Due')}</p>
                  <p className="text-3xl font-bold text-gray-800 text-center">
                    NPR {amount.toLocaleString('en-NP')}
                  </p>
                  {dueDate && (
                    <div className="flex justify-between mt-3 pt-3 border-t border-gray-100">
                      <span className="text-gray-400 text-sm">{t('Due Date')}</span>
                      <span className="text-gray-700 font-semibold text-sm">
                        {new Date(dueDate).toLocaleDateString('en-NP', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                  {billAlert.body && (
                    <p className="text-gray-400 text-xs text-center mt-2">{billAlert.body}</p>
                  )}
                </div>

                {/* Payment methods from merchant — locked */}
                {(meta?.esewaId || meta?.khaltiId || (Array.isArray(meta?.banks) && (meta.banks as unknown[]).length > 0)) && (
                  <div className="bg-white border border-gray-100 rounded-xl p-3 mb-4">
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-2">🔒 {t('Payment Account')}</p>
                    {!!meta?.esewaId  && <p className="text-xs mb-1">🟢 eSewa: <strong>{String(meta.esewaId)}</strong></p>}
                    {!!meta?.khaltiId && <p className="text-xs mb-1">🟣 Khalti: <strong>{String(meta.khaltiId)}</strong></p>}
                    {(meta?.banks as Array<{bankName: string; accountNumber: string; accountHolder: string}> ?? []).map((b, i) => (
                      <p key={i} className="text-xs mb-1">🏦 {b.bankName}: <strong>{b.accountNumber}</strong></p>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <button
                    onClick={payBillAlert}
                    disabled={billAlertPaying}
                    className="w-full py-4 bg-primary text-white font-bold rounded-2xl text-base flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {billAlertPaying ? <><Spinner size={20} /> Processing...</> : '⚡ Pay Now'}
                  </button>
                  <button
                    onClick={scheduleBillAlert}
                    className="w-full py-3.5 border-2 border-primary text-primary font-bold rounded-2xl text-base"
                  >
                    📅 Schedule for Later
                  </button>
                  <button
                    onClick={() => {
                      // Save dismissed alert so Notifications page shows it as missed
                      try {
                        const dismissed = JSON.parse(localStorage.getItem('ps_dismissed_alerts') ?? '[]');
                        const entry = {
                          id:         billAlert.id,
                          title:      billAlert.title,
                          body:       billAlert.body,
                          metadata:   billAlert.metadata,
                          createdAt:  billAlert.createdAt,
                          dismissedAt: new Date().toISOString(),
                        };
                        if (!dismissed.find((d: {id:string}) => d.id === billAlert.id)) {
                          dismissed.unshift(entry);
                          localStorage.setItem('ps_dismissed_alerts', JSON.stringify(dismissed.slice(0, 20)));
                        }
                      } catch { /* storage full */ }
                      setBillAlert(null);
                    }}
                    className="w-full py-3 text-gray-400 text-sm font-medium"
                  >
                    Remind me later
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Header ── */}
      <div className="bg-white px-5 pt-12 pb-3 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div>
            <p className="text-xs text-gray-400">{t(greeting())}</p>
            <p className="font-semibold text-gray-800 text-base leading-tight">{t('Hi,')} {user?.name?.split(' ')[0] ?? 'User'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Language toggle pill */}
          <button
            onClick={toggleLang}
            className="text-xs font-bold text-primary border border-primary/30 rounded-xl px-2.5 py-1.5 bg-[#E8F5EE]"
            title="Switch language"
          >
            {lang === 'en' ? 'NP' : 'EN'}
          </button>
          <button onClick={() => navigate('/notifications')} className="relative text-xl flex items-center justify-center w-8 h-8">
            <BsBell className="w-5 h-5 text-gray-600" />
            {unread > 0 && (
              <span className="absolute top-0 right-0 w-[7px] h-[7px] bg-red-500 rounded-full border border-white" />
            )}
          </button>
        </div>
      </div>

      <div className="h-[calc(100vh-130px)] overflow-y-auto pb-20">

        {/* ── Balance Card ── */}
        <div className="mx-3.5 mt-3.5 rounded-2xl bg-primary p-5 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/[0.06]" />
          <div className="absolute -bottom-5 left-7 w-20 h-20 rounded-full bg-white/[0.04]" />
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-white/75 text-xs">{t('NPR Balance')}</p>
                <button
                  onClick={() => setBalanceHidden(h => !h)}
                  className="text-white/60 text-sm leading-none"
                  title={balanceHidden ? 'Show balance' : 'Hide balance'}
                >
                  {balanceHidden ? '🙈' : '👁'}
                </button>
              </div>
              <p className="text-white font-bold text-[26px] tracking-tight select-none">
                {balance === null
                  ? 'NPR —'
                  : balanceHidden
                    ? 'NPR ••••••'
                    : `NPR ${balance.toLocaleString('en-NP')}`
                }
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/70 text-[10px] mb-0.5 flex items-center justify-end gap-1">⭐ Fonepoints</p>
              <p className="text-[#F9C642] font-semibold text-base">2,840.00</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/notifications')}
            className="mt-3.5 w-full bg-white/15 border border-white/25 rounded-[10px] px-3.5 py-2.5 flex items-center justify-between"
          >
            <span className="text-white text-sm font-medium">🏷 Reward History</span>
            <span className="text-white/70 text-base">›</span>
          </button>
        </div>

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-4 gap-2 px-3.5 py-3.5">
          {QUICK_ACTIONS.map(a => (
            <button key={a.label} onClick={() => navigate(a.path)}
              className="flex flex-col items-center gap-1.5">
              <div className="w-[52px] h-[52px] rounded-[14px] bg-white border border-gray-100 flex items-center justify-center text-xl shadow-sm">
                {a.emoji}
              </div>
              <span className="text-[10.5px] text-gray-700 text-center leading-tight">{a.label}</span>
            </button>
          ))}
        </div>

        {/* ── Live Notification Bubble (clickable) ── */}
        {liveNotif && (
          <button
            onClick={() => navigateFromNotif(liveNotif)}
            className="mx-3.5 mb-3.5 w-[calc(100%-28px)] bg-primary/10 border-[1.5px] border-primary/30 rounded-2xl p-3.5 flex gap-3 items-start text-left"
          >
            <span className="text-2xl">🔔</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-primary text-sm">{liveNotif.title}</p>
              <p className="text-gray-600 text-xs mt-0.5 truncate">{liveNotif.body}</p>
            </div>
            <span className="text-primary text-xs font-semibold mt-0.5 whitespace-nowrap">Tap to view →</span>
          </button>
        )}

        {/* ── AI Suggestion Bar ── */}
        {currentSug && (
          <div className="mx-3.5 mb-3.5 bg-white border-[1.5px] border-primary rounded-2xl p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#E8F5EE] text-[#15562E] text-[9px] font-bold px-1.5 py-0.5 rounded">AI INSIGHT</span>
              <span className="text-sm font-semibold text-gray-800 flex-1 truncate">
                {currentSug.metadata?.payee ?? currentSug.title}
              </span>
              <span className="text-[10px] text-gray-400">
                {currentSug.metadata?.confidence ? `${Math.round(currentSug.metadata.confidence * 100)}%` : ''} confidence
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mb-2.5">{currentSug.body}</p>
            <div className="flex gap-2">
              <button onClick={() => navigate('/suggestions')}
                className="flex-1 bg-primary text-white text-[12.5px] font-semibold py-2 rounded-[10px]">
                Automate Now ✓
              </button>
              <button onClick={dismissSug}
                className="px-3.5 py-2 text-gray-400 text-[12.5px] border border-gray-100 rounded-[10px]">
                Dismiss
              </button>
            </div>
            {suggestions.length > 1 && (
              <p className="text-center text-[11px] text-gray-400 mt-2 cursor-pointer"
                onClick={() => setActiveSugIdx(i => (i + 1) % suggestions.length)}>
                +{suggestions.length - 1} more <span className="text-primary font-medium">smart suggestions</span>
              </p>
            )}
          </div>
        )}

        {/* ── Smart Bills (saved biller accounts) ── */}
        <SmartBillsSection
          accounts={billerAccounts}
          onAddNew={() => navigate('/onboarding?step=category')}
          onSetup={() => navigate('/onboarding?step=category')}
          onViewAll={() => navigate('/smart-bills')}
          onPayTrafficFine={(acc) => {
            const fineAmount = Number((acc.details as Record<string, unknown>)?.fineAmount ?? 0);
            const q = new URLSearchParams({
              biller:      acc.billerName,
              amount:      String(fineAmount),
              category:    acc.billerCategory,
              accountId:   acc.customerId,
              description: `Traffic fine — ${String((acc.details as Record<string, unknown>)?.violation ?? '')}`,
              dueDate:     '',
            });
            navigate(`/bill-alert?${q}`);
          }}
          onScheduleTrafficFine={(acc) => {
            const fineAmount = Number((acc.details as Record<string, unknown>)?.fineAmount ?? 0);
            const q = new URLSearchParams({
              name:        `${acc.billerName} — ${acc.customerId}`,
              amount:      String(fineAmount),
              recipientId: acc.billerName,
              description: `Traffic fine — chit ${acc.customerId}`,
            });
            navigate(`/schedules/new?${q}`);
          }}
        />

        {/* ── Pending Bills from Merchants ── */}
        <div className="px-3.5 mb-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="font-semibold text-gray-800 text-sm">📅 {t('Upcoming Payments')}</span>
            <button onClick={() => navigate('/schedules')} className="text-primary text-xs font-medium">{t('View All')}</button>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            {loadingBills ? (
              <div className="flex justify-center py-6"><Spinner /></div>
            ) : bills.length === 0 && schedules.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-gray-400 text-sm">No pending bills</p>
                <button onClick={() => navigate('/schedules/new')}
                  className="text-primary text-xs font-medium mt-1">+ Add Schedule</button>
              </div>
            ) : (
              <>
                {bills.length > 0 && (
                  <div className="bg-[#E8F5EE] px-3.5 py-2.5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#15562E]">
                      {bills.length} Bill{bills.length > 1 ? 's' : ''} Due Soon
                    </span>
                    <span className="text-sm font-bold text-primary">
                      NPR {bills.reduce((s, b) => s + b.amount, 0).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-2 divide-x divide-gray-50">
                  {bills.slice(0, 4).map(bill => {
                    const d = daysUntil(bill.dueDate);
                    const dueLabel = d <= 0 ? 'Overdue!' : d === 1 ? 'Due tomorrow' : `In ${d} days`;
                    return (
                      <button key={bill.id} onClick={() => navigateToBill(bill)}
                        className="flex items-center gap-2.5 p-3 text-left hover:bg-[#E8F5EE] transition-colors border-b border-gray-50">
                        <div className="w-[34px] h-[34px] rounded-[10px] bg-[#EEF6FF] flex items-center justify-center text-base flex-shrink-0">
                          🏫
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{bill.merchant?.name ?? 'Merchant'}</p>
                          <p className="text-[10px] text-gray-400">{dueLabel}</p>
                        </div>
                        <p className="text-xs font-semibold text-[#15562E] flex-shrink-0">
                          NPR {bill.amount.toLocaleString()}
                        </p>
                      </button>
                    );
                  })}
                  {/* Scheduled payments */}
                  {schedules.slice(0, Math.max(0, 4 - bills.length)).map(s => (
                    <button key={s.id} onClick={() => navigate('/schedules')}
                      className="flex items-center gap-2.5 p-3 text-left hover:bg-[#E8F5EE] transition-colors border-b border-gray-50">
                      <div className="w-[34px] h-[34px] rounded-[10px] bg-[#FFF8E6] flex items-center justify-center text-base flex-shrink-0">
                        💸
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{s.name}</p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(s.nextRunAt).toLocaleDateString('en-NP', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <p className="text-xs font-semibold text-[#15562E] flex-shrink-0">
                        NPR {s.amount.toLocaleString()}
                      </p>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Utility Grid ── */}
        <div className="px-3.5 mb-3.5">
          <p className="font-semibold text-gray-800 text-sm mb-2.5">{t('Utility & Bill Payments')}</p>
          <div className="bg-white border border-gray-100 rounded-2xl p-3.5 grid grid-cols-4 gap-3">
            {UTILITIES.map(u => (
              <button key={u.label} onClick={() => navigate(u.path)}
                className="flex flex-col items-center gap-1.5">
                <div className="w-11 h-11 rounded-[12px] bg-[#E8F5EE] flex items-center justify-center text-primary">
                  {u.icon}
                </div>
                <span className="text-[10px] text-gray-700 text-center">{u.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Promo Banner ── */}
        <button onClick={() => navigate('/health-score')}
          className="mx-3.5 mb-4 w-[calc(100%-28px)] bg-primary rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="inline-block bg-white/15 border border-white/30 rounded text-[9px] font-bold text-white px-2 py-0.5 mb-1.5 tracking-wide">
              LIMITED OFFER
            </span>
            <p className="text-white font-bold text-[15px]">Flat 10% Cashback</p>
            <p className="text-white/75 text-[10px]">On first Internet bill payment</p>
          </div>
          <span className="text-[36px] font-extrabold text-white/15">10%</span>
        </button>

      </div>

      <BottomNav />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Smart Bills section — shown on Dashboard between Suggestions and Pending Bills
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { icon: React.ReactNode; bg: string; color: string; label?: string }> = {
  ELECTRICITY: { icon: <BsLightningCharge className="w-5 h-5" />, bg: 'bg-amber-50',  color: 'text-amber-600',  label: 'NEA Electricity'  },
  UTILITY:     { icon: <BsLightningCharge className="w-5 h-5" />, bg: 'bg-amber-50',  color: 'text-amber-600'                             },
  WATER:       { icon: <FaWater className="w-5 h-5" />,           bg: 'bg-sky-50',    color: 'text-sky-600',    label: 'KUKL Water'       },
  INTERNET:    { icon: <BsWifi className="w-5 h-5" />,            bg: 'bg-blue-50',   color: 'text-blue-600'                              },
  TV:          { icon: <BsTv className="w-5 h-5" />,              bg: 'bg-purple-50', color: 'text-purple-600', label: 'TV / Cable'       },
  EDUCATION:   { icon: <IoSchoolOutline className="w-5 h-5" />,   bg: 'bg-violet-50', color: 'text-violet-600'                            },
  SCHOOL:      { icon: <IoSchoolOutline className="w-5 h-5" />,   bg: 'bg-violet-50', color: 'text-violet-600', label: 'School Fee'       },
  COLLEGE:     { icon: <IoSchoolOutline className="w-5 h-5" />,   bg: 'bg-indigo-50', color: 'text-indigo-600', label: 'College Fee'      },
  TRAFFIC:     { icon: <RiCarLine className="w-5 h-5" />,         bg: 'bg-red-50',    color: 'text-red-600',    label: 'Traffic Fine'     },
  GOVERNMENT:  { icon: <RiCarLine className="w-5 h-5" />,         bg: 'bg-red-50',    color: 'text-red-600'                               },
  INSURANCE:   { icon: <BsShield className="w-5 h-5" />,          bg: 'bg-green-50',  color: 'text-green-600'                             },
  RENT:        { icon: <BsHouseDoor className="w-5 h-5" />,       bg: 'bg-orange-50', color: 'text-orange-600', label: 'House Rent'       },
};

function SmartBillsSection({
  accounts, onAddNew, onSetup, onViewAll, onPayTrafficFine, onScheduleTrafficFine,
}: {
  accounts: BillerAccount[];
  onAddNew: () => void;
  onSetup: () => void;
  onViewAll: () => void;
  onPayTrafficFine: (acc: BillerAccount) => void;
  onScheduleTrafficFine: (acc: BillerAccount) => void;
}) {
  return (
    <div className="px-3.5 mb-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <button onClick={onViewAll} className="font-semibold text-gray-800 text-sm hover:text-primary transition-colors">
          💡 Smart Bills
        </button>
        <div className="flex items-center gap-3">
          {accounts.length > 0 && (
            <button onClick={onAddNew} className="text-primary text-xs font-medium">+ Add</button>
          )}
          {accounts.length > 0 && (
            <button onClick={onViewAll} className="text-primary text-xs font-medium">View All →</button>
          )}
        </div>
      </div>

      {accounts.length === 0 ? (
        // Empty state — tappable card opens onboarding setup
        <button
          onClick={onSetup}
          className="w-full bg-white border-2 border-dashed border-primary/30 rounded-2xl p-5 text-left active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#E8F5EE] flex items-center justify-center text-2xl">
              💡
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-800">No smart bills yet</p>
              <p className="text-xs text-gray-500 mt-0.5">NEA · KUKL · Internet · TV · Rent · Insurance · School fees…</p>
            </div>
            <span className="text-primary font-bold text-xl">+</span>
          </div>
        </button>
      ) : (
        <div className="flex flex-col gap-2.5">
          {accounts.slice(0, 3).map(acc => {
            const meta = CATEGORY_META[acc.billerCategory.toUpperCase()] ?? { icon: <BsWallet2 className="w-5 h-5" />, bg: 'bg-gray-50', color: 'text-gray-500' };
            const isTrafficFine = acc.billerCategory.toUpperCase() === 'TRAFFIC' || acc.billerSlug.includes('traffic');
            return (
              <div key={acc.id} className="bg-white border border-gray-100 rounded-2xl p-3.5 shadow-card">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl ${meta.bg} ${meta.color} flex items-center justify-center flex-shrink-0`}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{acc.billerName}</p>
                    <p className="text-[10px] text-gray-400 truncate">ID: {acc.customerId}</p>
                  </div>
                  {acc.isVerified ? (
                    <span className="text-[9px] font-bold text-primary bg-[#E8F5EE] px-2 py-0.5 rounded-full">✓ VERIFIED</span>
                  ) : (
                    <button onClick={onViewAll} className="text-[10px] text-primary font-semibold bg-[#E8F5EE] px-2 py-1 rounded-xl">
                      Fetch Bill →
                    </button>
                  )}
                </div>

                {/* Traffic fine special treatment */}
                {isTrafficFine && <TrafficFineDetails
                  acc={acc} onPay={() => onPayTrafficFine(acc)} onSchedule={() => onScheduleTrafficFine(acc)}
                />}

                {/* Rent special treatment */}
                {acc.billerCategory.toUpperCase() === 'RENT' && <RentDetails acc={acc} />}
              </div>
            );
          })}
          {accounts.length > 3 && (
            <button onClick={onViewAll}
              className="w-full py-3 border border-gray-100 bg-white rounded-2xl text-primary text-sm font-semibold">
              View all {accounts.length} bills →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TrafficFineDetails({
  acc, onPay, onSchedule,
}: { acc: BillerAccount; onPay: () => void; onSchedule: () => void }) {
  const details = (acc.details ?? {}) as Record<string, unknown>;
  const fineAmount = Number(details.fineAmount ?? 0);
  const violation  = String(details.violation ?? 'Unknown violation');
  const fiscalYear = String(details.fiscalYear ?? '');
  const province   = String(details.province ?? '');

  // Compute days since saved (proxy for "approaching 60-day deadline")
  const daysSinceSaved = Math.floor((Date.now() - new Date(acc.createdAt).getTime()) / 86_400_000);
  const daysLeft       = Math.max(0, 60 - daysSinceSaved);
  const approachingDeadline = daysLeft <= 14 && daysLeft > 0;

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <p className="text-red-700 text-sm font-bold">
        You have unpaid traffic fine of NPR {fineAmount.toLocaleString()}
      </p>
      <p className="text-gray-500 text-xs mt-1">
        Chit #{acc.customerId} · {violation}
        {fiscalYear && ` · FY ${fiscalYear}`}
        {province && ` · ${province}`}
      </p>

      {approachingDeadline && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-2 flex items-start gap-2">
          <span className="text-amber-600 text-base">⚠</span>
          <p className="text-amber-700 text-[11px] leading-relaxed font-medium">
            Only <strong>{daysLeft} days left</strong> before 60-day deadline. Pay soon to avoid additional penalties.
          </p>
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <button
          onClick={onPay}
          disabled={!fineAmount}
          className="flex-1 py-2.5 bg-primary text-white text-sm font-bold rounded-xl disabled:opacity-50"
        >
          ⚡ Pay Now
        </button>
        <button
          onClick={onSchedule}
          disabled={!fineAmount}
          className="flex-1 py-2.5 border-2 border-primary text-primary text-sm font-bold rounded-xl disabled:opacity-50"
        >
          📅 Schedule
        </button>
      </div>

      <p className="text-gray-400 text-[10px] mt-2 leading-relaxed">
        Note: After payment, visit the traffic office with the receipt to collect your documents.
      </p>
    </div>
  );
}

function RentDetails({ acc }: { acc: BillerAccount }) {
  const details     = (acc.details ?? {}) as Record<string, unknown>;
  const rentAmount  = Number(details.rentAmount ?? details.amount ?? 0);
  const landlord    = String(details.landlordName ?? acc.customerId ?? '—');
  const address     = String(details.propertyAddress ?? details.address ?? '');

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="flex items-start justify-between mb-1.5">
        <div>
          <p className="text-orange-700 text-sm font-bold">Monthly House Rent</p>
          <p className="text-gray-500 text-xs mt-0.5">
            Landlord: <strong>{landlord}</strong>
            {address ? ` · ${address}` : ''}
          </p>
        </div>
        {rentAmount > 0 && (
          <p className="text-orange-600 font-bold text-sm flex-shrink-0 ml-2">
            NPR {rentAmount.toLocaleString()}
          </p>
        )}
      </div>
      <div className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-1.5 flex items-center gap-2">
        <span className="text-orange-500 text-xs">🔔</span>
        <p className="text-orange-700 text-[11px] font-medium">Reminder 3 days before due date</p>
      </div>
    </div>
  );
}
