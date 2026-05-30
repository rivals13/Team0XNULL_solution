import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { billerAccountsApi } from '../api';
import type { BillerAccount } from '../types';

const WS_URL    = 'http://localhost:3000';
const REMIND_KEY = 'paysmart_remind_dismissed';

interface BillDuePayload {
  merchantName: string;
  merchantSlug: string;
  amount:       number;
  dueDate:      string;
  description:  string;
  billId?:      string;
}

interface SocketContextValue {
  socket: React.MutableRefObject<Socket | null>;
}

const SocketContext = createContext<SocketContextValue>({ socket: { current: null } });
export const useSocketContext = () => useContext(SocketContext);

// ── Remind-tomorrow helpers ───────────────────────────────────────────────────
function isDismissed(key: string) {
  try {
    const map: Record<string, number> = JSON.parse(localStorage.getItem(REMIND_KEY) ?? '{}');
    const ts = map[key];
    return !!ts && Date.now() - ts < 24 * 60 * 60 * 1000;
  } catch { return false; }
}
function dismissForDay(key: string) {
  try {
    const map: Record<string, number> = JSON.parse(localStorage.getItem(REMIND_KEY) ?? '{}');
    map[key] = Date.now();
    localStorage.setItem(REMIND_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SocketProvider({ children }: { children: React.ReactNode }) {
  const { accessToken }  = useAuthStore();
  const navigate         = useNavigate();
  const socketRef        = useRef<Socket | null>(null);
  const [popup, setPopup]= useState<BillDuePayload | null>(null);
  // billerAccounts loaded once — used to find customerId for the schedule pre-fill
  const [billerAccounts, setBillerAccounts] = useState<BillerAccount[]>([]);

  // Load biller accounts when logged in (once) and refresh when a new account is saved
  useEffect(() => {
    if (!accessToken) return;
    billerAccountsApi.list().then(setBillerAccounts).catch(() => {});

    // Listen for the custom event fired after a new account is saved (from Onboarding)
    const onSaved = () => billerAccountsApi.list().then(setBillerAccounts).catch(() => {});
    window.addEventListener('billerAccountSaved', onSaved);
    return () => window.removeEventListener('billerAccountSaved', onSaved);
  }, [accessToken]);

  const closePopup = useCallback(() => setPopup(null), []);

  const remindLater = useCallback(() => {
    if (popup?.billId) dismissForDay(popup.billId);
    setPopup(null);
  }, [popup]);

  const goPayNow = useCallback(() => {
    setPopup(null);
    navigate('/smart-bills');
  }, [navigate]);

  const goSchedule = useCallback(() => {
    if (!popup) return;
    // Find the matching biller account by merchantSlug — no new API call
    const acc = billerAccounts.find(a => a.billerSlug === popup.merchantSlug);
    const q = new URLSearchParams({
      fromSmartBill:   'true',
      name:            `${popup.merchantName} — Bill`,
      amount:          String(popup.amount ?? ''),
      billerName:      popup.merchantName,
      merchantSlug:    popup.merchantSlug,
      customerId:      acc?.customerId ?? '',
      billerAccountId: acc?.id ?? '',
      billerCategory:  (acc?.billerCategory ?? '').toUpperCase(),
      description:     popup.description ?? '',
      dueDate:         popup.dueDate ?? '',
    });
    setPopup(null);
    navigate(`/schedules/new?${q}`);
  }, [popup, billerAccounts, navigate]);

  // ── WebSocket connection ──────────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken) return;

    const socket = io(`${WS_URL}/notifications`, {
      auth:               { token: accessToken },
      transports:         ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay:  2000,
    });
    socketRef.current = socket;

    socket.on('connect',    () => console.log('[WS] Connected:', socket.id));
    socket.on('disconnect', (r) => console.log('[WS] Disconnected:', r));
    socket.on('pong',       (d) => console.log('[WS] Pong:', d));

    socket.on('bill.due', (data: BillDuePayload & { billId?: string }) => {
      console.log('[WS] bill.due received:', data);
      const billKey = data.billId ?? `${data.merchantSlug}-${data.amount}`;
      // Server-pushed events ALWAYS show the popup — dismiss only affects
      // auto-scheduled re-shows, not real-time WS events from saving an account
      setPopup({ ...data, billId: billKey });
      billerAccountsApi.list().then(setBillerAccounts).catch(() => {});
    });

    const hb = setInterval(() => socket.emit('ping'), 30_000);
    return () => { clearInterval(hb); socket.disconnect(); socketRef.current = null; };
  }, [accessToken]);

  return (
    <SocketContext.Provider value={{ socket: socketRef }}>
      {children}

      {/* ── Global bill-due popup — appears on top of everything ── */}
      {popup && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center pb-[66px] px-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closePopup} />

          {/* Card */}
          <div className="relative w-full max-w-[390px] bg-white rounded-t-[32px] pb-8 pt-5 px-5 shadow-2xl animate-slide-up">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🔔</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800">{popup.merchantName}</p>
                <p className="text-xs text-gray-500 truncate">{popup.description}</p>
              </div>
              <button onClick={closePopup} className="text-gray-400 text-xl leading-none">✕</button>
            </div>

            {/* Amount box */}
            <div className="bg-primary/5 border border-primary/15 rounded-2xl px-4 py-4 mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Amount Due</p>
                <p className="text-2xl font-bold text-primary">
                  NPR {(popup.amount ?? 0).toLocaleString('en-NP')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-0.5">Due Date</p>
                <p className="text-sm font-semibold text-gray-700">
                  {popup.dueDate
                    ? new Date(popup.dueDate).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'}
                </p>
                {(() => {
                  const d = popup.dueDate ? Math.ceil((new Date(popup.dueDate).getTime() - Date.now()) / 86_400_000) : null;
                  return d !== null ? (
                    <p className="text-xs text-amber-600 font-medium mt-0.5">
                      ⏰ {d <= 0 ? 'due today' : d === 1 ? 'due tomorrow' : `due in ${d} days`}
                    </p>
                  ) : null;
                })()}
              </div>
            </div>

            {/* 3 action buttons */}
            <div className="flex flex-col gap-2.5">
              <button onClick={goPayNow}
                className="w-full py-3.5 bg-primary text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform">
                ⚡ Pay Now
              </button>
              <button onClick={goSchedule}
                className="w-full py-3.5 bg-gray-50 border border-gray-200 text-gray-700 font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform">
                📅 Schedule Payment
              </button>
              <button onClick={remindLater}
                className="w-full py-3 text-gray-400 text-sm font-medium">
                🔕 Remind me tomorrow
              </button>
            </div>
          </div>
        </div>
      )}
    </SocketContext.Provider>
  );
}
