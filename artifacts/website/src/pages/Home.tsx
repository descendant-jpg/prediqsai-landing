import { useState, useEffect } from "react";
import { Link } from "wouter";

const BG = "#070B12";
const CARD = "#0C1422";
const BORDER = "#131E2E";
const CYAN = "#00E5FF";
const GOLD = "#FFD700";
const TEXT = "#E0EAF5";
const MUTED = "#7A93B0";

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: "0 24px",
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: scrolled ? "rgba(7,11,18,0.95)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? `1px solid ${BORDER}` : "none",
        transition: "all 0.3s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: CYAN, letterSpacing: "-0.5px" }}>
          PrediQs
        </span>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          background: `linear-gradient(90deg, ${GOLD}, #FFA500)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          padding: "2px 6px",
          border: `1px solid ${GOLD}40`,
          borderRadius: 4,
        }}>AI</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <a href="#features" style={{ color: MUTED, fontSize: 14, transition: "color 0.2s" }}
          onMouseOver={e => (e.currentTarget.style.color = TEXT)}
          onMouseOut={e => (e.currentTarget.style.color = MUTED)}>Features</a>
        <a href="#pricing" style={{ color: MUTED, fontSize: 14, transition: "color 0.2s" }}
          onMouseOver={e => (e.currentTarget.style.color = TEXT)}
          onMouseOut={e => (e.currentTarget.style.color = MUTED)}>Pricing</a>
        <a
          href="#download"
          style={{
            background: `linear-gradient(135deg, ${CYAN}, #0088AA)`,
            color: BG,
            fontWeight: 700,
            fontSize: 14,
            padding: "8px 20px",
            borderRadius: 8,
            transition: "opacity 0.2s",
          }}
          onMouseOver={e => (e.currentTarget.style.opacity = "0.85")}
          onMouseOut={e => (e.currentTarget.style.opacity = "1")}
        >Get App</a>
      </div>
    </nav>
  );
}

