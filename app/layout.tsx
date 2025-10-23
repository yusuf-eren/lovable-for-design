import type { Metadata } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Arc AI – Instant design for non-design teams",
  description: "Arc AI transforms how teams design — instant, 100% on-brand, and effortlessly scalable. Elevate your brand, slash turnaround time, stay consistent.",
  openGraph: {
    title: "Arc AI – Instant design for non-design teams",
    description: "Arc AI transforms how teams design — instant, 100% on-brand, and effortlessly scalable. Elevate your brand, slash turnaround time, stay consistent.",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${dmSerifDisplay.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
