import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Calendar, Plus } from 'lucide-react'
import { formatDate, formatTime } from '@/lib/utils'

export const metadata = { title: 'Appointments' }

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-slate-100 text-slate-500',
  no_show: 'bg-red-50 text-red-600',
}

export default async function AppointmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Upcoming first, then past
  const { data: upcoming } = await supabase
    .from('appointments')
    .select('*, clients(full_name, email)')
    .eq('therapist_id', user!.id)
    .eq('status', 'scheduled')
    .gte('start_time', new Date().toISOString())
    .order('start_time')
    .limit(50)

  const { data: past } = await supabase
    .from('appointments')
    .select('*, clients(full_name)')
    .eq('therapist_id', user!.id)
    .or('status.neq.scheduled,start_time.lt.' + new Date().toISOString())
    .order('start_time', { ascending: false })
    .limit(50)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
          <p className="text-slate-500 text-sm mt-1">{upcoming?.length ?? 0} upcoming sessions</p>
        </div>
        <Link
          href="/appointments/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New appointment
        </Link>
      </div>

      {(!upcoming || upcoming.length === 0) && (!past || past.length === 0) ? (
        <div className="bg-white rounded-xl border border-slate-100 p-16 text-center">
          <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="font-semibold text-slate-900 mb-2">No appointments yet</h3>
          <p className="text-slate-500 text-sm mb-6">Schedule your first session</p>
          <Link
            href="/appointments/new"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Schedule appointment
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming && upcoming.length > 0 && (
            <Section title="Upcoming">
              {upcoming.map((appt: any) => (
                <ApptRow key={appt.id} appt={appt} />
              ))}
            </Section>
          )}
          {past && past.length > 0 && (
            <Section title="Past sessions">
              {past.map((appt: any) => (
                <ApptRow key={appt.id} appt={appt} />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">{title}</h2>
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function ApptRow({ appt }: { appt: any }) {
  return (
    <Link
      href={`/appointments/${appt.id}`}
      className="flex items-center gap-4 px-6 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
    >
      <div className="min-w-[110px]">
        <div className="text-xs text-slate-500">{formatDate(appt.start_time)}</div>
        <div className="text-sm font-semibold text-slate-900">{formatTime(appt.start_time)}</div>
      </div>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-blue-700 text-xs font-semibold">
            {appt.clients?.full_name?.[0]?.toUpperCase() ?? '?'}
          </span>
        </div>
        <div className="min-w-0">
          <div className="font-medium text-slate-900 truncate">{appt.clients?.full_name}</div>
          <div className="text-slate-500 text-xs">{appt.title || 'Session'}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {appt.reminder_24h_sent && (
          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">Reminded</span>
        )}
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[appt.status] ?? ''}`}>
          {appt.status}
        </span>
      </div>
    </Link>
  )
}
