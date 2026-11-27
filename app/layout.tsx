import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Krishna Anandam | Premium Villas & Residential Plots in Jhansi",
  description:
    "Krishna Anandam – premium gated community with 3 BHK duplex villas and residential plots at Badagaon, Jhansi. JDA approved · RERA registered. 4.4 acres · 97 units.",
  openGraph: {
    type: "website",
    title: "Krishna Anandam – Villas & Plots in Jhansi",
    description:
      "Premium gated community at Badagaon, Jhansi. JDA approved · RERA registered.",
    images: ["https://ka-lead-next.pages.dev/images/og.webp"],
  },
  other: {
    "theme-color": "#0a0a0a",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="image"
          href="/images/day.webp"
          fetchPriority="high"
        />
        {children}
      </body>
    </html>
  );
}
