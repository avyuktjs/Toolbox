import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Nav } from "@/components/chrome/nav";
import { Footer } from "@/components/chrome/footer";
import { ToolFilterProvider } from "@/features/tools/tool-filter";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Every tool. One tab.`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "avyuktjs", url: "https://vishy.dino.icu/" }],
  creator: "avyuktjs",
  keywords: [
    "toolbox", "tools", "downloader", "converter", "json", "base64",
    "image tools", "pdf tools", "regex", "cron", "contrast checker",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Every tool. One tab.`,
    description: SITE_DESCRIPTION,
    images: [{ url: "/og.png", width: 2880, height: 1150, alt: `${SITE_NAME} — the tool bench` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Every tool. One tab.`,
    description: SITE_DESCRIPTION,
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { other: { "google-site-verification": process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } } }
    : {}),
};

/** Static, trustworthy structured data — no user content in here. */
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "en",
    },
    {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Web",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  ],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfd" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${plexMono.variable}`}
    >
      <body className="flex min-h-dvh flex-col bg-paper text-ink">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <link rel="preconnect" href="https://i.ytimg.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://i.ytimg.com" />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ToolFilterProvider>
            <TooltipProvider>
              <Nav />
              <main className="flex-1">{children}</main>
              <Footer />
              <Toaster position="bottom-right" gap={8} />
            </TooltipProvider>
          </ToolFilterProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
