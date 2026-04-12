import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "leaflet/dist/leaflet.css";

import { Providers } from "@/components/providers/Providers";
import { TopNav } from "@/components/ui/TopNav";

import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-var",
});

export const metadata: Metadata = {
  title: "Herd Signal",
  description: "Maps, audio separation, and voice exploration for elephant conservation workflows.",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/favicon.png", sizes: "512x512" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body>
        <Providers>
          <TopNav />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
