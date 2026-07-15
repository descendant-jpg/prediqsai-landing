import { Link } from "wouter";

const BG = "#070B12";
const CARD = "#0C1422";
const BORDER = "#131E2E";
const CYAN = "#00E5FF";
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
      <Link href="/" style={{ color: MUTED, fontSize: 14, transition: "color 0.2s" }}
        onMouseOver={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = TEXT)}
        onMouseOut={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = MUTED)}>
        ← Back to Home
      </Link>
    </nav>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 12, paddingTop: 8 }}>{title}</h2>
      <div style={{ color: MUTED, fontSize: 15, lineHeight: 1.8 }}>{children}</div>
    </div>
  );
}

export default function Privacy() {
  return (
    <div style={{ background: BG, minHeight: "100vh", color: TEXT }}>
      <Header />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "60px 24px 80px" }}>
        <div style={{
          background: CARD, border: `1px solid ${BORDER}`,
          borderRadius: 20, padding: "48px 40px",
        }}>
          <p style={{ color: CYAN, fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
            Legal
          </p>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, color: TEXT, marginBottom: 8 }}>
            Privacy Policy
          </h1>
          <p style={{ color: MUTED, fontSize: 14, marginBottom: 40 }}>
            Last updated: May 22, 2026
          </p>

          <Section title="1. Introduction">
            <p>
              Welcome to PrediQs AI ("we," "our," or "us"). We are committed to protecting your personal
              information and your right to privacy. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your information when you use our mobile application and website
              (collectively, the "Service").
            </p>
            <p style={{ marginTop: 12 }}>
              <strong style={{ color: TEXT }}>
                Please note: PrediQs AI is a sports information, analytics, and tracking tool. We do
                not operate a sportsbook, and our Service does not accept real-money wagers,
                facilitate gambling transactions, or distribute prize money. All bankroll tracking is
                for personal informational purposes only.
              </strong>
            </p>
            <p style={{ marginTop: 12 }}>
              Please read this policy carefully. If you do not agree with the terms of this Privacy Policy,
              please discontinue use of our Service.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <p style={{ marginBottom: 12 }}>We collect information that you provide directly to us, including:</p>
            <ul style={{ paddingLeft: 20, listStyle: "disc", display: "flex", flexDirection: "column", gap: 8 }}>
              <li><strong style={{ color: TEXT }}>Account information:</strong> Email address, username, and password when you register.</li>
              <li><strong style={{ color: TEXT }}>Profile data:</strong> Bankroll settings, betting preferences, and notification preferences.</li>
              <li><strong style={{ color: TEXT }}>Transaction data:</strong> Bankroll entries, bet records, and financial tracking data you input.</li>
              <li><strong style={{ color: TEXT }}>Communications:</strong> Messages you send to our AI assistant or support team.</li>
              <li><strong style={{ color: TEXT }}>Device information:</strong> Device type, operating system, app version, and crash data. If you interact with advertisements within our Service, we may collect mobile advertising identifiers (such as Google Advertising ID) to provide relevant content.</li>
              <li><strong style={{ color: TEXT }}>Usage data:</strong> Features used, pages viewed, time spent, and interaction data.</li>
              <li><strong style={{ color: TEXT }}>Device Permissions:</strong> With your explicit consent, we may request access to your device's push notification system or other native features to provide alerts and predictions. You can revoke this access at any time through your device settings.</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <p style={{ marginBottom: 12 }}>We use the information we collect to:</p>
            <ul style={{ paddingLeft: 20, listStyle: "disc", display: "flex", flexDirection: "column", gap: 8 }}>
              <li>Provide, operate, and improve our Service</li>
              <li>Personalize your experience and deliver AI-powered predictions</li>
              <li>Process payments and manage your subscription</li>
              <li>Send transactional and promotional communications (with your consent)</li>
              <li>Monitor and analyse usage patterns to improve features</li>
              <li>Detect and prevent fraud, abuse, and security incidents</li>
              <li>Comply with legal obligations</li>
            </ul>
          </Section>

          <Section title="4. AI & Data Processing">
            <p>
              Our AI features use the Anthropic Claude API to generate sports predictions and chat responses.
              When you interact with our AI assistant, your messages are processed by Anthropic's API.
              We do not share personally identifiable information with Anthropic beyond what is necessary
              to provide the service. Conversation data may be retained to improve our AI models.
            </p>
          </Section>

          <Section title="5. Data Sharing">
            <p style={{ marginBottom: 12 }}>
              We do not sell your personal information. We may share your information with:
            </p>
            <ul style={{ paddingLeft: 20, listStyle: "disc", display: "flex", flexDirection: "column", gap: 8 }}>
              <li><strong style={{ color: TEXT }}>Service providers:</strong> Third-party vendors who help us deliver our Service (e.g., payment processors, hosting).</li>
              <li><strong style={{ color: TEXT }}>Analytics and Crash Reporting:</strong> Third-party services (such as Google Analytics or Firebase) to collect crash reports and usage metrics to improve app stability.</li>
              <li><strong style={{ color: TEXT }}>AI providers:</strong> Anthropic for AI chat and prediction features.</li>
              <li><strong style={{ color: TEXT }}>Legal authorities:</strong> When required by law, court order, or government regulation.</li>
              <li><strong style={{ color: TEXT }}>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets.</li>
            </ul>
          </Section>

          <Section title="6. Data Retention & Account Deletion">
            <p>
              We retain your personal information for as long as your account is active or as needed to
              provide services. Some data may be retained for legal compliance purposes for up to 7 years.
            </p>
            <p style={{ marginTop: 12 }}>
              <strong style={{ color: TEXT }}>Account and Data Deletion:</strong> You have the right to
              request the complete deletion of your account and all associated personal data. You can
              initiate this process directly within the app by navigating to your account settings to
              delete your profile, or by submitting a verifiable request to{" "}
              <a href="mailto:support@prediqsai.com" style={{ color: CYAN }}>support@prediqsai.com</a>.
              Upon request, we will securely erase your profile, bankroll data, and chat history, except
              where retention is strictly required for legal compliance.
            </p>
          </Section>

          <Section title="7. Security">
            <p>
              We implement industry-standard security measures including encryption in transit (TLS),
              bcrypt password hashing, JWT token-based authentication, and secure storage on your device.
              However, no method of transmission over the internet is 100% secure.
            </p>
          </Section>

          <Section title="8. Children's Privacy">
            <p>
              Our Service is not directed to individuals under the age of 18. We do not knowingly collect
              personal information from minors. If we become aware that a child under 18 has provided us
              with personal information, we will take steps to delete such information.
            </p>
          </Section>

          <Section title="9. Your Rights">
            <p style={{ marginBottom: 12 }}>Depending on your location, you may have the right to:</p>
            <ul style={{ paddingLeft: 20, listStyle: "disc", display: "flex", flexDirection: "column", gap: 8 }}>
              <li>Access and receive a copy of your personal data</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Request deletion of your personal data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Data portability (receive your data in a machine-readable format)</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p style={{ marginTop: 12 }}>
              To exercise these rights, contact us at <a href="mailto:support@prediqsai.com" style={{ color: CYAN }}>support@prediqsai.com</a>.
            </p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes
              by updating the "Last updated" date and, for significant changes, by sending a notification
              via the app or email.
            </p>
          </Section>

          <Section title="11. Contact Us">
            <p>
              If you have questions or concerns about this Privacy Policy, please contact us at:
            </p>
            <div style={{
              background: BG, border: `1px solid ${BORDER}`,
              borderRadius: 10, padding: "16px 20px", marginTop: 12,
            }}>
              <p style={{ color: TEXT, fontWeight: 600 }}>PrediQs AI</p>
              <p>Email: <a href="mailto:support@prediqsai.com" style={{ color: CYAN }}>support@prediqsai.com</a></p>
              <p>Website: <a href="https://prediqsai.com" style={{ color: CYAN }}>prediqsai.com</a></p>
            </div>
          </Section>
        </div>
      </main>

      <footer style={{
        borderTop: `1px solid ${BORDER}`,
        padding: "24px",
        textAlign: "center",
      }}>
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
