import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import esewaLogo from "../assets/images.jpeg";

const Icon = ({ name, fill = 0, size = 24, className = "", color = "" }) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={{
      fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
      fontSize: size,
      color: color || undefined,
      lineHeight: 1,
    }}
  >
    {name}
  </span>
);

const OVERDUE_BILLS = [
  { id: 1, name: "Vianet Internet", amount: 1000, daysLeft: 2, icon: "router", iconBg: "bg-red-50", iconColor: "text-red-500", urgent: true },
  { id: 4, name: "Ncell Recharge", amount: 300, daysLeft: 4, icon: "smartphone", iconBg: "bg-yellow-50", iconColor: "text-yellow-600", urgent: true },
];

const UPCOMING_BILLS = [
  { id: 2, name: "NEA Electricity", amount: 850, daysLeft: 6, icon: "bolt", iconBg: "bg-blue-50", iconColor: "text-blue-500" },
  { id: 3, name: "College Fee", amount: 2350, daysLeft: 12, icon: "school", iconBg: "bg-purple-50", iconColor: "text-purple-500" },
  { id: 5, name: "Dish Home TV", amount: 500, daysLeft: 17, icon: "tv", iconBg: "bg-teal-50", iconColor: "text-teal-500" },
];

const MISSED_SCHEDULES = [
  { id: 1, name: "Auto-pay: Vianet", missedDate: "27 May", amount: 1000 },
  { id: 2, name: "Auto-pay: NEA", missedDate: "25 May", amount: 850 },
];

const QUICK_REPLIES = [
  { id: "overdue", label: "⚠️ Overdue Bills" },
  { id: "upcoming", label: "📅 Upcoming Payments" },
  { id: "missed", label: "🔔 Missed Schedules" },
  { id: "autopay", label: "⚡ Set Auto-Pay" },
  { id: "summary", label: "📊 My Summary" },
];

function getBotResponse(raw) {
  const q = raw.toLowerCase();
  if (q.includes("overdue") || q.includes("urgent") || q.includes("due"))
    return { type: "overdue", text: `You have **${OVERDUE_BILLS.length} urgent bills** needing immediate attention!`, bills: OVERDUE_BILLS };

  if (q.includes("upcoming") || q.includes("next") || q.includes("payment"))
    return { type: "upcoming", text: `Here are your **upcoming bills** this month.`, bills: UPCOMING_BILLS };

  if (q.includes("auto") || q.includes("automate") || q.includes("autopay"))
    return { type: "autopay", text: `**Auto-Pay** helps you avoid missed payments.`, bills: [...OVERDUE_BILLS, ...UPCOMING_BILLS] };

  if (q.includes("missed") || q.includes("schedule"))
    return { type: "missed", text: `You have **${MISSED_SCHEDULES.length} missed schedules**.`, schedules: MISSED_SCHEDULES };

  if (q.includes("summary") || q.includes("total") || q.includes("overview")) {
    const total = [...OVERDUE_BILLS, ...UPCOMING_BILLS].reduce((s, b) => s + b.amount, 0);
    return {
      type: "summary",
      text: `Here's your **payment summary** for this month.`,
      summary: { total, overdue: OVERDUE_BILLS.length, upcoming: UPCOMING_BILLS.length, missed: MISSED_SCHEDULES.length },
    };
  }

  if (q.includes("hi") || q.includes("hello") || q.includes("hey") || q.includes("namaste"))
    return { type: "text", text: "Namaste! 🙏 I'm your eSewa Smart Assistant." };

  return { type: "text", text: "Ask me about overdue bills, upcoming payments, missed schedules, or auto-pay." };
}

