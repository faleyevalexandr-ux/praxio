import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, X } from 'lucide-react'
import type { Metadata } from 'next'

// ─── Data layer ───────────────────────────────────────────────────────────────

const COMPETITORS: Record<string, {
  name: string
  slug: string
  price: string
  targetPrice: string
  complexity: string
  setupTime: string
  forWho: string
  hasInsurance: boolean
  hasTelehealth: boolean
  keywords: string[]
}> = {
  'simplepractice-alternative': {
    name: 'SimplePractice',
    slug: 'simplepractice-alternative',
    price: '$79–$149/month',
    targetPrice: '$29/month',
    complexity: 'High — insurance billing, telehealth, intake forms, client portal',
    setupTime: '2–4 hours',
    forWho: 'Large practices and group clinics that need insurance billing',
    hasInsurance: true,
    hasTelehealth: true,
    keywords: ['simplepractice alternative', 'simplepractice cheaper', 'simplepractice too expensive', 'switch from simplepractice'],
  },
  'therapynotes-alternative': {
    name: 'TherapyNotes',
    slug: 'therapynotes-alternative',
    price: '$59–$99/month',
    targetPrice: '$29/month',
    complexity: 'High — billing, insurance claims, client portal, documentation',
    setupTime: '2–3 hours',
    forWho: 'Mental health practices that submit insurance claims',
    hasInsurance: true,
    hasTelehealth: false,
    keywords: ['therapynotes alternative', 'therapynotes cheaper', 'therapynotes too expensive', 'therapynotes alternative for solo'],
  },
  'theranest-alternative': {
    name: 'TheraNest',
    slug: 'theranest-alternative',
    price: '$39–$114/month',
    targetPrice: '$29/month',
    complexity: 'Medium — billing, scheduling, notes, group practice tools',
    setupTime: '1–2 hours',
    forWho: 'Group practices needing billing management',
    hasInsurance: true,
    hasTelehealth: true,
    keywords: ['theranest alternative', 'theranest cheaper', 'theranest pricing too high'],
  },
  'practice-better-alternative': {
    name: 'Practice Better',
    slug: 'practice-better-alternative',
    price: '$45–$135/month',
    targetPrice: '$29/month',
    complexity: 'High — meal plans, programs, client portals, forms',
    setupTime: '3–4 hours',
    forWho: 'Health coaches and nutritionists with complex client programs',
    hasInsurance: false,
    hasTelehealth: true,
    keywords: ['practice better alternative', 'practice better cheaper', 'practice better for therapists'],
  },
  'counseling-software-for-solo-therapists': {
    name: 'complex EHR systems',
    slug: 'counseling-software-for-solo-therapists',
    price: '$60–$150/month',
    targetPrice: '$29/month',
    complexity: 'High — insurance, billing, telehealth, intake forms, and more',
    setupTime: '2–5 hours',
    forWho: 'Large practices and hospital systems',
    hasInsurance: true,
    hasTelehealth: true,
    keywords: ['counseling software solo therapist', 'therapy software solo practice', 'simple practice management solo therapist'],
  },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  return Object.keys(COMPETITORS).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const comp = COMPETITORS[slug]
  if (!comp) return {}

  const title = `Best ${comp.name} Alternative for Solo Therapists (2025)`
  const description = `Looking for a ${comp.name} alternative? Praxio is a simpler, more affordable option at $29/month. No bloatware, 5-minute setup.`

  return {
    title,
    description,
    keywords: comp.keywords,
    openGraph: { title, description },
  }
}

