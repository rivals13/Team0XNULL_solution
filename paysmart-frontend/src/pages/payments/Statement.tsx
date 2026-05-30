import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { transactionsApi, paymentsApi } from '../../api';
import type { Transaction } from '../../types';
import BottomNav from '../../components/BottomNav';
import Spinner from '../../components/Spinner';
import { smartDate } from '../../utils/date';

const STATUS_STYLE: Record<string, string> = {
  COMPLETED: 'text-primary bg-green-50',
  PENDING:   'text-yellow-700 bg-yellow-50',
  FAILED:    'text-red-600 bg-red-50',
  CANCELLED: 'text-gray-500 bg-gray-100',
  REFUNDED:  'text-blue-600 bg-blue-50',
};

export default function Statement() {
  const [txns,    setTxns]    = useState<Transaction[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      transactionsApi.list(1, 50),
      paymentsApi.getBalance(),
    ])
      .then(([r, b]) => {
        setTxns(r.data);
        setBalance(b.balance);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /**
   * Compute running balance for each transaction.
   * Transactions are newest-first. Starting from current balance and
   * working backwards, each older tx had (current + all newer debits) as balance after.
   *
   * balanceAfter[0] (newest) = currentBalance
   * balanceAfter[i]          = balanceAfter[i-1] + txns[i-1].amount  (adding back what was deducted)
   */
  const runningBalances: number[] = [];
  if (balance !== null && txns.length > 0) {
    let running = balance;
    for (let i = 0; i < txns.length; i++) {
      runningBalances[i] = running;
      // Add back the deducted amount to get the balance that existed before this tx
      if (txns[i].status === 'COMPLETED') {
        running += txns[i].type === 'DEBIT' ? txns[i].amount : -txns[i].amount;
      }
    }
  }

  return (
    <div className="page bg-gray-50">
      <div className="bg-primary px-5 pt-12 pb-6 rounded-b-[32px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-white text-xl">←</button>
            <h1 className="text-white font-bold text-xl">Transaction History</h1>
          </div>
          {balance !== null && (
            <div className="text-right">
              <p className="text-white/60 text-[10px]">Current balance</p>
              <p className="text-white font-bold text-sm">NPR {balance.toLocaleString('en-NP')}</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 pt-5 pb-24">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : txns.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl">📋</span>
            <p className="text-gray-500 mt-4">No transactions yet</p>
          </div>
        ) : (
          <TransactionList txns={txns} runningBalances={runningBalances} />
        )}
      </div>
      <BottomNav />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Grouped transaction list with day headers
// ─────────────────────────────────────────────────────────────────────────────
function dayKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayHeader(dateStr: string): string {
  const date  = new Date(dateStr);
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yest  = new Date(today.getTime() - 86_400_000);
  const item  = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (item.getTime() === today.getTime()) return 'Today';
  if (item.getTime() === yest.getTime())  return 'Yesterday';
  const daysAgo = Math.floor((today.getTime() - item.getTime()) / 86_400_000);
  if (daysAgo < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function TransactionList({
  txns,
  runningBalances,
}: {
  txns: Transaction[];
  runningBalances: number[];
}) {
  // Group by calendar day
  const groups: { key: string; header: string; items: { txn: Transaction; idx: number }[] }[] = [];
  txns.forEach((t, i) => {
    const k = dayKey(t.createdAt);
    let g = groups.find(x => x.key === k);
    if (!g) {
      g = { key: k, header: dayHeader(t.createdAt), items: [] };
      groups.push(g);
    }
    g.items.push({ txn: t, idx: i });
  });

  return (
    <div className="flex flex-col gap-1">
      {groups.map(group => (
        <div key={group.key}>
          {/* Day header */}
          <div className="flex items-center gap-2 py-2 px-1">
            <span className="text-xs font-bold text-gray-500">{group.header}</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          {/* Transactions for this day */}
          <div className="flex flex-col gap-2">
            {group.items.map(({ txn: t, idx: i }) => {
              const isDebit   = t.type === 'DEBIT';
              const balAfter  = runningBalances[i];
              const completed = t.status === 'COMPLETED';
              // Time only for items within a group
              const timeStr = new Date(t.createdAt).toLocaleTimeString('en-GB', {
                hour: '2-digit', minute: '2-digit', hour12: false,
              });
              return (
                <div key={t.id} className="bg-white rounded-2xl px-4 py-3.5 shadow-card">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDebit ? 'bg-red-50' : 'bg-green-50'}`}>
                      <span className={`text-base font-bold ${isDebit ? 'text-red-500' : 'text-primary'}`}>
                        {isDebit ? '↑' : '↓'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">
                        {t.description ?? t.recipientId ?? 'Transaction'}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5">{timeStr}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-bold text-sm ${isDebit ? 'text-red-500' : 'text-primary'}`}>
                        {isDebit ? '−' : '+'}NPR {t.amount.toLocaleString('en-NP')}
                      </p>
                      {completed && balAfter !== undefined && (
                        <p className="text-gray-400 text-[10px] mt-0.5">
                          Bal: NPR {balAfter.toLocaleString('en-NP')}
                        </p>
                      )}
                      {!completed && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 inline-block ${STATUS_STYLE[t.status] ?? 'text-gray-500 bg-gray-100'}`}>
                          {t.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