function BillCard({ bill, onPay }) {
  const [paid, setPaid] = useState(false);

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border p-3 mt-2 transition-all ${paid ? "opacity-55" : ""}`}
      style={{
        background: "linear-gradient(180deg, #ffffff, #f8fafc)",
        borderColor: bill.urgent ? "rgba(239,68,68,0.16)" : "#e5e7eb",
        boxShadow: "0 1px 0 rgba(15,23,42,0.02)",
      }}
    >
      <div className={`w-10 h-10 rounded-2xl ${bill.iconBg} flex items-center justify-center shrink-0`}>
        <Icon name={bill.icon} size={18} className={bill.iconColor} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: "#0f172a" }}>{bill.name}</p>
        <p className={`text-[11px] font-semibold mt-0.5 ${bill.daysLeft <= 3 ? "text-red-500" : "text-slate-400"}`}>
          {bill.daysLeft} days left
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className="text-[12px] font-extrabold" style={{ color: "#0f172a" }}>NPR {bill.amount.toLocaleString()}</p>
        <button
          onClick={() => { setPaid(true); onPay && onPay(bill); }}
          disabled={paid}
          className="mt-1 px-3 py-1 rounded-xl text-[10px] font-bold text-white disabled:opacity-50 active:scale-95 transition-all"
          style={{ background: paid ? "#94a3b8" : "#00654b" }}
        >
          {paid ? "✓ Paid" : "Pay Now"}
        </button>
      </div>
    </div>
  );
}

function ScheduleRow({ schedule }) {
  const [retried, setRetried] = useState(false);

  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-orange-200 p-3 mt-2"
      style={{ background: "linear-gradient(180deg, #fffaf3, #fff7ed)" }}
    >
      <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
        <Icon name="notifications_off" size={18} className="text-orange-500" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: "#0f172a" }}>{schedule.name}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Missed · {schedule.missedDate}</p>
      </div>

      <div className="text-right shrink-0">
        <p className="text-[12px] font-extrabold" style={{ color: "#0f172a" }}>NPR {schedule.amount.toLocaleString()}</p>
        <button
          onClick={() => setRetried(true)}
          disabled={retried}
          className="mt-1 px-3 py-1 rounded-xl text-[10px] font-bold disabled:opacity-50 active:scale-95 transition-all"
          style={{ background: retried ? "#e2e8f0" : "#ffedd5", color: retried ? "#94a3b8" : "#d97706" }}
        >
          {retried ? "Done ✓" : "Retry"}
        </button>
      </div>
    </div>
  );
}

function SummaryGrid({ summary }) {
  const rows = [
    { label: "Total Due", value: `NPR ${summary.total.toLocaleString()}`, color: "#00654b", icon: "account_balance_wallet" },
    { label: "Overdue", value: `${summary.overdue} bills`, color: "#ef4444", icon: "warning" },
    { label: "Upcoming", value: `${summary.upcoming} bills`, color: "#3b82f6", icon: "calendar_month" },
    { label: "Missed", value: `${summary.missed}`, color: "#f59e0b", icon: "notifications_off" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 mt-2">
      {rows.map(r => (
        <div
          key={r.label}
          className="rounded-2xl border border-slate-100 p-3"
          style={{ background: "#f8fafc" }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Icon name={r.icon} size={13} color={r.color} />
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{r.label}</p>
          </div>
          <p className="text-sm font-extrabold" style={{ color: r.color }}>{r.value}</p>
        </div>
      ))}
    </div>
  );
}

function AutoPayToggle({ bill }) {
  const [on, setOn] = useState(false);

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 mt-2" style={{ background: "#f8fafc" }}>
      <div className={`w-10 h-10 rounded-2xl ${bill.iconBg} flex items-center justify-center shrink-0`}>
        <Icon name={bill.icon} size={18} className={bill.iconColor} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: "#0f172a" }}>{bill.name}</p>
        <p className="text-[11px] text-slate-400">NPR {bill.amount.toLocaleString()} / mo</p>
      </div>

      <button
        onClick={() => setOn(v => !v)}
        className="relative w-11 h-6 rounded-full transition-all duration-300 shrink-0"
        style={{ background: on ? "#00654b" : "#cbd5e1" }}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${on ? "left-5" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, overflow: "hidden", border: "2px solid #e5e7eb" }}>
        <img src={esewaLogo} alt="eSewa" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div className="bg-white rounded-2xl rounded-bl-sm border border-slate-100 px-3 py-2.5 shadow-sm flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function BotBubble({ msg, onPay }) {
  const parts = msg.text.split(/\*\*(.*?)\*\*/g);
  const formatted = parts.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : p));

  return (
    <div className="flex items-end gap-2 mb-3">
      <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, overflow: "hidden", border: "2px solid #e5e7eb" }}>
        <img src={esewaLogo} alt="eSewa" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      <div style={{ maxWidth: "82%" }}>
        <div className="bg-white rounded-2xl rounded-bl-sm border border-slate-100 px-3.5 py-2.5 shadow-sm">
          <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-line">{formatted}</p>
          {msg.type === "overdue" && msg.bills?.map(b => <BillCard key={b.id} bill={b} onPay={onPay} />)}
          {msg.type === "upcoming" && msg.bills?.map(b => <BillCard key={b.id} bill={b} onPay={onPay} />)}
          {msg.type === "missed" && msg.schedules?.map(s => <ScheduleRow key={s.id} schedule={s} />)}
          {msg.type === "autopay" && msg.bills?.map(b => <AutoPayToggle key={b.id} bill={b} />)}
          {msg.type === "summary" && msg.summary && <SummaryGrid summary={msg.summary} />}
        </div>
        <p className="text-[9px] text-slate-400 mt-1 ml-1">{msg.time}</p>
      </div>
    </div>
  );
}

function UserBubble({ msg }) {
  return (
    <div className="flex justify-end mb-3">
      <div style={{ maxWidth: "75%" }}>
        <div className="rounded-2xl rounded-br-sm px-3.5 py-2.5 text-[13px] text-white font-medium shadow-sm" style={{ background: "#00654b" }}>
          {msg.text}
        </div>
        <p className="text-[9px] text-slate-400 mt-1 text-right mr-1">{msg.time}</p>
      </div>
    </div>
  );
}

function ChatPopup({ onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [paidBills, setPaidBills] = useState([]);
  const bottomRef = useRef(null);

  const now = () => new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  useEffect(() => {
    const t1 = setTimeout(() => {
      setMessages([{
        id: 1,
        from: "bot",
        type: "text",
        time: now(),
        text: `Namaste! 🙏 I'm your eSewa Smart Assistant.\n\nYou have **${OVERDUE_BILLS.length} urgent bills** overdue and **${MISSED_SCHEDULES.length} missed schedules**.`,
      }]);
    }, 250);

    const t2 = setTimeout(() => {
      setMessages(prev => [...prev, {
        id: 2,
        from: "bot",
        type: "overdue",
        time: now(),
        text: "⚠️ These bills need your attention **right now**.",
        bills: OVERDUE_BILLS,
      }]);
    }, 1200);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const send = (text) => {
    if (!text.trim()) return;
    setMessages(p => [...p, { id: Date.now(), from: "user", text, time: now() }]);
    setInput("");
    setTyping(true);

    setTimeout(() => {
      setTyping(false);
      setMessages(p => [...p, { id: Date.now() + 1, from: "bot", time: now(), ...getBotResponse(text) }]);
    }, 700);
  };

  const handlePay = (bill) => {
    setPaidBills(p => [...p, bill.id]);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        from: "bot",
        type: "text",
        time: now(),
        text: `✅ **${bill.name}** payment of NPR ${bill.amount.toLocaleString()} is being processed.`,
      }]);
    }, 350);
  };

  const urgentLeft = OVERDUE_BILLS.filter(b => !paidBills.includes(b.id)).length;

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(10px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "28px 28px 0 0",
          height: "86vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 -18px 50px rgba(15,23,42,0.18)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px", flexShrink: 0 }}>
          <div style={{ width: 44, height: 4, borderRadius: 9999, background: "#dbe3ea" }} />
        </div>

        <div style={{
          background: "linear-gradient(135deg,#00654b,#008a60)",
          padding: "14px 16px 16px",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                overflow: "hidden",
                border: "2.5px solid rgba(255,255,255,0.8)",
                boxShadow: "0 2px 10px rgba(0,0,0,0.18)",
              }}>
                <img src={esewaLogo} alt="eSewa" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{
                position: "absolute",
                bottom: 1,
                right: 1,
                width: 11,
                height: 11,
                borderRadius: "50%",
                background: "#4ade80",
                border: "2px solid #00654b",
              }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: "#fff", margin: 0 }}>eSewa Assistant</p>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", margin: 0 }}>Online · Bill & Payment Expert</p>
              </div>
            </div>

            {urgentLeft > 0 && (
              <div style={{
                padding: "4px 10px",
                borderRadius: 9999,
                background: "rgba(255,255,255,0.2)",
                border: "1px solid rgba(255,255,255,0.25)",
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {urgentLeft} urgent
              </div>
            )}

            <button onClick={onClose} style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.16)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <Icon name="close" size={18} className="text-white" />
            </button>
          </div>

          <div style={{
            marginTop: 12,
            background: "rgba(255,255,255,0.14)",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 16,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              flexShrink: 0,
              background: "rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Icon name="warning" size={18} fill={1} className="text-white" />
            </div>

            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: "#fff", margin: "0 0 2px" }}>
                You have 2 urgent bills overdue and 2 missed schedules.
              </p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", margin: 0 }}>
                Let me help you fix them right now.
              </p>
            </div>
          </div>
        </div>

        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 16px 8px",
          background: "#f8fbf8",
        }}>
          {messages.map(msg =>
            msg.from === "bot"
              ? <BotBubble key={msg.id} msg={msg} onPay={handlePay} />
              : <UserBubble key={msg.id} msg={msg} />
          )}
          {typing && <TypingDots />}
          <div ref={bottomRef} />
        </div>

        <div style={{
          display: "flex",
          gap: 8,
          padding: "8px 16px",
          overflowX: "auto",
          background: "#fff",
          borderTop: "1px solid #eef2f7",
          flexShrink: 0,
        }}>
          {QUICK_REPLIES.map(qr => (
            <button
              key={qr.id}
              onClick={() => send(qr.label)}
              style={{
                flexShrink: 0,
                padding: "7px 12px",
                borderRadius: 9999,
                fontSize: 11,
                fontWeight: 600,
                border: "1px solid #e5e7eb",
                background: "#f8fafc",
                color: "#334155",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {qr.label}
            </button>
          ))}
        </div>

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 16px",
          paddingBottom: "max(10px,env(safe-area-inset-bottom))",
          borderTop: "1px solid #f1f5f9",
          background: "#fff",
          flexShrink: 0,
        }}>
          <div style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            background: "#f8fafc",
            border: "1.5px solid #e2e8f0",
            borderRadius: 18,
            padding: "10px 14px",
          }}>
            <input
              type="text"
              placeholder="Ask about bills, schedules…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send(input)}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 14,
                fontWeight: 500,
                color: "#334155",
                fontFamily: "inherit",
              }}
            />
          </div>

          <button
            onClick={() => send(input)}
            disabled={!input.trim()}
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              border: "none",
              background: input.trim() ? "#00654b" : "#d1fae5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: input.trim() ? "pointer" : "default",
              flexShrink: 0,
              transition: "all 0.2s",
            }}
          >
            <Icon name="send" size={18} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

