import { IoChevronBack } from 'react-icons/io5';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { syncApi } from '../../api';
import type { Suggestion } from '../../types';
import BottomNav from '../../components/BottomNav';
import Spinner from '../../components/Spinner';

export default function Suggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading,     setLoading]     = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    syncApi.getSuggestions()
      .then(setSuggestions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const dismiss = (id: string) => setSuggestions(p => p.filter(s => s.id !== id));

  return (
    <div className="page bg-gray-50">
      <div className="bg-primary px-5 pt-12 pb-6 rounded-b-[32px]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white flex items-center justify-center w-8 h-8 rounded-xl bg-white/15 active:bg-white/25"><IoChevronBack className="w-5 h-5" /></button>
          <div>
            <h1 className="text-white font-bold text-xl">Smart Suggestions</h1>
            <p className="text-white/70 text-sm">AI-detected payment patterns</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5 pb-24">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl">🤖</span>
            <p className="text-gray-500 mt-4 font-medium">No suggestions yet</p>
            <p className="text-gray-400 text-sm mt-1">PaySmart will analyse your payment history and suggest automations</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {suggestions.map(s => <SuggestionCard key={s.id} s={s} onDismiss={dismiss} onAutomate={() => navigate('/schedules/new')} />)}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

function SuggestionCard({
  s, onDismiss, onAutomate,
}: { s: Suggestion; onDismiss: (id: string) => void; onAutomate: () => void }) {
  const confidence = s.metadata?.confidence ?? 0;
  const pct        = Math.round(confidence * 100);
  const payee      = s.metadata?.payee ?? 'this payee';

  return (
    <div className="bg-white rounded-2xl p-5 shadow-card">
      <div className="flex items-start justify-between mb-3">
        <span className="bg-primary text-white text-[10px] font-bold px-2.5 py-1 rounded-full">AI INSIGHT</span>
        <div className="flex items-center gap-1">
          <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs font-bold text-primary">{pct}%</span>
        </div>
      </div>

      <h3 className="font-bold text-gray-800 mb-1">{s.title}</h3>
      <p className="text-gray-500 text-sm">{s.body}</p>

      {s.metadata?.avg_amount && (
        <div className="flex gap-3 mt-3">
          <div className="flex-1 bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400">Avg amount</p>
            <p className="font-bold text-gray-700">NPR {Math.round(s.metadata.avg_amount).toLocaleString()}</p>
          </div>
          {s.metadata?.frequency && (
            <div className="flex-1 bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400">Pattern</p>
              <p className="font-bold text-gray-700 capitalize">{s.metadata.frequency}</p>
            </div>
          )}
          <div className="flex-1 bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400">Payee</p>
            <p className="font-bold text-gray-700 truncate">{payee}</p>
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <button onClick={onAutomate} className="flex-1 py-3 bg-primary text-white font-semibold rounded-xl text-sm">
          ✓ Yes, Automate This
        </button>
        <button onClick={() => onDismiss(s.id)} className="px-4 py-3 text-gray-400 text-sm rounded-xl border border-gray-100">
          Not Now
        </button>
      </div>
    </div>
  );
}
