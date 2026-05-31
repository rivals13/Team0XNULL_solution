import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import esewaLogo from "../assets/images.jpeg";
import { ChatbotFAB } from "./ChatbotFAB";

// ─── Config ───────────────────────────────────────────────────
const API_BASE   = import.meta.env.VITE_API_URL || "http://localhost:3000";
const SESSION_ID = "user_" + Math.random().toString(36).slice(2, 9);
const USER_ID    = "default";

// ─── Icon ─────────────────────────────────────────────────────
const Icon = ({ name, fill = 0, size = 24, className = "", color = "" }) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={{
      fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
      fontSize: size, color: color || undefined, lineHeight: 1,
    }}
  >
    {name}
  </span>
);

// ─── Skeleton ─────────────────────────────────────────────────
const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
);

// ─── Quick Replies ────────────────────────────────────────────
const QUICK_REPLIES = [
  { id: "overdue",      label: "⚠️ Overdue Bills"     },
  { id: "upcoming",     label: "📅 Upcoming Payments"  },
  { id: "missed",       label: "🔔 Missed Schedules"   },
  { id: "schedule",     label: "📆 Schedule a Bill"    },
  { id: "schedule_all", label: "🗓️ Schedule All Bills" },
  { id: "autopay",      label: "⚡ Set Auto-Pay"       },
  { id: "summary",      label: "📊 My Summary"         },
];

// ─── API ──────────────────────────────────────────────────────
async function sendToAPI(message) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId: SESSION_ID }),
  });
  if (!res.ok) throw new Error("API error");
  return res.json();
}

async function startSession() {
  const res = await fetch(`${API_BASE}/api/session/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: USER_ID, sessionId: SESSION_ID }),
  });
  if (!res.ok) throw new Error("Session error");
  return res.json();
}

async function payBillAPI(billId) {
  const res = await fetch(`${API_BASE}/api/bills/${billId}/pay`, { method: "POST" });
  if (!res.ok) throw new Error("Pay failed");
  return res.json();
}

async function retryScheduleAPI(scheduleId) {
  const res = await fetch(`${API_BASE}/api/schedules/${scheduleId}/retry`, { method: "POST" });
  if (!res.ok) throw new Error("Retry failed");
  return res.json();
}

async function createScheduleAPI(name, amount, dueDate) {
  const res = await fetch(`${API_BASE}/api/schedules/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, amount, dueDate }),
  });
  if (!res.ok) throw new Error("Schedule failed");
  return res.json();
}

async function dismissNotifAPI(id) {
  await fetch(`${API_BASE}/api/notifications/${id}/dismiss`, { method: "POST" });
}

async function snoozeNotifAPI(id, hours = 4) {
  await fetch(`${API_BASE}/api/notifications/${id}/snooze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hours }),
  });
}

async function fetchNotifications() {
  const res = await fetch(`${API_BASE}/api/notifications?userId=${USER_ID}`);
  if (!res.ok) return [];
  return res.json();
}

// ─── Bill Card ────────────────────────────────────────────────
function BillCard({ bill, onPay }) {
  const [paid, setPaid]       = useState(false);
  const [loading, setLoading] = useState(false);
  const id = bill._id || bill.id;

  const handlePay = async () => {
    setLoading(true);
    try { await payBillAPI(id); } catch {}
    setPaid(true);
    setLoading(false);
    onPay?.(bill);
  };

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border p-3 mt-2 transition-all ${paid ? "opacity-55" : ""}`}
      style={{
        background: "linear-gradient(180deg,#ffffff,#f8fafc)",
        borderColor: bill.urgent ? "rgba(239,68,68,0.16)" : "#e5e7eb",
      }}
    >
      <div className={`w-10 h-10 rounded-2xl ${bill.iconBg || "bg-slate-50"} flex items-center justify-center shrink-0`}>
        <Icon name={bill.icon || "receipt"} size={18} className={bill.iconColor || "text-slate-500"} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: "#0f172a" }}>{bill.name}</p>
        <p className={`text-[11px] font-semibold mt-0.5 ${bill.daysLeft <= 3 ? "text-red-500" : "text-slate-400"}`}>
          {bill.daysLeft === 0 ? "Overdue today" : `${bill.daysLeft} days left`}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[12px] font-extrabold" style={{ color: "#0f172a" }}>
          NPR {bill.amount?.toLocaleString()}
        </p>
        <button
          onClick={handlePay}
          disabled={paid || loading}
          className="mt-1 px-3 py-1 rounded-xl text-[10px] font-bold text-white disabled:opacity-50 active:scale-95 transition-all"
          style={{ background: paid ? "#94a3b8" : "#00654b" }}
        >
          {loading ? "..." : paid ? "✓ Paid" : "Pay Now"}
        </button>
      </div>
    </div>
  );
}