function FloatingBubble({ onClick }) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 1000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      position: "fixed",
      bottom: 96,
      right: 16,
      zIndex: 50,
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: 8,
    }}>
      {show && !dismissed && (
        <div onClick={onClick} style={{
          position: "relative",
          background: "#fff",
          borderRadius: "18px 18px 6px 18px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 10px 30px rgba(15,23,42,0.12)",
          padding: "12px 14px 12px 12px",
          maxWidth: 235,
          cursor: "pointer",
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
        }}>
          <button onClick={e => { e.stopPropagation(); setDismissed(true); }} style={{
            position: "absolute",
            top: -8,
            right: -8,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#6b7280",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Icon name="close" size={12} className="text-white" />
          </button>

          <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, overflow: "hidden", border: "2px solid #e5e7eb" }}>
            <img src={esewaLogo} alt="eSewa" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>

          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: "#0f172a", margin: "0 0 3px" }}>eSewa Assistant</p>
            <p style={{ fontSize: 12, margin: 0, lineHeight: 1.4 }}>
              ⚠️ You have 2 overdue bills. Tap to fix now.
            </p>
          </div>
        </div>
      )}

      <button onClick={onClick} style={{
        width: 58,
        height: 58,
        borderRadius: "50%",
        background: "#fff",
        border: "3px solid #00654b",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 8px 24px rgba(0,101,75,0.24)",
        position: "relative",
        overflow: "hidden",
        padding: 0,
      }}>
        <div style={{
          position: "absolute",
          top: -4,
          right: -4,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#ef4444",
          border: "2px solid #fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 900,
          color: "#fff",
          zIndex: 1,
        }}>
          2
        </div>
        <img src={esewaLogo} alt="eSewa" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
      </button>
    </div>
  );
}

