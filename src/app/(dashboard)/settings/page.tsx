import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsForm } from './settings-form'

export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, practice_name, timezone, phone')
    .eq('id', user.id)
    .single()

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Settings</h1>
      <SettingsForm
        userId={user.id}
        initialData={{
          full_name: profile?.full_name ?? '',
          practice_name: profile?.practice_name ?? '',
          timezone: profile?.timezone ?? 'America/New_York',
          phone: profile?.phone ?? '',
          email: user.email ?? '',
        }}
      />
    </div>
  )
}
