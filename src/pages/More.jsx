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

const menuSections = [
  {
    title: "Account",
    items: [
      { label: "Profile Settings", icon: "manage_accounts", iconBg: "bg-blue-50", iconColor: "text-blue-500", route: null },
      { label: "Change PIN", icon: "lock_reset", iconBg: "bg-purple-50", iconColor: "text-purple-500", route: null },
      { label: "Linked Banks", icon: "account_balance", iconBg: "bg-green-50", iconColor: "text-green-600", route: null },
    ],
  },
  {
    title: "Features",
    items: [
      { label: "My Bills", icon: "receipt_long", iconBg: "bg-orange-50", iconColor: "text-orange-500", route: "/bills" },
      { label: "Health Score", icon: "monitor_heart", iconBg: "bg-red-50", iconColor: "text-red-500", route: "/health" },
      { label: "Schedule Payments", icon: "calendar_month", iconBg: "bg-teal-50", iconColor: "text-teal-500", route: "/schedules" },
    ],
  },
  {
    title: "Support",
    items: [
      { label: "Help & Support", icon: "help", iconBg: "bg-sky-50", iconColor: "text-sky-500", route: null },
      { label: "About eSewa", icon: "info", iconBg: "bg-gray-100", iconColor: "text-gray-500", route: null },
    ],
  },
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

export default function More() {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleItem = (item) => {
    if (item.route) navigate(item.route);
  };

  return (
    <div
      className="min-h-screen flex flex-col font-sans pb-28"
      style={{ background: "#f7faf6", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');`}</style>

      {/* Header */}
      <header
        className="sticky top-0 z-50 flex justify-between items-center px-5 py-4 border-b"
        style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderColor: "#e1e8fd", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
      >
        <h1 className="text-xl font-extrabold" style={{ color: "#141b2b" }}>More</h1>
        <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
          <Icon name="settings" size={22} className="text-gray-500" />
        </button>
      </header>

      {/* Profile Card */}
      <div className="px-5 pt-5">
        <div
          className="rounded-3xl p-5 flex items-center gap-4"
          style={{ background: "linear-gradient(135deg,#00654b,#008a60)", boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12)" }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-extrabold border-2 border-white/30 flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.2)" }}
          >
            S
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-extrabold text-white truncate">Sansar Chhetri</p>
            <p className="text-sm text-white/70 mt-0.5">+977 98XXXXXXXX</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-green-700" style={{ background: "rgba(255,255,255,0.9)" }}>
                Verified ✓
              </span>
              <span className="text-[10px] text-white/60">eSewa Member since 2023</span>
            </div>
          </div>
          <button className="p-2 rounded-xl" style={{ background: "rgba(255,255,255,0.15)" }}>
            <Icon name="edit" size={18} className="text-white" />
          </button>
        </div>
      </div>

      {/* Balance strip */}
      <div className="flex gap-3 px-5 mt-3">
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-3.5 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
            <Icon name="account_balance_wallet" size={18} className="text-green-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Balance</p>
            <p className="text-sm font-extrabold" style={{ color: "#141b2b" }}>NPR 12,450</p>
          </div>
        </div>
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-3.5 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
            <Icon name="monitor_heart" size={18} className="text-purple-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Score</p>
            <p className="text-sm font-extrabold" style={{ color: "#141b2b" }}>74 / 100</p>
          </div>
        </div>
      </div>

      {/* Menu sections */}
      <div className="flex flex-col gap-5 px-5 mt-5">
        {menuSections.map((section) => (
          <div key={section.title}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">{section.title}</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {section.items.map((item, idx) => (
                <button
                  key={item.label}
                  onClick={() => handleItem(item)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors ${idx !== 0 ? "border-t border-gray-100" : ""}`}
                >
                  <div className={`w-9 h-9 rounded-xl ${item.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <Icon name={item.icon} size={18} className={item.iconColor} />
                  </div>
                  <p className="flex-1 text-left text-sm font-semibold" style={{ color: "#141b2b" }}>{item.label}</p>
                  <Icon name="chevron_right" size={20} className="text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Logout */}
        <button
          onClick={() => setShowLogoutModal(true)}
          className="w-full flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-4 active:scale-95 transition-all"
        >
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <Icon name="logout" size={18} className="text-red-500" />
          </div>
          <p className="flex-1 text-left text-sm font-bold text-red-500">Logout</p>
          <Icon name="chevron_right" size={20} className="text-red-300" />
        </button>

        <p className="text-center text-xs text-gray-400 pb-2">eSewa v2.4.1 · © 2026 F1Soft International</p>
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
        <NavBtn onClick={() => navigate("/more")} icon="menu" label="More" active />
      </nav>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] px-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                <Icon name="logout" size={28} className="text-red-500" />
              </div>
              <h2 className="text-lg font-extrabold" style={{ color: "#141b2b" }}>Logout?</h2>
              <p className="text-sm text-gray-500 mt-1">You'll need to login again to access your account.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3.5 rounded-2xl font-semibold text-sm border border-gray-200 text-gray-600 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => navigate("/login")}
                className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-white bg-red-500 active:scale-95 transition-all"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
