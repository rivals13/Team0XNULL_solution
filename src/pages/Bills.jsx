import { useState } from "react";
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

const initialBills = [
  { id: 1, name: "Vianet Internet", category: "Internet", icon: "router", iconBg: "bg-red-50", iconColor: "text-red-500", amount: 1000, dueDate: "31 May 2026", daysLeft: 2, urgent: true },
  { id: 2, name: "NEA Electricity", category: "Electricity", icon: "bolt", iconBg: "bg-blue-50", iconColor: "text-blue-500", amount: 850, dueDate: "4 Jun 2026", daysLeft: 6, urgent: false },
  { id: 3, name: "College Fee", category: "Education", icon: "school", iconBg: "bg-purple-50", iconColor: "text-purple-500", amount: 2350, dueDate: "10 Jun 2026", daysLeft: 12, urgent: false },
  { id: 4, name: "Ncell Recharge", category: "Mobile", icon: "smartphone", iconBg: "bg-yellow-50", iconColor: "text-yellow-600", amount: 300, dueDate: "2 Jun 2026", daysLeft: 4, urgent: true },
  { id: 5, name: "Dish Home TV", category: "Cable TV", icon: "tv", iconBg: "bg-teal-50", iconColor: "text-teal-500", amount: 500, dueDate: "15 Jun 2026", daysLeft: 17, urgent: false },
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

export default function Bills() {
  const navigate = useNavigate();
  const [bills, setBills] = useState(initialBills);
  const [modal, setModal] = useState(null);
  const [paying, setPaying] = useState(false);
  const [paidIds, setPaidIds] = useState([]);

  const openModal = (bill) => setModal(bill);
  const closeModal = () => setModal(null);

  const confirmPay = () => {
    setPaying(true);
    setTimeout(() => {
      setPaidIds((prev) => [...prev, modal.id]);
      setPaying(false);
      setModal(null);
    }, 1400);
  };

  const totalDue = bills.filter((b) => !paidIds.includes(b.id)).reduce((s, b) => s + b.amount, 0);

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
        <h1 className="text-xl font-extrabold" style={{ color: "#141b2b" }}>My Bills</h1>
        <div className="w-9" />
      </header>

      {/* Summary */}
      <div
        className="mx-5 mt-5 rounded-2xl p-5 flex justify-between items-center"
        style={{ background: "linear-gradient(135deg,#00654b,#008a60)", boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12)" }}
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/70">Total Due</p>
          <p className="text-3xl font-extrabold text-white mt-1">NPR {totalDue.toLocaleString()}</p>
          <p className="text-xs text-white/60 mt-1">{bills.filter((b) => !paidIds.includes(b.id)).length} bills pending</p>
        </div>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
          <Icon name="receipt_long" size={28} className="text-white" />
        </div>
      </div>

      {/* Bills list */}
      <div className="flex flex-col gap-3 px-5 pt-5">
        {bills.map((bill) => {
          const paid = paidIds.includes(bill.id);
          return (
            <div
              key={bill.id}
              className={`bg-white rounded-2xl border p-4 shadow-sm transition-all ${paid ? "opacity-50" : ""}`}
              style={{ borderColor: bill.urgent && !paid ? "rgba(239,68,68,0.3)" : "#e2e8f0" }}
            >
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl ${bill.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon name={bill.icon} size={22} className={bill.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold truncate" style={{ color: "#141b2b" }}>{bill.name}</p>
                    {bill.urgent && !paid && (
                      <span className="shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 uppercase tracking-wider">
                        Urgent
                      </span>
                    )}
                    {paid && (
                      <span className="shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600 uppercase tracking-wider">
                        Paid
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{bill.category} · Due {bill.dueDate}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <div>
                  <p className="text-lg font-extrabold" style={{ color: "#141b2b" }}>
                    NPR {bill.amount.toLocaleString()}
                  </p>
                  <div className={`flex items-center gap-1 mt-0.5 ${bill.daysLeft <= 3 ? "text-red-500" : "text-gray-400"}`}>
                    <Icon name="schedule" size={13} />
                    <span className="text-[11px] font-semibold">{bill.daysLeft} days left</span>
                  </div>
                </div>
                <button
                  onClick={() => !paid && openModal(bill)}
                  disabled={paid}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white active:scale-95 transition-all disabled:opacity-40"
                  style={{ background: "#00654b" }}
                >
                  {paid ? "Paid" : "Pay Now"}
                </button>
              </div>
            </div>
          );
        })}
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

      {/* Payment Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-end z-100 animate-in fade-in duration-200">
          <div className="bg-white w-full rounded-t-4x] p-6 pb-10 animate-in slide-in-from-bottom duration-300">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
            <h2 className="text-xl font-extrabold mb-1" style={{ color: "#141b2b" }}>Confirm Payment</h2>
            <p className="text-sm text-gray-500 mb-5">You are about to pay the following bill</p>

            <div className="flex items-center gap-4 bg-gray-50 rounded-2xl p-4 mb-5">
              <div className={`w-12 h-12 rounded-xl ${modal.iconBg} flex items-center justify-center`}>
                <Icon name={modal.icon} size={22} className={modal.iconColor} />
              </div>
              <div>
                <p className="font-bold" style={{ color: "#141b2b" }}>{modal.name}</p>
                <p className="text-sm text-gray-500">{modal.category}</p>
              </div>
            </div>

            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">Amount</span>
              <span className="text-lg font-extrabold" style={{ color: "#141b2b" }}>NPR {modal.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">Due Date</span>
              <span className="text-sm font-semibold text-gray-700">{modal.dueDate}</span>
            </div>
            <div className="flex justify-between items-center mb-6">
              <span className="text-sm text-gray-500">Pay via</span>
              <span className="text-sm font-semibold" style={{ color: "#00654b" }}>eSewa Wallet</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 py-3.5 rounded-2xl font-semibold text-sm border border-gray-200 text-gray-600 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmPay}
                disabled={paying}
                className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-white active:scale-95 transition-all flex items-center justify-center gap-2"
                style={{ background: "#00654b" }}
              >
                {paying ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Processing…
                  </>
                ) : (
                  "Confirm & Pay"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
