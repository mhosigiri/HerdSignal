import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

import { Providers } from "@/components/providers/Providers";
import { Sidebar } from "@/components/ui/Sidebar";

import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Elephant Conservation Platform",
  description: "Maps, audio separation, and voice exploration for elephant conservation workflows.",
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
          <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#efe5d1_0%,#f8f5ef_38%,#ece5da_100%)] text-stone-900">
            <div className="grid min-h-screen lg:grid-cols-[18rem_1fr]">
              <Sidebar />
              <main className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
