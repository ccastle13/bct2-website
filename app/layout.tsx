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
  metadataBase: new URL("https://borchardtct.com"),
  title: "3D Machine-Control Models & Site Takeoffs | BCT",
  description:
    "Borchardt Construction Technology provides 3D machine-control models, construction drafting, site takeoffs, drone data processing, and GPS support.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Borchardt Construction Technology",
    title: "3D Machine-Control Models & Site Takeoffs | BCT",
    description:
      "Field-ready 3D models, construction drafting, site takeoffs, drone data processing, and GPS support for construction teams.",
    images: [
      {
        url: "/images/bct-hero-earthwork.webp",
        alt: "Construction earthwork project",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "3D Machine-Control Models & Site Takeoffs | BCT",
    description:
      "Field-ready 3D models, construction drafting, site takeoffs, drone data processing, and GPS support for construction teams.",
    images: ["/images/bct-hero-earthwork.webp"],
  },
  robots: {
    index: false,
    follow: false,
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
