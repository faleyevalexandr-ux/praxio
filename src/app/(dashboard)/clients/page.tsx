import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Users, Plus, Search } from 'lucide-react'

export const metadata = { title: 'Clients' }

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: clients } = await supabase
    .from('clients')
    .select('*, appointments(count)')
    .eq('therapist_id', user!.id)
    .is('archived_at', null)
    .order('full_name')

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-500 text-sm mt-1">{clients?.length ?? 0} active clients</p>
        </div>
        <Link
          href="/clients/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add client
        </Link>
      </div>

      {clients && clients.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-4 text-slate-500 text-sm font-medium">Name</th>
                <th className="text-left px-6 py-4 text-slate-500 text-sm font-medium">Email</th>
                <th className="text-left px-6 py-4 text-slate-500 text-sm font-medium">Phone</th>
                <th className="text-left px-6 py-4 text-slate-500 text-sm font-medium">Tags</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client: any) => (
                <tr key={client.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-700 text-xs font-semibold">
                          {client.full_name[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-slate-900">{client.full_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-sm">{client.email || '—'}</td>
                  <td className="px-6 py-4 text-slate-600 text-sm">{client.phone || '—'}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1.5 flex-wrap">
                      {client.tags?.map((tag: string) => (
                        <span key={tag} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/clients/${client.id}`}
                      className="text-blue-600 text-sm hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 p-16 text-center">
          <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="font-semibold text-slate-900 mb-2">No clients yet</h3>
          <p className="text-slate-500 text-sm mb-6">Add your first client to get started</p>
          <Link
            href="/clients/new"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add first client
          </Link>
        </div>
      )}
    </div>
  )
}
