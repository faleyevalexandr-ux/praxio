import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Therapy No-Show Cost Calculator — Free Tool',
  description:
    'Calculate what no-shows actually cost your private practice per year — and how much automated reminders could recover. Free, no signup.',
  keywords: ['no show calculator', 'therapy no show cost', 'missed appointment cost calculator', 'reduce no shows private practice'],
  openGraph: {
    title: 'Therapy No-Show Cost Calculator',
    description: 'See the yearly cost of missed sessions in your practice. Free tool.',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
