import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import SiteChrome from "@/components/site/SiteChrome";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://prediqsai.com";
const gaId = process.env.NEXT_PUBLIC_GA_ID;
const gscCode = process.env.NEXT_PUBLIC_GSC_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PrediQs AI — Stop Guessing. Use AI Data for Wins.",
    template: "%s | PrediQs AI",
  },
  description:
    "PrediQs AI analyzes form, head-to-head records, and odds movement to deliver data-backed football predictions with radical transparency — every result published.",
  openGraph: {
    siteName: "PrediQs AI",
    type: "website",
    images: ["/opengraph.jpg"],
  },
  // Google Search Console verification: set NEXT_PUBLIC_GSC_VERIFICATION
  ...(gscCode ? { verification: { google: gscCode } } : {}),
};

export const viewport: Viewport = {
  themeColor: "#05080e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${grotesk.variable} ${plexMono.variable}`}
    >
      <body className="min-h-screen bg-night text-ice">
        {gaId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="ga4" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}');`}
            </Script>
          </>
        ) : null}
        <AuthProvider>
          <SiteChrome>{children}</SiteChrome>
        </AuthProvider>
      </body>
    </html>
  );
}
