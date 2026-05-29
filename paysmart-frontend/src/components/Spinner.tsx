export default function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center">
      <svg
        width={size} height={size}
        viewBox="0 0 24 24"
        className="animate-spin text-primary"
        fill="none"
      >
        <circle cx="12" cy="12" r="10" stroke="#e5e7eb" strokeWidth="3" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="#1B6B3A" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}
