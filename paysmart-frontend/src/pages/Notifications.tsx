import { IoChevronBack } from 'react-icons/io5';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi, paymentsApi } from '../api';
import type { Notification, NotificationType, BankAccount } from '../types';
import BottomNav from '../components/BottomNav';
import Spinner from '../components/Spinner';
import { dayKey, dayHeader, timeOnly } from '../utils/date';
import { BsBell, BsExclamationCircle } from 'react-icons/bs';

const TYPE_META: Record<NotificationType, { icon: string; color: string }> = {
  BILL_DUE:           { icon: '📄', color: 'bg-yellow-50 border-yellow-100' },
  BILL_PAID:          { icon: '✅', color: 'bg-green-50 border-green-100' },
  PAYMENT_SUCCESS:    { icon: '💸', color: 'bg-green-50 border-green-100' },
  PAYMENT_FAILED:     { icon: '❌', color: 'bg-red-50 border-red-100' },
  SCHEDULE_REMINDER:  { icon: '⏰', color: 'bg-blue-50 border-blue-100' },
  SCHEDULE_TRIGGERED: { icon: '🔁', color: 'bg-blue-50 border-blue-100' },
  NEW_SUGGESTION:     { icon: '🤖', color: 'bg-purple-50 border-purple-100' },
  SYSTEM:             { icon: '🔔', color: 'bg-gray-50 border-gray-100' },
};

// ── Persisted action state ────────────────────────────────────────────────────
const STORAGE_KEY       = 'ps_notif_actioned';
const DISMISSED_KEY     = 'ps_dismissed_alerts';

type ActionedMap = Record<string, 'paid' | 'scheduled'>;

interface DismissedEntry {
  id:          string;
  title:       string;
  body:        string;
  metadata?:   Record<string, unknown>;
  createdAt:   string;
  dismissedAt: string;
}

