import { useState, useEffect } from "react";

const GOLD   = "#F5A623";
const TEAL   = "#00C9A7";
const RED    = "#E53935";
const BG_CARD = "#141414";
const TEXT   = "#ffffff";
const MUTED  = "#999999";
const ORANGE = "#F5A623";

const SECTIONS = [
  {
    title: "Educational Purpose Only",
    color: ORANGE,
    body: "PrediQs AI provides educational trading information and market analysis for informational purposes only. This is NOT financial advice, investment advice, or trading advice.",
  },
  {
    title: "High Risk Warning",
    color: RED,
    body: "Trading forex, CFDs, cryptocurrencies, and other financial instruments involves substantial risk of loss. You may lose some or all of your invested capital. Only trade with money you can afford to lose.",
  },
  {
    title: "Past Performance",
    color: ORANGE,
    body: "Past performance of any trading signal or strategy does not guarantee future results. Historical data is provided for educational purposes only.",
  },
  {
    title: "Your Responsibility",
    color: TEAL,
    body: "You are solely responsible for your trading decisions. We strongly recommend consulting a qualified financial advisor before trading. PrediQs AI and its operators are not liable for any trading losses.",
  },
];

const BULLETS = [
  "We are NOT a registered investment advisor",
  "We are NOT a licensed broker or financial institution",
  "Signals are for educational purposes only",
  "Always do your own research before trading",
  "Never risk more than you can afford to lose",
];

interface Props {
  onAccept: () => void;
}

export default function DisclaimerModal({ onAccept }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  const accept = () => {
    localStorage.setItem("prediqs_disclaimer_accepted", "1");
    setVisible(false);
    setTimeout(onAccept, 320);
  };

  return (
    <>
      <style>{`
        @keyframes pq-disc-in {
          from { opacity: 0; transform: translateY(52px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes pq-disc-out {
          from { opacity: 1; transform: translateY(0)    scale(1);    }
          to   { opacity: 0; transform: translateY(32px) scale(0.95); }
        }
        .pq-disc-in  { animation: pq-disc-in  0.44s cubic-bezier(0.175,0.885,0.32,1.275) forwards; }
        .pq-disc-out { animation: pq-disc-out 0.28s ease forwards; }
        .pq-disc-scroll::-webkit-scrollbar { width: 3px; }
        .pq-disc-scroll::-webkit-scrollbar-track { background: transparent; }
        .pq-disc-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
        .pq-disc-accept:hover { transform: scale(1.02); filter: brightness(1.08); }
      `}</style>

      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9100,
          background: "rgba(0,0,0,0.78)",
          backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 16px",
          fontFamily: "'DM Sans', sans-serif",
          animation: "pq-overlay-in 0.25s ease forwards",
        }}
      >
        <div
          className={visible ? "pq-disc-in" : "pq-disc-out"}
          style={{
            background: "linear-gradient(180deg, #1a1208 0%, #0d0d0d 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 20,
            maxWidth: 380,
            width: "100%",
            maxHeight: "88vh",
            display: "flex", flexDirection: "column",
            boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
            overflow: "hidden",
          }}
        >
          <div style={{
            padding: "20px 24px 16px",
            background: "rgba(0,0,0,0.3)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            flexShrink: 0,
            display: "flex", alignItems: "flex-start", gap: 14,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "rgba(245,166,35,0.12)",
              border: `1.5px solid ${ORANGE}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, marginTop: 2,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke={ORANGE} strokeWidth="1.8" strokeLinejoin="round" />
                <line x1="12" y1="9" x2="12" y2="13" stroke={ORANGE} strokeWidth="1.8" strokeLinecap="round" />
                <line x1="12" y1="17" x2="12.01" y2="17" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <p style={{ color: TEXT, fontSize: 15, fontWeight: 700, margin: 0, lineHeight: 1.45 }}>
              Educational only. Not financial advice.{" "}
              <span style={{ color: RED }}>Trading involves risk of loss.</span>
            </p>
          </div>

          <div
            className="pq-disc-scroll"
            style={{ overflowY: "auto", padding: "20px 24px", flex: 1 }}
          >
            {SECTIONS.map((s, i) => (
              <div key={i}>
                {i > 0 && (
                  <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "16px 0" }} />
                )}
                <h3 style={{ color: s.color, fontSize: 13, fontWeight: 700, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {s.title}
                </h3>
                <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.65, margin: 0 }}>
                  {s.body}
                </p>
              </div>
            ))}

            <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "20px 0 16px" }} />

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {BULLETS.map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: "rgba(245,166,35,0.15)",
                    border: `1.5px solid ${ORANGE}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, marginTop: 1,
                  }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                      <path d="M12 9v4M12 17h.01" stroke={ORANGE} strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span style={{ color: MUTED, fontSize: 13, lineHeight: 1.55 }}>{b}</span>
                </div>
              ))}
            </div>

            <div style={{ height: 24 }} />
          </div>

          <div style={{
            padding: "16px 24px 20px",
            background: "rgba(0,0,0,0.4)",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            flexShrink: 0,
          }}>
            <button
              className="pq-disc-accept"
              onClick={accept}
              style={{
                width: "100%", padding: "15px 0",
                background: GOLD, color: "#0d0d0d",
                border: "none", borderRadius: 14,
                fontSize: 15, fontWeight: 800,
                cursor: "pointer",
                boxShadow: `0 4px 24px rgba(245,166,35,0.4)`,
                transition: "transform 0.15s ease, filter 0.15s ease",
                fontFamily: "inherit",
              }}
            >
              I Understand and Accept
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
