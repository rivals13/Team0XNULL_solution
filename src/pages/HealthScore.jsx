import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

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

const SCORE = 74;
const RADIUS = 70;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const metrics = [
  { label: "On-time Payments", value: 88, icon: "check_circle", color: "#00654b", bg: "bg-green-50", iconColor: "text-green-600", desc: "6/7 bills paid on time" },
  { label: "Savings Rate", value: 62, icon: "savings", color: "#3b82f6", bg: "bg-blue-50", iconColor: "text-blue-500", desc: "Saving 22% of income" },
  { label: "Bill Consistency", value: 75, icon: "event_available", color: "#8b5cf6", bg: "bg-purple-50", iconColor: "text-purple-500", desc: "Regular payment pattern" },
  { label: "Budget Adherence", value: 58, icon: "account_balance_wallet", color: "#f59e0b", bg: "bg-yellow-50", iconColor: "text-yellow-600", desc: "Slightly over budget" },
];

const tips = [
  { icon: "tips_and_updates", text: "Pay Vianet before due date to boost your score by +3 pts" },
  { icon: "trending_up", text: "You're in the top 40% of eSewa users your age" },
  { icon: "warning", text: "Reduce impulse spending to improve Budget Adherence" },
];

const NavBtn = ({ onClick, icon, label, active = false }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center rounded-full px-3 py-1.5 transition-transform active:scale-95"
    style={{ color: active ? "#00654b" : "#64748b" }}
  >
    <Icon name={icon} size={24} fill={active ? 1 : 0} />
    <span className="text-[10px] font-medium mt-1 uppercase">{label}</span>
  </button>
);

function ScoreRing({ score, animated }) {
  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;
  const color = score >= 75 ? "#00654b" : score >= 50 ? "#f59e0b" : "#ef4444";
  const label = score >= 75 ? "Great" : score >= 50 ? "Fair" : "Needs work";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-44 h-44">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r={RADIUS} fill="none" stroke="#e2e8f0" strokeWidth="12" />
          <circle
            cx="80" cy="80" r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={animated ? offset : CIRCUMFERENCE}
            style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-extrabold" style={{ color: "#141b2b" }}>{animated ? score : 0}</span>
          <span className="text-xs font-bold mt-0.5" style={{ color }}>/ 100</span>
          <span className="text-xs font-semibold text-gray-500 mt-1">{label}</span>
        </div>
      </div>
    </div>
  );
}

export default function HealthScore() {
  const navigate = useNavigate();
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col font-sans pb-24"
      style={{ background: "#f7faf6", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');`}</style>

      {/* Header */}
      <header
        className="sticky top-0 z-50 flex justify-between items-center px-5 py-4 border-b"
        style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderColor: "#e1e8fd", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
      >
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
          <Icon name="arrow_back" size={22} className="text-gray-600" />
        </button>
        <h1 className="text-xl font-extrabold" style={{ color: "#141b2b" }}>Health Score</h1>
        <div className="w-9" />
      </header>

      {/* Score ring */}
      <div
        className="flex flex-col items-center py-8 px-5 mx-5 mt-5 rounded-3xl"
        style={{ background: "linear-gradient(160deg,#f0fdf7,#e8f5f0)", border: "1px solid rgba(0,101,75,0.12)" }}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Your Financial Health</p>
        <ScoreRing score={SCORE} animated={animated} />
        <p className="text-sm text-gray-500 mt-4 text-center px-4">
          Your score improved <span className="font-bold text-green-600">+5 pts</span> this month. Keep paying bills on time!
        </p>
      </div>

      {/* Breakdown */}
      <div className="px-5 mt-6">
        <h2 className="text-base font-extrabold mb-3" style={{ color: "#141b2b" }}>Score Breakdown</h2>
        <div className="flex flex-col gap-3">
          {metrics.map((m) => (
            <div key={m.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${m.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon name={m.icon} size={20} className={m.iconColor} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold" style={{ color: "#141b2b" }}>{m.label}</p>
                    <p className="text-sm font-extrabold" style={{ color: m.color }}>{m.value}%</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{m.desc}</p>
                </div>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: animated ? `${m.value}%` : "0%",
                    background: m.color,
                    transitionDelay: "0.3s",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="px-5 mt-6">
        <h2 className="text-base font-extrabold mb-3" style={{ color: "#141b2b" }}>Improve Your Score</h2>
        <div className="flex flex-col gap-2">
          {tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-3 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon name={tip.icon} size={18} className="text-green-600" />
              </div>
              <p className="text-sm text-gray-600 font-medium leading-snug">{tip.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Nav */}
      <nav
        className="fixed bottom-0 left-0 w-full z-50 h-20 flex justify-around items-center px-2 bg-white border-t"
        style={{ borderColor: "#f1f4f0", boxShadow: "0 -4px 20px -4px rgba(0,101,75,0.15)" }}
      >
        <NavBtn onClick={() => navigate("/")} icon="home" label="Home" />
        <NavBtn onClick={() => navigate("/statement")} icon="receipt_long" label="Statement" />
        <div className="relative -mt-8 flex flex-col items-center">
          <button
            className="w-16 h-16 rounded-full flex items-center justify-center text-white border-4 border-white shadow-lg active:scale-95 transition-all"
            style={{ background: "#00654b" }}
          >
            <Icon name="qr_code_scanner" size={28} className="text-white" />
          </button>
          <span className="text-[10px] font-bold mt-1 text-[#00654b]">Scan & Pay</span>
        </div>
        <NavBtn onClick={() => navigate("/schedules")} icon="calendar_month" label="Schedules" />
        <NavBtn onClick={() => navigate("/more")} icon="menu" label="More" />
      </nav>
    </div>
  );
}