function Countdown() {
  const worldCup = new Date("2026-06-11T00:00:00Z");
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const diff = Math.max(0, worldCup.getTime() - now.getTime());
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const units = [
    { label: "Days", value: timeLeft.days },
    { label: "Hours", value: timeLeft.hours },
    { label: "Minutes", value: timeLeft.minutes },
    { label: "Seconds", value: timeLeft.seconds },
  ];

  return (
    <div style={{
      display: "inline-flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 8,
      marginTop: 32,
    }}>
      <p style={{ color: GOLD, fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        ⚽ FIFA World Cup 2026 Countdown
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        {units.map(({ label, value }) => (
          <div key={label} style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            padding: "12px 16px",
            minWidth: 64,
          }}>
            <span style={{
              fontSize: 28,
              fontWeight: 800,
              color: CYAN,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}>
              {String(value).padStart(2, "0")}
            </span>
            <span style={{ fontSize: 11, color: MUTED, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const AI_LABELS = ["GPT-4", "Claude", "Gemini", "Grok", "PrediQs AI"];

function PoweredByBadge() {
  const [idx, setIdx] = useState(0);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setOpacity(0);
      setTimeout(() => {
        setIdx((i) => (i + 1) % AI_LABELS.length);
        setOpacity(1);
      }, 350);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      background: `${CARD}cc`, border: `1px solid ${CYAN}30`,
      borderRadius: 999, padding: "6px 16px", marginBottom: 24,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: CYAN, display: "inline-block", boxShadow: `0 0 8px ${CYAN}` }} />
      <span style={{ color: CYAN, fontSize: 13, fontWeight: 600 }}>
        Powered by{" "}
        <span style={{ transition: "opacity 0.35s ease", opacity, display: "inline-block", minWidth: 80 }}>
          {AI_LABELS[idx]}
        </span>
      </span>
    </div>
  );
}

function Hero() {
  return (
    <section
      id="hero"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "100px 24px 60px",
        background: `radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,229,255,0.07) 0%, transparent 70%), ${BG}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{
        position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)",
        width: 600, height: 600, borderRadius: "50%",
        background: `radial-gradient(circle, rgba(0,229,255,0.05) 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      <PoweredByBadge />

      <h1 style={{
        fontSize: "clamp(36px, 6vw, 72px)",
        fontWeight: 900,
        lineHeight: 1.1,
        letterSpacing: "-0.03em",
        maxWidth: 760,
        marginBottom: 20,
      }}>
        <span style={{ color: TEXT }}>Bet Smarter With</span>
        <br />
        <span style={{
          background: `linear-gradient(135deg, ${CYAN} 0%, #0088CC 50%, ${GOLD} 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>AI-Powered Predictions</span>
      </h1>

      <p style={{
        fontSize: "clamp(16px, 2vw, 20px)",
        color: MUTED,
        maxWidth: 560,
        lineHeight: 1.7,
        marginBottom: 16,
      }}>
        Real-time sports analytics, multi-model AI match previews, bankroll management,
        and value bet detection — all in one intelligent mobile app.
      </p>

      <Countdown />

      <div id="download" style={{ display: "flex", gap: 16, marginTop: 36, flexWrap: "wrap", justifyContent: "center" }}>
        <a
          href="https://apps.apple.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", gap: 12,
            background: TEXT, color: BG,
            borderRadius: 12, padding: "14px 28px",
            fontWeight: 700, fontSize: 15,
            transition: "transform 0.2s, box-shadow 0.2s",
            boxShadow: `0 4px 24px rgba(224,234,245,0.1)`,
          }}
          onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 32px rgba(224,234,245,0.15)`; }}
          onMouseOut={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `0 4px 24px rgba(224,234,245,0.1)`; }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
          App Store
        </a>
        <a
          href="https://play.google.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", gap: 12,
            background: `linear-gradient(135deg, ${CYAN}, #0088AA)`,
            color: BG,
            borderRadius: 12, padding: "14px 28px",
            fontWeight: 700, fontSize: 15,
            transition: "transform 0.2s, box-shadow 0.2s",
            boxShadow: `0 4px 24px ${CYAN}30`,
          }}
          onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 32px ${CYAN}40`; }}
          onMouseOut={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `0 4px 24px ${CYAN}30`; }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.18 23.76c.3.17.64.24.99.18l.07-.04 11.14-11.14-2.96-2.96L3.18 23.76zM20.06 10.3l-2.86-1.65-3.26 3.26 3.26 3.26 2.87-1.66c.82-.47.82-1.74-.01-2.21zM2.07 1.09C2.03 1.23 2 1.38 2 1.55v20.9c0 .17.03.33.07.47l.07.06 11.72-11.72v-.14L2.07 1.09zM12.23 13.55l-9.05 9.05c.3.17.64.24.99.18l.07-.04 11.14-11.14-2.96-2.96-.19.19v4.72z"/>
          </svg>
          Google Play
        </a>
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginTop: 28,
        color: MUTED, fontSize: 13,
      }}>
        <span style={{ color: GOLD }}>★★★★★</span>
        <span>Trusted by early adopters · Free to start</span>
      </div>
    </section>
  );
}

const features = [
  {
    icon: "🤖",
    title: "AI Predictions",
    desc: "Our multi-model AI engine combines GPT-4, Gemini, and proprietary models to analyze live ESPN data every 6 hours, generating high-confidence picks across NFL, NBA, MLB, and Soccer.",
    color: CYAN,
  },
  {
    icon: "⚡",
    title: "Oracle AI Preview",
    desc: "Deep match previews powered by an ensemble of AI models — team form, head-to-head stats, injury reports, and expected goals analysis.",
    color: GOLD,
  },
  {
    icon: "🎯",
    title: "Value Bet Scanner",
    desc: "Compare odds across 6 bookmakers in real time. Our algorithm flags positive-EV opportunities before lines move.",
    color: "#A855F7",
  },
  {
    icon: "💰",
    title: "Bankroll Manager",
    desc: "Kelly Criterion calculator, daily loss limits, and a full transaction history to keep your betting disciplined.",
    color: "#22C55E",
  },
  {
    icon: "⚽",
    title: "World Cup 2026",
    desc: "Dedicated coverage for the FIFA World Cup 2026 with AI-powered group stage, knockout, and final predictions.",
    color: "#F97316",
  },
  {
    icon: "📊",
    title: "Performance Tracker",
    desc: "Win rate, ROI by sport, and confidence accuracy breakdowns. Know exactly which predictions are making you money.",
    color: "#EC4899",
  },
  {
    icon: "🔄",
    title: "Arbitrage Scanner",
    desc: "Automatically detects arbitrage opportunities across 10+ bookmakers in real time. Lock in guaranteed profit regardless of match outcome.",
    color: "#00E5FF",
  },
];

function Features() {
  return (
    <section id="features" style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <p style={{ color: CYAN, fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
          Everything You Need
        </p>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, color: TEXT, letterSpacing: "-0.02em" }}>
          Built for Serious Bettors
        </h2>
        <p style={{ color: MUTED, fontSize: 16, marginTop: 12, maxWidth: 480, margin: "12px auto 0" }}>
          From casual picks to systematic bankroll management — PrediQs AI covers every angle.
        </p>
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: 20,
      }}>
        {features.map(f => (
          <div
            key={f.title}
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
              padding: 28,
              transition: "transform 0.2s, border-color 0.2s, box-shadow 0.2s",
              cursor: "default",
            }}
            onMouseOver={e => {
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
              (e.currentTarget as HTMLDivElement).style.borderColor = f.color + "60";
              (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 40px ${f.color}15`;
            }}
            onMouseOut={e => {
              (e.currentTarget as HTMLDivElement).style.transform = "none";
              (e.currentTarget as HTMLDivElement).style.borderColor = BORDER;
              (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: f.color + "18",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, marginBottom: 16,
            }}>
              {f.icon}
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: TEXT, marginBottom: 8 }}>{f.title}</h3>
            <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SocialProof() {
  const testimonials = [
    { name: "Alex M.", role: "NFL bettor", text: "The AI picks are genuinely good. Hit 7 of my last 10 NFL plays using PrediQs.", stars: 5 },
    { name: "Jordan K.", role: "Soccer fan", text: "Oracle AI previews are insane — feels like having a data analyst in your pocket.", stars: 5 },
    { name: "Sam T.", role: "Daily bettor", text: "Bankroll manager finally got me to stop chasing losses. Down to using Kelly sizing now.", stars: 5 },
  ];

  return (
    <section style={{ padding: "60px 24px", background: `linear-gradient(180deg, transparent, ${CARD}50, transparent)` }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 12 }}>
            {"★★★★★".split("").map((s, i) => (
              <span key={i} style={{ color: GOLD, fontSize: 20 }}>{s}</span>
            ))}
          </div>
          <p style={{ color: TEXT, fontSize: 18, fontWeight: 600 }}>
            Loved by early users
          </p>
          <p style={{ color: MUTED, fontSize: 14, marginTop: 4 }}>Join the growing community of smarter bettors</p>
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
        }}>
          {testimonials.map(t => (
            <div key={t.name} style={{
              background: CARD, border: `1px solid ${BORDER}`,
              borderRadius: 14, padding: 24,
            }}>
              <div style={{ display: "flex", gap: 2, marginBottom: 12 }}>
                {Array(t.stars).fill(0).map((_, i) => (
                  <span key={i} style={{ color: GOLD, fontSize: 14 }}>★</span>
                ))}
              </div>
              <p style={{ color: TEXT, fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>"{t.text}"</p>
              <div>
                <p style={{ color: CYAN, fontWeight: 600, fontSize: 14 }}>{t.name}</p>
                <p style={{ color: MUTED, fontSize: 12 }}>{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      color: MUTED,
      features: [
        "5 AI predictions per day",
        "Basic bankroll tracker",
        "Dashboard overview",
        "Community picks feed",
      ],
      cta: "Download Free",
      highlight: false,
    },
    {
      name: "Premium",
      price: "$39.99",
      period: "per month",
      annualNote: "$455/yr (save 5%)",
      color: CYAN,
      features: [
        "Unlimited AI predictions",
        "Multi-Model AI match previews",
        "6-bookmaker odds comparison",
        "Full bankroll management",
        "Kelly Criterion calculator",
        "Win rate & ROI analytics",
        "World Cup 2026 coverage",
        "Priority Multi-Model AI assistant access",
        "Arbitrage Scanner (10+ bookmakers)",
        "Live in-play betting alerts",
        "Early line movement detection",
        "Multi-sport parlay optimizer",
        "Dedicated Multi-Model AI betting assistant (24/7)",
        "Exclusive World Cup 2026 prop bets",
        "Export reports to PDF/CSV",
        "VIP Discord community access",
      ],
      cta: "Start Premium",
      highlight: true,
    },
  ];

  return (
    <section id="pricing" style={{ padding: "80px 24px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <p style={{ color: CYAN, fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
          Simple Pricing
        </p>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, color: TEXT, letterSpacing: "-0.02em" }}>
          Start Free. Go Premium When Ready.
        </h2>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: 24,
        alignItems: "start",
      }}>
        {plans.map(p => (
          <div
            key={p.name}
            style={{
              background: p.highlight ? `linear-gradient(145deg, #0D1B2A, ${CARD})` : CARD,
              border: `2px solid ${p.highlight ? CYAN : BORDER}`,
              borderRadius: 20,
              padding: 32,
              position: "relative",
              boxShadow: p.highlight ? `0 0 60px ${CYAN}15` : "none",
            }}
          >
            {p.highlight && (
              <div style={{
                position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                background: `linear-gradient(90deg, ${CYAN}, #0088AA)`,
                color: BG, fontWeight: 700, fontSize: 12,
                padding: "4px 16px", borderRadius: 999,
                letterSpacing: "0.05em", textTransform: "uppercase",
              }}>
                Most Popular
              </div>
            )}
            <h3 style={{ fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 8 }}>{p.name}</h3>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 42, fontWeight: 900, color: p.color, letterSpacing: "-0.02em" }}>{p.price}</span>
              <span style={{ color: MUTED, fontSize: 15 }}>/ {p.period}</span>
            </div>
            {p.annualNote && (
              <p style={{ color: GOLD, fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{p.annualNote}</p>
            )}
            {!p.annualNote && <div style={{ marginBottom: 24 }} />}

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
              {p.features.map(f => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ color: p.highlight ? CYAN : MUTED, fontSize: 16, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ color: p.highlight ? TEXT : MUTED, fontSize: 14, lineHeight: 1.5 }}>{f}</span>
                </div>
              ))}
            </div>

            <a
              href="#download"
              style={{
                display: "block", textAlign: "center",
                background: p.highlight ? `linear-gradient(135deg, ${CYAN}, #0088AA)` : `${BORDER}`,
                color: p.highlight ? BG : TEXT,
                fontWeight: 700, fontSize: 15,
                padding: "14px 28px", borderRadius: 12,
                transition: "opacity 0.2s",
                border: p.highlight ? "none" : `1px solid ${MUTED}40`,
              }}
              onMouseOver={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseOut={e => (e.currentTarget.style.opacity = "1")}
            >
              {p.cta}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{
      borderTop: `1px solid ${BORDER}`,
      padding: "40px 24px 32px",
      textAlign: "center",
    }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: CYAN }}>PrediQs</span>
          <span style={{
            fontSize: 11, fontWeight: 700,
            background: `linear-gradient(90deg, ${GOLD}, #FFA500)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            border: `1px solid ${GOLD}40`, borderRadius: 4, padding: "2px 6px",
          }}>AI</span>
        </div>

        <div style={{
          display: "flex", justifyContent: "center", flexWrap: "wrap",
          gap: "8px 24px", marginBottom: 20,
        }}>
          {[
            { label: "Privacy Policy", href: "/privacy" },
            { label: "Terms of Service", href: "/terms" },
            { label: "Support", href: "/support" },
          ].map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              style={{ color: MUTED, fontSize: 14, transition: "color 0.2s" }}
              onMouseOver={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = CYAN)}
              onMouseOut={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = MUTED)}
            >
              {label}
            </Link>
          ))}
          <a
            href="mailto:support@prediqsai.com"
            style={{ color: MUTED, fontSize: 14, transition: "color 0.2s" }}
            onMouseOver={e => (e.currentTarget.style.color = CYAN)}
            onMouseOut={e => (e.currentTarget.style.color = MUTED)}
          >
            support@prediqsai.com
          </a>
        </div>

        <p style={{ color: MUTED, fontSize: 12, lineHeight: 1.6, maxWidth: 560, margin: "0 auto 16px" }}>
          <strong style={{ color: TEXT }}>18+ only.</strong> Gambling can be addictive. Please bet responsibly. PrediQs AI provides
          information and analysis for entertainment purposes only and does not guarantee betting outcomes.
          If you have a gambling problem, call the National Problem Gambling Helpline at 1-800-522-4700.
        </p>

        <p style={{ color: MUTED + "80", fontSize: 12 }}>
          © {new Date().getFullYear()} PrediQs AI. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div style={{ background: BG, minHeight: "100vh", color: TEXT }}>
      <Nav />
      <Hero />
      <Features />
      <SocialProof />
      <Pricing />
      <Footer />
    </div>
  );
}
