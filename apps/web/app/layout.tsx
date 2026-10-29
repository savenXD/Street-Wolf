import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const brand = Bricolage_Grotesque({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "Street Wolf: open-source lead engine",
  description: "Scrape Google Maps leads into a live sheet. Open source, self-hostable, free.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${brand.variable} h-full bg-white antialiased`}
    >
      <body className="min-h-full bg-white font-sans text-neutral-950">{children}</body>
    </html>
  );
}
