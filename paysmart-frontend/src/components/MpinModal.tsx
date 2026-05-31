import React, { useState, useRef, useEffect } from 'react';

interface Props {
  onConfirm: () => void;
  onCancel:  () => void;
}

/**
 * MPIN confirmation popup — 4-digit PIN (correct: 1234).
 * Blocks payment until correct MPIN is entered.
 */
export default function MpinModal({ onConfirm, onCancel }: Props) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error,  setError]  = useState('');
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => { refs[0].current?.focus(); }, []);

  const handleDigit = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    setError('');
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 3) refs[i + 1].current?.focus();
  };

  const handleKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs[i - 1].current?.focus();
    }
    if (e.key === 'Enter') verify();
  };

  const verify = () => {
    const pin = digits.join('');
    if (pin.length < 4) { setError('Enter all 4 digits'); return; }
    if (pin === '1234') {
      onConfirm();
    } else {
      setError('Incorrect MPIN. Please try again.');
      setDigits(['', '', '', '']);
      refs[0].current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div
        className="relative w-full max-w-[320px] bg-white rounded-3xl px-6 py-8 shadow-2xl text-center"
        style={{ animation: 'slideDown 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        {/* Icon */}
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🔐</span>
        </div>

        <h2 className="font-bold text-gray-800 text-lg mb-1">Enter your MPIN</h2>
        <p className="text-gray-400 text-xs mb-6">4-digit eSewa security PIN</p>

        {/* 4 PIN boxes */}
        <div className="flex justify-center gap-3 mb-4">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={refs[i]}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKey(i, e)}
              className={`w-12 h-12 rounded-2xl border-2 text-center text-xl font-bold focus:outline-none transition-colors ${
                d ? 'border-primary bg-[#E8F5EE] text-primary' : 'border-gray-200 bg-gray-50'
              } ${error ? 'border-red-300' : ''}`}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-xs font-medium mb-4">{error}</p>
        )}

        <button
          onClick={verify}
          disabled={digits.join('').length < 4}
          className="w-full py-3.5 bg-primary text-white font-bold rounded-2xl text-sm disabled:opacity-50 active:scale-95 transition-transform"
        >
          Confirm Payment
        </button>
        <button onClick={onCancel} className="w-full py-2.5 text-gray-400 text-xs mt-2">
          Cancel
        </button>
      </div>
      <style>{`@keyframes slideDown { from { opacity:0; transform:translateY(-30px) scale(0.95) } to { opacity:1; transform:translateY(0) scale(1) } }`}</style>
    </div>
  );
}