const NavBtn = ({ onClick, icon, label, active = false }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center px-3 py-1.5 active:scale-95 transition-transform"
    style={{ color: active ? "#00654b" : "#64748b", background: "none", border: "none", cursor: "pointer" }}
  >
    <Icon name={icon} size={24} fill={active ? 1 : 0} />
    <span style={{ fontSize: 10, fontWeight: 600, marginTop: 3, textTransform: "uppercase" }}>{label}</span>
  </button>
);

export default function ChatbotPage() {
  const navigate = useNavigate();
  const [popupOpen, setPopupOpen] = useState(false);

  useEffect(() => {
    const id = "esewa-gfonts";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const reminders = [
    { id: 1, icon: "warning", bg: "bg-red-50", ic: "text-red-500", title: "Vianet bill overdue", desc: "NPR 1,000 due in 2 days — service may cut", time: "Just now", urgent: true },
    { id: 2, icon: "notifications_off", bg: "bg-orange-50", ic: "text-orange-500", title: "Auto-pay missed: NEA", desc: "Scheduled NPR 850 payment failed", time: "2h ago", urgent: true },
    { id: 3, icon: "smartphone", bg: "bg-yellow-50", ic: "text-yellow-600", title: "Ncell recharge due soon", desc: "NPR 300 due in 4 days", time: "5h ago", urgent: false },
    { id: 4, icon: "auto_awesome", bg: "bg-green-50", ic: "text-green-600", title: "Set up Auto-Pay & save time", desc: "Automate 5 bills, never miss a payment", time: "Yesterday", urgent: false },
    { id: 5, icon: "calendar_month", bg: "bg-blue-50", ic: "text-blue-500", title: "3 payments due this week", desc: "College fee, Dish Home, NEA coming up", time: "Yesterday", urgent: false },
  ];

  return (
    <div className="min-h-screen flex flex-col pb-24" style={{ background: "#f7faf6", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @keyframes sheetUp { from { transform:translateY(100%) } to { transform:translateY(0) } }
        @keyframes fadeOverlay { from { opacity:0 } to { opacity:1 } }
        @keyframes bubbleIn { from { opacity:0; transform:translateY(12px) scale(0.96) } to { opacity:1; transform:translateY(0) scale(1) } }
        @keyframes fabPulse { 0%,100% { box-shadow:0 8px 24px rgba(0,101,75,0.24) } 50% { box-shadow:0 8px 24px rgba(0,101,75,0.24),0 0 0 10px rgba(0,101,75,0.08) } }
        @keyframes badgePop { from { transform:scale(0) } 70% { transform:scale(1.2) } to { transform:scale(1) } }
        @keyframes rowIn { from { opacity:0; transform:translateX(-6px) } to { opacity:1; transform:translateX(0) } }
        @keyframes heroIn { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      <header
        className="sticky top-0 z-50 flex items-center gap-3 px-5 py-4 border-b"
        style={{
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(14px)",
          borderColor: "#e8efe9",
          boxShadow: "0 2px 14px rgba(15,23,42,0.04)",
        }}
      >
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
          <Icon name="arrow_back" size={22} className="text-slate-600" />
        </button>

        <div className="flex-1">
          <h1 className="text-lg font-extrabold" style={{ color: "#0f172a" }}>Smart Assistant</h1>
          <p className="text-[11px] text-slate-400">Payment reminders & alerts</p>
        </div>

        <button
          onClick={() => setPopupOpen(true)}
          style={{
            position: "relative",
            width: 40,
            height: 40,
            borderRadius: "50%",
            overflow: "hidden",
            border: "2.5px solid #00654b",
            cursor: "pointer",
            flexShrink: 0,
            padding: 0,
            background: "#fff",
            boxShadow: "0 2px 8px rgba(0,101,75,0.18)",
          }}
        >
          <img src={esewaLogo} alt="eSewa" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <span style={{
            position: "absolute",
            top: -2,
            right: -2,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#ef4444",
            border: "2px solid #fff",
          }} />
        </button>
      </header>

      <div
        className="mx-5 mt-5 rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg,#00654b,#008a60)",
          boxShadow: "0 10px 30px rgba(0,101,75,0.28)",
          animation: "heroIn 0.4s ease 0.1s both",
        }}
      >
        <div className="flex items-center gap-4 p-5 pb-3">
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              overflow: "hidden",
              flexShrink: 0,
              border: "2.5px solid rgba(255,255,255,0.5)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
            }}
          >
            <img src={esewaLogo} alt="eSewa" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>

          <div className="flex-1">
            <p style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: 0 }}>Your eSewa Assistant</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.72)", margin: "3px 0 0" }}>
              Watching your bills 24/7
            </p>
          </div>

          <button
            onClick={() => setPopupOpen(true)}
            style={{
              flexShrink: 0,
              padding: "8px 16px",
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              background: "rgba(255,255,255,0.94)",
              color: "#00654b",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            Chat Now
          </button>
        </div>

        <div
          style={{
            margin: "0 12px 12px",
            borderRadius: 16,
            background: "rgba(0,0,0,0.18)",
            border: "1px solid rgba(255,255,255,0.18)",
            padding: "11px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            flexShrink: 0,
            background: "rgba(255,255,255,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Icon name="warning" size={20} fill={1} className="text-white" />
          </div>

          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: "#fff", margin: "0 0 2px", lineHeight: 1.3 }}>
              You have <span style={{ color: "#fde68a" }}>2 urgent bills overdue</span> and <span style={{ color: "#fde68a" }}>2 missed schedules</span>.
            </p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", margin: 0 }}>
              Let me help you fix them right now.
            </p>
          </div>

          <div style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            flexShrink: 0,
            background: "rgba(255,255,255,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Icon name="arrow_forward" size={16} className="text-white" />
          </div>
        </div>
      </div>

      <div className="px-5 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-extrabold" style={{ color: "#0f172a" }}>Reminders & Alerts</h2>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
            {reminders.filter(r => r.urgent).length} urgent
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {reminders.map((r, i) => (
            <button
              key={r.id}
              onClick={() => setPopupOpen(true)}
              className="w-full flex items-center gap-3.5 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm active:scale-[0.98] transition-all text-left"
              style={{
                animation: `rowIn 0.3s ease ${i * 0.07}s both`,
                boxShadow: "0 1px 0 rgba(15,23,42,0.02)",
              }}
            >
              <div className={`w-11 h-11 rounded-2xl ${r.bg} flex items-center justify-center shrink-0`}>
                <Icon name={r.icon} size={20} className={r.ic} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold truncate" style={{ color: "#0f172a" }}>{r.title}</p>
                  {r.urgent && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse" />}
                </div>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{r.desc}</p>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <p className="text-[10px] text-slate-400">{r.time}</p>
                <Icon name="chevron_right" size={16} className="text-slate-300" />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div
        className="mx-5 mt-5 p-4 rounded-2xl flex items-center gap-3"
        style={{ background: "rgba(0,101,75,0.06)", border: "1px dashed rgba(0,101,75,0.24)" }}
      >
        <Icon name="tips_and_updates" size={20} fill={1} className="text-[#00654b] shrink-0" />
        <p className="text-xs text-slate-600 font-medium">
          Tap any reminder or the <strong className="text-[#00654b]">eSewa button</strong> to chat with your assistant instantly.
        </p>
      </div>

      <nav
        className="fixed bottom-0 left-0 w-full z-50 h-20 flex justify-around items-center px-2 bg-white border-t"
        style={{ borderColor: "#eef2f7", boxShadow: "0 -4px 20px -4px rgba(0,101,75,0.10)" }}
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

      {!popupOpen && <FloatingBubble onClick={() => setPopupOpen(true)} />}
      {popupOpen && <ChatPopup onClose={() => setPopupOpen(false)} />}
    </div>
  );
}