import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { paymentsApi } from '../api';
import MpinModal from '../components/MpinModal';

const WS_URL = 'http://localhost:3000';

export interface BillDuePayload {
  type:         string;
  merchantName: string;
  merchantSlug: string;
  customerId:   string;
  amount:       number;
  dueDate:      string;
  description:  string;
  billId:       string;
}

interface SocketContextValue {
  socket: React.MutableRefObject<Socket | null>;
}

const SocketContext = createContext<SocketContextValue>({ socket: { current: null } });
export const useSocketContext = () => useContext(SocketContext);

/** Save a dismissed bill to localStorage so Notifications page can show it */
function saveDismissed(popup: BillDuePayload) {
  try {
    const key  = 'ps_dismissed_alerts';
    const list = JSON.parse(localStorage.getItem(key) ?? '[]');
    const entry = {
      id:          popup.billId || `${popup.merchantSlug}-${Date.now()}`,
      title:       `Bill due: ${popup.merchantName}`,
      body:        `NPR ${popup.amount} — ${popup.description}`,
      metadata:    popup,
      createdAt:   new Date().toISOString(),
      dismissedAt: new Date().toISOString(),
    };
    // De-duplicate by billId
    const filtered = list.filter((d: { id: string }) => d.id !== entry.id);
    filtered.unshift(entry);
    localStorage.setItem(key, JSON.stringify(filtered.slice(0, 20)));
  } catch { /* storage full */ }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SocketProvider({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore();
  const navigate        = useNavigate();
  const socketRef       = useRef<Socket | null>(null);
  const [popup,     setPopup]    = useState<BillDuePayload | null>(null);
  const [showMpin,  setShowMpin] = useState(false);
  const [paying,    setPaying]   = useState(false);
  const [payResult, setPayResult]= useState<'success' | 'error' | null>(null);

  const dismiss = useCallback((save = true) => {
    if (popup && save) saveDismissed(popup);
    setPopup(null);
    setShowMpin(false);
    setPaying(false);
    setPayResult(null);
  }, [popup]);

  // Execute payment after MPIN confirmed
  const executePay = useCallback(async () => {
    if (!popup) return;
    setShowMpin(false);
    setPaying(true);
    try {
      await paymentsApi.execute({
        amount:      popup.amount,
        provider:    'ESEWA',
        recipientId: popup.merchantName,
        description: `${popup.merchantName} – ${popup.description}`,
        billId:      popup.billId || undefined,
      });
      setPayResult('success');
      setTimeout(() => { setPopup(null); setPayResult(null); setPaying(false); }, 2500);
    } catch {
      setPayResult('error');
      setPaying(false);
    }
  }, [popup]);

  const goSchedule = useCallback(() => {
    if (!popup) return;
    saveDismissed(popup);                       // save so it shows in notifications
    const q = new URLSearchParams({
      fromSmartBill: 'true',
      name:          `${popup.merchantName} — Bill`,
      amount:        String(popup.amount),
      billerName:    popup.merchantName,
      merchantSlug:  popup.merchantSlug,
      customerId:    popup.customerId,
      description:   popup.description,
      dueDate:       popup.dueDate,
    });
    setPopup(null);
    navigate(`/schedules/new?${q}`);
  }, [popup, navigate]);

  // ── WebSocket ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken) return;
    const socket = io(`${WS_URL}/notifications`, {
      auth: { token: accessToken }, transports: ['websocket'],
      reconnectionAttempts: 5, reconnectionDelay: 2000,
    });
    socketRef.current = socket;
    socket.on('connect',    () => console.log('[WS] Connected:', socket.id));
    socket.on('disconnect', (r) => console.log('[WS] Disconnected:', r));

    socket.on('bill.due', (raw: Record<string, unknown>) => {
      console.log('[WS] bill.due received:', raw);
      const merchantName = String(raw.merchantName ?? '');
      const amount       = Number(raw.amount ?? 0);
      if (!merchantName || !amount) { console.warn('[WS] bill.due missing fields', raw); return; }
      setPopup({
        type:         'BILL_DUE',
        merchantName,
        merchantSlug: String(raw.merchantSlug ?? ''),
        customerId:   String(raw.customerId   ?? ''),
        amount,
        dueDate:      String(raw.dueDate      ?? ''),
        description:  String(raw.description  ?? ''),
        billId:       String(raw.billId       ?? ''),
      });
      setPayResult(null);
    });

    const hb = setInterval(() => socket.emit('ping'), 30_000);
    return () => { clearInterval(hb); socket.disconnect(); socketRef.current = null; };
  }, [accessToken]);

  return (
    <SocketContext.Provider value={{ socket: socketRef }}>
      {children}

      {/* ── MPIN modal (shown on top of bill popup) ── */}
      {showMpin && popup && (
        <MpinModal
          onConfirm={executePay}
          onCancel={() => setShowMpin(false)}
        />
      )}

      {/* ── Global bill-due popup ── */}
      {popup && !showMpin && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ animation: 'fadeIn 0.15s ease' }}>
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => dismiss(true)} />

          <div className="relative w-full max-w-[390px] bg-white rounded-3xl shadow-2xl overflow-hidden"
            style={{ animation: 'slideDown 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}>

            {/* Header */}
            <div className={`px-5 pt-5 pb-6 ${payResult === 'success' ? 'bg-green-500' : payResult === 'error' ? 'bg-red-500' : 'bg-primary'}`}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-base">{payResult === 'success' ? '✅' : payResult === 'error' ? '❌' : '🔔'}</span>
                  </div>
                  <span className="text-white text-xs font-semibold uppercase tracking-wide opacity-80">
                    {payResult === 'success' ? 'Payment Sent!' : payResult === 'error' ? 'Payment Failed' : 'Bill Due'}
                  </span>
                </div>
                <button onClick={() => dismiss(true)}
                  className="text-white/60 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10">✕</button>
              </div>
              <p className="text-white font-bold text-xl">{popup.merchantName}</p>
              {popup.customerId && (
                <p className="text-white/70 text-xs mt-1">
                  Customer ID: <span className="font-mono font-semibold">{popup.customerId}</span>
                </p>
              )}
            </div>

            {/* Body */}
            <div className="px-5 py-5">
              {/* Success / Error state */}
              {payResult === 'success' && (
                <div className="text-center py-4">
                  <p className="text-green-600 font-bold text-lg">✅ NPR {popup.amount.toLocaleString('en-NP')} paid!</p>
                  <p className="text-gray-400 text-sm mt-1">Payment successful</p>
                </div>
              )}
              {payResult === 'error' && (
                <div className="text-center py-2 mb-3">
                  <p className="text-red-500 text-sm font-semibold">Payment failed. Please try again.</p>
                </div>
              )}

              {/* Normal state — amount + date */}
              {!payResult && (
                <>
                  <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3.5 mb-4">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-semibold mb-0.5">Amount Due</p>
                      <p className="text-2xl font-bold text-primary">NPR {popup.amount.toLocaleString('en-NP')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 uppercase font-semibold mb-0.5">Due Date</p>
                      <p className="text-sm font-semibold text-gray-700">
                        {popup.dueDate
                          ? new Date(popup.dueDate).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </p>
                      {popup.dueDate && (() => {
                        const d = Math.ceil((new Date(popup.dueDate).getTime() - Date.now()) / 86_400_000);
                        return <p className={`text-[10px] mt-0.5 font-medium ${d <= 0 ? 'text-red-500' : d <= 3 ? 'text-amber-500' : 'text-gray-400'}`}>
                          {d <= 0 ? 'Due today!' : d === 1 ? 'Due tomorrow' : `${d} days left`}
                        </p>;
                      })()}
                    </div>
                  </div>
                  {popup.description && <p className="text-xs text-gray-500 mb-4 text-center">{popup.description}</p>}
                </>
              )}

              {/* Action buttons */}
              {!payResult && (
                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={() => setShowMpin(true)}
                    disabled={paying}
                    className="w-full py-3.5 bg-primary text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform text-sm disabled:opacity-60">
                    {paying ? '⏳ Processing…' : `⚡ Pay Now — NPR ${popup.amount.toLocaleString('en-NP')}`}
                  </button>
                  <button onClick={goSchedule}
                    className="w-full py-3.5 bg-gray-50 border border-gray-200 text-gray-800 font-semibold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform text-sm">
                    📅 Schedule Payment
                  </button>
                  <button onClick={() => dismiss(true)}
                    className="w-full py-2.5 text-gray-400 text-xs font-medium">
                    🔕 Remind me later
                  </button>
                </div>
              )}
            </div>
          </div>

          <style>{`
            @keyframes fadeIn    { from { opacity:0 } to { opacity:1 } }
            @keyframes slideDown { from { opacity:0; transform:translateY(-40px) scale(0.95) } to { opacity:1; transform:translateY(0) scale(1) } }
          `}</style>
        </div>
      )}
    </SocketContext.Provider>
  );
}
