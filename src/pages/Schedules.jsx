import { useState } from "react";

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

const bills = [
  {
    id: 1, label: "Vianet", amount: "NPR 1,000", days: 2,
    icon: "router", iconBg: "bg-red-50", iconColor: "text-red-600", urgent: true,
  },
  {
    id: 2, label: "NEA Electricity", amount: "NPR 850", days: 5,
    icon: "bolt", iconBg: "bg-blue-50", iconColor: "text-blue-600", urgent: false,
  },
  {
    id: 3, label: "College Fee", amount: "NPR 2,350", days: 12,
    icon: "school", iconBg: "bg-purple-50", iconColor: "text-purple-600", urgent: false,
  },
];

const navItems = [
  { icon: "home", label: "Home" },
  { icon: "receipt_long", label: "Statement" },
  null, // QR center
  { icon: "calendar_month", label: "Schedules", active: true },
  { icon: "menu", label: "More" },
];

export default function PaySmart() {
  const [dismissed, setDismissed] = useState(false);
  const [setupDone, setSetupDone] = useState(false);
  const [activeNav, setActiveNav] = useState(3);

  return (
    <div
      className="relative flex flex-col min-h-screen pb-28 font-sans"
      style={{ background: "#f7faf6", color: "#141b2b", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Google Fonts */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');`}</style>

      {/* Header */}
      <header className="sticky top-0 z-50 flex justify-between items-center px-5 py-4 border-b"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderColor: "#e1e8fd", boxShadow: "0 2px 12px 0 rgba(0,0,0,0.05)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ background: "linear-gradient(135deg,#00654b,#006c4c)" }}>A</div>
          <span className="font-extrabold text-xl" style={{ color: "#00654b" }}>PaySmart</span>
        </div>
        <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
          <Icon name="notifications" size={24} className="text-gray-500" />
        </button>
      </header>

      {/* Main */}
      <main className="flex flex-col gap-6 px-5 pt-6">

        {/* Greeting */}
        <section>
          <h1 className="text-2xl font-bold tracking-tight">Good morning, Aarav 👋</h1>
          <p className="text-sm mt-1" style={{ color: "#3e4944" }}>Ready for your upcoming bills?</p>
        </section>

        {/* Summary Card */}
        <section className="relative overflow-hidden rounded-2xl p-6"
          style={{ background: "linear-gradient(135deg,#00654b,#006c4c)", boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12)" }}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.75)" }}>
                Scheduled this month
              </p>
              <h2 className="text-[32px] font-bold text-white mt-2">NPR 4,200</h2>
            </div>
            <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
              <Icon name="calendar_month" size={24} className="text-white" />
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2" style={{ color: "rgba(255,255,255,0.85)" }}>
            <Icon name="check_circle" size={16} className="text-white" />
            <span className="text-xs">All schedules are active and verified.</span>
          </div>
          <div className="absolute -right-10 -bottom-10 w-32 h-32 rounded-full" style={{ background: "rgba(255,255,255,0.05)", filter: "blur(20px)" }} />
          <div className="absolute -left-12 -top-12 w-24 h-24 rounded-full" style={{ background: "rgba(255,255,255,0.05)", filter: "blur(16px)" }} />
        </section>

        {/* Upcoming Payments */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Upcoming Payments</h2>
            <button className="text-sm font-semibold hover:underline" style={{ color: "#00654b" }}>View All</button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-5 px-5" style={{ scrollbarWidth: "none" }}>
            {bills.map(b => (
              <div key={b.id} className="min-w-[160px] rounded-2xl p-4 flex-shrink-0 bg-white border transition-transform active:scale-95 cursor-pointer"
                style={{ borderColor: "#e1e8fd", boxShadow: "0 2px 12px 0 rgba(0,0,0,0.05)" }}>
                <div className={`w-10 h-10 rounded-xl ${b.iconBg} flex items-center justify-center mb-3`}>
                  <Icon name={b.icon} size={20} className={b.iconColor} />
                </div>
                <p className="text-xs font-semibold" style={{ color: "#3e4944" }}>{b.label}</p>
                <p className="text-lg font-semibold mt-1">{b.amount}</p>
                <div className={`mt-3 flex items-center gap-1 w-fit px-2 py-0.5 rounded-full ${b.urgent ? "bg-orange-50 text-orange-700" : "text-gray-500"}`}
                  style={!b.urgent ? { background: "#e9edff" } : {}}>
                  <Icon name="schedule" size={14} className={b.urgent ? "text-orange-700" : "text-gray-500"} />
                  <span className="text-[10px] font-bold">{b.days} days left</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Smart Suggestions */}
        {!dismissed && (
          <section className="pb-4">
            <h2 className="text-xl font-semibold mb-4">Smart Suggestions</h2>
            <div className="relative overflow-hidden rounded-2xl p-5 border bg-white"
              style={{ borderColor: "rgba(189,201,194,0.3)", boxShadow: "0 2px 12px 0 rgba(0,0,0,0.05)" }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider"
                  style={{ background: "#00654b" }}>New</span>
                <span className="text-xs font-semibold" style={{ color: "#00654b" }}>Automation Alert</span>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <h3 className="text-base font-semibold leading-tight">Automate Vianet payments?</h3>
                  <p className="text-sm mt-1" style={{ color: "#3e4944" }}>
                    You pay NPR 1,000 every month. Set up auto-pay to avoid service interruptions.
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(0,101,75,0.1)" }}>
                  <Icon name="auto_awesome" size={22} style={{ color: "#00654b" }} className="text-green-800" />
                </div>
              </div>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setSetupDone(true)}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
                  style={{ background: setupDone ? "#4caf50" : "#00654b" }}>
                  {setupDone ? "✓ Done!" : "Set Up"}
                </button>
                <button
                  onClick={() => setDismissed(true)}
                  className="flex-1 py-3 rounded-xl text-xs font-bold border transition-all active:scale-95"
                  style={{ color: "#3e4944", borderColor: "rgba(110,122,115,0.2)" }}>
                  Dismiss
                </button>
              </div>
              <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full"
                style={{ background: "rgba(0,101,75,0.05)", filter: "blur(24px)" }} />
            </div>
          </section>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 w-full z-50 h-20 flex justify-around items-center px-2 bg-white border-t"
        style={{ borderColor: "#f1f4f0", boxShadow: "0 -4px 20px -4px rgba(0,101,75,0.15)" }}>
        {navItems.map((item, i) =>
          item === null ? (
            <div key="qr" className="relative -mt-8 flex flex-col items-center">
              <button className="w-16 h-16 rounded-full flex items-center justify-center text-white border-4 border-white transition-transform active:scale-95"
                style={{ background: "#00654b", boxShadow: "0 4px 20px -4px rgba(0,101,75,0.4)" }}>
                <Icon name="qr_code_scanner" size={28} className="text-white" />
              </button>
              <span className="text-[10px] font-bold mt-1" style={{ color: "#00654b" }}>Scan &amp; Pay</span>
            </div>
          ) : (
            <button key={i} onClick={() => setActiveNav(i)}
              className="flex flex-col items-center justify-center rounded-full px-3 py-1.5 transition-transform active:scale-95"
              style={{ color: activeNav === i ? "#00654b" : "#64748b" }}>
              <Icon name={item.icon} size={24} fill={activeNav === i ? 1 : 0} />
              <span className="text-[10px] font-medium mt-1">{item.label}</span>
            </button>
          )
        )}
      </nav>
    </div>
  );
}