import type { Metadata } from "next";
import { Inter, Rajdhani } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const rajdhani = Rajdhani({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ["latin"],
  variable: '--font-rajdhani'
});

export const metadata: Metadata = {
  metadataBase: new URL("https://portal.tsp.thelochnessbotanicalsociety.com"),
  title: "The Satellite Project Om: Cannabis Innovation & Blockchain Integration",
  description: "Explore The Satellite Project Om, a cutting-edge cannabis cultivation and blockchain-powered ecosystem. Home to 1,500 tokenized plants, sustainable growth, and community-driven operations.",
  openGraph: {
    title: "The Satellite Project Om: Cannabis Innovation & Blockchain Integration",
    description:
      "The Satellite Project Om is a pioneering cannabis cultivation facility in Santa Fe, NM, blending sustainable agriculture with blockchain technology. Our tokenized plant system ensures community ownership, transparency, and consistent yield distribution.",
    type: "website",
    url: "https://portal.tsp.thelochnessbotanicalsociety.com",
    siteName: "The Satellite Project Om",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Satellite Project Om: Cannabis Innovation & Blockchain Integration",
    description:
      "Join The Satellite Project Om, where cutting-edge cannabis cultivation meets blockchain technology. Discover sustainable growth, tokenized plant ownership, and community-driven yield sharing.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#00ccff" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      </head>
      <body className={`${inter.variable} ${rajdhani.variable} font-sans`}>{children}</body>
    </html>
  );
}
