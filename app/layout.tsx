import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meros — P0 Memory Spine",
  description: "P0 diagnostic: real Walrus Memory Mainnet write + fresh-session recall.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}
