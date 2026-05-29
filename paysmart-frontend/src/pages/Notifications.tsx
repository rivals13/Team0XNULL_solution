import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi, paymentsApi } from '../api';
import type { Notification, NotificationType, BankAccount } from '../types';
import BottomNav from '../components/BottomNav';
import Spinner from '../components/Spinner';

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
// Tracks which notification IDs have been acted on (paid / scheduled) so the
// buttons stay hidden even after navigating away and coming back.
const STORAGE_KEY = 'ps_notif_actioned';

type ActionedMap = Record<string, 'paid' | 'scheduled'>;

function loadActioned(): ActionedMap {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'); }
  catch { return {}; }
}

function saveActioned(map: ActionedMap) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); }
  catch { /* quota exceeded — ignore */ }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Notifications() {
  const navigate = useNavigate();
  const [items,    setItems]    = useState<Notification[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [paying,   setPaying]   = useState<string | null>(null);
  // actioned: ids that were paid/scheduled in this or previous sessions
  const [actioned, setActioned] = useState<ActionedMap>(loadActioned);

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
  };

  /** Record that this notification was acted on and persist across page navigations. */
  const recordAction = (id: string, action: 'paid' | 'scheduled') => {
    setActioned(prev => {
      const updated = { ...prev, [id]: action };
      saveActioned(updated);
      return updated;
    });
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
      // No amount in metadata — fall back to bill-alert page
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
      // Also update local type so icon flips to ✅ immediately
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

  // ── Navigate to Schedule page pre-filled ─────────────────────────────────
  const scheduleIt = (n: Notification) => {
    const meta = n.metadata as Record<string, unknown> | undefined;
    recordAction(n.id, 'scheduled');
    markRead(n.id);  // mark read so the unread dot goes away
    const q = new URLSearchParams({
      name:        String(meta?.scheduleName ?? meta?.merchantName ?? 'Bill Payment'),
      amount:      String(meta?.amount ?? meta?.required ?? ''),
      recipientId: String(meta?.recipientId ?? meta?.merchantName ?? ''),
      description: n.body,
      dueDate:     String(meta?.dueDate ?? ''),
    });
    navigate(`/schedules/new?${q}`);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page bg-gray-50">
      <div className="bg-primary px-5 pt-12 pb-6 rounded-b-[32px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-white text-xl">←</button>
            <h1 className="text-white font-bold text-xl">Notifications</h1>
          </div>
          <button onClick={markAll} className="text-white/70 text-sm">Mark all read</button>
        </div>
      </div>

      <div className="px-5 pt-5 pb-24 flex flex-col gap-3">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl">🔔</span>
            <p className="text-gray-500 mt-4">All caught up!</p>
          </div>
        ) : items
          // Hide BILL_DUE entries that were already paid — PAYMENT_SUCCESS notification
          // shows in the list and is cleaner; no need to show both
          .filter(n => !(n.type === 'BILL_DUE' && actioned[n.id] === 'paid'))
          .map(n => {
          const meta        = TYPE_META[n.type] ?? { icon: '🔔', color: 'bg-gray-50 border-gray-100' };
          const isBillDue   = n.type === 'BILL_DUE';
          const isReminder  = n.type === 'SCHEDULE_REMINDER';
          const payingThis  = paying === n.id;

          // Was this notification acted on (paid or scheduled)?
          const actionTaken = actioned[n.id];   // 'paid' | 'scheduled' | undefined
          // Also treat any BILL_PAID type as already paid (backend confirms)
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
              {/* Notification row */}
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
                  <p className="text-gray-300 text-[10px] mt-1">
                    {new Date(n.createdAt).toLocaleDateString('en-NP', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                {!n.readAt && <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />}
              </button>

              {/* ── BILL_DUE — payment methods + action buttons ───────────── */}
              {isBillDue && (() => {
                const nMeta    = n.metadata as Record<string, unknown> | undefined;
                const esewaId  = nMeta?.esewaId  ? String(nMeta.esewaId)  : null;
                const khaltiId = nMeta?.khaltiId ? String(nMeta.khaltiId) : null;
                const banks    = (nMeta?.banks ?? []) as BankAccount[];

                return (
                  <div className="px-4 pb-4">
                    {/* Payment account info — always visible */}
                    {(esewaId || khaltiId || banks.length > 0) && !alreadyPaid && (
                      <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 mb-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
                          🔒 Pay to (merchant account — cannot be changed)
                        </p>
                        {esewaId  && (
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-base">🟢</span>
                            <div>
                              <p className="text-[10px] text-gray-400">eSewa</p>
                              <p className="text-sm font-bold text-gray-800">{esewaId}</p>
                            </div>
                          </div>
                        )}
                        {khaltiId && (
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-base">🟣</span>
                            <div>
                              <p className="text-[10px] text-gray-400">Khalti</p>
                              <p className="text-sm font-bold text-gray-800">{khaltiId}</p>
                            </div>
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
                        <span className="text-lg">✅</span>
                        <p className="text-green-700 text-sm font-semibold">Payment done</p>
                      </div>
                    ) : alreadyScheduled ? (
                      <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
                        <span className="text-lg">📅</span>
                        <p className="text-blue-700 text-sm font-semibold">Scheduled for auto-payment</p>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => payNow(n)}
                          disabled={payingThis}
                          className="flex-1 py-2.5 bg-primary text-white text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-60"
                        >
                          {payingThis ? <><Spinner size={14} /> Paying...</> : '⚡ Pay Now'}
                        </button>
                        <button
                          onClick={() => scheduleIt(n)}
                          className="flex-1 py-2.5 border-2 border-primary text-primary text-sm font-bold rounded-xl"
                        >
                          📅 Schedule
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── SCHEDULE_REMINDER — show buttons OR paid badge ────────── */}
              {isReminder && (
                <div className="px-4 pb-4">
                  {alreadyPaid ? (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5">
                      <span className="text-lg">✅</span>
                      <p className="text-green-700 text-sm font-semibold">Payment done</p>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate('/schedules')}
                        className="flex-1 py-2.5 bg-blue-500 text-white text-sm font-bold rounded-xl"
                      >
                        👁 View Schedule
                      </button>
                      <button
                        onClick={() => payNow(n)}
                        disabled={payingThis}
                        className="flex-1 py-2.5 bg-primary text-white text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-60"
                      >
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
      <BottomNav />
    </div>
  );
}