// ─── Schedule Row ─────────────────────────────────────────────
function ScheduleRow({ schedule, onRetried }) {
  const [retried, setRetried] = useState(false);
  const [loading, setLoading] = useState(false);
  const id = schedule._id || schedule.id;

  const handleRetry = async () => {
    setLoading(true);
    try { await retryScheduleAPI(id); } catch {}
    setRetried(true);
    setLoading(false);
    onRetried?.(schedule);
  };

  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-orange-200 p-3 mt-2"
      style={{ background: "linear-gradient(180deg,#fffaf3,#fff7ed)" }}
    >
      <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
        <Icon name="notifications_off" size={18} className="text-orange-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: "#0f172a" }}>{schedule.name}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          {schedule.scheduled ? `Scheduled · ${schedule.dueDate || ""}` : `Missed · ${schedule.missedDate}`}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[12px] font-extrabold" style={{ color: "#0f172a" }}>
          NPR {schedule.amount?.toLocaleString()}
        </p>
        {!schedule.scheduled && (
          <button
            onClick={handleRetry}
            disabled={retried || loading}
            className="mt-1 px-3 py-1 rounded-xl text-[10px] font-bold disabled:opacity-50 active:scale-95 transition-all"
            style={{
              background: retried ? "#e2e8f0" : "#ffedd5",
              color: retried ? "#94a3b8" : "#d97706",
            }}
          >
            {loading ? "..." : retried ? "Done ✓" : "Retry"}
          </button>
        )}
        {schedule.scheduled && (
          <span className="mt-1 px-3 py-1 rounded-xl text-[10px] font-bold inline-block"
            style={{ background: "#dcfce7", color: "#16a34a" }}>
            Auto ✓
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Schedule Confirm Card ────────────────────────────────────
// Shown when user asks to schedule a bill via chat
function ScheduleConfirmCard({ bill, onConfirm }) {
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading]     = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await createScheduleAPI(bill.name, bill.amount, `In ${bill.daysLeft} days`);
    } catch {}
    setConfirmed(true);
    setLoading(false);
    onConfirm?.(bill);
  };

  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-green-200 p-3 mt-2"
      style={{ background: "linear-gradient(180deg,#f0fdf4,#dcfce7)" }}
    >
      <div className={`w-10 h-10 rounded-2xl ${bill.iconBg || "bg-green-50"} flex items-center justify-center shrink-0`}>
        <Icon name={bill.icon || "calendar_month"} size={18} className={bill.iconColor || "text-green-500"} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: "#0f172a" }}>{bill.name}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          NPR {bill.amount?.toLocaleString()} · due in {bill.daysLeft} days
        </p>
      </div>
      <div className="text-right shrink-0">
        <button
          onClick={handleConfirm}
          disabled={confirmed || loading}
          className="px-3 py-1.5 rounded-xl text-[10px] font-bold text-white disabled:opacity-50 active:scale-95 transition-all"
          style={{ background: confirmed ? "#94a3b8" : "#00654b" }}
        >
          {loading ? "..." : confirmed ? "✓ Scheduled" : "Confirm"}
        </button>
      </div>
    </div>
  );
}

