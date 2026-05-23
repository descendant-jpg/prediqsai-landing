import { useState, useEffect } from "react";

const GOLD    = "#F5A623";
const BG_CARD = "#141414";
const TEXT    = "#ffffff";
const MUTED   = "#999999";

export const LANGUAGES = [
  { code: "en", native: "English",    english: "English"    },
  { code: "es", native: "Español",    english: "Spanish"    },
  { code: "ar", native: "العربية",   english: "Arabic"     },
  { code: "fr", native: "Français",   english: "French"     },
  { code: "de", native: "Deutsch",    english: "German"     },
  { code: "pt", native: "Português",  english: "Portuguese" },
  { code: "zh", native: "中文",       english: "Chinese"    },
  { code: "hi", native: "हिन्दी",    english: "Hindi"      },
  { code: "ja", native: "日本語",     english: "Japanese"   },
  { code: "ko", native: "한국어",     english: "Korean"     },
  { code: "tr", native: "Türkçe",     english: "Turkish"    },
  { code: "ru", native: "Русский",    english: "Russian"    },
  { code: "it", native: "Italiano",   english: "Italian"    },
];

interface Props {
  current: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}

export default function LanguageSelector({ current, onSelect, onClose }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 20);
    return () => clearTimeout(t);
  }, []);

  const close = () => {
    setOpen(false);
    setTimeout(onClose, 300);
  };

  const select = (code: string) => {
    localStorage.setItem("prediqs_language", code);
    onSelect(code);
    setOpen(false);
    setTimeout(onClose, 300);
  };

  return (
    <>
      <style>{`
        @keyframes pq-lang-sheet-in  { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes pq-lang-sheet-out { from { transform: translateY(0);    } to { transform: translateY(100%); } }
        .pq-lang-in  { animation: pq-lang-sheet-in  0.36s cubic-bezier(0.175,0.885,0.32,1.15) forwards; }
        .pq-lang-out { animation: pq-lang-sheet-out 0.28s ease forwards; }
        .pq-lang-item:hover { background: rgba(255,255,255,0.04) !important; }
        .pq-lang-scroll::-webkit-scrollbar { width: 3px; }
        .pq-lang-scroll::-webkit-scrollbar-track { background: transparent; }
        .pq-lang-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
      `}</style>

      <div
        onClick={close}
        style={{
          position: "fixed", inset: 0, zIndex: 9200,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(6px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          fontFamily: "'DM Sans', sans-serif",
          animation: "pq-overlay-in 0.22s ease forwards",
        }}
      >
        <div
          className={open ? "pq-lang-in" : "pq-lang-out"}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: BG_CARD,
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px 20px 0 0",
            width: "100%", maxWidth: 480,
            maxHeight: "72vh",
            display: "flex", flexDirection: "column",
            boxShadow: "0 -16px 60px rgba(0,0,0,0.6)",
            overflow: "hidden",
          }}
        >
          <div style={{
            padding: "18px 20px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <span style={{ color: TEXT, fontSize: 17, fontWeight: 700 }}>Language</span>
            <button
              onClick={close}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
                border: "none", cursor: "pointer",
                color: MUTED, fontSize: 16, lineHeight: 1,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>

          <div className="pq-lang-scroll" style={{ overflowY: "auto", flex: 1 }}>
            {LANGUAGES.map((lang) => {
              const isActive = lang.code === current;
              return (
                <div
                  key={lang.code}
                  className="pq-lang-item"
                  onClick={() => select(lang.code)}
                  style={{
                    padding: "14px 20px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    cursor: "pointer",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: isActive ? "rgba(245,166,35,0.06)" : "transparent",
                    transition: "background 0.15s ease",
                  }}
                >
                  <div>
                    <div style={{
                      color: isActive ? GOLD : TEXT,
                      fontSize: 17, fontWeight: 700, lineHeight: 1.25,
                    }}>
                      {lang.native}
                    </div>
                    <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>
                      {lang.english}
                    </div>
                  </div>
                  {isActive && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              );
            })}
            <div style={{ height: 12 }} />
          </div>
        </div>
      </div>
    </>
  );
}
