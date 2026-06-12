'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function NoShowCalculator() {
  const [sessionsPerWeek, setSessionsPerWeek] = useState(20)
  const [fee, setFee] = useState(120)
  const [noShowRate, setNoShowRate] = useState(8)

  const weeklyLoss = sessionsPerWeek * (noShowRate / 100) * fee
  const yearlyLoss = weeklyLoss * 48 // 48 рабочих недель
  const recovered = yearlyLoss * 0.45 // напоминания сокращают no-show на ~30-60%

  const fmt = (n: number) => '$' + Math.round(n).toLocaleString('en-US')

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-slate-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
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

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          Therapy No-Show Cost Calculator
        </h1>
        <p className="text-xl text-slate-600 mb-12">
          No-shows feel like &quot;part of the job&quot; — until you see the yearly number.
          Calculate what missed sessions actually cost your practice.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
          {/* Inputs */}
          <div className="space-y-8">
            <div>
              <label className="flex justify-between text-sm font-medium text-slate-700 mb-2">
                <span>Sessions per week</span>
                <span className="text-blue-600 font-semibold">{sessionsPerWeek}</span>
              </label>
              <input
                type="range" min={5} max={40} value={sessionsPerWeek}
                onChange={(e) => setSessionsPerWeek(+e.target.value)}
                className="w-full accent-blue-600"
              />
            </div>
            <div>
              <label className="flex justify-between text-sm font-medium text-slate-700 mb-2">
                <span>Session fee</span>
                <span className="text-blue-600 font-semibold">${fee}</span>
              </label>
              <input
                type="range" min={50} max={300} step={5} value={fee}
                onChange={(e) => setFee(+e.target.value)}
                className="w-full accent-blue-600"
              />
            </div>
            <div>
              <label className="flex justify-between text-sm font-medium text-slate-700 mb-2">
                <span>No-show / late-cancel rate</span>
                <span className="text-blue-600 font-semibold">{noShowRate}%</span>
              </label>
              <input
                type="range" min={1} max={25} value={noShowRate}
                onChange={(e) => setNoShowRate(+e.target.value)}
                className="w-full accent-blue-600"
              />
              <p className="text-xs text-slate-400 mt-1">Industry average for private practice: 5–10%</p>
            </div>
          </div>

          {/* Results */}
          <div className="bg-slate-50 rounded-2xl p-8 flex flex-col justify-center">
            <div className="mb-6">
              <div className="text-sm text-slate-500 mb-1">You lose every week</div>
              <div className="text-3xl font-bold text-slate-900">{fmt(weeklyLoss)}</div>
            </div>
            <div className="mb-6">
              <div className="text-sm text-slate-500 mb-1">Per year (48 working weeks)</div>
              <div className="text-5xl font-bold text-red-600">{fmt(yearlyLoss)}</div>
            </div>
            <div className="border-t border-slate-200 pt-6">
              <div className="text-sm text-slate-500 mb-1">Recoverable with automated reminders*</div>
              <div className="text-3xl font-bold text-green-600">{fmt(recovered)}/yr</div>
              <p className="text-xs text-slate-400 mt-2">
                *Studies consistently show reminders cut no-shows by 30–60%. We use 45%.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-600 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">
            Praxio reminders cost $29/month. Your no-shows cost {fmt(yearlyLoss / 12)}/month.
          </h2>
          <p className="text-blue-100 mb-6">Automated email reminders, scheduling, and client notes for solo therapists.</p>
          <Link
            href="/login"
            className="inline-block bg-white text-blue-700 px-8 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
          >
            Start 14-day free trial →
          </Link>
        </div>

        <div className="mt-16 text-slate-600 text-sm leading-relaxed space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">How this calculator works</h2>
          <p>
            Weekly loss = sessions per week × no-show rate × session fee. Yearly figure assumes 48
            working weeks (4 weeks off). The recovery estimate applies a 45% reduction — the midpoint
            of published findings on appointment reminder effectiveness in outpatient settings (30–60%).
          </p>
          <p>
            Even a single prevented no-show per month typically covers the cost of any reminder tool.
            The bigger cost is invisible: an empty slot can&apos;t be re-billed, but your rent, insurance
            and time run anyway.
          </p>
        </div>
      </main>
    </div>
  )
}
