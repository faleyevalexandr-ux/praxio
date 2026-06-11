import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Praxio — Simple Practice Management for Solo Therapists',
    template: '%s | Praxio',
  },
  description:
    'Simple appointment scheduling, client notes, and automated reminders for solo therapists. No bloatware. 14-day free trial.',
  keywords: [
    'therapist scheduling software',
    'therapy practice management',
    'appointment reminders therapist',
    'solo therapist software',
    'mental health practice software',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: 'Praxio',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
