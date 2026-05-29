import type { Toast } from '../hooks/useToast';

export default function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[90%] max-w-[400px]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg text-white text-sm font-medium animate-bounce-in
            ${t.type === 'error'   ? 'bg-red-500'   : ''}
            ${t.type === 'success' ? 'bg-primary'   : ''}
            ${t.type === 'info'    ? 'bg-gray-800'  : ''}
          `}
        >
          <span>{t.type === 'error' ? '✗' : t.type === 'success' ? '✓' : 'ℹ'}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
