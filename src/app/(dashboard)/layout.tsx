import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Calendar, Users, LayoutDashboard, CreditCard, Settings } from 'lucide-react'
import { SignOutButton } from '@/components/sign-out-button'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/appointments', label: 'Appointments', icon: Calendar },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check subscription status
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, trial_ends_at, full_name, practice_name')
    .eq('id', user.id)
    .single()

  const isActive =
    profile?.subscription_status === 'active' ||
    profile?.subscription_status === 'trialing'

  // If expired, redirect to billing (unless already there)
  // This is handled by middleware too, but belt-and-suspenders

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-100 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="font-semibold text-slate-900">Praxio</span>
          </div>
          {profile?.practice_name && (
            <p className="text-slate-500 text-xs mt-2 truncate">{profile.practice_name}</p>
          )}
        </div>

        {/* Trial banner */}
        {profile?.subscription_status === 'trialing' && profile.trial_ends_at && (
          <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-amber-700 text-xs font-medium">
              Trial ends {new Date(profile.trial_ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
            <Link href="/billing" className="text-amber-700 text-xs underline">
              Upgrade now →
            </Link>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <NavLink key={href} href={href} label={label} icon={<Icon className="w-4 h-4" />} />
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
              <span className="text-slate-600 text-xs font-medium">
                {(profile?.full_name || user.email || '?')[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {profile?.full_name || 'My Account'}
              </p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-sm font-medium"
    >
      {icon}
      {label}
    </Link>
  )
}
