import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { schedulesApi } from '../../api';
import type { Schedule, ScheduleFreq } from '../../types';
import BottomNav from '../../components/BottomNav';
import Spinner from '../../components/Spinner';
import { BsPencil, BsPauseFill, BsPlayFill, BsXCircle, BsCalendarCheck } from 'react-icons/bs';
import { IoChevronBack } from 'react-icons/io5';

const FREQ_LABELS: Record<string, string> = {
  ONCE: 'One-time', DAILY: 'Daily', WEEKLY: 'Weekly',
  BIWEEKLY: 'Bi-weekly', MONTHLY: 'Monthly',
  YEARLY: 'Yearly', CUSTOM_CRON: 'Custom',
};

const FREQUENCIES: ScheduleFreq[] = ['ONCE', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY'];

// ─── Simple in-page toast ─────────────────────────────────────────────────────
function Toast({ msg, type, onDone }: { msg: string; type: 'success' | 'error'; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className={`fixed top-14 left-1/2 -translate-x-1/2 z-[999] px-4 py-2.5 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-2 ${type === 'success' ? 'bg-primary' : 'bg-red-500'}`}>
      {type === 'success' ? '✓' : '✕'} {msg}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Schedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [busy,      setBusy]      = useState<string | null>(null);
  const [toast,     setToast]     = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [editTarget, setEditTarget] = useState<Schedule | null>(null);
  const navigate = useNavigate();

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
  }, []);

  const load = async () => {
    try { setSchedules(await schedulesApi.list()); }
    catch { showToast('Failed to load schedules', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const onCreated = (e: Event) => {
      const s = (e as CustomEvent<Schedule>).detail;
      if (s?.id) setSchedules(prev => prev.some(x => x.id === s.id) ? prev : [s, ...prev]);
    };
    window.addEventListener('scheduleCreated', onCreated);
    return () => window.removeEventListener('scheduleCreated', onCreated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Optimistic update helpers
  const updateOne = (id: string, patch: Partial<Schedule>) =>
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));

  const pause = async (id: string) => {
    setBusy(id);
    updateOne(id, { status: 'PAUSED' }); // optimistic
    try {
      const updated = await schedulesApi.pause(id);
      updateOne(id, updated);
      showToast('Schedule paused');
    } catch {
      updateOne(id, { status: 'ACTIVE' }); // rollback
      showToast('Failed to pause', 'error');
    } finally { setBusy(null); }
  };

  const resume = async (id: string) => {
    setBusy(id);
    updateOne(id, { status: 'ACTIVE' }); // optimistic
    try {
      const updated = await schedulesApi.resume(id);
      updateOne(id, updated);
      showToast('Schedule resumed');
    } catch {
      updateOne(id, { status: 'PAUSED' }); // rollback
      showToast('Failed to resume', 'error');
    } finally { setBusy(null); }
  };

  const cancel = async (id: string) => {
    if (!confirm('Cancel this schedule? This cannot be undone.')) return;
    setBusy(id);
    try {
      await schedulesApi.cancel(id);
      setSchedules(p => p.filter(s => s.id !== id));
      showToast('Schedule cancelled');
    } catch {
      showToast('Failed to cancel', 'error');
    } finally { setBusy(null); }
  };

  const saveEdit = async (id: string, data: Parameters<typeof schedulesApi.update>[1]) => {
    setBusy(id);
    try {
      const updated = await schedulesApi.update(id, data);
      updateOne(id, updated);
      setEditTarget(null);
      showToast('Schedule updated');
    } catch {
      showToast('Failed to update schedule', 'error');
    } finally { setBusy(null); }
  };

  const activeCount = schedules.filter(s => s.status === 'ACTIVE').length;

  return (
    <div className="page bg-gray-50">
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {/* Header */}
      <div className="bg-primary px-5 pt-12 pb-6 rounded-b-[32px]">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate(-1)} className="text-white flex items-center justify-center w-8 h-8 rounded-xl bg-white/15 active:bg-white/25">
            <IoChevronBack className="w-5 h-5" />
          </button>
          <h1 className="text-white font-bold text-xl">Scheduled Payments</h1>
        </div>
        <p className="text-white/70 text-sm ml-8">{activeCount} active schedule{activeCount !== 1 ? 's' : ''}</p>
      </div>

      <div className="px-5 pt-5 pb-24">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-16">
            <BsCalendarCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No schedules yet</p>
            <p className="text-gray-400 text-sm mt-1">Set up automatic payments so you never miss a bill</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {schedules.map(s => (
              <ScheduleCard
                key={s.id}
                s={s}
                isBusy={busy === s.id}
                onPause={pause}
                onResume={resume}
                onCancel={cancel}
                onEdit={() => setEditTarget(s)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add FAB */}
      <button onClick={() => navigate('/schedules/new')}
        className="fixed bottom-20 right-4 w-14 h-14 bg-primary rounded-full shadow-xl flex items-center justify-center text-white text-2xl z-50 active:scale-95 transition-transform">
        +
      </button>
      <BottomNav />

      {/* Edit modal */}
      {editTarget && (
        <EditModal
          s={editTarget}
          isBusy={busy === editTarget.id}
          onSave={(data) => saveEdit(editTarget.id, data)}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}

// ─── Schedule Card ─────────────────────────────────────────────────────────────
function ScheduleCard({
  s, isBusy, onPause, onResume, onCancel, onEdit,
}: {
  s: Schedule; isBusy: boolean;
  onPause: (id: string) => void; onResume: (id: string) => void;
  onCancel: (id: string) => void; onEdit: () => void;
}) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    ACTIVE:    { bg: 'bg-green-100',  text: 'text-primary',     label: 'Active'    },
    PAUSED:    { bg: 'bg-yellow-100', text: 'text-yellow-700',  label: 'Paused'    },
    CANCELLED: { bg: 'bg-gray-100',   text: 'text-gray-400',    label: 'Cancelled' },
    COMPLETED: { bg: 'bg-blue-50',    text: 'text-blue-600',    label: 'Completed' },
  };
  const st = statusConfig[s.status] ?? statusConfig.CANCELLED;
  const canAct = s.status === 'ACTIVE' || s.status === 'PAUSED';

  // Progress (only when maxOccurrences > 0)
  const hasLimit    = s.maxOccurrences > 0;
  const done        = s.executedCount ?? 0;
  const total       = s.maxOccurrences;
  const remaining   = Math.max(0, total - done);
  const progressPct = hasLimit ? Math.min(100, (done / total) * 100) : 0;

  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 transition-opacity ${isBusy ? 'opacity-60' : ''}`}>
      {/* Top row: name + status + edit */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-bold text-gray-800 truncate">{s.name}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${st.bg} ${st.text}`}>
              {st.label}
            </span>
          </div>
          <p className="text-primary font-bold text-xl">NPR {s.amount.toLocaleString()}</p>
          <p className="text-gray-400 text-xs mt-0.5">
            via {s.provider} · {FREQ_LABELS[s.frequency] ?? s.frequency}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] text-gray-400">Next payment</p>
          <p className="text-sm font-semibold text-gray-700">
            {new Date(s.nextRunAt).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          {canAct && (
            <button onClick={onEdit} className="mt-1 text-gray-400 hover:text-primary transition-colors p-1">
              <BsPencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {hasLimit && (
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
            <span>{done} of {total} payments done</span>
            <span>{remaining} remaining</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {/* Action buttons */}
      {canAct && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
          {s.status === 'ACTIVE' ? (
            <button onClick={() => onPause(s.id)} disabled={isBusy}
              className="flex-1 py-2.5 text-yellow-700 bg-yellow-50 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95 transition-transform">
              {isBusy ? <Spinner size={12} /> : <BsPauseFill className="w-3.5 h-3.5" />} Pause
            </button>
          ) : (
            <button onClick={() => onResume(s.id)} disabled={isBusy}
              className="flex-1 py-2.5 text-primary bg-green-50 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95 transition-transform">
              {isBusy ? <Spinner size={12} /> : <BsPlayFill className="w-3.5 h-3.5" />} Resume
            </button>
          )}
          <button onClick={() => onCancel(s.id)} disabled={isBusy}
            className="flex-1 py-2.5 text-red-500 bg-red-50 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95 transition-transform">
            {isBusy ? <Spinner size={12} /> : <BsXCircle className="w-3.5 h-3.5" />} Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({
  s, isBusy, onSave, onClose,
}: {
  s: Schedule; isBusy: boolean;
  onSave: (data: Parameters<typeof schedulesApi.update>[1]) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name:           s.name,
    amount:         String(s.amount),
    frequency:      s.frequency as string,
    nextRunAt:      new Date(s.nextRunAt).toISOString().slice(0, 16),
    maxOccurrences: s.maxOccurrences > 0 ? String(s.maxOccurrences) : '',
    description:    s.description ?? '',
  });
  const [err, setErr] = useState('');
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!form.name.trim())            { setErr('Name is required'); return; }
    if (Number(form.amount) <= 0)     { setErr('Amount must be greater than 0'); return; }
    if (!form.nextRunAt)              { setErr('Date is required'); return; }
    if (new Date(form.nextRunAt) <= new Date(Date.now() + 60_000)) {
      setErr('Date must be at least 1 minute in the future'); return;
    }
    const maxOcc = form.maxOccurrences ? Number(form.maxOccurrences) : 0;
    if (maxOcc < 0 || maxOcc > 10)   { setErr('Max occurrences must be 0–10'); return; }

    onSave({
      name:           form.name,
      amount:         Number(form.amount),
      frequency:      form.frequency,
      nextRunAt:      new Date(form.nextRunAt).toISOString(),
      maxOccurrences: maxOcc,
      description:    form.description || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-end justify-center pb-[66px]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[390px] bg-white rounded-t-[28px] px-5 pt-5 pb-8 shadow-2xl animate-slide-up max-h-[80vh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h2 className="font-bold text-gray-800 text-lg mb-4">Edit Schedule</h2>

        {err && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-xl mb-3">{err}</div>}

        <form onSubmit={submit} className="flex flex-col gap-4">
          {/* Locked fields info */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-500">
            🔒 Merchant, Customer ID, and payment destination cannot be changed
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Schedule Name</label>
            <input value={form.name} onChange={set('name')}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-primary" />
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Amount (NPR)</label>
            <input type="number" value={form.amount} onChange={set('amount')} min="1"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-primary" />
          </div>

          {/* Frequency */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Frequency</label>
            <select value={form.frequency} onChange={set('frequency')}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-primary">
              {FREQUENCIES.map(f => (
                <option key={f} value={f}>
                  {f === 'ONCE' ? 'One-time' : f === 'BIWEEKLY' ? 'Bi-weekly' : f.charAt(0) + f.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Next date */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Next Payment Date</label>
            <input type="datetime-local" value={form.nextRunAt} onChange={set('nextRunAt')}
              min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-primary" />
          </div>

          {/* Max occurrences */}
          {form.frequency !== 'ONCE' && (
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Max Payments <span className="text-gray-400 font-normal">(1–10, or leave blank for unlimited)</span>
              </label>
              <input type="number" value={form.maxOccurrences} onChange={set('maxOccurrences')}
                min="0" max="10" placeholder="Unlimited"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-primary" />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Note (optional)</label>
            <textarea value={form.description} onChange={set('description')} rows={2}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-primary resize-none" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 border border-gray-200 text-gray-600 font-semibold rounded-2xl text-sm">
              Cancel
            </button>
            <button type="submit" disabled={isBusy}
              className="flex-1 py-3 bg-primary text-white font-semibold rounded-2xl text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              {isBusy ? <><Spinner size={16} /> Saving…</> : '💾 Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
