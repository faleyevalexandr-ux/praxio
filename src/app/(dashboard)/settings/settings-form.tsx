'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle } from 'lucide-react'

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Australia/Sydney',
  'Australia/Melbourne',
]

export function SettingsForm({
  userId,
  initialData,
}: {
  userId: string
  initialData: {
    full_name: string
    practice_name: string
    timezone: string
    phone: string
    email: string
  }
}) {
  const [form, setForm] = useState(initialData)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
    setSaved(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const supabase = createClient()
    const { error: err } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name,
        practice_name: form.practice_name,
        timezone: form.timezone,
        phone: form.phone,
      })
      .eq('id', userId)

    if (err) {
      setError(err.message)
    } else {
      setSaved(true)
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Profile */}
      <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Profile</h2>
        <Field label="Full name" name="full_name" value={form.full_name} onChange={handleChange} />
        <Field label="Practice name" name="practice_name" value={form.practice_name} onChange={handleChange} placeholder="e.g. Smith Therapy" />
        <Field label="Phone" name="phone" value={form.phone} onChange={handleChange} placeholder="+1 (555) 000-0000" />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
          <input
            value={form.email}
            disabled
            className="w-full border border-slate-100 rounded-lg px-4 py-3 text-slate-400 bg-slate-50 text-sm cursor-not-allowed"
          />
          <p className="text-xs text-slate-400 mt-1">Email cannot be changed here — contact support</p>
        </div>
      </div>

      {/* Timezone */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Timezone</h2>
        <p className="text-sm text-slate-500 mb-3">
          Used for displaying appointment times correctly.
        </p>
        <select
          name="timezone"
          value={form.timezone}
          onChange={handleChange}
          className="w-full border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {saved && (
          <div className="flex items-center gap-1.5 text-green-600 text-sm">
            <CheckCircle className="w-4 h-4" />
            Saved
          </div>
        )}
      </div>
    </form>
  )
}

function Field({
  label, name, value, onChange, placeholder = ''
}: {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      />
    </div>
  )
}
