import React from "react";
import esewaLogo from "../assets/images.jpeg";

const Icon = ({ name, fill = 0, size = 24, className = "" }) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={{
      fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
      fontSize: size,
      lineHeight: 1,
    }}
  >
    {name}
  </span>
);

export function ChatbotFAB({ onClick, urgentCount = 2 }) {
  const [showBubble, setShowBubble] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setShowBubble(true), 1400);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{`
        @keyframes fabPulse {
          0%,100% { box-shadow:0 8px 24px -4px rgba(0,101,75,0.45) }
          50% { box-shadow:0 8px 24px -4px rgba(0,101,75,0.45),0 0 0 10px rgba(0,101,75,0.08) }
        }
        @keyframes bubbleIn {
          from { opacity:0; transform:translateY(10px) scale(0.92) }
          to { opacity:1; transform:translateY(0) scale(1) }
        }
        @keyframes badgePop {
          from { transform:scale(0) }
          70% { transform:scale(1.15) }
          to { transform:scale(1) }
        }
      `}</style>

      <div className="fixed bottom-24 right-5 z-50 flex flex-col items-end gap-2">
        {showBubble && !dismissed && (
          <div
            onClick={onClick}
            className="cursor-pointer"
            style={{
              maxWidth: 235,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "18px 18px 6px 18px",
              padding: "12px 14px 12px 12px",
              boxShadow: "0 10px 30px rgba(15,23,42,0.12)",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              animation: "bubbleIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards",
              position: "relative",
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDismissed(true);
              }}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center"
            >
              <Icon name="close" size={12} className="text-white" />
            </button>

            <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 shrink-0">
              <img src={esewaLogo} alt="eSewa" className="w-full h-full object-cover" />
            </div>

            <div>
              <p className="text-[11px] font-extrabold text-slate-900 mb-1">eSewa Assistant</p>
              <p className="text-[12px] text-slate-600 leading-relaxed">
                {urgentCount > 0
                  ? `⚠️ You have ${urgentCount} urgent bills. Tap to fix now.`
                  : "✅ All bills look good. Tap to check your summary."}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={onClick}
          className="relative w-14 h-14 rounded-full active:scale-95 transition-all flex items-center justify-center overflow-hidden"
          style={{
            background: "linear-gradient(135deg,#00654b,#008a60)",
            boxShadow: "0 8px 24px -4px rgba(0,101,75,0.5)",
            animation: "fabPulse 2.5s ease-in-out infinite",
            border: "3px solid #fff",
          }}
        >
          {urgentCount > 0 && (
            <span
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white"
              style={{ animation: "badgePop 0.35s cubic-bezier(0.34,1.56,0.64,1) both" }}
            >
              {urgentCount}
            </span>
          )}

          <img src={esewaLogo} alt="eSewa" className="w-full h-full object-cover" />
        </button>
      </div>
    </>
  );
}import React from "react";
import esewaLogo from "../assets/images.jpeg";

const Icon = ({ name, fill = 0, size = 24, className = "" }) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={{
      fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
      fontSize: size,
      lineHeight: 1,
    }}
  >
    {name}
  </span>
);

export function ChatbotFAB({ onClick, urgentCount = 2 }) {
  const [showBubble, setShowBubble] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setShowBubble(true), 1400);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{`
        @keyframes fabPulse {
          0%,100% { box-shadow:0 8px 24px -4px rgba(0,101,75,0.45) }
          50% { box-shadow:0 8px 24px -4px rgba(0,101,75,0.45),0 0 0 10px rgba(0,101,75,0.08) }
        }
        @keyframes bubbleIn {
          from { opacity:0; transform:translateY(10px) scale(0.92) }
          to { opacity:1; transform:translateY(0) scale(1) }
        }
        @keyframes badgePop {
          from { transform:scale(0) }
          70% { transform:scale(1.15) }
          to { transform:scale(1) }
        }
      `}</style>

      <div className="fixed bottom-24 right-5 z-50 flex flex-col items-end gap-2">
        {showBubble && !dismissed && (
          <div
            onClick={onClick}
            className="cursor-pointer"
            style={{
              maxWidth: 235,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "18px 18px 6px 18px",
              padding: "12px 14px 12px 12px",
              boxShadow: "0 10px 30px rgba(15,23,42,0.12)",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              animation: "bubbleIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards",
              position: "relative",
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDismissed(true);
              }}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center"
            >
              <Icon name="close" size={12} className="text-white" />
            </button>

            <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 shrink-0">
              <img src={esewaLogo} alt="eSewa" className="w-full h-full object-cover" />
            </div>

            <div>
              <p className="text-[11px] font-extrabold text-slate-900 mb-1">eSewa Assistant</p>
              <p className="text-[12px] text-slate-600 leading-relaxed">
                {urgentCount > 0
                  ? `⚠️ You have ${urgentCount} urgent bills. Tap to fix now.`
                  : "✅ All bills look good. Tap to check your summary."}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={onClick}
          className="relative w-14 h-14 rounded-full active:scale-95 transition-all flex items-center justify-center overflow-hidden"
          style={{
            background: "linear-gradient(135deg,#00654b,#008a60)",
            boxShadow: "0 8px 24px -4px rgba(0,101,75,0.5)",
            animation: "fabPulse 2.5s ease-in-out infinite",
            border: "3px solid #fff",
          }}
        >
          {urgentCount > 0 && (
            <span
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white"
              style={{ animation: "badgePop 0.35s cubic-bezier(0.34,1.56,0.64,1) both" }}
            >
              {urgentCount}
            </span>
          )}

          <img src={esewaLogo} alt="eSewa" className="w-full h-full object-cover" />
        </button>
      </div>
    </>
  );
}