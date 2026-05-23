import { useState, useEffect } from "react";
import RatingPopup from "./RatingPopup";
import DisclaimerModal from "./DisclaimerModal";
import LanguageSelector, { LANGUAGES } from "./LanguageSelector";

const GOLD  = "#F5A623";
const MUTED = "#999999";
const TEXT  = "#ffffff";

function getLangCode(): string {
  return localStorage.getItem("prediqs_language") ?? "en";
}

function getLangNative(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.native ?? "English";
}

export default function AppModals() {
  const [step, setStep]           = useState<"rating" | "disclaimer" | "done">("done");
  const [langCode, setLangCode]   = useState<string>("en");
  const [showLang, setShowLang]   = useState(false);

  useEffect(() => {
    setLangCode(getLangCode());

    const disclaimerAccepted = localStorage.getItem("prediqs_disclaimer_accepted");
    const ratingDismissed    = localStorage.getItem("prediqs_rating_dismissed");

    if (!disclaimerAccepted) {
      setStep(ratingDismissed ? "disclaimer" : "rating");
    } else {
      setStep("done");
    }
  }, []);

  const handleRatingDismiss = () => {
    localStorage.setItem("prediqs_rating_dismissed", "1");
    setStep("disclaimer");
  };

  const handleDisclaimerAccept = () => {
    setStep("done");
  };

  return (
    <>
      <style>{`
        @keyframes pq-overlay-in { from { opacity: 0; } to { opacity: 1; } }
        .pq-lang-btn:hover { opacity: 0.85; transform: scale(1.02); }
        .pq-footer-glow {
          background: linear-gradient(180deg, transparent, rgba(0,0,0,0.6));
        }
      `}</style>

      {step === "rating" && <RatingPopup onDismiss={handleRatingDismiss} />}
      {step === "disclaimer" && <DisclaimerModal onAccept={handleDisclaimerAccept} />}

      {showLang && (
        <LanguageSelector
          current={langCode}
          onSelect={(code) => setLangCode(code)}
          onClose={() => setShowLang(false)}
        />
      )}

      <button
        className="pq-lang-btn"
        onClick={() => setShowLang(true)}
        title="Select language"
        style={{
          position: "fixed",
          top: 14,
          right: 16,
          zIndex: 8000,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 13px 7px 10px",
          background: "rgba(20,20,20,0.85)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 999,
          cursor: "pointer",
          backdropFilter: "blur(8px)",
          transition: "opacity 0.15s ease, transform 0.15s ease",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" stroke={GOLD} strokeWidth="1.6" />
          <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"
            stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span style={{ color: TEXT, fontSize: 13, fontWeight: 700, lineHeight: 1 }}>
          {getLangNative(langCode)}
        </span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <path d="M6 9l6 6 6-6" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <footer style={{
        position: "fixed",
        bottom: 0, left: 0, right: 0,
        zIndex: 7900,
        padding: "10px 0 14px",
        display: "flex", justifyContent: "center", gap: 28,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(6px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        fontFamily: "'DM Sans', sans-serif",
        pointerEvents: "none",
      }}>
        {[
          { icon: "🔒", label: "Encrypted" },
          { icon: "🛡️", label: "Secure"    },
          { icon: "🌐", label: "Global"    },
        ].map(({ icon, label }) => (
          <div
            key={label}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            }}
          >
            <span style={{ fontSize: 17 }}>{icon}</span>
            <span style={{ color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: "0.4px" }}>
              {label}
            </span>
          </div>
        ))}
      </footer>
    </>
  );
}
