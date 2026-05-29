import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { transactionsApi, paymentsApi } from '../../api';
import type { Transaction } from '../../types';
import BottomNav from '../../components/BottomNav';
import Spinner from '../../components/Spinner';

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
          <div className="flex flex-col gap-2.5">
            {txns.map((t, i) => {
              const isDebit   = t.type === 'DEBIT';
              const balAfter  = runningBalances[i];
              const completed = t.status === 'COMPLETED';

              return (
                <div key={t.id} className="bg-white rounded-2xl px-4 py-3.5 shadow-card">
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDebit ? 'bg-red-50' : 'bg-green-50'}`}>
                      <span className={`text-base font-bold ${isDebit ? 'text-red-500' : 'text-primary'}`}>
                        {isDebit ? '↑' : '↓'}
                      </span>
                    </div>

                    {/* Description + date */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">
                        {t.description ?? t.recipientId ?? 'Transaction'}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {new Date(t.createdAt).toLocaleDateString('en-NP', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>

                    {/* Amount + running balance */}
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
        )}
      </div>
      <BottomNav />
    </div>
  );
}