export default async function SeoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const comp = COMPETITORS[slug]
  if (!comp) notFound()

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">P</span>
            </div>
            <span className="font-semibold text-slate-900">Praxio</span>
          </Link>
          <Link href="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            Start free trial
          </Link>
        </div>
      </nav>

      <article className="max-w-4xl mx-auto px-6 py-16">
        {/* Breadcrumb */}
        <nav className="text-sm text-slate-500 mb-8">
          <Link href="/" className="hover:text-slate-700">Home</Link>
          <span className="mx-2">›</span>
          <span>Alternatives</span>
          <span className="mx-2">›</span>
          <span className="text-slate-700">{comp.name}</span>
        </nav>

        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          Best {comp.name} Alternative for Solo Therapists
        </h1>
        <p className="text-xl text-slate-600 mb-12">
          If {comp.name} feels like too much tool for your solo practice, you're not alone.
          Here's a straightforward comparison — and a simpler option at {comp.targetPrice}.
        </p>

        {/* Quick answer box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-12">
          <h2 className="font-semibold text-blue-900 mb-2">TL;DR</h2>
          <p className="text-blue-800">
            <strong>{comp.name}</strong> is built for {comp.forWho}. If you're a solo therapist
            who just needs appointment scheduling, client notes, and automated reminders —
            <strong> Praxio does exactly that for {comp.targetPrice}</strong> (vs {comp.price}).
          </p>
        </div>

        {/* Comparison table */}
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          Praxio vs {comp.name}: Side-by-side
        </h2>
        <div className="overflow-x-auto mb-12">
          <table className="w-full border border-slate-200 rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-6 py-4 text-slate-600 font-medium border-b border-slate-200">Feature</th>
                <th className="px-6 py-4 text-blue-700 font-semibold border-b border-slate-200">Praxio</th>
                <th className="px-6 py-4 text-slate-500 font-medium border-b border-slate-200">{comp.name}</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Monthly price', comp.targetPrice, comp.price],
                ['Setup time', '5 minutes', comp.setupTime],
                ['Appointment scheduling', '✓', '✓'],
                ['Automated email reminders', '✓', '✓'],
                ['Client notes', '✓', '✓'],
                ['Insurance billing', '✗ (intentionally)', comp.hasInsurance ? '✓' : '✗'],
                ['Built-in telehealth', '✗ (use Zoom)', comp.hasTelehealth ? '✓' : '✗'],
                ['Learning curve', 'Zero', 'High'],
                ['Per-therapist add-on fee', 'No', 'Often yes'],
              ].map(([feature, td, sp]) => (
                <tr key={feature} className="border-b border-slate-100 last:border-0">
                  <td className="px-6 py-4 text-slate-700">{feature}</td>
                  <td className="px-6 py-4 text-center font-medium text-blue-700">{td}</td>
                  <td className="px-6 py-4 text-center text-slate-500">{sp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* When to switch */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="border border-green-200 bg-green-50 rounded-xl p-6">
            <h3 className="font-semibold text-green-900 mb-3">Choose Praxio if…</h3>
            <ul className="space-y-2 text-green-800 text-sm">
              {[
                "You're a solo therapist or small practice",
                "You don't bill insurance directly",
                "You're paying too much for features you never use",
                "You want to get set up in under 10 minutes",
                "You just need scheduling + notes + reminders",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="border border-slate-200 rounded-xl p-6">
            <h3 className="font-semibold text-slate-900 mb-3">Stick with {comp.name} if…</h3>
            <ul className="space-y-2 text-slate-600 text-sm">
              {[
                "You bill insurance and need claim management",
                "You need a built-in telehealth solution",
                "You have a group practice with multiple therapists",
                "You use client intake forms extensively",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <X className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* FAQ */}
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Frequently asked questions</h2>
        <div className="space-y-6 mb-12">
          {[
            {
              q: `Can I import my clients from ${comp.name}?`,
              a: `Yes — you can add clients manually (it takes about 2 minutes per client) or email us and we'll help you with a CSV import.`,
            },
            {
              q: `Does Praxio have a free trial?`,
              a: `Yes, 14 days free — no credit card required. After the trial, it's $29/month flat.`,
            },
            {
              q: `What about HIPAA compliance?`,
              a: `Praxio stores data on Supabase (SOC 2 Type II certified), all data is encrypted at rest and in transit. We do not sell or share client data.`,
            },
            {
              q: `Does Praxio have an app?`,
              a: `The web app works on mobile browsers. A native iOS/Android app is on our roadmap for late 2025.`,
            },
          ].map(({ q, a }) => (
            <div key={q}>
              <h3 className="font-semibold text-slate-900 mb-2">{q}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{a}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-blue-600 rounded-2xl p-10 text-center text-white">
          <h2 className="text-2xl font-bold mb-3">Try Praxio free for 14 days</h2>
          <p className="text-blue-100 mb-8">No credit card. No setup call. Cancel anytime.</p>
          <Link
            href="/login"
            className="inline-block bg-white text-blue-700 px-8 py-4 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
          >
            Start free trial →
          </Link>
        </div>
      </article>

      {/* Internal links footer */}
      <footer className="border-t border-slate-100 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-slate-500 text-sm mb-3">Other alternatives you might consider:</p>
          <div className="flex gap-4 flex-wrap">
            {Object.values(COMPETITORS)
              .filter((c) => c.slug !== slug)
              .map((c) => (
                <Link key={c.slug} href={`/seo/${c.slug}`} className="text-blue-600 text-sm hover:underline">
                  {c.name} Alternative
                </Link>
              ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