function loadActioned(): ActionedMap {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'); }
  catch { return {}; }
}
function saveActioned(map: ActionedMap) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); }
  catch { /* quota exceeded */ }
}
function loadDismissed(): DismissedEntry[] {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]'); }
  catch { return []; }
}
function removeDismissed(id: string) {
  try {
    const arr = loadDismissed().filter(d => d.id !== id);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(arr));
  } catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Notifications() {
  const navigate = useNavigate();
  const [items,     setItems]     = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<DismissedEntry[]>(loadDismissed);
  const [loading,   setLoading]   = useState(true);
  const [paying,    setPaying]    = useState<string | null>(null);
  const [actioned,  setActioned]  = useState<ActionedMap>(loadActioned);

  useEffect(() => {
    notificationsApi.list(1, 50)
      .then(r => setItems(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const markRead = async (id: string) => {
    await notificationsApi.markRead(id).catch(() => {});
    setItems(p => p.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
  };

  const markAll = async () => {
    await notificationsApi.markAllRead().catch(() => {});
    setItems(p => p.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    // Also clear dismissed
    localStorage.removeItem(DISMISSED_KEY);
    setDismissed([]);
  };

  const recordAction = (id: string, action: 'paid' | 'scheduled') => {
    setActioned(prev => {
      const updated = { ...prev, [id]: action };
      saveActioned(updated);
      return updated;
    });
  };

  // Clear a dismissed entry once user acts on it
  const clearDismissed = (id: string) => {
    removeDismissed(id);
    setDismissed(p => p.filter(d => d.id !== id));
  };

  // ── Pay directly from notification ────────────────────────────────────────
  const payNow = async (n: Notification) => {
    const meta        = n.metadata as Record<string, unknown> | undefined;
    const amount      = Number(meta?.amount ?? meta?.required ?? 0);
    const biller      = String(meta?.recipientId ?? meta?.merchantName ?? 'Merchant');
    const provider    = String(meta?.provider ?? 'ESEWA');
    const description = n.body;
    const billId      = meta?.billId ? String(meta.billId) : undefined;

    if (!amount) {
      const q = new URLSearchParams({
        biller, amount: String(amount), description,
        dueDate: String(meta?.dueDate ?? ''), billId: String(meta?.billId ?? ''),
      });
      navigate(`/bill-alert?${q}`);
      return;
    }
    setPaying(n.id);
    try {
      await paymentsApi.execute({ amount, provider, recipientId: biller, description, billId });
      await markRead(n.id);
      recordAction(n.id, 'paid');
      setItems(p => p.map(x => x.id === n.id
        ? { ...x, type: 'BILL_PAID' as NotificationType, title: `✅ Paid — ${biller}`, readAt: new Date().toISOString() }
        : x
      ));
    } catch {
      alert('Payment failed. Please try again.');
    } finally {
      setPaying(null);
    }
  };

  // Pay from dismissed entry
  const payDismissed = async (entry: DismissedEntry) => {
    const meta        = entry.metadata ?? {};
    const amount      = Number(meta.amount ?? 0);
    const biller      = String(meta.merchantName ?? 'Merchant');
    const billId      = meta.billId ? String(meta.billId) : undefined;
    if (!amount) {
      clearDismissed(entry.id);
      const q = new URLSearchParams({ biller, amount: '0', description: entry.body, dueDate: String(meta.dueDate ?? ''), billId: String(billId ?? '') });
      navigate(`/bill-alert?${q}`);
      return;
    }
    setPaying(entry.id);
    try {
      await paymentsApi.execute({ amount, provider: 'ESEWA', recipientId: biller, description: entry.body, billId });
      clearDismissed(entry.id);
    } catch {
      alert('Payment failed. Please try again.');
    } finally {
      setPaying(null);
    }
  };

  const scheduleIt = (n: Notification) => {
    const meta = n.metadata as Record<string, unknown> | undefined;
    recordAction(n.id, 'scheduled');
    markRead(n.id);
    const q = new URLSearchParams({
      name:        String(meta?.scheduleName ?? meta?.merchantName ?? 'Bill Payment'),
      amount:      String(meta?.amount ?? meta?.required ?? ''),
      recipientId: String(meta?.recipientId ?? meta?.merchantName ?? ''),
      description: n.body,
      dueDate:     String(meta?.dueDate ?? ''),
    });
    navigate(`/schedules/new?${q}`);
  };

  // ── Derived lists ─────────────────────────────────────────────────────────
  // Missed = BILL_DUE unread (from backend) + dismissed entries (from localStorage)
  const missedFromDb  = items.filter(n => n.type === 'BILL_DUE' && !n.readAt && !actioned[n.id]);
  const missedCount   = missedFromDb.length + dismissed.length;
  const regularItems  = items.filter(n =>
    !(n.type === 'BILL_DUE' && !n.readAt && !actioned[n.id]) &&
    !(n.type === 'BILL_DUE' && actioned[n.id] === 'paid')
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page bg-gray-50">
      <div className="bg-primary px-5 pt-12 pb-6 rounded-b-[32px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-white flex items-center justify-center w-8 h-8 rounded-xl bg-white/15 active:bg-white/25"><IoChevronBack className="w-5 h-5" /></button>
            <div className="flex items-center gap-2">
              <h1 className="text-white font-bold text-xl">Notifications</h1>
              {missedCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {missedCount}
                </span>
              )}
            </div>
          </div>
          <button onClick={markAll} className="text-white/70 text-sm">Mark all read</button>
        </div>
      </div>

      <div className="px-5 pt-5 pb-24 flex flex-col gap-3">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <>
            {/* ── MISSED ALERTS section ───────────────────────────────────── */}
            {(missedFromDb.length > 0 || dismissed.length > 0) && (
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <BsExclamationCircle className="w-4 h-4 text-red-500" />
                  <p className="text-sm font-bold text-red-600">
                    Missed Alerts ({missedCount})
                  </p>
                </div>
                <div className="flex flex-col gap-2.5">

                  {/* Unread BILL_DUE from server */}
                  {missedFromDb.map(n => (
                    <MissedCard
                      key={n.id}
                      title={n.title}
                      body={n.body}
                      createdAt={n.createdAt}
                      meta={n.metadata as Record<string,unknown> | undefined}
                      isPaying={paying === n.id}
                      onPay={() => payNow(n)}
                      onSchedule={() => scheduleIt(n)}
                      onDismiss={() => markRead(n.id)}
                    />
                  ))}

                  {/* Locally dismissed */}
                  {dismissed.map(entry => (
                    <MissedCard
                      key={entry.id}
                      title={entry.title}
                      body={entry.body}
                      createdAt={entry.createdAt}
                      meta={entry.metadata}
                      isPaying={paying === entry.id}
                      onPay={() => payDismissed(entry)}
                      onSchedule={() => {
                        clearDismissed(entry.id);
                        const meta = entry.metadata ?? {};
                        const q = new URLSearchParams({
                          name:        String(meta.merchantName ?? 'Bill Payment'),
                          amount:      String(meta.amount ?? ''),
                          recipientId: String(meta.merchantName ?? ''),
                          description: entry.body,
                          dueDate:     String(meta.dueDate ?? ''),
                        });
                        navigate(`/schedules/new?${q}`);
                      }}
                      onDismiss={() => clearDismissed(entry.id)}
                    />
                  ))}
                </div>

                {/* Divider */}
                {regularItems.length > 0 && (
                  <div className="flex items-center gap-3 mt-4 mb-1">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400 font-medium">All Notifications</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                )}
              </div>
            )}

            {/* ── Empty state ─────────────────────────────────────────────── */}
            {items.length === 0 && dismissed.length === 0 && (
              <div className="text-center py-16">
                <BsBell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">All caught up!</p>
              </div>
            )}

            {/* ── Regular notifications — grouped by day ───────────────────── */}
            {(() => {
              const filtered = regularItems.filter(n => !(n.type === 'BILL_DUE' && actioned[n.id] === 'paid'));
              // Build day groups
              const groups: { key: string; header: string; items: Notification[] }[] = [];
              filtered.forEach(n => {
                const k = dayKey(n.createdAt);
                let g = groups.find(x => x.key === k);
                if (!g) { g = { key: k, header: dayHeader(n.createdAt), items: [] }; groups.push(g); }
                g.items.push(n);
              });

              return groups.map(group => (
                <div key={group.key}>
                  {/* Day header */}
                  <div className="flex items-center gap-2 py-1.5 px-1 mb-1">
                    <span className="text-xs font-bold text-gray-500">{group.header}</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  {/* Notifications for this day */}
                  <div className="flex flex-col gap-2">
                    {group.items.map(n => {
                      const meta        = TYPE_META[n.type] ?? { icon: '🔔', color: 'bg-gray-50 border-gray-100' };
                      const isBillDue   = n.type === 'BILL_DUE';
                      const isReminder  = n.type === 'SCHEDULE_REMINDER';
                      const payingThis  = paying === n.id;
                      const actionTaken = actioned[n.id];
                      const alreadyPaid = n.type === 'BILL_PAID' || actionTaken === 'paid';
                      const alreadyScheduled = actionTaken === 'scheduled';

                      return (
                        <div
                          key={n.id}
                          className={`bg-white rounded-2xl shadow-card border ${
                            !n.readAt
                              ? 'border-l-4 border-l-primary border-t-gray-100 border-r-gray-100 border-b-gray-100'
                              : 'border-gray-100'
                          }`}
                        >
                          <button
                            onClick={() => markRead(n.id)}
                            className="w-full text-left p-4 flex items-start gap-3"
                          >
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border ${meta.color}`}>
                              <span className="text-xl">{meta.icon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold ${n.readAt ? 'text-gray-600' : 'text-gray-800'}`}>
                                {n.title}
                              </p>
                              <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{n.body}</p>
                              <p className="text-gray-300 text-[10px] mt-1">{timeOnly(n.createdAt)}</p>
                            </div>
                            {!n.readAt && <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />}
                          </button>

                          {/* BILL_DUE actions */}
                          {isBillDue && (() => {
                            const nMeta   = n.metadata as Record<string, unknown> | undefined;
                            const esewaId = nMeta?.esewaId ? String(nMeta.esewaId) : null;
                            const banks   = (nMeta?.banks ?? []) as BankAccount[];
                            return (
                              <div className="px-4 pb-4">
                                {(esewaId || banks.length > 0) && !alreadyPaid && (
                                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 mb-3">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">🔒 Pay to</p>
                                    {esewaId && (
                                      <div className="flex items-center gap-2 mb-1.5">
                                        <img src="https://e7.pngegg.com/pngimages/261/608/png-clipart-esewa-zone-office-bayalbas-google-play-iphone-iphone-electronics-text-thumbnail.png" style={{ width: '16px', height: '16px', objectFit: 'contain', borderRadius: '3px' }} alt="eSewa" />
                                        <div><p className="text-[10px] text-gray-400">eSewa</p><p className="text-sm font-bold text-gray-800">{esewaId}</p></div>
                                      </div>
                                    )}
                                    {banks.map((b, i) => (
                                      <div key={i} className="flex items-start gap-2 mb-1.5">
                                        <span className="text-base mt-0.5">🏦</span>
                                        <div>
                                          <p className="text-[10px] text-gray-400">{b.bankName}</p>
                                          <p className="text-xs font-bold text-gray-800 font-mono">{b.accountNumber}</p>
                                          <p className="text-[10px] text-gray-500">{b.accountHolder}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {alreadyPaid ? (
                                  <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5">
                                    <span>✅</span><p className="text-green-700 text-sm font-semibold">Payment done</p>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-2">
                                    {alreadyScheduled && (
                                      <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2">
                                        <span>📅</span><p className="text-blue-700 text-sm font-semibold">Scheduled for auto-payment</p>
                                      </div>
                                    )}
                                    <div className="flex gap-2">
                                      <button onClick={() => payNow(n)} disabled={payingThis}
                                        className="flex-1 py-2.5 bg-primary text-white text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-60">
                                        {payingThis ? <><Spinner size={14} /> Paying...</> : '⚡ Pay Now'}
                                      </button>
                                      {!alreadyScheduled && (
                                        <button onClick={() => scheduleIt(n)}
                                          className="flex-1 py-2.5 border-2 border-primary text-primary text-sm font-bold rounded-xl">
                                          📅 Schedule
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* SCHEDULE_REMINDER actions */}
                          {isReminder && (
                            <div className="px-4 pb-4">
                              {alreadyPaid ? (
                                <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5">
                                  <span>✅</span><p className="text-green-700 text-sm font-semibold">Payment done</p>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <button onClick={() => navigate('/schedules')}
                                    className="flex-1 py-2.5 bg-blue-500 text-white text-sm font-bold rounded-xl">
                                    👁 View Schedule
                                  </button>
                                  <button onClick={() => payNow(n)} disabled={payingThis}
                                    className="flex-1 py-2.5 bg-primary text-white text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-60">
                                    {payingThis ? <><Spinner size={14} /> Paying...</> : '⚡ Pay Now'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MissedCard — red-bordered card for missed/dismissed bill alerts
// ─────────────────────────────────────────────────────────────────────────────
function MissedCard({
  title, body, createdAt, meta, isPaying, onPay, onSchedule, onDismiss,
}: {
  title:      string;
  body:       string;
  createdAt:  string;
  meta?:      Record<string, unknown>;
  isPaying:   boolean;
  onPay:      () => void;
  onSchedule: () => void;
  onDismiss:  () => void;
}) {
  const amount  = meta?.amount  ? `NPR ${Number(meta.amount).toLocaleString('en-NP')}` : '';
  const dueDate = meta?.dueDate ? new Date(String(meta.dueDate)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

  return (
    <div className="bg-white border-2 border-red-200 rounded-2xl overflow-hidden shadow-card">
      {/* Red top strip */}
      <div className="bg-red-50 px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
          <span className="text-lg">📄</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-red-700 truncate">{title}</p>
          <p className="text-xs text-red-400 mt-0.5 truncate">{body}</p>
        </div>
        <button onClick={onDismiss} className="text-gray-300 text-lg leading-none flex-shrink-0">✕</button>
      </div>
      {/* Details row */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-50">
        {amount && <span className="text-sm font-bold text-gray-800">{amount}</span>}
        {dueDate && <span className="text-xs text-gray-400">Due {dueDate}</span>}
        <span className="text-[10px] text-gray-300 ml-auto">{timeOnly(createdAt)}</span>
      </div>
      {/* Actions */}
      <div className="flex gap-2 px-4 py-3">
        <button onClick={onPay} disabled={isPaying}
          className="flex-1 py-2.5 bg-red-500 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-60">
          {isPaying ? <Spinner size={14} /> : '⚡'} Pay Now
        </button>
        <button onClick={onSchedule}
          className="flex-1 py-2.5 border-2 border-red-300 text-red-600 text-sm font-bold rounded-xl">
          📅 Schedule
        </button>
      </div>
    </div>
  );
}
