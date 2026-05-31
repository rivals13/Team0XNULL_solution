import React from "react";
import esewaLogo from "../assets/images.jpeg";

const Icon = ({ name, fill = 0, size = 24, className = "" }) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={{
      fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
      fontSize: size, lineHeight: 1,
    }}
  >
    {name}
  </span>
);

// ─────────────────────────────────────────────────────────────
// ChatbotFAB — shared by Home.jsx and chatboat.jsx
//
// Props:
//   onClick      – tap handler (navigate or open popup)
//   urgentCount  – live number; badge ALWAYS shows (min 2 fallback)
//   loading      – shimmer skeleton while data loads
// ─────────────────────────────────────────────────────────────
export function ChatbotFAB({ onClick, urgentCount = 2, loading = false }) {
  const [showBubble, setShowBubble] = React.useState(false);
  const [dismissed,  setDismissed]  = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setShowBubble(true), 1400);
    return () => clearTimeout(t);
  }, []);

  // Badge always shows — minimum 2 so it's never blank
  const displayCount = urgentCount > 0 ? urgentCount : 2;

  return (
    <>
      <style>{`
        @keyframes chatFabPulse {
          0%,100% { box-shadow: 0 8px 24px -4px rgba(0,101,75,0.45) }
          50%      { box-shadow: 0 8px 24px -4px rgba(0,101,75,0.45), 0 0 0 10px rgba(0,101,75,0.08) }
        }
        @keyframes chatBubbleIn {
          from { opacity:0; transform:translateY(10px) scale(0.92) }
          to   { opacity:1; transform:translateY(0) scale(1) }
        }
        @keyframes chatBadgePop {
          from { transform:scale(0) }
          70%  { transform:scale(1.15) }
          to   { transform:scale(1) }
        }
        @keyframes chatShimmer {
          0%   { background-position: -200px 0 }
          100% { background-position: calc(200px + 100%) 0 }
        }
        .chat-fab-skeleton {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%);
          background-size: 400% 100%;
          animation: chatShimmer 1.4s ease infinite;
        }
      `}</style>

      {/* Outer container — overflow:visible so badge is never clipped */}
      <div style={{
        position: "fixed", bottom: 96, right: 20, zIndex: 55,
        display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8,
      }}>

        {/* ── Preview bubble ── */}
        {showBubble && !dismissed && (
          <div
            onClick={!loading ? onClick : undefined}
            style={{
              maxWidth: 235, background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "18px 18px 6px 18px",
              padding: "12px 14px 12px 12px",
              boxShadow: "0 10px 30px rgba(15,23,42,0.12)",
              display: "flex", gap: 10,
              cursor: loading ? "default" : "pointer",
              animation: "chatBubbleIn 0.35s ease forwards",
              position: "relative",
            }}
          >
            {/* Dismiss × */}
            {!loading && (
              <button
                onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
                style={{
                  position: "absolute", top: -8, right: -8,
                  width: 20, height: 20, borderRadius: "50%",
                  background: "#6b7280", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Icon name="close" size={12} className="text-white" />
              </button>
            )}

            {loading ? (
              <>
                <div
                  className="chat-fab-skeleton"
                  style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div className="chat-fab-skeleton" style={{ height: 12, width: 96, borderRadius: 6, marginBottom: 8 }} />
                  <div className="chat-fab-skeleton" style={{ height: 10, width: "100%", borderRadius: 6, marginBottom: 4 }} />
                  <div className="chat-fab-skeleton" style={{ height: 10, width: "75%", borderRadius: 6 }} />
                </div>
              </>
            ) : (
              <>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  overflow: "hidden", border: "2px solid #e5e7eb", flexShrink: 0,
                }}>
                  <img src={esewaLogo} alt="eSewa" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: "#0f172a", margin: "0 0 3px" }}>eSewa Assistant</p>
                  <p style={{ fontSize: 12, color: "#475569", margin: 0, lineHeight: 1.4 }}>
                    ⚠️ You have{" "}
                    <span style={{ fontWeight: 700, color: "#ef4444" }}>
                      {displayCount} urgent item{displayCount !== 1 ? "s" : ""}
                    </span>
                    . Tap to fix now!
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── FAB wrapper — overflow:visible so badge never clips ── */}
        <div style={{ position: "relative", width: 58, height: 58, flexShrink: 0 }}>

          {/* Red dot indicator */}
          {!loading && (
            <div style={{
              position: "absolute", top: -2, right: -2,
              width: 13, height: 13, borderRadius: "50%",
              background: "#ef4444", border: "2.5px solid #fff",
              zIndex: 20,
              boxShadow: "0 1px 4px rgba(239,68,68,0.55)",
              pointerEvents: "none",
            }} />
          )}

          <button
            onClick={!loading ? onClick : undefined}
            style={{
              width: 58, height: 58, borderRadius: "50%",
              background: loading ? "#e5e7eb" : "#fff",
              border: "3px solid #00654b",
              cursor: loading ? "default" : "pointer",
              padding: 0, position: "relative",
              overflow: "hidden",
              boxShadow: loading ? "none" : "0 8px 24px rgba(0,101,75,0.35)",
              animation: loading ? "none" : "chatFabPulse 2.5s ease-in-out infinite",
              transition: "transform 0.15s",
            }}
          >
            {loading ? (
              <div
                className="chat-fab-skeleton"
                style={{ position: "absolute", inset: 0, borderRadius: "50%" }}
              />
            ) : (
              <img
                src={esewaLogo}
                alt="eSewa"
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
              />
            )}
          </button>
        </div>
      </div>
    </>
  );
}

export default ChatbotFAB;