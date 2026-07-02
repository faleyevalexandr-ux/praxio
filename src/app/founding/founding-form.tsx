'use client'

import { useState, type FormEvent } from 'react'
import { CheckCircle } from 'lucide-react'

export default function FoundingForm() {
  const [email, setEmail] = useState('')
  const [practice, setPractice] = useState('')
  const [tool, setTool] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setMsg('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          practice_type: practice,
          current_tool: tool,
          source: 'founding',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setMsg(data.error ?? 'Something went wrong.')
        return
      }
      setStatus('done')
    } catch {
      setStatus('error')
      setMsg('Network error — please try again.')
    }
  }

  if (status === 'done') {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">You&apos;re on the founding list</h3>
        <p className="text-slate-600 text-sm">
          Your $19/month founding rate is reserved. We&apos;ll email you the moment Praxio opens —
          no charge until you&apos;re actually using it.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
          Work email *
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourpractice.com"
          className="w-full border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="practice" className="block text-sm font-medium text-slate-700 mb-1.5">
          What do you practice? <span className="text-slate-400">(optional)</span>
        </label>
        <input
          id="practice"
          type="text"
          value={practice}
          onChange={(e) => setPractice(e.target.value)}
          placeholder="e.g. counselling, psychotherapy, CBT"
          className="w-full border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="tool" className="block text-sm font-medium text-slate-700 mb-1.5">
          What do you use today? <span className="text-slate-400">(optional)</span>
        </label>
        <input
          id="tool"
          type="text"
          value={tool}
          onChange={(e) => setTool(e.target.value)}
          placeholder="e.g. SimplePractice, pen & paper, nothing"
          className="w-full border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {status === 'error' && <p className="text-red-500 text-sm">{msg}</p>}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
      >
        {status === 'loading' ? 'Reserving…' : 'Lock my $19/month founding rate'}
      </button>
      <p className="text-slate-400 text-xs text-center">
        No card required. We only charge once you start using Praxio.
      </p>
    </form>
  )
}
