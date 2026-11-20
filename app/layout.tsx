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

const siteTitle = "3D Machine-Control Models & Site Takeoffs | BCT";
const siteDescription =
  "Borchardt Construction Technology provides 3D machine-control models, construction drafting, site takeoffs, drone data processing, and GPS support.";
const siteUrl = "https://borchardtct.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  alternates: {
    canonical: `${siteUrl}/`,
  },
  openGraph: {
    type: "website",
    url: `${siteUrl}/`,
    title: siteTitle,
    description: siteDescription,
    siteName: "Borchardt Construction Technology",
    images: [
      {
        url: "/images/bct-hero-earthwork.webp",
        width: 1920,
        height: 1080,
        alt: "Construction earthwork site",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/images/bct-hero-earthwork.webp"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-bct-ink text-foreground">{children}</body>
    </html>
  );
}
