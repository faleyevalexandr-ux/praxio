'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft } from 'lucide-react'

export default function NewAppointmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const defaultClientId = searchParams.get('client') ?? ''

  const [form, setForm] = useState({
    client_id: defaultClientId,
    title: 'Therapy Session',
    start_date: new Date().toISOString().slice(0, 10),
    start_time: '10:00',
    duration_min: '50',
    notes: '',
  })

  useEffect(() => {
    async function loadClients() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from('clients')
        .select('id, full_name')
        .eq('therapist_id', user!.id)
        .is('archived_at', null)
        .order('full_name')
      setClients(data ?? [])
    }
    loadClients()
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const startTime = new Date(`${form.start_date}T${form.start_time}:00`)
    const endTime = new Date(startTime.getTime() + parseInt(form.duration_min) * 60 * 1000)

    const { data, error: err } = await supabase
      .from('appointments')
      .insert({
        therapist_id: user.id,
        client_id: form.client_id,
        title: form.title,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        notes: form.notes || null,
      })
      .select()
      .single()

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    // Queue reminders
    await queueReminders(data.id, startTime, supabase)

    router.push(`/appointments/${data.id}`)
  }

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/appointments" className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to appointments
      </Link>

      <h1 className="text-2xl font-bold text-slate-900 mb-8">Schedule appointment</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-100 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Client *</label>
          <select
            name="client_id"
            value={form.client_id}
            onChange={handleChange}
            required
            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
          >
            <option value="">Select client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </select>
          {clients.length === 0 && (
            <p className="text-slate-500 text-xs mt-1">
              <Link href="/clients/new" className="text-blue-600 hover:underline">Add a client first</Link>
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Session title</label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Date *</label>
            <input
              type="date"
              name="start_date"
              value={form.start_date}
              onChange={handleChange}
              required
              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Time *</label>
            <input
              type="time"
              name="start_time"
              value={form.start_time}
              onChange={handleChange}
              required
              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Duration</label>
          <select
            name="duration_min"
            value={form.duration_min}
            onChange={handleChange}
            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
          >
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="50">50 minutes</option>
            <option value="60">60 minutes</option>
            <option value="90">90 minutes</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
            placeholder="Session notes…"
            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
          />
        </div>

        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-blue-700 text-xs">
            📧 Client will receive an automatic email reminder 24 hours before the session.
          </p>
        </div>

        {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || clients.length === 0}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Scheduling…' : 'Schedule appointment'}
          </button>
          <Link
            href="/appointments"
            className="px-6 py-2.5 rounded-lg font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

async function queueReminders(appointmentId: string, startTime: Date, supabase: any) {
  const reminders = []

  const h24 = new Date(startTime.getTime() - 24 * 60 * 60 * 1000)
  if (h24 > new Date()) {
    reminders.push({ appointment_id: appointmentId, type: '24h', send_at: h24.toISOString() })
  }

  const h1 = new Date(startTime.getTime() - 60 * 60 * 1000)
  if (h1 > new Date()) {
    reminders.push({ appointment_id: appointmentId, type: '1h', send_at: h1.toISOString() })
  }

  if (reminders.length > 0) {
    await supabase.from('reminders').insert(reminders)
  }
}
