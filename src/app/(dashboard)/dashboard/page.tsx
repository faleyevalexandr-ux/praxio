import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Calendar, Users, CheckCircle, Clock, Plus } from 'lucide-react'
import { formatTime } from '@/lib/utils'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Today's range
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const [
    { data: todayAppts },
    { data: upcomingAppts },
    { count: clientCount },
    { count: apptCount },
  ] = await Promise.all([
    supabase
      .from('appointments')
      .select('*, clients(full_name, email)')
      .eq('therapist_id', user!.id)
      .eq('status', 'scheduled')
      .gte('start_time', todayStart.toISOString())
      .lte('start_time', todayEnd.toISOString())
      .order('start_time'),
    supabase
      .from('appointments')
      .select('*, clients(full_name)')
      .eq('therapist_id', user!.id)
      .eq('status', 'scheduled')
      .gt('start_time', todayEnd.toISOString())
      .order('start_time')
      .limit(5),
    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('therapist_id', user!.id)
      .is('archived_at', null),
    supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('therapist_id', user!.id)
      .eq('status', 'scheduled'),
  ])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link
          href="/appointments/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New appointment
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Calendar className="w-5 h-5 text-blue-600" />} label="Today's sessions" value={todayAppts?.length ?? 0} />
        <StatCard icon={<Clock className="w-5 h-5 text-amber-500" />} label="Upcoming" value={apptCount ?? 0} />
        <StatCard icon={<Users className="w-5 h-5 text-green-600" />} label="Active clients" value={clientCount ?? 0} />
        <StatCard icon={<CheckCircle className="w-5 h-5 text-purple-600" />} label="Sessions this month" value="—" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's schedule */}
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Today's schedule</h2>
            <Link href="/appointments" className="text-blue-600 text-sm hover:underline">View all</Link>
          </div>
          {todayAppts && todayAppts.length > 0 ? (
            <div className="space-y-3">
              {todayAppts.map((appt: any) => (
                <div key={appt.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                  <div className="text-center min-w-[52px]">
                    <div className="text-sm font-semibold text-slate-900">{formatTime(appt.start_time)}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">{appt.clients?.full_name}</div>
                    <div className="text-slate-500 text-xs">{appt.title}</div>
                  </div>
                  <Link href={`/appointments/${appt.id}`} className="text-blue-600 text-xs hover:underline">
                    View
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No sessions today</p>
              <Link href="/appointments/new" className="text-blue-600 text-sm mt-1 hover:underline">
                Schedule one →
              </Link>
            </div>
          )}
        </div>

        {/* Upcoming */}
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Coming up</h2>
            <Link href="/appointments" className="text-blue-600 text-sm hover:underline">View all</Link>
          </div>
          {upcomingAppts && upcomingAppts.length > 0 ? (
            <div className="space-y-3">
              {upcomingAppts.map((appt: any) => (
                <div key={appt.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50">
                  <div className="min-w-[90px]">
                    <div className="text-xs text-slate-500">
                      {new Date(appt.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="text-sm font-medium text-slate-900">{formatTime(appt.start_time)}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">{appt.clients?.full_name}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <p className="text-sm">No upcoming sessions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-slate-500 text-sm">{label}</div>
    </div>
  )
}
