import React, { useState, useEffect } from 'react';

const Icon = ({ name, className = "" }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const Notification = ({ onClose }) => {
  const [visibleItems, setVisibleItems] = useState([]);
  
  const allNotifications = [
    { id: 1, title: "Payment Received", desc: "NPR 500 received from Rabin.", time: "2m ago", icon: "add_circle", color: "text-green-600", bg: "bg-green-50" },
    { id: 2, title: "Bill Reminder", desc: "Your Vianet bill is due in 2 days.", time: "1h ago", icon: "warning", color: "text-orange-600", bg: "bg-orange-50" },
    { id: 3, title: "Cashback Alert", desc: "You earned NPR 50 cashback on Topup!", time: "3h ago", icon: "redeem", color: "text-purple-600", bg: "bg-purple-50" },
  ];

  useEffect(() => {
    // Simulate notifications "arriving" one by one
    allNotifications.forEach((_, index) => {
      setTimeout(() => {
        setVisibleItems(prev => [...prev, allNotifications[index]]);
      }, (index + 1) * 600); // 600ms staggered delay
    });
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