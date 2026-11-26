import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JOELVERSE — Joel Butala, Creative, Marketing & Technology",
  description:
    "Joel Butala is a multidisciplinary creative, marketing and technology professional in Kampala. Ride a boda boda through a 3D world of his marketing, branding, web, software and business work, or open the classic portfolio.",
  openGraph: {
    title: "JOELVERSE — Joel Butala",
    description: "Ride a boda boda through a tiny 3D Kampala to explore my work.",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#151515",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
