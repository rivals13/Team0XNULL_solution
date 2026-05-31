import { useState, useEffect } from 'react';
import { fetchNotifications } from '../services/automationApi';

const Icon = ({ name, className = "" }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const Notification = ({ onClose }) => {
  const [visibleItems, setVisibleItems] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const loadNotifications = async () => {
      try {
        const notifications = await fetchNotifications();
        const normalizedItems = (Array.isArray(notifications) ? notifications : []).map((item, index) => ({
          id: item.notification_id ?? item.id ?? index,
          title: item.service_provider ?? item.notification_id ?? "Live notification",
          desc: `Due ${item.due_date ?? item.latest_transaction_date ?? "soon"} · NPR ${Number(item.due_amount ?? item.average_amount ?? 0).toLocaleString()}`,
          time: item.priority_rank ? `Priority #${item.priority_rank}` : "Live",
          icon: "notifications_active",
          color: "text-[#00654b]",
          bg: "bg-emerald-50",
        }));

        if (isMounted) {
          if (normalizedItems.length === 0) {
            setVisibleItems([]);
            return;
          }

          normalizedItems.forEach((item, index) => {
            setTimeout(() => {
              if (isMounted) {
                setVisibleItems((prev) => [...prev, item]);
              }
            }, (index + 1) * 350);
          });
        }
      } catch {
        if (isMounted) {
          setVisibleItems([]);
        }
      }
    };

    loadNotifications();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#f7faf9] animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1 -ml-1">
            <Icon name="arrow_back" className="text-gray-700" />
          </button>
          <h2 className="text-lg font-bold">Notifications</h2>
        </div>
        <button className="text-sm font-bold text-[#00654b]">Mark all as read</button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {visibleItems.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-20 text-gray-400">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Icon name="notifications_paused" size={32} />
            </div>
            <p className="text-sm font-medium">Syncing notifications...</p>
          </div>
        )}

        {visibleItems.map((item) => (
          <div 
            key={item.id} 
            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex gap-4 animate-in slide-in-from-bottom-4 duration-500"
          >
            <div className={`w-12 h-12 ${item.bg} ${item.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Icon name={item.icon} size={24} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h3 className="text-sm font-bold text-gray-900">{item.title}</h3>
                <span className="text-[10px] font-medium text-gray-400 uppercase">{item.time}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notification;