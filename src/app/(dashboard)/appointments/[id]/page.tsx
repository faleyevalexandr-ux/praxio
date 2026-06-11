import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { formatDate, formatTime } from '@/lib/utils'
import { AppointmentActions } from './appointment-actions'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('appointments').select('title, start_time').eq('id', id).single()
  return { title: data ? `${data.title} — ${formatDate(data.start_time)}` : 'Appointment' }
}

export default async function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: appt } = await supabase
    .from('appointments')
    .select('*, clients(id, full_name, email, phone)')
    .eq('id', id)
    .eq('therapist_id', user!.id)
    .single()

  if (!appt) notFound()

  const duration = Math.round(
    (new Date(appt.end_time).getTime() - new Date(appt.start_time).getTime()) / 60000
  )

  const STATUS_COLORS: Record<string, string> = {
    scheduled: 'bg-blue-50 text-blue-700',
    completed: 'bg-green-50 text-green-700',
    cancelled: 'bg-slate-100 text-slate-500',
    no_show: 'bg-red-50 text-red-600',
  }

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/appointments" className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to appointments
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{appt.title}</h1>
          <p className="text-slate-500 mt-1">
            {formatDate(appt.start_time)} at {formatTime(appt.start_time)} · {duration} min
          </p>
        </div>
        <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${STATUS_COLORS[appt.status] ?? ''}`}>
          {appt.status}
        </span>
      </div>

      <div className="space-y-4">
        {/* Client */}
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Client</h2>
          <Link href={`/clients/${appt.clients?.id}`} className="flex items-center gap-3 hover:opacity-80">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-700 font-semibold">{appt.clients?.full_name?.[0]?.toUpperCase()}</span>
            </div>
            <div>
              <div className="font-medium text-slate-900">{appt.clients?.full_name}</div>
              {appt.clients?.email && <div className="text-slate-500 text-sm">{appt.clients?.email}</div>}
            </div>
          </Link>
        </div>

        {/* Reminder status */}
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Reminders</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">24-hour reminder</span>
              {appt.reminder_24h_sent ? (
                <span className="text-green-600 font-medium">Sent ✓</span>
              ) : (
                <span className="text-slate-400">Pending</span>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">1-hour reminder</span>
              {appt.reminder_1h_sent ? (
                <span className="text-green-600 font-medium">Sent ✓</span>
              ) : (
                <span className="text-slate-400">Pending</span>
              )}
            </div>
          </div>
          {!appt.clients?.email && (
            <p className="text-amber-600 text-xs mt-3">
              ⚠ No email on file — add one to{' '}
              <Link href={`/clients/${appt.clients?.id}`} className="underline">client profile</Link>
            </p>
          )}
        </div>

        {/* Notes */}
        {appt.notes && (
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Session notes</h2>
            <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">{appt.notes}</p>
          </div>
        )}

        {/* Actions */}
        {appt.status === 'scheduled' && (
          <AppointmentActions appointmentId={appt.id} />
        )}
      </div>
    </div>
  )
}
