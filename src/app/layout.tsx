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
  title: "The Satellite Project Om: Cannabis Innovation & Blockchain Integration",
  description: "Explore The Satellite Project Om, a cutting-edge cannabis cultivation and blockchain-powered ecosystem. Home to 1,500 tokenized plants, sustainable growth, and community-driven operations.",
  openGraph: {
    title: "The Satellite Project Om: Cannabis Innovation & Blockchain Integration",
    description:
      "The Satellite Project Om is a pioneering cannabis cultivation facility in Santa Fe, NM, blending sustainable agriculture with blockchain technology. Our tokenized plant system ensures community ownership, transparency, and consistent yield distribution.",
    type: "website",
    url: "https://omgrown.life", // Official URL for The Satellite Project Om
    images: [
      {
        url: "https://storage.googleapis.com/tgl_cdn/MegaServerParty/TSPBanner.png", // The Satellite Project Om banner image
        width: 1200,
        height: 630,
        alt: "The Satellite Project Om Banner",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Satellite Project Om: Cannabis Innovation & Blockchain Integration",
    description:
      "Join The Satellite Project Om, where cutting-edge cannabis cultivation meets blockchain technology. Discover sustainable growth, tokenized plant ownership, and community-driven yield sharing.",
    images: [
      {
        url: "https://storage.googleapis.com/tgl_cdn/MegaServerParty/TSPBanner.png", // The Satellite Project Om banner image
        alt: "The Satellite Project Om Banner",
      },
    ],
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
        {/* General Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#00ccff" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />

        {/* Open Graph Meta Tags for Social Sharing */}
        <meta property="og:title" content="The Satellite Project Om: Cannabis Innovation & Blockchain Integration" />
        <meta property="og:description" content="Discover The Satellite Project Om, where sustainable cannabis cultivation meets blockchain technology. Experience tokenized plant ownership and community-driven growth." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://omgrown.life" />
        <meta property="og:image" content="https://storage.googleapis.com/tgl_cdn/MegaServerParty/TSPBanner.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="The Satellite Project Om Banner" />
        <meta property="og:site_name" content="The Satellite Project Om" />

        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="The Satellite Project Om: Cannabis Innovation & Blockchain Integration" />
        <meta name="twitter:description" content="The Satellite Project Om blends cannabis cultivation with blockchain technology, offering tokenized plant ownership and sustainable growth." />
        <meta name="twitter:image" content="https://storage.googleapis.com/tgl_cdn/MegaServerParty/TSPBanner.png" />
        <meta name="twitter:image:alt" content="The Satellite Project Om Banner" />

        {/* SEO and Rich Link Metadata */}
        <meta property="og:locale" content="en_US" />
        <meta property="og:updated_time" content="2024-01-01T00:00:00Z" />
        <meta property="article:author" content="The Satellite Project Om" />

        {/* Facebook Specific Meta */}
        <meta property="fb:app_id" content="YOUR_FACEBOOK_APP_ID" />

        {/* Canonical Link */}
        <link rel="canonical" href="https://omgrown.life" />
      </head>
      <body className={`${inter.variable} ${rajdhani.variable} font-sans`}>{children}</body>
    </html>
  );
}
