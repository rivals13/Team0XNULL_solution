import React from 'react';
import { useNavigate } from 'react-router-dom';

export interface BillDuePayload {
  merchantName: string;
  merchantSlug: string;
  amount:       number;
  dueDate:      string;
  description:  string;
  billId?:      string;
}

interface Props {
  data:     BillDuePayload;
  onClose:  () => void;
  onRemind: () => void;  // dismiss for 24 hours
}

export default function BillDuePopup({ data, onClose, onRemind }: Props) {
  const navigate  = useNavigate();
  const dueDate   = new Date(data.dueDate);
  const daysLeft  = Math.ceil((dueDate.getTime() - Date.now()) / 86_400_000);
  const dueLine   = daysLeft <= 0 ? 'due today' : daysLeft === 1 ? 'due tomorrow' : `due in ${daysLeft} days`;

  const goPayNow = () => {
    onClose();
    navigate('/smart-bills');
  };

  const goSchedule = () => {
    onClose();
    const q = new URLSearchParams({
      fromSmartBill: 'true',
      name:          `${data.merchantName} Bill`,
      amount:        String(data.amount),
      billerName:    data.merchantName,
      merchantSlug:  data.merchantSlug,
      description:   data.description,
      dueDate:       data.dueDate,
    });
    navigate(`/schedules/new?${q}`);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center pb-[66px] px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Card */}
      <div className="relative w-full max-w-[390px] bg-white rounded-t-[32px] pb-8 pt-5 px-5 shadow-2xl animate-slide-up">
        {/* Drag handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xl">🔔</span>
          </div>
          <div>
            <p className="font-bold text-gray-800">{data.merchantName}</p>
            <p className="text-xs text-gray-500">{data.description}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 text-xl leading-none">✕</button>
        </div>

        {/* Bill amount box */}
        <div className="bg-primary/5 border border-primary/15 rounded-2xl px-4 py-4 mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Amount Due</p>
            <p className="text-2xl font-bold text-primary">
              NPR {(data.amount ?? 0).toLocaleString('en-NP')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-0.5">Due Date</p>
            <p className="text-sm font-semibold text-gray-700">
              {dueDate.toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <p className="text-xs text-amber-600 font-medium mt-0.5">⏰ {dueLine}</p>
          </div>
        </div>

        {/* 3 action buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={goPayNow}
            className="w-full py-3.5 bg-primary text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            ⚡ Pay Now
          </button>
          <button
            onClick={goSchedule}
            className="w-full py-3.5 bg-gray-50 border border-gray-200 text-gray-700 font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            📅 Schedule Payment
          </button>
          <button
            onClick={onRemind}
            className="w-full py-3 text-gray-400 text-sm font-medium"
          >
            🔕 Remind me tomorrow
          </button>
        </div>
      </div>
    </div>
  );
}
