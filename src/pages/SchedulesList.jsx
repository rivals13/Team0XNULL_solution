import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Image Assets
import vianetImg from "../assets/vianet.png";
import neaImg from "../assets/nea.jpg";

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

const initialBills = [
  { id: 1, label: "Vianet", amount: "NPR 1,000", days: 2, icon: vianetImg, isImage: true, iconBg: "bg-red-50", urgent: true, automated: false },
  { id: 2, label: "NEA Electricity", amount: "NPR 850", days: 5, icon: neaImg, isImage: true, iconBg: "bg-blue-50", urgent: false, automated: false },
  { id: 3, label: "College Fee", amount: "NPR 2,350", days: 12, icon: "school", isImage: false, iconBg: "bg-purple-50", iconColor: "text-purple-600", urgent: false, automated: false },
];

export default function PaySmart() {
  const navigate = useNavigate();
  const [bills, setBills] = useState(initialBills);
  const [dismissed, setDismissed] = useState(false);
  const [setupDone, setSetupDone] = useState(false);
  
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [showSuggestion, setShowSuggestion] = useState(false);

  const [showSetupModal, setShowSetupModal] = useState(false);
  const [amount, setAmount] = useState("1000");
  const [paymentDate, setPaymentDate] = useState("2026-05-15");
  const [remindMe, setRemindMe] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnalyzing(false);
      setShowSuggestion(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const openSetupModal = () => {
    setShowSetupModal(true);
    setAmount("1000");
  };

  const handleSetupAutoPay = () => {
    setBills((prev) =>
      prev.map((bill) =>
        bill.id === 1
          ? { ...bill, automated: true, amount: `NPR ${parseInt(amount).toLocaleString()}` }
          : bill
      )
    );
    setSetupDone(true);
    setShowSetupModal(false);
  };

  return (
    <div
      className="relative flex flex-col min-h-screen pb-28 font-sans transition-all duration-500"
      style={{ background: "#f7faf6", color: "#141b2b", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');
        
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-suggestion { animation: slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-50 flex justify-between items-center px-5 py-4 border-b"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderColor: "#e1e8fd", boxShadow: "0 2px 12px 0 rgba(0,0,0,0.05)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ background: "linear-gradient(135deg,#00654b,#006c4c)" }}>S</div>
          <span className="font-extrabold text-xl" style={{ color: "#00654b" }}>PaySmart</span>
        </div>
        <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
          <Icon name="notifications" size={24} className="text-gray-500" />
        </button>
      </header>

      <main className="flex flex-col gap-6 px-5 pt-6">
        <section>
          <h1 className="text-2xl font-bold tracking-tight">Good morning, Sansar👋</h1>
          <p className="text-sm mt-1" style={{ color: "#3e4944" }}>Ready for your upcoming bills?</p>
        </section>

        {/* Summary Card */}
        <section className="relative overflow-hidden rounded-2xl p-6"
          style={{ background: "linear-gradient(135deg,#00654b,#006c4c)", boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12)" }}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.75)" }}>Scheduled this month</p>
              <h2 className="text-[32px] font-bold text-white mt-2">
                NPR {bills.reduce((sum, b) => sum + parseInt(b.amount.replace(/\D/g, "")), 0).toLocaleString()}
              </h2>
            </div>
            <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
              <Icon name="calendar_month" size={24} className="text-white" />
            </div>
          </div>
        </section>

        {/* Upcoming Payments */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Upcoming Payments</h2>
            <button className="text-sm font-semibold hover:underline" style={{ color: "#00654b" }}>View All</button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
            {bills.map((b) => (
              <div key={b.id} className="min-w-[160px] rounded-2xl p-4 flex-shrink-0 bg-white border transition-transform active:scale-95 cursor-pointer"
                style={{ borderColor: "#e1e8fd", boxShadow: "0 2px 12px 0 rgba(0,0,0,0.05)" }}
              >
                <div className={`w-10 h-10 rounded-xl ${b.iconBg} flex items-center justify-center mb-3 overflow-hidden p-1.5`}>
                  {b.isImage ? (
                    <img src={b.icon} alt={b.label} className="w-full h-full object-contain" />
                  ) : (
                    <Icon name={b.icon} size={20} className={b.iconColor} />
                  )}
                </div>
                <p className="text-xs font-semibold truncate" style={{ color: "#3e4944" }}>{b.label}</p>
                <p className="text-lg font-semibold mt-1">{b.amount}</p>
                {b.automated && (
                  <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-bold">
                    <Icon name="autorenew" size={14} /> Auto-pay ON
                  </div>
                )}
                <div className={`mt-3 flex items-center gap-1 w-fit px-2 py-0.5 rounded-full ${b.urgent ? "bg-orange-50 text-orange-700" : "text-gray-500"}`}
                  style={!b.urgent ? { background: "#e9edff" } : {}}>
                  <Icon name="schedule" size={14} />
                  <span className="text-[10px] font-bold">{b.days} days left</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Smart Suggestions */}
        <section className="pb-4 min-h-[140px]">
          <h2 className="text-xl font-semibold mb-4">Smart Suggestions</h2>
          
          {!dismissed ? (
            isAnalyzing ? (
              <div className="animate-pulse bg-white border rounded-2xl p-5 flex items-center gap-4" style={{ borderColor: "#e1e8fd" }}>
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
            ) : showSuggestion && (
              <div className="animate-suggestion relative overflow-hidden rounded-2xl p-5 border bg-white"
                style={{ borderColor: "rgba(0,101,75,0.2)", boxShadow: "0 10px 25px -5px rgba(0,101,75,0.1)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider"
                    style={{ background: "#00654b" }}>AI Insight</span>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold leading-tight">Hey, you usually pay Vianet around this time!</h3>
                    <p className="text-sm mt-2" style={{ color: "#3e4944" }}>
                      Would you like to automate this to avoid any service interruptions? We can handle it for you.
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 p-2"
                    style={{ background: "rgba(0,101,75,0.1)" }}>
                    <img src={vianetImg} alt="Vianet AI" className="w-full h-full object-contain opacity-90" />
                  </div>
                </div>
                <div className="mt-5 flex gap-3">
                  <button onClick={openSetupModal} className="flex-1 py-3 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
                    style={{ background: setupDone ? "#4caf50" : "#00654b" }}>
                    {setupDone ? "✓ Auto-pay Enabled" : "Automate Now"}
                  </button>
                  <button onClick={() => setDismissed(true)} className="flex-1 py-3 rounded-xl text-xs font-bold border transition-all active:scale-95"
                    style={{ color: "#3e4944", borderColor: "rgba(110,122,115,0.2)" }}>
                    Dismiss
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-10 px-4 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 animate-in fade-in zoom-in duration-300">
               <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                 <Icon name="check_circle" size={20} className="text-gray-400" />
               </div>
              <p className="text-sm font-medium text-gray-500">All caught up! No suggestions.</p>
            </div>
          )}
        </section>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 w-full z-50 h-20 flex justify-around items-center px-2 bg-white border-t"
        style={{ borderColor: "#f1f4f0", boxShadow: "0 -4px 20px -4px rgba(0,101,75,0.15)" }}>
        
        <NavBtn onClick={() => navigate("/")} icon="home" label="Home" />
        <NavBtn onClick={() => navigate("/statement")} icon="receipt_long" label="Statement" />
        
        <div className="relative -mt-8 flex flex-col items-center">
          <button onClick={() => navigate("/scan")} className="w-16 h-16 rounded-full flex items-center justify-center text-white border-4 border-white transition-transform active:scale-95 shadow-lg"
            style={{ background: "#00654b" }}>
            <Icon name="qr_code_scanner" size={28} className="text-white" />
          </button>
          <span className="text-[10px] font-bold mt-1 text-[#00654b]">Scan & Pay</span>
        </div>

        <NavBtn onClick={() => navigate("/schedules")} icon="calendar_month" label="Schedules" active />
        <NavBtn onClick={() => navigate("/more")} icon="menu" label="More" />
      </nav>

      {/* Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end z-[100] animate-in fade-in duration-300">
          <div className="bg-white w-full rounded-t-[32px] max-h-[90vh] overflow-auto slide-in-from-bottom duration-500 pb-10">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Auto-pay Setup</h2>
                <button onClick={() => setShowSetupModal(false)} className="text-3xl text-gray-400">×</button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-4">
                  <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center p-2">
                    <img src={vianetImg} alt="Vianet" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Vianet Internet</p>
                    <p className="text-sm text-gray-500">Subscription Bill</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Maximum Amount (NPR)</label>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border border-gray-200 rounded-2xl px-5 py-4 text-2xl font-bold focus:outline-none focus:border-[#00654b] bg-gray-50/50" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Preferred Deduction Date</label>
                  <div className="relative">
                    <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="w-full border border-gray-200 rounded-2xl px-5 py-4 font-semibold focus:outline-none focus:border-[#00654b] bg-gray-50/50 appearance-none" />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none"><Icon name="calendar_today" size={20} className="text-gray-400" /></div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl bg-gray-50/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg"><Icon name="notifications_active" size={20} className="text-orange-600" /></div>
                    <div>
                      <p className="text-sm font-bold">Reminder Notification</p>
                      <p className="text-[11px] text-gray-500">Send alert 1 day before deduction</p>
                    </div>
                  </div>
                  <button onClick={() => setRemindMe(!remindMe)} className={`w-12 h-6 rounded-full transition-colors relative ${remindMe ? 'bg-[#00654b]' : 'bg-gray-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${remindMe ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <div className="pt-4">
                  <button onClick={handleSetupAutoPay} className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg active:scale-95 transition-all" style={{ background: "#00654b" }}>
                    Confirm & Enable
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const NavBtn = ({ onClick, icon, label, active = false }) => (
  <button onClick={onClick} className="flex flex-col items-center justify-center rounded-full px-3 py-1.5 transition-transform active:scale-95"
    style={{ color: active ? "#00654b" : "#64748b" }}>
    <Icon name={icon} size={24} fill={active ? 1 : 0} />
    <span className="text-[10px] font-medium mt-1 uppercase">{label}</span>
  </button>
);