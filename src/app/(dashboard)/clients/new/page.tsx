'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft } from 'lucide-react'

export default function NewClientPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    notes: '',
    tags: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const tags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const { data, error: err } = await supabase
      .from('clients')
      .insert({
        therapist_id: user.id,
        full_name: form.full_name,
        email: form.email || null,
        phone: form.phone || null,
        notes: form.notes || null,
        tags,
      })
      .select()
      .single()

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    router.push(`/clients/${data.id}`)
  }

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/clients" className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to clients
      </Link>

      <h1 className="text-2xl font-bold text-slate-900 mb-8">Add new client</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-100 p-6 space-y-5">
        <Field label="Full name *" name="full_name" value={form.full_name} onChange={handleChange} required placeholder="Jane Smith" />
        <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="jane@example.com" />
        <Field label="Phone" name="phone" value={form.phone} onChange={handleChange} placeholder="+1 (555) 000-0000" />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={4}
            placeholder="Initial notes about this client..."
            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
          />
        </div>
        <Field
          label="Tags (comma separated)"
          name="tags"
          value={form.tags}
          onChange={handleChange}
          placeholder="anxiety, CBT, weekly"
        />

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Saving…' : 'Add client'}
          </button>
          <Link
            href="/clients"
            className="px-6 py-2.5 rounded-lg font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

function Field({
  label, name, value, onChange, type = 'text', required = false, placeholder = ''
}: {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; required?: boolean; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="w-full border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      />
    </div>
  )
}
