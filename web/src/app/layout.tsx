import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, JetBrains_Mono } from "next/font/google";
import { MotionConfig } from "motion/react";

import { LIVE_URL } from "@/lib/site";

import "./globals.css";

const display = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const text = Barlow({
  variable: "--font-text",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const description =
  "An expected field goal model trained on 128,069 tracked shots from the 2014-15 NBA season. Model comparison, SHAP explanations, a player shot-making leaderboard, and an interactive shot predictor.";

export const metadata: Metadata = {
  metadataBase: new URL(LIVE_URL),
  title: "NBA Shot Quality · Expected FG% from SportVU tracking",
  description,
  openGraph: {
    title: "NBA Shot Quality",
    description,
    type: "website",
    images: ["/og.jpg"],
  },
  twitter: { card: "summary_large_image", title: "NBA Shot Quality", description, images: ["/og.jpg"] },
};

export const viewport: Viewport = {
  themeColor: "#0a0d12",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${text.variable} ${mono.variable}`}>
      <body>
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </body>
    </html>
  );
}
