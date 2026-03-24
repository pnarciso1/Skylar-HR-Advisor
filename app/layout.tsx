import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Skylar — HR Advisor",
  description:
    "Expert HR guidance powered by AI. Get instant advice on employee relations, performance management, hiring, compliance, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased bg-background text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
