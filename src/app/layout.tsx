import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { CookieConsent } from "@/components/cookie-consent";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://applyagent.ca'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  title: {
    default: "ApplyAgent - AI Job Search Command Center",
    template: "%s | ApplyAgent",
  },
  description: "Evaluate job postings, generate tailored resumes, and track applications with AI. Built for IT and security professionals in Canada.",
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: 'website',
    siteName: 'ApplyAgent',
    title: 'ApplyAgent - AI Job Search Command Center',
    description: 'Evaluate job postings, generate tailored resumes, and track applications with AI.',
    url: APP_URL,
  },
  twitter: {
    card: 'summary',
    title: 'ApplyAgent - AI Job Search Command Center',
    description: 'Evaluate job postings, generate tailored resumes, and track applications with AI.',
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
          <CookieConsent />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
