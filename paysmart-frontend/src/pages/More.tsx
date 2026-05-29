import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useLang } from '../store/lang';
import BottomNav from '../components/BottomNav';

const MENU = [
  { icon: '💡', label: 'Smart Bills',       path: '/smart-bills'   },
  { icon: '💚', label: 'Health Score',      path: '/health-score'  },
  { icon: '🤖', label: 'Smart Suggestions', path: '/suggestions'   },
  { icon: '🔔', label: 'Notifications',     path: '/notifications' },
  { icon: '🏪', label: 'Merchant Portal',   path: '/merchant/setup'},
];

export default function More() {
  const navigate           = useNavigate();
  const { user, clearAuth} = useAuthStore();
  const { lang, toggle, t } = useLang();

  const logout = () => { clearAuth(); navigate('/login'); };

  return (
    <div className="page bg-gray-50">
      <div className="bg-primary px-5 pt-12 pb-8 rounded-b-[32px]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-white font-bold text-xl">{t('More')}</h1>
          {/* Language toggle */}
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

      <div className="px-5 pt-5 pb-24">

        {/* Language info banner */}
        <div className="bg-white rounded-2xl p-4 shadow-card mb-4 flex items-center gap-3">
          <span className="text-2xl">{lang === 'ne' ? '🇳🇵' : '🇬🇧'}</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-800">
              {lang === 'ne' ? 'नेपाली भाषा सक्रिय' : 'English Language Active'}
            </p>
            <p className="text-xs text-gray-400">
              {lang === 'ne' ? 'अ्याप नेपाली भाषामा देखाइरहेको छ' : 'App is displaying in English'}
            </p>
          </div>
          <button
            onClick={toggle}
            className="text-primary text-xs font-bold border border-primary/30 rounded-xl px-3 py-1.5"
          >
            {lang === 'ne' ? 'Switch to English' : 'नेपालीमा हेर्नुहोस्'}
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-card overflow-hidden mb-4">
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

        <p className="text-center text-gray-300 text-xs mt-6">PaySmart v1.0 · eSewa Hackathon 2026</p>
      </div>
      <BottomNav />
    </div>
  );
}