// ─── Summary Grid ─────────────────────────────────────────────
function SummaryGrid({ summary }) {
  const rows = [
    { label: "Total Due", value: `NPR ${summary.total?.toLocaleString()}`, color: "#00654b", icon: "account_balance_wallet" },
    { label: "Overdue",   value: `${summary.overdue} bills`,               color: "#ef4444", icon: "warning"                },
    { label: "Upcoming",  value: `${summary.upcoming} bills`,              color: "#3b82f6", icon: "calendar_month"          },
    { label: "Missed",    value: `${summary.missed}`,                      color: "#f59e0b", icon: "notifications_off"       },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 mt-2">
      {rows.map((r) => (
        <div key={r.label} className="rounded-2xl border border-slate-100 p-3" style={{ background: "#f8fafc" }}>
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

// ─── Auto-Pay Toggle ──────────────────────────────────────────
function AutoPayToggle({ bill }) {
  const [on, setOn] = useState(false);

  const handleToggle = async () => {
    const next = !on;
    setOn(next);
    if (next) {
      try {
        await createScheduleAPI(bill.name, bill.amount, `In ${bill.daysLeft} days`);
      } catch {}
    }
  };

  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 mt-2"
      style={{ background: "#f8fafc" }}
    >
      <div className={`w-10 h-10 rounded-2xl ${bill.iconBg || "bg-slate-50"} flex items-center justify-center shrink-0`}>
        <Icon name={bill.icon || "receipt"} size={18} className={bill.iconColor || "text-slate-500"} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: "#0f172a" }}>{bill.name}</p>
        <p className="text-[11px] text-slate-400">NPR {bill.amount?.toLocaleString()} / mo</p>
      </div>
      <button
        onClick={handleToggle}
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

// ─── Smart Reminder Banner ─────────────────────────────────────
function ReminderBanner({ msg, onSnooze, onDismiss, onPay }) {
  if (!msg.hasReminder) return null;
  return (
    <div
      className="rounded-2xl border border-amber-200 p-3 mt-2 mb-1"
      style={{ background: "linear-gradient(135deg,#fffbeb,#fef3c7)" }}
    >
      <div className="flex items-start gap-2 mb-2">
        <div className="w-7 h-7 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
          <Icon name="notifications_active" size={15} fill={1} color="#d97706" />
        </div>
        <p className="text-[12px] font-semibold text-amber-900 leading-relaxed flex-1">{msg.text}</p>
      </div>
      {msg.type === "overdue" && msg.bills?.map((b) => (
        <BillCard key={b._id || b.id} bill={b} onPay={onPay} />
      ))}
      {msg.type === "missed" && msg.schedules?.map((s) => (
        <ScheduleRow key={s._id || s.id} schedule={s} />
      ))}
      <div className="flex gap-2 mt-2.5">
        <button
          onClick={onSnooze}
          className="flex-1 py-1.5 rounded-xl text-[11px] font-bold border border-amber-300 text-amber-700 active:scale-95 transition-all"
          style={{ background: "rgba(251,191,36,0.12)" }}
        >
          ⏰ Snooze 4h
        </button>
        <button
          onClick={onDismiss}
          className="flex-1 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200 text-slate-500 active:scale-95 transition-all"
          style={{ background: "#f8fafc" }}
        >
          ✕ Dismiss
        </button>
      </div>
    </div>
  );
}

// ─── Typing Dots ──────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, overflow: "hidden", border: "2px solid #e5e7eb" }}>
        <img src={esewaLogo} alt="eSewa" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div className="bg-white rounded-2xl rounded-bl-sm border border-slate-100 px-3 py-2.5 shadow-sm flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
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

// ─── Bot Bubble ───────────────────────────────────────────────
function BotBubble({ msg, onPay, onSnooze, onDismiss, onScheduleConfirm }) {
  const parts     = (msg.text || "").split(/\*\*(.*?)\*\*/g);
  const formatted = parts.map((p, i) =>
    i % 2 === 1 ? <strong key={i}>{p}</strong> : p
  );

  const avatar = (
    <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, overflow: "hidden", border: "2px solid #e5e7eb" }}>
      <img src={esewaLogo} alt="eSewa" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  );

  if (msg.isSessionStart) {
    return (
      <div className="flex items-end gap-2 mb-3">
        {avatar}
        <div style={{ maxWidth: "88%" }}>
          {msg.hasReminder ? (
            <ReminderBanner msg={msg} onSnooze={onSnooze} onDismiss={onDismiss} onPay={onPay} />
          ) : (
            <div className="bg-white rounded-2xl rounded-bl-sm border border-slate-100 px-3.5 py-2.5 shadow-sm">
              <p className="text-[13px] text-slate-700 leading-relaxed">{formatted}</p>
            </div>
          )}
          <p className="text-[10px] text-slate-400 mt-1 ml-1">{msg.time}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 mb-3">
      {avatar}
      <div style={{ maxWidth: "82%" }}>
        <div
          className="rounded-3xl border border-slate-200 px-4 py-3 shadow-[0_18px_35px_-24px_rgba(15,23,42,0.25)]"
          style={{ background: "#ffffff" }}
        >
          <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-line">{formatted}</p>

          {/* Bill lists */}
          {msg.type === "overdue"  && msg.bills?.map((b) => <BillCard key={b._id || b.id} bill={b} onPay={onPay} />)}
          {msg.type === "upcoming" && msg.bills?.map((b) => <BillCard key={b._id || b.id} bill={b} onPay={onPay} />)}

          {/* Missed schedules (retry) */}
          {msg.type === "missed" && msg.schedules?.map((s) => <ScheduleRow key={s._id || s.id} schedule={s} />)}

          {/* Schedule confirmation cards */}
          {msg.type === "schedule_confirm" && msg.scheduleTargets?.map((b) => (
            <ScheduleConfirmCard key={b._id || b.id} bill={b} onConfirm={onScheduleConfirm} />
          ))}

          {/* Auto-pay toggles */}
          {msg.type === "autopay" && msg.bills?.map((b) => <AutoPayToggle key={b._id || b.id} bill={b} />)}

          {/* Summary grid */}
          {msg.type === "summary" && msg.summary && <SummaryGrid summary={msg.summary} />}
        </div>
        <p className="text-[10px] text-slate-400 mt-2 ml-1">{msg.time}</p>
      </div>
    </div>
  );
}

// ─── User Bubble ──────────────────────────────────────────────
function UserBubble({ msg }) {
  return (
    <div className="flex justify-end mb-3">
      <div style={{ maxWidth: "75%" }}>
        <div
          className="rounded-3xl px-4 py-3 text-[13px] text-white font-medium"
          style={{
            background: "linear-gradient(135deg,#0f766e,#0f5132)",
            boxShadow: "0 20px 45px -24px rgba(0,0,0,0.24)",
          }}
        >
          {msg.text}
        </div>
        <p className="text-[10px] text-slate-400 mt-1 text-right mr-1">{msg.time}</p>
      </div>
    </div>
  );
}

// ─── Error Bubble ─────────────────────────────────────────────
function ErrorBubble({ onRetry, retrying }) {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, overflow: "hidden", border: "2px solid #e5e7eb" }}>
        <img src={esewaLogo} alt="eSewa" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div className="bg-red-50 border border-red-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm flex items-center gap-2">
        <Icon name="wifi_off" size={15} color="#f87171" className="shrink-0" />
        <p className="text-[12px] text-red-500 font-medium">Couldn't reach server.</p>
        <button
          onClick={onRetry}
          disabled={retrying}
          className="text-[11px] font-bold text-[#00654b] underline ml-1 disabled:opacity-50"
        >
          {retrying ? "Retrying…" : "Retry"}
        </button>
      </div>
    </div>
  );
}

