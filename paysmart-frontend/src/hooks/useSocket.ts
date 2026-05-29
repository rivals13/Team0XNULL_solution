import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Notification } from '../types';

const WS_URL = 'http://localhost:3000';

interface SocketEvents {
  onNotification?: (n: Notification) => void;
  onPaymentSuccess?: (d: { amount: number; provider: string; transactionId: string }) => void;
  onPaymentFailed?: (d: { amount: number; provider: string; error: string }) => void;
  onBillDue?: (d: unknown) => void;
}

export function useSocket(token: string | null, events: SocketEvents = {}) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const socket = io(`${WS_URL}/notifications`, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => console.log('[WS] Connected:', socket.id));
    socket.on('disconnect', (r) => console.log('[WS] Disconnected:', r));
    socket.on('pong', (d) => console.log('[WS] Pong:', d));

    socket.on('notification', (n: Notification) => {
      events.onNotification?.(n);
    });
    socket.on('payment.success', events.onPaymentSuccess ?? (() => {}));
    socket.on('payment.failed',  events.onPaymentFailed  ?? (() => {}));
    socket.on('bill.due',        events.onBillDue         ?? (() => {}));

    // heartbeat
    const hb = setInterval(() => socket.emit('ping'), 30_000);

    return () => {
      clearInterval(hb);
      socket.disconnect();
      socketRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return socketRef;
}
