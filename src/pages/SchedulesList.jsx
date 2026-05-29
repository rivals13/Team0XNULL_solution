import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchScheduleSnapshot } from "../services/automationApi";

const Icon = ({ name, fill = 0, size = 24, className = "" }) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={{
      fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
      fontSize: size,
    }}
  >
    {name}
  </span>
);

const fallbackSummary = {
  recipient: "LBEF College Fee",
  amount: 150000,
  category: "Education",
  payment_count: 5,
  average_interval_days: 60,
  next_due_date: "2025-11-29",
  confidence: 0.96,
  message: "Detected recurring payment to LBEF College Fee: 150000 x5. Would you like to automate this?",
  automation_ready: true,
};

export default function SchedulesList() {
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState({ transactions: [], patterns: [] });
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [showAllPatterns, setShowAllPatterns] = useState(false);

  const refreshSnapshot = async () => {
    setLoading(true);
    try {
      const data = await fetchScheduleSnapshot();
      setSnapshot({
        transactions: data.transactions ?? [],
        patterns: data.patterns ?? [],
      });
      setLastSync(new Date());
    } catch (error) {
      setSnapshot({ transactions: [], patterns: [fallbackSummary] });
      setLastSync(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSnapshot();
    const intervalId = window.setInterval(refreshSnapshot, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  const topPattern = snapshot.patterns[0] ?? fallbackSummary;
  const visiblePatterns = showAllPatterns ? snapshot.patterns : snapshot.patterns.slice(0, 2);
  const recurringTransactions = useMemo(
    () => snapshot.transactions.filter((transaction) => transaction.recipient === topPattern.recipient),
    [snapshot.transactions, topPattern.recipient],
  );

  const handleAutomate = () => {
    navigate("/automation-dashboard", {
      state: {
        suggestion: topPattern,
      },
    });
  };

  return (
    <div
      className="relative flex min-h-screen flex-col pb-28 font-sans"
      style={{ background: "linear-gradient(180deg,#f6fbf8 0%,#eef6f1 100%)", color: "#12211a", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');`}</style>

      <header
        className="sticky top-0 z-50 flex items-center justify-between border-b px-5 py-4"
        style={{ background: "rgba(255,255,255,0.88)", backdropFilter: "blur(14px)", borderColor: "rgba(193,208,200,0.45)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-lg"
            style={{ background: "linear-gradient(135deg,#00654b,#0d7b5c)" }}
          >
            <Icon name="schedule" size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1a7a5b]">Schedules</p>
            <h1 className="text-lg font-extrabold text-[#102219]">Automation Insights</h1>
          </div>
        </div>
        <button
          onClick={refreshSnapshot}
          className="rounded-full border px-3 py-2 text-xs font-bold transition-transform active:scale-95"
          style={{ borderColor: "rgba(0,101,75,0.18)", color: "#00654b" }}
        >
          Refresh
        </button>
      </header>

      <main className="flex flex-col gap-6 px-5 pt-6">
        <section
          className="relative overflow-hidden rounded-[28px] p-6 text-white shadow-[0_18px_40px_-16px_rgba(0,101,75,0.55)]"
          style={{ background: "linear-gradient(135deg,#00654b,#0d7b5c)" }}
        >
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">Pattern detected</p>
              <h2 className="mt-2 text-3xl font-extrabold leading-tight">
                {topPattern.recipient} recurring payment
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/85">
                {topPattern.message}
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-md">
              <Icon name="auto_awesome" size={24} className="text-white" />
            </div>
          </div>
          <div className="relative z-10 mt-6 flex flex-wrap gap-3 text-sm text-white/90">
            <span className="rounded-full bg-white/15 px-3 py-1 font-semibold">
              NPR {Number(topPattern.amount).toLocaleString()} x{topPattern.payment_count}
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 font-semibold">
              Every {Math.round(topPattern.average_interval_days)} days
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 font-semibold">
              Next due {topPattern.next_due_date}
            </span>
          </div>
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-6 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
        </section>

        <section className="rounded-[26px] border bg-white p-5 shadow-[0_10px_25px_-16px_rgba(22,63,46,0.35)]" style={{ borderColor: "rgba(189,201,194,0.55)" }}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#00654b]">Recurring services</p>
              <h3 className="mt-1 text-lg font-bold text-[#102219]">Detected patterns from the database</h3>
            </div>
            {snapshot.patterns.length > 2 && (
              <button
                onClick={() => setShowAllPatterns((current) => !current)}
                className="rounded-full border px-3 py-2 text-xs font-bold transition-transform active:scale-95"
                style={{ borderColor: "rgba(0,101,75,0.18)", color: "#00654b" }}
              >
                {showAllPatterns ? "Show less" : `See more (${snapshot.patterns.length - 2})`}
              </button>
            )}
          </div>
          <div className="grid gap-3">
            {visiblePatterns.map((pattern) => (
              <article key={pattern.pattern_id} className="rounded-2xl border bg-emerald-50/40 p-4" style={{ borderColor: "rgba(0,101,75,0.14)" }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-[#102219]">{pattern.recipient}</p>
                    <p className="mt-1 text-xs text-slate-500">{pattern.category} · {pattern.payment_count} payments</p>
                  </div>
                  <p className="text-sm font-extrabold text-[#00654b]">NPR {Number(pattern.amount).toLocaleString()}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
                  <span className="rounded-full bg-white px-2.5 py-1">Every {Math.round(pattern.average_interval_days)} days</span>
                  <span className="rounded-full bg-white px-2.5 py-1">Next due {pattern.next_due_date}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        {!dismissed && (
          <section className="overflow-hidden rounded-[26px] border bg-white p-5 shadow-[0_10px_25px_-16px_rgba(22,63,46,0.35)]" style={{ borderColor: "rgba(189,201,194,0.55)" }}>
            <div className="mb-4 flex items-center gap-2">
              <span className="rounded-full bg-[#00654b] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white">New</span>
              <span className="text-xs font-semibold text-[#00654b]">AI automation prompt</span>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <h3 className="text-base font-bold leading-tight text-[#102219]">
                  Do you want to automate this?
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {topPattern.recipient} has appeared {topPattern.payment_count} times with the same amount. This is a strong recurring-payment signal.
                </p>
              </div>
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#00654b]">
                <Icon name="history" size={22} />
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={handleAutomate}
                className="flex-1 rounded-2xl py-3 text-xs font-bold text-white transition-transform active:scale-95"
                style={{ background: "linear-gradient(135deg,#00654b,#0d7b5c)" }}
              >
                Automate
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="flex-1 rounded-2xl border py-3 text-xs font-bold transition-transform active:scale-95"
                style={{ borderColor: "rgba(110,122,115,0.24)", color: "#425349" }}
              >
                Dismiss
              </button>
            </div>
          </section>
        )}

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#102219]">Transaction history</h2>
            <span className="text-xs font-semibold text-slate-500">
              {loading ? "Syncing..." : `${snapshot.transactions.length} records`}
            </span>
          </div>
          <div className="grid gap-3">
            {recurringTransactions.map((transaction) => (
              <article key={transaction.transaction_id} className="rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: "rgba(189,201,194,0.4)" }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-[#102219]">{transaction.recipient}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {transaction.category} · {transaction.date}
                    </p>
                  </div>
                  <p className="text-sm font-extrabold text-[#00654b]">
                    NPR {Number(transaction.amount).toLocaleString()}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[26px] border border-dashed border-emerald-200 bg-emerald-50/70 p-5 text-sm text-emerald-900">
          <div className="flex items-center gap-2 font-bold">
            <Icon name="check_circle" size={18} className="text-emerald-700" />
            Real-time automation suggestion
          </div>
          <p className="mt-2 leading-6 text-emerald-900/80">
            The backend re-evaluates recurring patterns from the JSON transaction store and the dashboard refreshes every 30 seconds.
            {lastSync ? ` Last sync ${lastSync.toLocaleTimeString()}.` : ""}
          </p>
        </section>
      </main>
    </div>
  );
}