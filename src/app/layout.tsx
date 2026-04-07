import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://careeops.com'

export const metadata: Metadata = {
  title: {
    default: "CareerOps - AI Job Search Command Center",
    template: "%s | CareerOps",
  },
  description: "Evaluate job postings, generate tailored resumes, and track applications with AI. Built for IT and security professionals in Canada.",
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: 'website',
    siteName: 'CareerOps',
    title: 'CareerOps - AI Job Search Command Center',
    description: 'Evaluate job postings, generate tailored resumes, and track applications with AI.',
    url: APP_URL,
  },
  twitter: {
    card: 'summary',
    title: 'CareerOps - AI Job Search Command Center',
    description: 'Evaluate job postings, generate tailored resumes, and track applications with AI.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
