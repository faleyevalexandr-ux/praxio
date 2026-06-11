'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, UserX } from 'lucide-react'

export function AppointmentActions({ appointmentId }: { appointmentId: string }) {
  const router = useRouter()
  const supabase = createClient()

  async function updateStatus(status: string) {
    await supabase
      .from('appointments')
      .update({ status })
      .eq('id', appointmentId)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-6">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Update status</h2>
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => updateStatus('completed')}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          <CheckCircle className="w-4 h-4" />
          Mark completed
        </button>
        <button
          onClick={() => updateStatus('no_show')}
          className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
        >
          <UserX className="w-4 h-4" />
          No show
        </button>
        <button
          onClick={() => updateStatus('cancelled')}
          className="flex items-center gap-2 border border-slate-200 text-slate-600 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          <XCircle className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </div>
  )
}
