import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Nav } from "@/components/chrome/nav";
import { Footer } from "@/components/chrome/footer";
import { ToolFilterProvider } from "@/features/tools/tool-filter";
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
  title: {
    default: "Toolbox — Every tool. One tab.",
    template: "%s — Toolbox",
  },
  description:
    "A growing bench of free, instant web utilities: a media downloader, an FFmpeg converter, JSON formatter, Base64, contrast checker and more. No accounts, no uploads.",
  applicationName: "Toolbox",
  authors: [{ name: "avyuktjs", url: "https://vishy.dino.icu/" }],
  creator: "avyuktjs",
  keywords: ["toolbox", "tools", "downloader", "converter", "json", "base64", "webm", "mp4"],
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
