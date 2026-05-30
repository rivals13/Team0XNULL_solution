import { IoChevronBack } from 'react-icons/io5';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../api';
import { useAuthStore } from '../store/auth';
import type { HealthScore } from '../types';
import BottomNav from '../components/BottomNav';
import Spinner from '../components/Spinner';

const GRADE_COLOR: Record<string, string> = {
  A: '#1B6B3A', B: '#2ECC71', C: '#F1C40F', D: '#E67E22', F: '#E74C3C',
};

export default function HealthScorePage() {
  const { user }        = useAuthStore();
  const navigate        = useNavigate();
  const [data, setData] = useState<HealthScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!user?.id) return;
    usersApi.getHealthScore(user.id)
      .then(setData)
      .catch(() => setError('Could not load health score.'))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const gradeColor = data ? GRADE_COLOR[data.grade] : '#ccc';

  return (
    <div className="page bg-gray-50">
      <div className="bg-primary px-5 pt-12 pb-6 rounded-b-[32px]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white flex items-center justify-center w-8 h-8 rounded-xl bg-white/15 active:bg-white/25"><IoChevronBack className="w-5 h-5" /></button>
          <div>
            <h1 className="text-white font-bold text-xl">Financial Health Score</h1>
            <p className="text-white/70 text-sm">Based on your payment behaviour</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-6 pb-24">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : error ? (
          <p className="text-center text-red-500 py-8">{error}</p>
        ) : data && (
          <>
            {/* Circular gauge */}
            <div className="bg-white rounded-3xl p-8 shadow-card flex flex-col items-center mb-5">
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 200 200" className="w-full h-full -rotate-[90deg]">
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#f0faf4" strokeWidth="20" />
                  <circle
                    cx="100" cy="100" r="80" fill="none"
                    stroke={gradeColor} strokeWidth="20"
                    strokeDasharray={`${(data.score / 100) * 502} 502`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 1s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-5xl font-bold" style={{ color: gradeColor }}>{data.score}</p>
                  <p className="text-lg font-bold" style={{ color: gradeColor }}>{data.grade}</p>
                  <p className="text-xs text-gray-400">out of 100</p>
                </div>
              </div>

              <p className="text-center text-gray-600 text-sm mt-4 leading-relaxed">{data.insight}</p>
              <p className="text-xs text-gray-300 mt-2">
                Last updated: {new Date(data.calculatedAt).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {/* Breakdown */}
            <div className="bg-white rounded-3xl p-5 shadow-card mb-4">
              <h3 className="font-bold text-gray-800 mb-4">Score Breakdown</h3>
              <div className="flex flex-col gap-3">
                <ScoreRow
                  label="On-time Payments"
                  detail={`${data.breakdown.on_time_payments} payments`}
                  value={`+${data.breakdown.on_time_contribution}`}
                  positive
                />
                <ScoreRow
                  label="Missed Payments"
                  detail={`${data.breakdown.missed_payments} missed`}
                  value={`${data.breakdown.missed_penalty}`}
                  positive={false}
                />
                <ScoreRow
                  label="Balance Health"
                  detail={`Avg NPR ${data.breakdown.avg_balance_maintained.toLocaleString()}`}
                  value={`+${data.breakdown.balance_score}`}
                  positive
                />
              </div>
            </div>

            {/* Tips */}
            <div className="bg-primary/5 rounded-3xl p-5 border border-primary/10">
              <h3 className="font-bold text-primary mb-3">💡 How to improve</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2"><span className="text-primary">→</span> Pay bills before the due date</li>
                <li className="flex items-start gap-2"><span className="text-primary">→</span> Set up automatic schedules for recurring bills</li>
                <li className="flex items-start gap-2"><span className="text-primary">→</span> Maintain consistent payment patterns</li>
              </ul>
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

function ScoreRow({ label, detail, value, positive }: { label: string; detail: string; value: string; positive: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50">
      <div>
        <p className="font-medium text-gray-700 text-sm">{label}</p>
        <p className="text-gray-400 text-xs">{detail}</p>
      </div>
      <span className={`font-bold text-base ${positive ? 'text-primary' : 'text-red-500'}`}>{value} pts</span>
    </div>
  );
}
