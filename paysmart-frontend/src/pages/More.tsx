import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useLang } from '../store/lang';
import { usePreferences } from '../context/PreferencesContext';
import BottomNav from '../components/BottomNav';
import Spinner from '../components/Spinner';

const MENU = [
  { icon: '💡', label: 'Smart Bills',       path: '/smart-bills'   },
  { icon: '🤖', label: 'Smart Suggestions', path: '/suggestions'   },
  { icon: '🔔', label: 'Notifications',     path: '/notifications' },
  { icon: '🏪', label: 'Merchant Portal',   path: '/merchant/setup'},
];

// ─── Reusable toggle row ──────────────────────────────────────────────────────
function PrefRow({
  icon, title, desc, value, onChange, saving, warn,
}: {
  icon: string; title: string; desc: string;
  value: boolean; onChange: () => void; saving?: boolean; warn?: string;
}) {
  return (
    <div className="px-5 py-4 border-b border-gray-50 last:border-0">
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-800">{title}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
              {warn && value && (
                <p className="text-[10px] text-amber-600 mt-1 font-medium">⚠ {warn}</p>
              )}
            </div>
            <button
              onClick={onChange}
              disabled={saving}
              className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-colors ${value ? 'bg-primary' : 'bg-gray-200'} ${saving ? 'opacity-60' : ''}`}
            >
              {saving
                ? <Spinner size={12} />
                : <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function More() {
  const navigate           = useNavigate();
  const { user, clearAuth} = useAuthStore();
  const { lang, toggle, t } = useLang();
  const { prefs, saving, toggle: togglePref } = usePreferences();

  const logout = () => { clearAuth(); navigate('/login'); };

  return (
    <div className="page bg-gray-50">
      <div className="bg-primary px-5 pt-12 pb-8 rounded-b-[32px]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-white font-bold text-xl">{t('More')}</h1>
          <button
            onClick={toggle}
            className="flex items-center gap-2 bg-white/15 border border-white/25 rounded-2xl px-3 py-2"
          >
            <span className="text-base">{lang === 'en' ? '🇳🇵' : '🇬🇧'}</span>
            <span className="text-white text-xs font-bold">
              {lang === 'en' ? 'नेपाली' : 'English'}
            </span>
          </button>
        </div>

        {/* Profile card */}
        <div className="flex items-center gap-4 bg-white/15 rounded-2xl p-4">
          <div className="w-12 h-12 rounded-full bg-white/30 flex items-center justify-center text-xl text-white font-bold">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div>
            <p className="text-white font-bold">{user?.name}</p>
            <p className="text-white/70 text-sm">{user?.email}</p>
            <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full capitalize">{user?.role}</span>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5 pb-24 flex flex-col gap-4">

        {/* ── Payment Preferences ── */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 px-1">
            ⚙️ Payment Preferences
          </p>
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <PrefRow
              icon="⚡"
              title="Auto-Payment"
              desc="Executes scheduled payments automatically on the due date without asking for confirmation."
              value={prefs.autoPayEnabled}
              onChange={() => togglePref('autoPayEnabled')}
              saving={saving}
              warn="Payments will deduct automatically without any confirmation popup."
            />
            <PrefRow
              icon="📱"
              title="SMS Reminder"
              desc="Receive an SMS 3 days before each bill is due on your registered phone number via Sparrow SMS."
              value={prefs.smsReminder}
              onChange={() => togglePref('smsReminder')}
              saving={saving}
            />
            <PrefRow
              icon="🔔"
              title="Due-Date Notifications"
              desc="Push notifications 1 day before and 1 hour before each scheduled payment."
              value={prefs.pushNotification}
              onChange={() => togglePref('pushNotification')}
              saving={saving}
            />
            <PrefRow
              icon="💳"
              title="Partial Payment"
              desc="Show option to pay a custom partial amount on payment screens. Useful for NEA electricity bills."
              value={prefs.partialPayment}
              onChange={() => togglePref('partialPayment')}
              saving={saving}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-2 px-1">
            Preferences are saved to your account and apply across all devices.
          </p>
        </div>

        {/* ── Navigation menu ── */}
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          {MENU.map(({ icon, label, path }, i) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              className={`w-full flex items-center gap-4 px-5 py-4 text-left active:bg-gray-50 ${i < MENU.length - 1 ? 'border-b border-gray-50' : ''}`}
            >
              <span className="text-2xl">{icon}</span>
              <span className="flex-1 font-medium text-gray-700">{t(label)}</span>
              <span className="text-gray-300">›</span>
            </button>
          ))}
        </div>

        <button onClick={logout} className="w-full py-4 border-2 border-red-100 text-red-500 font-semibold rounded-2xl">
          {t('Logout')}
        </button>

        <p className="text-center text-gray-300 text-xs mt-2">PaySmart v1.0 · eSewa Hackathon 2026</p>
      </div>
      <BottomNav />
    </div>
  );
}
