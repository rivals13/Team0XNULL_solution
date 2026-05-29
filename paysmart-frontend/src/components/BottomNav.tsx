import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/dashboard',   label: 'Home',        icon: HomeIcon },
  { to: '/statement',   label: 'Statement',   icon: StatIcon },
  { to: '/smart-bills', label: 'Smart Bills', icon: BillsIcon, center: true },
  { to: '/schedules',   label: 'Schedules',   icon: CalIcon },
  { to: '/more',        label: 'More',        icon: MoreIcon },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 shadow-nav z-50">
      <div className="flex items-end justify-around px-2 pt-2 pb-3">
        {tabs.map(({ to, label, icon: Icon, center }) => (
          center ? (
            <NavLink key={to} to={to} className="flex flex-col items-center -mt-6">
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] text-gray-400 mt-1">{label}</span>
            </NavLink>
          ) : (
            <NavLink
              key={to} to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-2 ${isActive ? 'text-primary' : 'text-gray-400'}`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{label}</span>
            </NavLink>
          )
        ))}
      </div>
    </nav>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function StatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
function BillsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 16h4" />
    </svg>
  );
}
function CalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function MoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="5" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="19" r="1" fill="currentColor" />
    </svg>
  );
}
