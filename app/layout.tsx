import type { Metadata } from "next";
import { Inter, Silkscreen } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const silkscreen = Silkscreen({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Meros — Support memory that compounds",
  description:
    "Meros remembers each customer privately and turns approved support resolutions into reusable organizational memory. Solve it once. Remember it for everyone.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${silkscreen.variable} min-h-screen bg-[#030806] text-[#F5F7F5] antialiased`}
        style={{ fontFamily: "var(--font-inter), Inter, system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
