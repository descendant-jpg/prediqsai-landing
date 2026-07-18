import { useState } from "react";
import { Link } from "wouter";

const BG = "#070B12";
const CARD = "#0C1422";
const BORDER = "#131E2E";
const CYAN = "#00E5FF";
const GOLD = "#FFD700";
const TEXT = "#E0EAF5";
const MUTED = "#7A93B0";

function Header() {
  return (
    <nav style={{
      padding: "0 24px",
      height: 64,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottom: `1px solid ${BORDER}`,
      background: "rgba(7,11,18,0.95)",
      backdropFilter: "blur(12px)",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: CYAN }}>PrediQs</span>
        <span style={{
          fontSize: 11, fontWeight: 700,
          background: "linear-gradient(90deg, #FFD700, #FFA500)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          border: "1px solid rgba(255,215,0,0.3)",
          borderRadius: 4, padding: "2px 6px",
        }}>AI</span>
      </Link>
      <Link href="/" style={{ color: MUTED, fontSize: 14 }}
        onMouseOver={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = TEXT)}
        onMouseOut={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = MUTED)}>
        ← Back to Home
      </Link>
    </nav>
  );
}

const faqs = [
  {
    q: "How accurate are the AI predictions?",
    a: "Our AI analyses live ESPN data and uses Claude to generate predictions with confidence scores. Win rates vary by sport and market, but our models typically achieve 55–65% accuracy on high-confidence picks. Always use predictions as one data point among many — never as a guarantee.",
  },
  {
    q: "How often are predictions updated?",
    a: "Predictions are regenerated every 6 hours using live ESPN scoreboard and schedule data. For live matches, the Oracle AI preview provides real-time analysis. You'll see a 'last updated' timestamp on every prediction card.",
  },
  {
    q: "What sports does PrediQs AI cover?",
    a: "We currently cover NFL, NBA, MLB, and Soccer (including major European leagues and international competitions). World Cup 2026 coverage will be expanded significantly as the tournament approaches.",
  },
  {
    q: "What is the Kelly Criterion calculator?",
    a: "The Kelly Criterion is a mathematical formula that calculates the optimal bet size based on your edge and bankroll. Enter the bookmaker odds and your estimated win probability, and PrediQs AI will suggest the optimal fraction of your bankroll to wager.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "Subscriptions are managed through the App Store (iOS) or Google Play Store (Android). Go to your device's subscription settings, find PrediQs AI, and select Cancel. Cancellations take effect at the end of the current billing period.",
  },
  {
    q: "Is my financial data safe?",
    a: "Your bankroll data is stored securely on our servers with encryption in transit and at rest. We never store actual bank or payment details on our servers — payment processing is handled by Stripe, a PCI-DSS compliant processor.",
  },
  {
    q: "What is the difference between Free and Premium?",
    a: "Free gives you 5 AI predictions per day and basic bankroll tracking. Premium unlocks unlimited predictions, Oracle AI match previews, 6-bookmaker odds comparison, full bankroll management with Kelly Criterion, win rate analytics, and priority AI assistant access.",
  },
  {
    q: "How does the AI assistant work?",
    a: "The AI assistant is powered by Anthropic's Claude model. You can ask it anything related to sports betting — team form, value picks, bankroll strategy, rule explanations, or match analysis. The assistant has context of your betting history to give personalised advice.",
  },
  {
    q: "Can I delete my account?",
    a: "Yes. Go to Profile > Delete Account in the app. This will permanently remove all your data including predictions history, bankroll records, and chat conversations. This action cannot be undone. Alternatively, email support@prediqsai.com.",
  },
  {
    q: "I found a bug. How do I report it?",
    a: "Please email us at support@prediqsai.com with a description of the bug, your device model and OS version, and steps to reproduce it. Screenshots are very helpful. We aim to respond within 24–48 hours.",
  },
];

