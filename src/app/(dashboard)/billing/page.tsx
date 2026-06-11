import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CheckCircle, ExternalLink } from 'lucide-react'

export const metadata = { title: 'Billing' }

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, trial_ends_at, stripe_customer_id')
    .eq('id', user.id)
    .single()

  const isActive = profile?.subscription_status === 'active'
  const isTrialing = profile?.subscription_status === 'trialing'
  const trialEnds = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null
  const trialDaysLeft = trialEnds
    ? Math.max(0, Math.ceil((trialEnds.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Billing</h1>

      {/* Subscription status */}
      <div className="bg-white rounded-xl border border-slate-100 p-6 mb-6">
        <h2 className="font-semibold text-slate-900 mb-4">Subscription status</h2>
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500' : isTrialing ? 'bg-amber-400' : 'bg-red-400'}`} />
          <div>
            <div className="font-medium text-slate-900 capitalize">
              {profile?.subscription_status ?? 'unknown'}
            </div>
            {isTrialing && trialDaysLeft > 0 && (
              <div className="text-slate-500 text-sm">
                Trial ends in {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''}
              </div>
            )}
            {isActive && (
              <div className="text-slate-500 text-sm">$29/month · Praxio Pro</div>
            )}
          </div>
        </div>

        {/* CTA depending on status */}
        {!isActive && (
          <UpgradeButton userId={user.id} />
        )}
        {isActive && profile?.stripe_customer_id && (
          <ManagePortalButton customerId={profile.stripe_customer_id} />
        )}
      </div>

      {/* Plan details */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Praxio Pro — $29/month</h2>
        <ul className="space-y-2.5">
          {[
            'Unlimited clients',
            'Unlimited appointments',
            'Automatic email reminders (24h before)',
            'Client notes & tags',
            'HIPAA-friendly data storage',
            'Email support',
          ].map((f) => (
            <li key={f} className="flex items-center gap-3 text-slate-700 text-sm">
              <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// Server actions for checkout / portal
function UpgradeButton({ userId }: { userId: string }) {
  async function startCheckout() {
    'use server'
    const { createClient: createSC } = await import('@/lib/supabase/server')
    const { stripe, PLANS } = await import('@/lib/stripe')
    const { redirect: redir } = await import('next/navigation')
    const supabase = await createSC()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', userId)
      .single()

    let customerId = profile?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email ?? undefined,
        metadata: { supabase_user_id: userId },
      })
      customerId = customer.id
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId)
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: PLANS.monthly.priceId, quantity: 1 }],
      subscription_data: { trial_period_days: PLANS.monthly.trialDays },
      success_url: `${appUrl}/billing?success=1`,
      cancel_url: `${appUrl}/billing`,
      allow_promotion_codes: true,
    })

    redir(session.url!)
  }

  return (
    <form action={startCheckout}>
      <button
        type="submit"
        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
      >
        Start subscription — $29/month
      </button>
    </form>
  )
}

function ManagePortalButton({ customerId }: { customerId: string }) {
  async function openPortal() {
    'use server'
    const { stripe } = await import('@/lib/stripe')
    const { redirect: redir } = await import('next/navigation')
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/billing`,
    })
    redir(session.url)
  }

  return (
    <form action={openPortal}>
      <button
        type="submit"
        className="flex items-center gap-2 border border-slate-200 text-slate-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        Manage subscription
      </button>
    </form>
  )
}
