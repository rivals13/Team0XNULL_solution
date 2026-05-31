import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createAutomationRule, fetchAutomations } from "../services/automationApi";

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

const defaultForm = {
  recipient: "NEA",
  amount: "1500",
  category: "Utility",
  frequency: "monthly",
  scheduleDay: "15",
  reminderDays: "3",
  startDate: "2026-04-15",
};

function buildFormFromSuggestion(suggestion) {
  if (!suggestion) {
    return defaultForm;
  }

  const inferredDay = suggestion.next_due_date ? String(new Date(suggestion.next_due_date).getDate()) : defaultForm.scheduleDay;
  return {
    recipient: suggestion.recipient ?? defaultForm.recipient,
    amount: String(suggestion.amount ?? defaultForm.amount),
    category: suggestion.category ?? defaultForm.category,
    frequency: suggestion.payment_count >= 2 ? "monthly" : defaultForm.frequency,
    scheduleDay: inferredDay,
    reminderDays: defaultForm.reminderDays,
    startDate: suggestion.next_due_date ?? defaultForm.startDate,
  };
}

export default function AutomationDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const suggestion = location.state?.suggestion;
  const [form, setForm] = useState(() => buildFormFromSuggestion(suggestion));
  const [saving, setSaving] = useState(false);
  const [savedAutomation, setSavedAutomation] = useState(null);
  const [savedAutomations, setSavedAutomations] = useState([]);
  const [authExpired, setAuthExpired] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSavedAutomations = async () => {
      try {
        const automations = await fetchAutomations();
        if (!isMounted || !Array.isArray(automations) || automations.length === 0) {
          if (isMounted) {
            setSavedAutomations([]);
          }
          return;
        }

        const latestAutomation = automations[automations.length - 1];
        setSavedAutomations(automations);
        setSavedAutomation(latestAutomation);

        if (!suggestion) {
          setForm({
            recipient: latestAutomation.recipient ?? defaultForm.recipient,
            amount: String(latestAutomation.amount ?? defaultForm.amount),
            category: latestAutomation.category ?? defaultForm.category,
            frequency: latestAutomation.frequency ?? defaultForm.frequency,
            scheduleDay: String(latestAutomation.schedule_day ?? defaultForm.scheduleDay),
            reminderDays: String(latestAutomation.reminder_days ?? defaultForm.reminderDays),
            startDate: latestAutomation.start_date ?? defaultForm.startDate,
          });
        }
      } catch {
        if (isMounted) {
          setSavedAutomation(null);
          setSavedAutomations([]);
        }
      }
    };

    loadSavedAutomations();

    return () => {
      isMounted = false;
    };
  }, [suggestion]);

  const handleChange = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setAuthExpired(false);

    try {
      const payload = {
        recipient: form.recipient,
        amount: Number(form.amount),
        category: form.category,
        frequency: form.frequency,
        schedule_day: Number(form.scheduleDay),
        reminder_days: Number(form.reminderDays),
        start_date: form.startDate,
        source: suggestion?.pattern_id ?? null,
      };

      // Validate schedule_day on the client to prevent invalid submissions
      const sd = Number(payload.schedule_day);
      if (!Number.isInteger(sd) || sd < 1 || sd > 32) {
        alert("Schedule day must be an integer between 1 and 32.");
        return;
      }

      const response = await createAutomationRule(payload);
      const savedRecord = response.automation ?? response;
      setSavedAutomation(savedRecord);
      setSavedAutomations((current) => {
        const filtered = current.filter((item) => item.automation_id !== savedRecord.automation_id);
        return [...filtered, savedRecord];
      });
    } catch (error) {
      const msg = String(error?.message ?? "").toLowerCase();
      if (msg.includes("invalid token") || msg.includes("authentication required")) {
        setAuthExpired(true);
      } else {
        alert(error?.message ?? "Save failed");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="min-h-screen pb-10 font-sans"
      style={{ background: "radial-gradient(circle at top left, #e8fff4 0, #f7fbf8 38%, #eef4f0 100%)", color: "#12211a", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');`}</style>

      <header className="px-5 pt-5">
        {authExpired && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-red-800">
            Session expired, please log in again.
          </div>
        )}
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-xs font-bold shadow-sm transition-transform active:scale-95"
          style={{ borderColor: "rgba(0,101,75,0.18)", color: "#00654b" }}
        >
          <Icon name="arrow_back" size={18} />
          Back to schedules
        </button>

        <div
          className="relative overflow-hidden rounded-[30px] p-6 text-white shadow-[0_18px_40px_-20px_rgba(0,101,75,0.6)]"
          style={{ background: "linear-gradient(135deg,#00654b,#0d7b5c)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">Automation dashboard</p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight">Configure recurring payments and reminders</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85">
            Turn detected transaction patterns into automation rules, reminder schedules, and deadline-driven monthly execution.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs font-bold text-white/90">
            <span className="rounded-full bg-white/15 px-3 py-1">Recurring bills</span>
            <span className="rounded-full bg-white/15 px-3 py-1">Deadline reminders</span>
            <span className="rounded-full bg-white/15 px-3 py-1">Safe scheduling</span>
          </div>
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        </div>
      </header>

      <main className="grid gap-6 px-5 pt-6 lg:grid-cols-[1.3fr_0.9fr]">
        <section className="rounded-[28px] border bg-white p-5 shadow-[0_12px_28px_-18px_rgba(18,33,26,0.35)]" style={{ borderColor: "rgba(189,201,194,0.55)" }}>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#102219]">Automation settings</h2>
              <p className="mt-1 text-sm text-slate-500">Fine-tune the rule that will repeat automatically.</p>
            </div>
            {suggestion ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Pattern linked</span>
            ) : null}
          </div>

          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <Field label="Recipient" value={form.recipient} onChange={handleChange("recipient")} />
            <Field label="Amount (NPR)" type="number" value={form.amount} onChange={handleChange("amount")} />
            <Field label="Category" value={form.category} onChange={handleChange("category")} />
            <SelectField
              label="Frequency"
              value={form.frequency}
              onChange={handleChange("frequency")}
              options={[
                ["monthly", "Monthly"],
                ["weekly", "Weekly"],
                ["quarterly", "Quarterly"],
              ]}
            />
            <Field label="Schedule day" type="number" value={form.scheduleDay} onChange={handleChange("scheduleDay")} />
            <Field label="Reminder days before" type="number" value={form.reminderDays} onChange={handleChange("reminderDays")} />
            <Field label="Start date" type="date" value={form.startDate} onChange={handleChange("startDate")} />

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-bold text-white transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-75"
                style={{ background: "linear-gradient(135deg,#00654b,#0d7b5c)" }}
              >
                <Icon name="event_repeat" size={20} />
                {saving ? "Saving automation..." : "Save automation"}
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <div className="rounded-[28px] border bg-white p-5 shadow-[0_12px_28px_-18px_rgba(18,33,26,0.35)]" style={{ borderColor: "rgba(189,201,194,0.55)" }}>
            <h3 className="text-lg font-bold text-[#102219]">Automation preview</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {form.recipient} will be scheduled on day {form.scheduleDay} of every {form.frequency} cycle.
            </p>
            <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="font-bold">Reminder plan</p>
              <p className="mt-1 leading-6">
                Send reminders {form.reminderDays} days before the due date and hold the payment until the scheduled execution window opens.
              </p>
            </div>
          </div>

          {savedAutomation ? (
            <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 shadow-[0_12px_28px_-18px_rgba(18,33,26,0.35)]">
              <div className="flex items-center gap-2 font-bold">
                <Icon name="check_circle" size={18} className="text-emerald-700" />
                Automation saved
              </div>
              <p className="mt-2 text-sm leading-6 text-emerald-950/80">
                {savedAutomation.recipient} has been configured for {savedAutomation.frequency} payments.
              </p>
            </div>
          ) : null}

          <div className="rounded-[28px] border bg-white p-5 shadow-[0_12px_28px_-18px_rgba(18,33,26,0.35)]" style={{ borderColor: "rgba(189,201,194,0.55)" }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[#102219]">Saved automations</h3>
                <p className="mt-1 text-sm text-slate-500">Loaded from the backend, so refresh keeps the same rules visible.</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{savedAutomations.length} saved</span>
            </div>

            <div className="mt-4 grid gap-3">
              {savedAutomations.length > 0 ? savedAutomations.map((automation) => (
                <article key={automation.automation_id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[#102219]">{automation.recipient}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {automation.category} · day {automation.schedule_day} · {automation.frequency}
                      </p>
                    </div>
                    <p className="text-sm font-extrabold text-[#00654b]">NPR {Number(automation.amount).toLocaleString()}</p>
                  </div>
                </article>
              )) : null}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Field({ label, type = "text", value, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-semibold text-[#102219] outline-none transition focus:border-[#00654b]"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{label}</span>
      <select
        value={value}
        onChange={onChange}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-semibold text-[#102219] outline-none transition focus:border-[#00654b]"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}