function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {faqs.map((item, i) => (
        <div
          key={i}
          style={{
            background: CARD,
            border: `1px solid ${openIndex === i ? CYAN + "40" : BORDER}`,
            borderRadius: 12,
            overflow: "hidden",
            transition: "border-color 0.2s",
          }}
        >
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "18px 22px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: TEXT,
              textAlign: "left",
              gap: 16,
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.5 }}>{item.q}</span>
            <span style={{
              color: openIndex === i ? CYAN : MUTED,
              fontSize: 20,
              fontWeight: 300,
              flexShrink: 0,
              transition: "transform 0.2s, color 0.2s",
              transform: openIndex === i ? "rotate(45deg)" : "none",
            }}>+</span>
          </button>
          {openIndex === i && (
            <div style={{
              padding: "0 22px 18px",
              color: MUTED,
              fontSize: 14,
              lineHeight: 1.7,
              borderTop: `1px solid ${BORDER}`,
              paddingTop: 16,
            }}>
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Support() {
  return (
    <div style={{ background: BG, minHeight: "100vh", color: TEXT }}>
      <Header />
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "60px 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <p style={{ color: CYAN, fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
            Help Centre
          </p>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, color: TEXT, marginBottom: 12 }}>
            How Can We Help?
          </h1>
          <p style={{ color: MUTED, fontSize: 16, maxWidth: 480, margin: "0 auto" }}>
            Find answers to common questions below, or reach out to us directly.
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 52,
        }}>
          {[
            { icon: "✉️", label: "Email Support", value: "support@prediqsai.com", href: "mailto:support@prediqsai.com", color: CYAN },
            { icon: "⚡", label: "Response Time", value: "Within 24–48 hours", href: null, color: GOLD },
            { icon: "🌐", label: "Website", value: "prediqsai.com", href: "https://prediqsai.com", color: "#A855F7" },
          ].map(item => (
            <div key={item.label} style={{
              background: CARD, border: `1px solid ${BORDER}`,
              borderRadius: 14, padding: "22px 20px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
              <p style={{ color: MUTED, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{item.label}</p>
              {item.href ? (
                <a href={item.href} style={{ color: item.color, fontWeight: 600, fontSize: 14 }}>{item.value}</a>
              ) : (
                <p style={{ color: TEXT, fontWeight: 600, fontSize: 14 }}>{item.value}</p>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 52 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: TEXT, marginBottom: 24 }}>
            Frequently Asked Questions
          </h2>
          <FAQ />
        </div>

        <div style={{ marginBottom: 52 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: TEXT, marginBottom: 24 }}>
            Account Deletion
          </h2>
          <div style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            padding: "22px",
          }}>
            <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.7 }}>
              To request the deletion of your account and all associated data, please send an email from your registered email address to{" "}
              <a href="mailto:support@prediqsai.com" style={{ color: CYAN, fontWeight: 600 }}>support@prediqsai.com</a>.
            </p>
          </div>
        </div>

        <div style={{
          background: `linear-gradient(135deg, ${CARD}, #0D1B2A)`,
          border: `1px solid ${CYAN}30`,
          borderRadius: 20,
          padding: "36px 32px",
          textAlign: "center",
          boxShadow: `0 0 40px ${CYAN}10`,
        }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT, marginBottom: 8 }}>
            Still have questions?
          </h2>
          <p style={{ color: MUTED, fontSize: 15, marginBottom: 24 }}>
            Our team is here to help. Send us an email and we'll get back to you within 24–48 hours.
          </p>
          <a
            href="mailto:support@prediqsai.com"
            style={{
              display: "inline-block",
              background: `linear-gradient(135deg, ${CYAN}, #0088AA)`,
              color: BG, fontWeight: 700, fontSize: 15,
              padding: "14px 32px", borderRadius: 12,
              transition: "opacity 0.2s",
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseOut={e => (e.currentTarget.style.opacity = "1")}
          >
            Contact Support
          </a>
          <div style={{
            marginTop: 28, padding: "20px", background: "#FF6B0015",
            border: "1px solid #FF6B0030", borderRadius: 10,
          }}>
            <p style={{ color: "#FF9944", fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
              ⚠️ Responsible Gambling Support
            </p>
            <p style={{ color: MUTED, fontSize: 13 }}>
              If gambling is causing problems in your life, please call the{" "}
              <a href="tel:18005224700" style={{ color: CYAN }}>National Problem Gambling Helpline: 1-800-522-4700</a>
              {" "}(24/7, free, confidential).
            </p>
          </div>
        </div>
      </main>

      <footer style={{ borderTop: `1px solid ${BORDER}`, padding: "24px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
          {[
            { label: "Home", href: "/" },
            { label: "Privacy Policy", href: "/privacy" },
            { label: "Terms of Service", href: "/terms" },
            { label: "Support", href: "/support" },
          ].map(({ label, href }) => (
            <Link key={label} href={href} style={{ color: MUTED, fontSize: 14 }}>{label}</Link>
          ))}
        </div>
        <p style={{ color: MUTED + "80", fontSize: 12, marginTop: 12 }}>
          © {new Date().getFullYear()} PrediQs AI. All rights reserved. 18+ only. Bet responsibly.
        </p>
      </footer>
    </div>
  );
}
