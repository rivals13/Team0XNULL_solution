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

const transactions = [
  { id: 1, type: "sent", name: "Vianet Internet", category: "Bills", icon: "router", iconBg: "bg-red-50", iconColor: "text-red-500", amount: -1000, date: "Today, 9:14 AM" },
  { id: 2, type: "received", name: "Received from Rabin", category: "Transfer", icon: "person", iconBg: "bg-green-50", iconColor: "text-green-600", amount: 500, date: "Today, 8:02 AM" },
  { id: 3, type: "sent", name: "NEA Electricity", category: "Bills", icon: "bolt", iconBg: "bg-blue-50", iconColor: "text-blue-500", amount: -850, date: "Yesterday, 6:30 PM" },
  { id: 4, type: "sent", name: "Khalti Topup", category: "Mobile", icon: "smartphone", iconBg: "bg-purple-50", iconColor: "text-purple-500", amount: -200, date: "Yesterday, 2:15 PM" },
  { id: 5, type: "received", name: "Salary — LBEF", category: "Transfer", icon: "account_balance", iconBg: "bg-green-50", iconColor: "text-green-600", amount: 25000, date: "28 May, 10:00 AM" },
  { id: 6, type: "bills", name: "College Fee", category: "Bills", icon: "school", iconBg: "bg-orange-50", iconColor: "text-orange-500", amount: -2350, date: "27 May, 3:45 PM" },
  { id: 7, type: "sent", name: "Foodmandu Order", category: "Food", icon: "lunch_dining", iconBg: "bg-yellow-50", iconColor: "text-yellow-600", amount: -420, date: "27 May, 1:10 PM" },
  { id: 8, type: "received", name: "Cashback — eSewa", category: "Cashback", icon: "redeem", iconBg: "bg-green-50", iconColor: "text-green-600", amount: 50, date: "26 May, 11:00 AM" },
  { id: 9, type: "bills", name: "Vianet Internet", category: "Bills", icon: "router", iconBg: "bg-red-50", iconColor: "text-red-500", amount: -1000, date: "25 May, 9:00 AM" },
  { id: 10, type: "sent", name: "Daraz Purchase", category: "Shopping", icon: "shopping_bag", iconBg: "bg-orange-50", iconColor: "text-orange-500", amount: -1200, date: "24 May, 4:20 PM" },
  { id: 11, type: "received", name: "Received from Priya", category: "Transfer", icon: "person", iconBg: "bg-green-50", iconColor: "text-green-600", amount: 800, date: "23 May, 7:00 PM" },
  { id: 12, type: "bills", name: "NEA Electricity", category: "Bills", icon: "bolt", iconBg: "bg-blue-50", iconColor: "text-blue-500", amount: -710, date: "22 May, 10:30 AM" },
];

const TABS = ["All", "Sent", "Received", "Bills"];

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

export default function Statement() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("All");

  const filtered =
    activeTab === "All"
      ? transactions
      : transactions.filter((t) => t.type === activeTab.toLowerCase());

  const totalIn = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div
      className="min-h-screen flex flex-col font-sans pb-24"
      style={{ background: "#f7faf6", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');
        .scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}
      `}</style>

      {/* Header */}
      <header
        className="sticky top-0 z-50 flex justify-between items-center px-5 py-4 border-b"
        style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderColor: "#e1e8fd", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
      >
        <h1 className="text-xl font-extrabold" style={{ color: "#141b2b" }}>Statement</h1>
        <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
          <Icon name="download" size={22} className="text-gray-500" />
        </button>
      </header>

      {/* Summary */}
      <div className="px-5 pt-5 pb-2 flex gap-3">
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total In</p>
          <p className="text-lg font-extrabold" style={{ color: "#00654b" }}>
            +NPR {totalIn.toLocaleString()}
          </p>
        </div>
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Out</p>
          <p className="text-lg font-extrabold text-red-500">
            -NPR {totalOut.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-5 pt-4 pb-2 overflow-x-auto scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95"
            style={
              activeTab === tab
                ? { background: "#00654b", color: "#fff" }
                : { background: "#fff", color: "#64748b", border: "1px solid #e2e8f0" }
            }
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      <div className="flex flex-col gap-2 px-5 pt-3">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <Icon name="receipt_long" size={40} className="text-gray-300 mb-3" />
            <p className="text-sm font-medium">No transactions found</p>
          </div>
        )}
        {filtered.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 px-4 py-3.5 shadow-sm"
          >
            <div className={`w-11 h-11 rounded-xl ${tx.iconBg} flex items-center justify-center shrink-0`}>
              <Icon name={tx.icon} size={20} className={tx.iconColor} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "#141b2b" }}>{tx.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{tx.date}</p>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-sm font-extrabold ${tx.amount > 0 ? "text-green-600" : "text-red-500"}`}>
                {tx.amount > 0 ? "+" : ""}NPR {Math.abs(tx.amount).toLocaleString()}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">{tx.category}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Nav */}
      <nav
        className="fixed bottom-0 left-0 w-full z-50 h-20 flex justify-around items-center px-2 bg-white border-t"
        style={{ borderColor: "#f1f4f0", boxShadow: "0 -4px 20px -4px rgba(0,101,75,0.15)" }}
      >
        <NavBtn onClick={() => navigate("/")} icon="home" label="Home" />
        <NavBtn onClick={() => navigate("/statement")} icon="receipt_long" label="Statement" active />
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
