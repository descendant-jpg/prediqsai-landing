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
      <Link href="/" style={{ color: MUTED, fontSize: 14 }}
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

export default function Terms() {
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
            Terms of Service
          </h1>
          <p style={{ color: MUTED, fontSize: 14, marginBottom: 40 }}>
            Last updated: May 22, 2026
          </p>

          <Section title="1. Acceptance of Terms">
            <p>
              By downloading, installing, or using the PrediQs AI mobile application or website
              (collectively, the "Service"), you agree to be bound by these Terms of Service ("Terms").
              If you do not agree to these Terms, do not use the Service.
            </p>
            <p style={{ marginTop: 12 }}>
              You must be at least <strong style={{ color: TEXT }}>18 years of age</strong> to use this Service.
              By using the Service, you represent and warrant that you are 18 or older and that the laws
              of your jurisdiction permit you to access sports betting-related information.
            </p>
          </Section>

          <Section title="2. Description of Service">
            <p>
              PrediQs AI provides AI-powered sports analytics, predictions, odds comparison, and
              bankroll management tools for informational and entertainment purposes. We use the
              Anthropic Claude AI model to generate predictions and analysis based on publicly available
              sports data.
            </p>
            <p style={{ marginTop: 12, fontWeight: 600, color: TEXT }}>
              IMPORTANT DISCLAIMER: PrediQs AI is NOT a gambling operator, bookmaker, or betting exchange.
              We do not accept wagers or process gambling transactions. All predictions and analysis are
              provided for informational purposes only and do not constitute gambling advice or guarantees
              of outcome.
            </p>
            <p style={{ marginTop: 12 }}>
              <strong style={{ color: TEXT }}>Platform Independence:</strong> Google LLC, Google Play,
              and Apple Inc. are not sponsors of, nor are they involved in any way with, the Service,
              any predictions, bankroll tracking, or any promotional activities provided within the
              application.
            </p>
          </Section>

          <Section title="3. User Accounts">
            <p style={{ marginBottom: 12 }}>When you create an account, you agree to:</p>
            <ul style={{ paddingLeft: 20, listStyle: "disc", display: "flex", flexDirection: "column", gap: 8 }}>
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your password and account</li>
              <li>Notify us immediately of any unauthorised use of your account</li>
              <li>Take responsibility for all activities under your account</li>
              <li>Not share your account credentials with others</li>
            </ul>
            <p style={{ marginTop: 12 }}>
              <strong style={{ color: TEXT }}>Account Deletion:</strong> You have the right to terminate
              your account at any time. To request the complete deletion of your account and all
              associated personal data from our systems, please contact our support team at{" "}
              <a href="mailto:support@prediqsai.com" style={{ color: CYAN }}>
                <strong>support@prediqsai.com</strong>
              </a>.
            </p>
          </Section>

          <Section title="4. Subscription and Payments">
            <p style={{ marginBottom: 12 }}>PrediQs AI offers the following subscription tiers:</p>
            <ul style={{ paddingLeft: 20, listStyle: "disc", display: "flex", flexDirection: "column", gap: 8 }}>
              <li><strong style={{ color: TEXT }}>Free:</strong> Limited access with 5 AI predictions per day at no cost.</li>
              <li><strong style={{ color: TEXT }}>Premium Monthly:</strong> $29.99/month, full access to all features.</li>
              <li><strong style={{ color: TEXT }}>Premium Annual:</strong> $319/year (billed annually), full access to all features.</li>
              <li><strong style={{ color: TEXT }}>Lifetime:</strong> $299 one-time payment, permanent full access.</li>
            </ul>
            <p style={{ marginTop: 12 }}>
              Subscriptions auto-renew unless cancelled at least 24 hours before the renewal date.
              You may cancel at any time through your device's subscription management settings.
              Refunds are subject to the applicable app store's refund policy.
            </p>
          </Section>

          <Section title="5. Responsible Gambling">
            <div style={{
              background: "#FF6B0020",
              border: "1px solid #FF6B0040",
              borderRadius: 10,
              padding: "16px 20px",
              marginBottom: 16,
            }}>
              <p style={{ color: "#FF9944", fontWeight: 700, marginBottom: 8 }}>⚠️ Responsible Gambling Warning</p>
              <p>
                Gambling can be addictive and cause financial and personal harm. PrediQs AI strongly
                encourages responsible gambling. Never bet more than you can afford to lose. If you
                believe you may have a gambling problem, seek help immediately.
              </p>
              <p style={{ marginTop: 8 }}>
                <strong style={{ color: TEXT }}>National Problem Gambling Helpline:</strong>{" "}
                <a href="tel:18005224700" style={{ color: CYAN }}>1-800-522-4700</a>{" "}
                (available 24/7)
              </p>
              <p style={{ marginTop: 4 }}>
                <a href="https://www.ncpgambling.org" target="_blank" rel="noopener noreferrer" style={{ color: CYAN }}>www.ncpgambling.org</a>
              </p>
            </div>
          </Section>

          <Section title="6. Intellectual Property">
            <p>
              The Service and its original content, features, and functionality are owned by PrediQs AI
              and are protected by international copyright, trademark, and other intellectual property laws.
              You may not reproduce, distribute, modify, create derivative works of, publicly display,
              or exploit any of the content without our express written permission.
            </p>
          </Section>

          <Section title="7. Prohibited Uses">
            <p style={{ marginBottom: 12 }}>You agree not to:</p>
            <ul style={{ paddingLeft: 20, listStyle: "disc", display: "flex", flexDirection: "column", gap: 8 }}>
              <li>Use the Service in any jurisdiction where sports betting analysis is prohibited by law</li>
              <li>Reverse-engineer, decompile, or disassemble any part of the Service</li>
              <li>Use automated tools to scrape, crawl, or extract data from the Service</li>
              <li>Resell or redistribute AI predictions or proprietary data to third parties</li>
              <li>Attempt to gain unauthorised access to our systems or networks</li>
              <li>Use the Service for any illegal or unauthorised purpose</li>
              <li>Harass, abuse, or harm other users</li>
            </ul>
          </Section>

          <Section title="8. Disclaimer of Warranties">
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
              EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, WE DISCLAIM
              ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
              PURPOSE, AND NON-INFRINGEMENT.
            </p>
            <p style={{ marginTop: 12 }}>
              WE DO NOT WARRANT THAT AI PREDICTIONS ARE ACCURATE, RELIABLE, OR WILL RESULT IN PROFITABLE
              OUTCOMES. SPORTS OUTCOMES ARE INHERENTLY UNCERTAIN AND PAST PERFORMANCE IS NOT INDICATIVE
              OF FUTURE RESULTS.
            </p>
          </Section>

          <Section title="9. Limitation of Liability">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, PREDIQSAI SHALL NOT BE LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF
              PROFITS, LOSS OF FUNDS WAGERED, OR ANY OTHER LOSSES ARISING FROM YOUR USE OF THE SERVICE,
              EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
          </Section>

          <Section title="10. Governing Law">
            <p>
              These Terms shall be governed by and construed in accordance with applicable law.
              Any disputes arising under these Terms shall be subject to binding arbitration.
            </p>
          </Section>

          <Section title="11. Changes to Terms">
            <p>
              We reserve the right to modify these Terms at any time. We will notify you of material
              changes by updating the "Last updated" date and providing notice through the Service.
              Continued use of the Service after changes constitutes acceptance of the revised Terms.
            </p>
          </Section>

          <Section title="12. Contact">
            <p>
              For questions about these Terms, contact us at{" "}
              <a href="mailto:support@prediqsai.com" style={{ color: CYAN }}>support@prediqsai.com</a>.
            </p>
          </Section>
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