// ─── Notification Panel ───────────────────────────────────────
function NotificationPanel({ onClose, notifications, setNotifications }) {
  const [loading, setLoading] = useState(true);
  const notifs = notifications || [];

  useEffect(() => {
    fetchNotifications().then((data) => {
      setNotifications(data);
      setLoading(false);
    });
  }, [setNotifications]);

  const handle = async (id, action) => {
    action === "snooze"
      ? await snoozeNotifAPI(id, 4)
      : await dismissNotifAPI(id);
    setNotifications((p) => (p || []).filter((n) => (n._id || n.id) !== id));
  };

  const typeIcon = (type) =>
    ({
      bill_due:           { icon: "receipt",           color: "#ef4444", bg: "bg-red-50"    },
      missed_payment:     { icon: "notifications_off", color: "#f59e0b", bg: "bg-orange-50" },
      pattern_suggestion: { icon: "auto_awesome",      color: "#3b82f6", bg: "bg-blue-50"   },
      schedule:           { icon: "calendar_month",    color: "#8b5cf6", bg: "bg-purple-50" },
    }[type] || { icon: "info", color: "#64748b", bg: "bg-slate-50" });

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 400,
        background: "rgba(15,23,42,0.55)",
        backdropFilter: "blur(10px)",
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
      }}
    >
      <div style={{
        background: "#fff",
        borderRadius: "28px 28px 0 0",
        maxHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 -18px 50px rgba(15,23,42,0.18)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px", flexShrink: 0 }}>
          <div style={{ width: 44, height: 4, borderRadius: 9999, background: "#dbe3ea" }} />
        </div>
        <div className="flex items-center justify-between px-5 pb-4" style={{ flexShrink: 0 }}>
          <div>
            <h2 className="text-base font-extrabold" style={{ color: "#0f172a" }}>Pending Reminders</h2>
            <p className="text-[11px] text-slate-400">
              {notifs.length} item{notifs.length !== 1 ? "s" : ""} need attention
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "#f1f5f9", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Icon name="close" size={18} className="text-slate-500" />
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: "0 16px 24px" }}>
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <Skeleton className="w-10 h-10 rounded-2xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-56" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Skeleton className="h-8 w-24 rounded-lg" />
                    <Skeleton className="h-8 w-24 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && notifs.length === 0 && (
            <div className="flex flex-col items-center py-10 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center">
                <Icon name="check_circle" size={28} fill={1} color="#00654b" />
              </div>
              <p className="text-sm font-bold text-slate-600">All caught up!</p>
              <p className="text-xs text-slate-400">No pending reminders.</p>
            </div>
          )}

          {!loading && notifs.map((n, i) => {
            const { icon, color, bg } = typeIcon(n.type);
            const id = n._id || n.id;
            return (
              <div
                key={id}
                className="flex items-start gap-3 bg-white rounded-2xl border border-slate-100 p-4 mb-2.5 shadow-sm"
                style={{ animation: `rowIn 0.3s ease ${i * 0.06}s both` }}
              >
                <div className={`w-10 h-10 rounded-2xl ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <Icon name={icon} size={18} color={color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: "#0f172a" }}>{n.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                  {n.amount > 0 && (
                    <p className="text-[11px] font-bold mt-1" style={{ color }}>
                      NPR {n.amount?.toLocaleString()}
                    </p>
                  )}
                  <div className="flex gap-2 mt-2.5">
                    <button
                      onClick={() => handle(id, "snooze")}
                      className="px-3 py-1 rounded-lg text-[10px] font-bold border border-slate-200 text-slate-600 active:scale-95 transition-all"
                      style={{ background: "#f8fafc" }}
                    >
                      ⏰ Snooze 4h
                    </button>
                    <button
                      onClick={() => handle(id, "dismiss")}
                      className="px-3 py-1 rounded-lg text-[10px] font-bold border border-red-100 text-red-500 active:scale-95 transition-all"
                      style={{ background: "#fff5f5" }}
                    >
                      ✕ Dismiss
                    </button>
                  </div>
                </div>
                <span
                  className="text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                  style={{ background: "#f1f5f9", color: "#94a3b8" }}
                >
                  shown {n.shownCount}×
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Chat Popup ───────────────────────────────────────────────
function ChatPopup({ onClose }) {
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState("");
  const [typing,    setTyping]    = useState(false);
  const [retrying,  setRetrying]  = useState(false);
  const [paidBills, setPaidBills] = useState([]);
  const [lastMsg,   setLastMsg]   = useState(null);
  const bottomRef    = useRef(null);
  // ── FIX: ensure session greeting fires exactly once per popup mount ──
  const sessionStarted = useRef(false);

  const nowStr = () =>
    new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  useEffect(() => {
    // Guard: if already ran (StrictMode double-invoke or re-render), skip
    if (sessionStarted.current) return;
    sessionStarted.current = true;

    (async () => {
      setTyping(true);
      try {
        const data = await startSession();
        setMessages([{
          id: Date.now(),
          from: "bot",
          isSessionStart: true,
          time: nowStr(),
          ...data,
        }]);
      } catch {
        setMessages([{ id: Date.now(), from: "error" }]);
      } finally {
        setTyping(false);
      }
    })();
  }, []); // empty deps — runs once on mount

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const handleSessionSnooze = async (msg) => {
    if (msg.notificationId) await snoozeNotifAPI(msg.notificationId, 4);
    setMessages((p) =>
      p.map((m) =>
        m.isSessionStart
          ? { ...m, hasReminder: false, text: "Got it — I'll remind you in 4 hours. Anything else I can help with?" }
          : m
      )
    );
  };

  const handleSessionDismiss = async (msg) => {
    if (msg.notificationId) await dismissNotifAPI(msg.notificationId);
    setMessages((p) =>
      p.map((m) =>
        m.isSessionStart
          ? { ...m, hasReminder: false, text: "Noted, dismissed! Let me know if you need anything." }
          : m
      )
    );
  };

  const send = async (text, isRetry = false) => {
    const t = text?.trim();
    if (!t) return;

    if (!isRetry) {
      setMessages((p) => [...p, { id: Date.now(), from: "user", text: t, time: nowStr() }]);
      setInput("");
      setLastMsg(t);
    } else {
      setMessages((p) => p.filter((m) => m.from !== "error"));
      setRetrying(true);
    }

    setTyping(true);
    try {
      const data = await sendToAPI(t);
      setMessages((p) => [
        ...p.filter((m) => m.from !== "error"),
        { id: Date.now() + 1, from: "bot", time: nowStr(), ...data },
      ]);
    } catch {
      setMessages((p) => [
        ...p.filter((m) => m.from !== "error"),
        { id: Date.now() + 1, from: "error" },
      ]);
    } finally {
      setTyping(false);
      setRetrying(false);
    }
  };

  const handlePay = (bill) => {
    setPaidBills((p) => [...p, bill._id || bill.id]);
    setMessages((p) => [
      ...p,
      {
        id: Date.now(),
        from: "bot",
        type: "text",
        time: nowStr(),
        text: `✅ **${bill.name}** payment of NPR ${bill.amount?.toLocaleString()} is being processed.`,
      },
    ]);
  };

  const handleScheduleConfirm = (bill) => {
    setMessages((p) => [
      ...p,
      {
        id: Date.now(),
        from: "bot",
        type: "text",
        time: nowStr(),
        text: `📆 **${bill.name}** has been scheduled for auto-pay! NPR ${bill.amount?.toLocaleString()} will be paid 1 day before the due date.`,
      },
    ]);
  };

  const urgentLeft = messages
    .flatMap((m) => m.bills || [])
    .filter((b) => b.urgent && !paidBills.includes(b._id || b.id)).length;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(15,23,42,0.58)",
        backdropFilter: "blur(10px)",
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
        padding: "0 8px 8px",
      }}
    >
      <div style={{
        background: "#fff",
        borderRadius: "28px 28px 0 0",
        height: "92vh",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 -18px 60px rgba(15,23,42,0.22)",
      }}>

        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px", flexShrink: 0 }}>
          <div style={{ width: 44, height: 4, borderRadius: 9999, background: "#dae4eb" }} />
        </div>

        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#00654b,#008a60)", padding: "14px 16px 16px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%", overflow: "hidden",
                border: "2.5px solid rgba(255,255,255,0.8)",
                boxShadow: "0 2px 10px rgba(0,0,0,0.18)",
              }}>
                <img src={esewaLogo} alt="eSewa" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{
                position: "absolute", bottom: 1, right: 1,
                width: 11, height: 11, borderRadius: "50%",
                background: "#4ade80", border: "2px solid #00654b",
              }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: "#fff", margin: 0 }}>eSewa Assistant</p>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", margin: 0 }}>
                  Online · Smart Reminders
                </p>
              </div>
            </div>
            {urgentLeft > 0 && (
              <div style={{
                padding: "4px 10px", borderRadius: 9999,
                background: "rgba(255,255,255,0.2)",
                border: "1px solid rgba(255,255,255,0.25)",
                color: "#fff", fontSize: 10, fontWeight: 700, flexShrink: 0,
              }}>
                {urgentLeft} urgent
              </div>
            )}
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "rgba(255,255,255,0.16)", border: "none",
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", flexShrink: 0,
              }}
            >
              <Icon name="close" size={18} className="text-white" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: "18px 16px 10px",
          background: "#ecf9f2",
          scrollbarWidth: "none",
        }}>
          {messages.length === 0 && typing ? (
            <div className="flex items-end gap-2 mb-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="bg-white rounded-2xl rounded-bl-sm border border-slate-100 px-4 py-3 shadow-sm space-y-2">
                <Skeleton className="h-3 w-44" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ) : (
            messages.map((msg) =>
              msg.from === "error" ? (
                <ErrorBubble
                  key={msg.id}
                  retrying={retrying}
                  onRetry={() => send(lastMsg, true)}
                />
              ) : msg.from === "bot" ? (
                <BotBubble
                  key={msg.id}
                  msg={msg}
                  onPay={handlePay}
                  onSnooze={() => handleSessionSnooze(msg)}
                  onDismiss={() => handleSessionDismiss(msg)}
                  onScheduleConfirm={handleScheduleConfirm}
                />
              ) : (
                <UserBubble key={msg.id} msg={msg} />
              )
            )
          )}
          {typing && messages.length > 0 && <TypingDots />}
          <div ref={bottomRef} />
        </div>

        {/* Quick replies */}
        <div style={{
          display: "flex", gap: 10, padding: "12px 16px",
          overflowX: "auto", background: "#fff",
          borderTop: "1px solid #e8f0f3", flexShrink: 0,
          scrollbarWidth: "none",
        }}>
          {QUICK_REPLIES.map((qr) => (
            <button
              key={qr.id}
              onClick={() => send(qr.label)}
              disabled={typing}
              style={{
                flexShrink: 0, padding: "10px 16px", borderRadius: 9999,
                fontSize: 12, fontWeight: 700,
                border: "1px solid #d1e7dd", background: "#f4fcf6",
                color: "#0f172a", cursor: typing ? "default" : "pointer",
                whiteSpace: "nowrap", opacity: typing ? 0.55 : 1,
                boxShadow: "0 6px 18px -14px rgba(15,23,42,0.18)",
              }}
            >
              {qr.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 16px",
          paddingBottom: "max(14px,env(safe-area-inset-bottom))",
          borderTop: "1px solid #e8f3ef", background: "#fff", flexShrink: 0,
        }}>
          <div style={{
            flex: 1, display: "flex", alignItems: "center",
            background: "#f3f9f1", border: "1.5px solid #d7edda",
            borderRadius: 22, padding: "12px 14px",
            boxShadow: "inset 0 1px 2px rgba(15,23,42,0.06)",
          }}>
            <input
              type="text"
              placeholder="Ask about bills, schedules…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !typing && send(input)}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                fontSize: 14, fontWeight: 500, color: "#1f2937",
                fontFamily: "inherit", minWidth: 0,
              }}
            />
          </div>
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || typing}
            style={{
              width: 46, height: 46, borderRadius: 16, border: "none",
              background: input.trim() && !typing ? "#00654b" : "#d4f1dd",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: input.trim() && !typing ? "pointer" : "default",
              flexShrink: 0, transition: "all 0.2s",
              boxShadow: input.trim() && !typing ? "0 10px 22px -14px rgba(0,101,75,0.9)" : "none",
            }}
          >
            <Icon name="send" size={18} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Nav Button ───────────────────────────────────────────────
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

// ─── Page ─────────────────────────────────────────────────────
export default function ChatbotPage() {
  const navigate = useNavigate();
  const [popupOpen,      setPopupOpen]      = useState(false);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [reminders,      setReminders]      = useState([]);
  const [notifications,  setNotifications]  = useState([]);
  const [isLoading,      setIsLoading]      = useState(true);

  useEffect(() => {
    const id = "esewa-gfonts";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id   = id;
      link.rel  = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [overdueRes, missedRes, notifsData] = await Promise.all([
          fetch(`${API_BASE}/api/bills/overdue`).then((r) => r.json()),
          fetch(`${API_BASE}/api/schedules/missed`).then((r) => r.json()),
          fetchNotifications(),
        ]);
        setNotifications(notifsData);
        setReminders([
          ...overdueRes.map((b) => ({
            id: b._id, icon: "warning", bg: "bg-red-50", ic: "text-red-500",
            title: `${b.name} overdue`,
            desc: `NPR ${b.amount?.toLocaleString()} due in ${b.daysLeft} days`,
            time: "Just now", urgent: true,
          })),
          ...missedRes.map((s) => ({
            id: s._id, icon: "notifications_off", bg: "bg-orange-50", ic: "text-orange-500",
            title: `Auto-pay missed: ${s.name}`,
            desc: `Scheduled NPR ${s.amount?.toLocaleString()} payment failed`,
            time: s.missedDate, urgent: true,
          })),
        ]);
      } catch {
        setReminders([
          { id: 1, icon: "warning",           bg: "bg-red-50",    ic: "text-red-500",    title: "Vianet bill overdue",     desc: "NPR 1,000 due in 2 days",         time: "Just now",  urgent: true  },
          { id: 2, icon: "notifications_off", bg: "bg-orange-50", ic: "text-orange-500", title: "Auto-pay missed: NEA",    desc: "Scheduled NPR 850 payment failed", time: "2h ago",    urgent: true  },
          { id: 3, icon: "smartphone",        bg: "bg-yellow-50", ic: "text-yellow-600", title: "Ncell recharge due soon", desc: "NPR 300 due in 4 days",           time: "5h ago",    urgent: false },
          { id: 4, icon: "auto_awesome",      bg: "bg-green-50",  ic: "text-green-600",  title: "Set up Auto-Pay & save",  desc: "Automate 5 bills, never miss",    time: "Yesterday", urgent: false },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const apiBadge      = notifications.filter((n) => !n.actionTaken && !n.dismissedAt).length;
  const fallbackBadge = reminders.filter((r) => r.urgent).length;
  const badgeCount    = apiBadge > 0 ? apiBadge : fallbackBadge > 0 ? fallbackBadge : 2;

  return (
    <div
      className="min-h-screen flex flex-col pb-24"
      style={{ background: "#f7faf6", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <style>{`
        @keyframes heroIn   { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes rowIn    { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
        @keyframes bubbleIn { from{opacity:0;transform:translateY(12px) scale(0.9)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes fabPulse { 0%,100%{box-shadow:0 8px 24px rgba(0,101,75,0.35)} 50%{box-shadow:0 8px 24px rgba(0,101,75,0.35),0 0 0 10px rgba(0,101,75,0.07)} }
      `}</style>

      {/* Header */}
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
          <p className="text-[11px] text-slate-400">Adaptive Reminders</p>
        </div>
        <button
          onClick={() => setNotifPanelOpen(true)}
          style={{
            position: "relative", width: 38, height: 38, borderRadius: 12,
            background: "#f1f5f9", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >
          <Icon name="notifications" size={20} fill={1} color="#ef4444" />
          <span style={{
            position: "absolute", top: 5, right: 5,
            width: 8, height: 8, borderRadius: "50%",
            background: "#ef4444", border: "2px solid #fff",
            boxShadow: "0 1px 4px rgba(239,68,68,0.45)",
          }} />
        </button>
        <button
          onClick={() => setPopupOpen(true)}
          style={{
            position: "relative", width: 40, height: 40, borderRadius: "50%",
            overflow: "hidden", border: "2.5px solid #00654b", cursor: "pointer",
            flexShrink: 0, padding: 0, background: "#fff",
            boxShadow: "0 2px 8px rgba(0,101,75,0.18)",
          }}
        >
          <img src={esewaLogo} alt="eSewa" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <span style={{
            position: "absolute", top: -2, right: -2,
            width: 12, height: 12, borderRadius: "50%",
            background: "#4ade80", border: "2px solid #fff",
          }} />
        </button>
      </header>

      {/* Hero banner */}
      <div
        className="mx-5 mt-5 rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg,#00654b,#008a60)",
          boxShadow: "0 10px 30px rgba(0,101,75,0.28)",
          animation: "heroIn 0.4s ease 0.1s both",
        }}
      >
        <div className="flex items-center gap-4 p-5 pb-3">
          <div style={{
            width: 56, height: 56, borderRadius: 18, overflow: "hidden",
            flexShrink: 0, border: "2.5px solid rgba(255,255,255,0.5)",
          }}>
            <img src={esewaLogo} alt="eSewa" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div className="flex-1">
            <p style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: 0 }}>Your eSewa Assistant</p>
            {isLoading ? (
              <div className="space-y-1.5 mt-1.5"><Skeleton className="h-2.5 w-32 bg-white/30" /></div>
            ) : (
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.72)", margin: "3px 0 0" }}>
                Watches bills · Never repeats itself
              </p>
            )}
          </div>
          <button
            onClick={() => setPopupOpen(true)}
            style={{
              flexShrink: 0, padding: "8px 16px", borderRadius: 12,
              border: "none", cursor: "pointer",
              background: "rgba(255,255,255,0.94)", color: "#00654b",
              fontSize: 12, fontWeight: 800,
            }}
          >
            Chat Now
          </button>
        </div>
      </div>

      {/* Reminders list */}
      <div className="px-5 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-extrabold" style={{ color: "#0f172a" }}>Reminders &amp; Alerts</h2>
          <button
            onClick={() => setNotifPanelOpen(true)}
            className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 active:scale-95"
          >
            {isLoading ? "Loading…" : `${reminders.filter((r) => r.urgent).length} urgent · See all`}
          </button>
        </div>
        <div className="flex flex-col gap-2.5">
          {isLoading
            ? [...Array(3)].map((_, i) => (
                <div key={i} className="w-full rounded-2xl border border-slate-100 p-4 shadow-sm bg-white">
                  <div className="flex items-center gap-3.5">
                    <Skeleton className="w-11 h-11 rounded-2xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </div>
              ))
            : reminders.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => setPopupOpen(true)}
                  className="w-full flex items-center gap-3.5 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm active:scale-[0.98] transition-all text-left"
                  style={{ animation: `rowIn 0.3s ease ${i * 0.07}s both` }}
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
              ))
          }
        </div>
      </div>

      {/* Tip */}
      <div
        className="mx-5 mt-5 p-4 rounded-2xl flex items-center gap-3"
        style={{ background: "rgba(0,101,75,0.06)", border: "1px dashed rgba(0,101,75,0.24)" }}
      >
        <Icon name="tips_and_updates" size={20} fill={1} className="text-[#00654b] shrink-0" />
        <p className="text-xs text-slate-600 font-medium">
          Reminders are scored by urgency and fade after repeated views —{" "}
          <strong className="text-[#00654b]">never pestered</strong> about the same thing twice.
        </p>
      </div>

      {/* Bottom Nav */}
      <nav
        className="fixed bottom-0 left-0 w-full z-50 h-20 flex justify-around items-center px-2 bg-white border-t"
        style={{ borderColor: "#eef2f7", boxShadow: "0 -4px 20px -4px rgba(0,101,75,0.10)" }}
      >
        <NavBtn onClick={() => navigate("/")}          icon="home"          label="Home"      />
        <NavBtn onClick={() => navigate("/statement")} icon="receipt_long"  label="Statement" />
        <div className="relative -mt-8 flex flex-col items-center">
          <button
            className="w-16 h-16 rounded-full flex items-center justify-center text-white border-4 border-white shadow-lg active:scale-95 transition-all"
            style={{ background: "#00654b" }}
          >
            <Icon name="qr_code_scanner" size={28} className="text-white" />
          </button>
          <span className="text-[10px] font-bold mt-1 text-[#00654b]">Scan &amp; Pay</span>
        </div>
        <NavBtn onClick={() => navigate("/schedules")} icon="calendar_month" label="Schedules" />
        <NavBtn onClick={() => navigate("/more")}      icon="menu"           label="More"      />
      </nav>

      {!popupOpen && (
        <ChatbotFAB
          onClick={() => setPopupOpen(true)}
          urgentCount={badgeCount}
          loading={isLoading}
        />
      )}

      {popupOpen      && <ChatPopup         onClose={() => setPopupOpen(false)} />}
      {notifPanelOpen && <NotificationPanel onClose={() => setNotifPanelOpen(false)} notifications={notifications} setNotifications={setNotifications} />}
    </div>
  );
}