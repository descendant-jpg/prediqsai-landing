import type { Logger } from "pino";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * "From" address for transactional email. Override with EMAIL_FROM once a
 * verified Resend domain exists; falls back to Resend's shared onboarding
 * sender, which only delivers reliably to the account owner in test mode.
 */
function fromAddress(): string {
  return process.env.EMAIL_FROM ?? "PrediQs AI <onboarding@resend.dev>";
}

/**
 * Send the email-verification message via the Resend REST API.
 * Returns true on success. Never throws — callers should not fail signup just
 * because the email provider is unavailable.
 */
export async function sendVerificationEmail(
  to: string,
  username: string,
  verifyUrl: string,
  log?: Logger,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    log?.warn("RESEND_API_KEY not set — skipping verification email");
    return false;
  }

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#070B12;padding:32px;color:#E0EAF5">
      <div style="max-width:480px;margin:0 auto;background:#0C1422;border:1px solid #1A2535;border-radius:16px;padding:32px">
        <h1 style="color:#FFD700;font-size:22px;margin:0 0 8px">Verify your email</h1>
        <p style="color:#9FB1C1;font-size:15px;line-height:1.5;margin:0 0 24px">
          Hi ${escapeHtml(username)}, welcome to PrediQs AI. Confirm your email address to start using your account.
        </p>
        <a href="${verifyUrl}" style="display:inline-block;background:#FFD700;color:#070B12;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:15px">
          Verify Email
        </a>
        <p style="color:#3A5060;font-size:12px;line-height:1.5;margin:24px 0 0">
          If the button doesn't work, paste this link into your browser:<br/>
          <span style="color:#9FB1C1;word-break:break-all">${verifyUrl}</span>
        </p>
        <p style="color:#3A5060;font-size:12px;margin:16px 0 0">This link expires in 24 hours.</p>
      </div>
    </div>`;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to,
        subject: "Verify your PrediQs AI email",
        html,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      log?.warn({ status: res.status, detail }, "Resend verification email failed");
      return false;
    }
    return true;
  } catch (err) {
    log?.warn({ err }, "Resend verification email threw");
    return false;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
