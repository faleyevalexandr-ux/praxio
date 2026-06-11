'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Archive } from 'lucide-react'

export function ArchiveClientButton({ clientId }: { clientId: string }) {
  const router = useRouter()
  const supabase = createClient()

  async function handleArchive() {
    if (!confirm('Archive this client? They will be hidden from the clients list.')) return

    await supabase
      .from('clients')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', clientId)

    router.push('/clients')
  }

  return (
    <button
      onClick={handleArchive}
      className="flex items-center gap-2 border border-slate-200 text-slate-600 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
    >
      <Archive className="w-4 h-4" />
      Archive
    </button>
  )
}
