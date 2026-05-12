import type { Metadata } from "next";
import { Literata, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
});

const literata = Literata({
  variable: "--font-literary",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WriteNow",
  description: "Protected writing workspace with credentials-based auth.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${literata.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
