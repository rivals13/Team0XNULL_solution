import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { schedulesApi } from '../../api';
import type { Schedule } from '../../types';
import BottomNav from '../../components/BottomNav';
import Spinner from '../../components/Spinner';

const FREQ_LABELS: Record<string, string> = {
  ONCE: 'One-time', DAILY: 'Daily', WEEKLY: 'Weekly',
  BIWEEKLY: 'Bi-weekly', MONTHLY: 'Monthly',
  YEARLY: 'Yearly', CUSTOM_CRON: 'Custom',
};

export default function Schedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [busy,      setBusy]      = useState<string | null>(null); // id of schedule being acted on
  const navigate = useNavigate();

  const load = async () => {
    setError('');
    try { setSchedules(await schedulesApi.list()); }
    catch { setError('Failed to load schedules.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const pause = async (id: string) => {
    setBusy(id);
    try { await schedulesApi.pause(id); await load(); }
    catch { setError('Failed to pause schedule — please try again.'); }
    finally { setBusy(null); }
  };

  const resume = async (id: string) => {
    setBusy(id);
    try { await schedulesApi.resume(id); await load(); }
    catch { setError('Failed to resume schedule — please try again.'); }
    finally { setBusy(null); }
  };

  const cancel = async (id: string) => {
    if (!confirm('Cancel this schedule? This cannot be undone.')) return;
    setBusy(id);
    try {
      await schedulesApi.cancel(id);
      setSchedules(p => p.filter(s => s.id !== id));
    } catch { setError('Failed to cancel schedule — please try again.'); }
    finally { setBusy(null); }
  };

  const activeCount = schedules.filter(s => s.status === 'ACTIVE').length;

  return (
    <div className="page bg-gray-50">
      {/* Header */}
      <div className="bg-primary px-5 pt-12 pb-6 rounded-b-[32px]">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate(-1)} className="text-white text-xl">←</button>
          <h1 className="text-white font-bold text-xl">Scheduled Payments</h1>
        </div>
        <p className="text-white/70 text-sm ml-8">{activeCount} active schedule{activeCount !== 1 ? 's' : ''}</p>
      </div>

      <div className="px-5 pt-5 pb-24">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-2xl mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl">📅</span>
            <p className="text-gray-500 mt-4">No schedules yet</p>
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
              />
            ))}
          </div>
        )}
      </div>

      {/* Add FAB */}
      <button
        onClick={() => navigate('/schedules/new')}
        className="fixed bottom-20 right-4 w-14 h-14 bg-primary rounded-full shadow-xl flex items-center justify-center text-white text-2xl z-50 active:scale-95 transition-transform"
        style={{ bottom: '80px', right: '16px' }}
      >
        +
      </button>
      <BottomNav />
    </div>
  );
}

function ScheduleCard({
  s, isBusy, onPause, onResume, onCancel,
}: {
  s: Schedule;
  isBusy: boolean;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const statusColor: Record<string, string> = {
    ACTIVE:    'bg-green-100 text-primary',
    PAUSED:    'bg-yellow-100 text-yellow-700',
    CANCELLED: 'bg-gray-100 text-gray-400',
    COMPLETED: 'bg-gray-100 text-gray-500',
  };

  const canAct = s.status !== 'CANCELLED' && s.status !== 'COMPLETED';

  return (
    <div className={`bg-white rounded-2xl p-4 shadow-card transition-opacity ${isBusy ? 'opacity-60' : 'opacity-100'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-gray-800">{s.name}</h3>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor[s.status] ?? 'bg-gray-100 text-gray-500'}`}>
              {s.status}
            </span>
          </div>
          <p className="text-primary font-bold text-xl">NPR {s.amount.toLocaleString()}</p>
          <p className="text-gray-400 text-xs mt-1">via {s.provider} · {FREQ_LABELS[s.frequency] ?? s.frequency}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Next payment</p>
          <p className="text-sm font-semibold text-gray-700">
            {new Date(s.nextRunAt).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      {canAct && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-50">
          {s.status === 'ACTIVE' ? (
            <button
              onClick={() => onPause(s.id)}
              disabled={isBusy}
              className="flex-1 py-2.5 text-yellow-700 bg-yellow-50 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95 transition-transform"
            >
              {isBusy ? <Spinner size={14} /> : '⏸'} Pause
            </button>
          ) : (
            <button
              onClick={() => onResume(s.id)}
              disabled={isBusy}
              className="flex-1 py-2.5 text-primary bg-green-50 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95 transition-transform"
            >
              {isBusy ? <Spinner size={14} /> : '▶'} Resume
            </button>
          )}
          <button
            onClick={() => onCancel(s.id)}
            disabled={isBusy}
            className="flex-1 py-2.5 text-red-500 bg-red-50 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95 transition-transform"
          >
            {isBusy ? <Spinner size={14} /> : '✕'} Cancel
          </button>
        </div>
      )}
    </div>
  );
}
