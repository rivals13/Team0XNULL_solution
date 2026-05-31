import { useEffect, useState } from "react";
import { fetchTransactionHistory } from "../services/automationApi";

export default function Statement() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      setLoading(true);
      setError("");
      try {
        const records = await fetchTransactionHistory();
        if (isMounted) {
          setTransactions(Array.isArray(records) ? records : []);
        }
      } catch {
        if (isMounted) {
          setError("Unable to load live transaction history. Showing no records.");
          setTransactions([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadHistory();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f7faf9] px-5 py-6 text-[#181c1c]">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 rounded-[28px] bg-white p-6 shadow-sm border border-gray-100">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-[#00654b]">Transaction history</p>
          <h1 className="mt-2 text-3xl font-extrabold">Live backend statement</h1>
          <p className="mt-2 text-sm text-gray-500">This page reads directly from <span className="font-semibold">GET /api/transactions-history</span>.</p>
        </div>

        {loading ? (
          <div className="rounded-[28px] border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            Loading live transactions...
          </div>
        ) : error ? (
          <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            {error}
          </div>
        ) : (
          <div className="grid gap-3">
            {transactions.map((transaction) => (
              <article key={transaction.transaction_id} className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-[#102219]">{transaction.recipient}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {transaction.category} · {transaction.date} · {transaction.transaction_id}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-[#00654b]">NPR {Number(transaction.amount).toLocaleString()}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-slate-400">{transaction.note ?? "No note"}</p>
                  </div>
                </div>
              </article>
            ))}

            {transactions.length === 0 && (
              <div className="rounded-[28px] border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                No transactions found in the backend database.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}