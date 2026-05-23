import { useState, useEffect } from "react";

const GOLD = "#F5A623";
const TEAL = "#00C9A7";
const BG_CARD = "#141414";
const TEXT = "#ffffff";
const MUTED = "#999999";

interface Props {
  onDismiss: () => void;
}

export default function RatingPopup({ onDismiss }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 320);
  };

  const rate = () => {
    window.open("https://play.google.com/store", "_blank");
    dismiss();
  };

  return (
    <>
      <style>{`
        @keyframes pq-overlay-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes pq-card-in {
          from { opacity: 0; transform: translateY(48px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        @keyframes pq-card-out {
          from { opacity: 1; transform: translateY(0)   scale(1);    }
          to   { opacity: 0; transform: translateY(32px) scale(0.95); }
        }
        @keyframes pq-star-spin {
          0%   { transform: rotate(0deg) scale(1); }
          50%  { transform: rotate(8deg) scale(1.08); }
          100% { transform: rotate(0deg) scale(1); }
        }
        .pq-rating-overlay {
          animation: pq-overlay-in 0.25s ease forwards;
        }
        .pq-rating-card-in  { animation: pq-card-in  0.42s cubic-bezier(0.175,0.885,0.32,1.275) forwards; }
        .pq-rating-card-out { animation: pq-card-out 0.28s ease forwards; }
        .pq-btn-rate:hover  { transform: scale(1.02); }
        .pq-btn-later:hover { opacity: 0.7; }
      `}</style>

      <div
        className="pq-rating-overlay"
        style={{
          position: "fixed", inset: 0, zIndex: 9000,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 16px",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div
          className={visible ? "pq-rating-card-in" : "pq-rating-card-out"}
          style={{
            background: BG_CARD,
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 20,
            padding: "32px 28px",
            maxWidth: 380,
            width: "100%",
            textAlign: "center",
            boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
          }}
        >
          <div
            style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "rgba(245,166,35,0.12)",
              border: `2px solid ${GOLD}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
              animation: "pq-star-spin 2.5s ease-in-out infinite",
            }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                stroke={GOLD} strokeWidth="1.8" strokeLinejoin="round"
              />
            </svg>
          </div>

          <h2 style={{ color: TEXT, fontSize: 22, fontWeight: 800, margin: "0 0 10px", letterSpacing: "-0.3px" }}>
            Enjoying PrediQs AI?
          </h2>
          <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.6, margin: "0 0 28px" }}>
            If you love the app, take a moment to rate us!<br />
            Your feedback helps us grow and improve.
          </p>

          <button
            className="pq-btn-rate"
            onClick={rate}
            style={{
              width: "100%", padding: "14px 0",
              background: TEAL, color: "#fff",
              border: "none", borderRadius: 14,
              fontSize: 15, fontWeight: 700,
              cursor: "pointer", marginBottom: 14,
              boxShadow: `0 4px 20px rgba(0,201,167,0.35)`,
              transition: "transform 0.15s ease",
              fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <span>▶️</span> Rate on Play Store
          </button>

          <button
            className="pq-btn-later"
            onClick={dismiss}
            style={{
              background: "none", border: "none",
              color: MUTED, fontSize: 14, cursor: "pointer",
              fontFamily: "inherit", padding: "4px 0",
              transition: "opacity 0.15s ease",
            }}
          >
            Not Now
          </button>
        </div>
      </div>
    </>
  );
}
