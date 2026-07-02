import { createAdminClient } from '@/lib/supabase/admin'
import { Calendar, FileText, BellRing } from 'lucide-react'
import FoundingForm from './founding-form'

export const metadata = {
  title: 'Founding Therapists — Praxio',
  description:
    'The first 30 solo therapists lock $19/month for life. Simple practice management: scheduling, client notes, automatic reminders — without the insurance-billing bloat.',
}

const GOAL = 30

export default async function FoundingPage() {
  let taken = 0
  try {
    const supabase = createAdminClient()
    const { count } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true })
    taken = count ?? 0
  } catch {
    taken = 0
  }
  const left = Math.max(0, GOAL - taken)

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Scarcity badge */}
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          {left > 0 ? `${left} of ${GOAL} founding spots left` : 'Founding cohort full — join the waitlist'}
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight mb-5">
          Practice management for solo therapists — without the bloat.
        </h1>

        <p className="text-lg text-slate-600 mb-8 max-w-2xl">
          SimplePractice and TherapyNotes charge $79–149/month for insurance billing,
          claims, and portals you never open. Praxio does the three things you actually
          use — and the first {GOAL} therapists lock it in at <strong>$19/month for life</strong>{' '}
          (regular price $29).
        </p>

        {/* Three features */}
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: <Calendar className="w-5 h-5 text-blue-600" />, t: 'Scheduling', d: 'Clean calendar, recurring weekly slots.' },
            { icon: <FileText className="w-5 h-5 text-blue-600" />, t: 'Client notes', d: 'Quick notes tied to each client.' },
            { icon: <BellRing className="w-5 h-5 text-blue-600" />, t: 'Auto reminders', d: 'Cut no-shows, sent automatically.' },
          ].map((f) => (
            <div key={f.t} className="bg-white rounded-xl border border-slate-100 p-5">
              <div className="mb-2">{f.icon}</div>
              <div className="font-semibold text-slate-900 text-sm mb-1">{f.t}</div>
              <div className="text-slate-500 text-sm">{f.d}</div>
            </div>
          ))}
        </div>

        {/* Capture */}
        <div className="max-w-md">
          <FoundingForm />
        </div>

        <p className="text-slate-400 text-sm mt-8 max-w-2xl">
          Praxio is built for solo, cash-pay therapists — no insurance claims, no
          clearinghouses. Data is encrypted at rest and in transit. Founding members
          help shape what we build first.
        </p>
      </div>
    </main>
  )
}
