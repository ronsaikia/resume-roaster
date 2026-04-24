import type { Metadata } from "next";
import { Inter, Space_Mono, Syne } from "next/font/google";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
  display: "swap",
});

const syne = Syne({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

export const metadata: Metadata = {
  title: "JhalmuriCV",
  description:
    "Get your resume roasted by AI. Brutal honesty, structured feedback, and real scores to help you land your dream job.",
  keywords: [
    "resume",
    "AI",
    "analysis",
    "job search",
    "career",
    "ATS",
    "resume review",
  ],
  authors: [{ name: "CHIRON" }],
  openGraph: {
    title: "JhalmuriCV",
    description: "AI-powered brutal honesty. Structured feedback. Real scores.",
    type: "website",
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ overflowX: "hidden", height: "auto" }}>
      <body
        className={`${inter.variable} ${spaceMono.variable} ${syne.variable} antialiased min-h-screen`}
        style={{ overflowX: "hidden", height: "auto" }}
      >
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
