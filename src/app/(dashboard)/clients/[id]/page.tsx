import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Calendar, Plus, Mail, Phone } from 'lucide-react'
import { formatDate, formatTime } from '@/lib/utils'
import { ArchiveClientButton } from './archive-client-button'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('clients').select('full_name').eq('id', id).single()
  return { title: data?.full_name ?? 'Client' }
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('therapist_id', user!.id)
    .single()

  if (!client) notFound()

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('client_id', id)
    .order('start_time', { ascending: false })
    .limit(20)

  const upcoming = appointments?.filter((a) => a.status === 'scheduled' && new Date(a.start_time) > new Date()) ?? []
  const past = appointments?.filter((a) => a.status !== 'scheduled' || new Date(a.start_time) <= new Date()) ?? []

  return (
    <div className="p-8">
      <Link href="/clients" className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to clients
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-700 font-bold text-xl">{client.full_name[0].toUpperCase()}</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{client.full_name}</h1>
            <div className="flex items-center gap-4 mt-1">
              {client.email && (
                <span className="flex items-center gap-1.5 text-slate-500 text-sm">
                  <Mail className="w-3.5 h-3.5" />
                  {client.email}
                </span>
              )}
              {client.phone && (
                <span className="flex items-center gap-1.5 text-slate-500 text-sm">
                  <Phone className="w-3.5 h-3.5" />
                  {client.phone}
                </span>
              )}
            </div>
            {client.tags && client.tags.length > 0 && (
              <div className="flex gap-1.5 mt-2">
                {client.tags.map((tag: string) => (
                  <span key={tag} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/appointments/new?client=${client.id}`}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New appointment
          </Link>
          <ArchiveClientButton clientId={client.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notes */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Notes</h2>
            {client.notes ? (
              <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">{client.notes}</p>
            ) : (
              <p className="text-slate-400 text-sm italic">No notes yet</p>
            )}
          </div>
        </div>

        {/* Appointments */}
        <div className="lg:col-span-2 space-y-6">
          {upcoming.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Upcoming sessions</h2>
              <div className="space-y-3">
                {upcoming.map((appt) => (
                  <ApptRow key={appt.id} appt={appt} />
                ))}
              </div>
            </div>
          )}
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Session history</h2>
            {past.length > 0 ? (
              <div className="space-y-3">
                {past.map((appt) => (
                  <ApptRow key={appt.id} appt={appt} />
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                <p className="text-sm">No sessions yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-slate-100 text-slate-500',
  no_show: 'bg-red-50 text-red-600',
}

function ApptRow({ appt }: { appt: any }) {
  return (
    <Link href={`/appointments/${appt.id}`} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
      <div className="min-w-[100px]">
        <div className="text-xs text-slate-500">{formatDate(appt.start_time)}</div>
        <div className="text-sm font-medium text-slate-900">{formatTime(appt.start_time)}</div>
      </div>
      <div className="flex-1">
        <div className="text-sm text-slate-700">{appt.title || 'Session'}</div>
      </div>
      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[appt.status] ?? ''}`}>
        {appt.status}
      </span>
    </Link>
  )
}
