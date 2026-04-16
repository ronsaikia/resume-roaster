import type { Metadata } from "next";
import { Inter, Space_Mono } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Resume Roaster 🔥 | AI-Powered Resume Analysis",
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
  authors: [{ name: "AEC Coding Club" }],
  openGraph: {
    title: "Resume Roaster 🔥",
    description: "AI-powered brutal honesty. Structured feedback. Real scores.",
    type: "website",
  },
  alternates: {
    canonical: "/",
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
        className={`${inter.variable} ${spaceMono.variable} antialiased min-h-screen`}
        style={{ overflowX: "hidden", height: "auto" }}
      >
        {children}
      </body>
    </html>
  );
}
