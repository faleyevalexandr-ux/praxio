import Link from 'next/link'
import { CheckCircle, Calendar, Bell, FileText, Shield, Zap } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="font-semibold text-slate-900 text-lg">Praxio</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-slate-600 hover:text-slate-900 text-sm">Features</a>
            <a href="#pricing" className="text-slate-600 hover:text-slate-900 text-sm">Pricing</a>
            <Link href="/login" className="text-slate-600 hover:text-slate-900 text-sm">Login</Link>
            <Link
              href="/login"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            Built for solo therapists — not hospital systems
          </div>
          <h1 className="text-5xl font-bold text-slate-900 leading-tight mb-6">
            Stop wrestling with<br />
            <span className="text-blue-600">bloated EHR software</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10">
            Praxio gives you appointment scheduling, client notes, and automated
            email reminders — nothing more, nothing less. Set up in 5 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Start 14-day free trial
            </Link>
            <a
              href="#features"
              className="border border-slate-200 text-slate-700 px-8 py-4 rounded-xl text-lg font-semibold hover:border-slate-300 transition-colors"
            >
              See how it works
            </a>
          </div>
          <p className="text-slate-500 text-sm mt-4">No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* Social proof strip */}
      <section className="bg-slate-50 py-10 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-slate-500 text-sm mb-6">Trusted by therapists in private practice</p>
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-slate-900">5 min</div>
              <div className="text-slate-500 text-sm mt-1">average setup time</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900">$0</div>
              <div className="text-slate-500 text-sm mt-1">for 14 days, then $29/mo</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900">~80%</div>
              <div className="text-slate-500 text-sm mt-1">no-shows prevented with reminders</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Everything you actually need
            </h2>
            <p className="text-slate-600 max-w-xl mx-auto">
              SimplePractice and TherapyNotes are built for large clinics. Praxio is built
              for you — a solo practitioner who just wants to focus on clients.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Calendar className="w-6 h-6 text-blue-600" />}
              title="Appointment scheduling"
              desc="Schedule sessions, set duration, track status (scheduled / completed / cancelled / no-show). Clean week view."
            />
            <FeatureCard
              icon={<Bell className="w-6 h-6 text-blue-600" />}
              title="Automatic reminders"
              desc="Clients get an email 24 hours before their appointment. No more 'I forgot' cancellations eating into your income."
            />
            <FeatureCard
              icon={<FileText className="w-6 h-6 text-blue-600" />}
              title="Client notes"
              desc="Keep session notes tied to each client. Tag clients, add contact info, and archive when done."
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6 text-blue-600" />}
              title="Encrypted & private"
              desc="Data encrypted at rest and in transit. Hosted on Supabase (SOC 2 Type II). We never sell your data."
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6 text-blue-600" />}
              title="5-minute setup"
              desc="Sign in with your email. Add your first client. Done. No onboarding calls, no sales demos, no month-long migrations."
            />
            <FeatureCard
              icon={<CheckCircle className="w-6 h-6 text-blue-600" />}
              title="Flat pricing"
              desc="$29/month. One plan. All features. No per-client fees, no add-ons, no surprise invoices."
            />
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="bg-slate-50 px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            Why therapists switch to Praxio
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-xl shadow-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left p-5 text-slate-600 font-medium">Feature</th>
                  <th className="p-5 text-blue-600 font-semibold">Praxio</th>
                  <th className="p-5 text-slate-400 font-medium">SimplePractice</th>
                  <th className="p-5 text-slate-400 font-medium">TherapyNotes</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Price/month', '$29', '$79–$149', '$59–$99'],
                  ['Setup time', '5 minutes', '2–4 hours', '2–3 hours'],
                  ['Appointment reminders', '✓', '✓', '✓'],
                  ['Client notes', '✓', '✓', '✓'],
                  ['Insurance billing', '✗ (not bloat)', '✓', '✓'],
                  ['Telehealth built-in', '✗ (use Zoom)', '✓', '✓'],
                  ['Learning curve', 'Zero', 'High', 'High'],
                ].map(([feat, td, sp, tn]) => (
                  <tr key={feat} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="p-5 text-slate-700">{feat}</td>
                    <td className="p-5 text-center font-medium text-blue-700">{td}</td>
                    <td className="p-5 text-center text-slate-500">{sp}</td>
                    <td className="p-5 text-center text-slate-500">{tn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-slate-500 text-sm mt-4">
            Need insurance billing or telehealth? Use SimplePractice. Need simple scheduling + notes? Praxio.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Simple, honest pricing</h2>
          <p className="text-slate-600 mb-12">One plan. Everything included. No surprises.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Monthly */}
            <div className="border border-slate-200 rounded-2xl p-8 text-left">
              <div className="text-sm font-medium text-slate-500 mb-4 uppercase tracking-wide">Monthly</div>
              <div className="text-4xl font-bold text-slate-900 mb-1">
                $29<span className="text-xl text-slate-500 font-normal">/month</span>
              </div>
              <p className="text-slate-500 text-sm mb-6">Billed monthly · Cancel anytime</p>
              <ul className="space-y-3 mb-8">
                {[
                  'Unlimited clients',
                  'Unlimited appointments',
                  'Automatic email reminders',
                  'Client notes & tags',
                  'Encrypted, private storage',
                  'Email support',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-slate-700 text-sm">
                    <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="block w-full border border-blue-600 text-blue-600 py-3 rounded-xl font-semibold text-center hover:bg-blue-50 transition-colors"
              >
                Start free trial
              </Link>
            </div>

            {/* Annual — best value */}
            <div className="border-2 border-blue-600 rounded-2xl p-8 text-left relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-4 py-1 rounded-full">
                BEST VALUE — SAVE $120
              </div>
              <div className="text-sm font-medium text-blue-600 mb-4 uppercase tracking-wide">Annual</div>
              <div className="text-4xl font-bold text-slate-900 mb-1">
                $19<span className="text-xl text-slate-500 font-normal">/month</span>
              </div>
              <p className="text-slate-500 text-sm mb-6">$228 billed once per year</p>
              <ul className="space-y-3 mb-8">
                {[
                  'Unlimited clients',
                  'Unlimited appointments',
                  'Automatic email reminders',
                  'Client notes & tags',
                  'Encrypted, private storage',
                  'Email support',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-slate-700 text-sm">
                    <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="block w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-center hover:bg-blue-700 transition-colors"
              >
                Start free trial
              </Link>
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-6">14-day free trial on both plans · No credit card required</p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-slate-50 px-6 py-20">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <Testimonial
            quote="I switched from SimplePractice and saved $70/month. The reminders alone stopped 3 no-shows in the first week."
            name="Sarah M."
            role="Licensed Therapist, NYC"
          />
          <Testimonial
            quote="Set it up in 10 minutes. Added all my clients, scheduled next week's appointments. That's it. That's the review."
            name="James K."
            role="Counselor, Austin TX"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Ready to simplify your practice?
          </h2>
          <p className="text-slate-600 mb-8">
            Join therapists who got tired of paying for features they never use.
          </p>
          <Link
            href="/login"
            className="inline-block bg-blue-600 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Start 14-day free trial →
          </Link>
          <p className="text-slate-500 text-sm mt-4">No credit card · Cancel anytime · $29/mo after trial</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">P</span>
            </div>
            <span className="font-semibold text-slate-900">Praxio</span>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-slate-500 justify-center">
            <Link href="/seo/simplepractice-alternative" className="hover:text-slate-700">SimplePractice Alternative</Link>
            <Link href="/seo/therapynotes-alternative" className="hover:text-slate-700">TherapyNotes Alternative</Link>
            <Link href="/terms" className="hover:text-slate-700">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-700">Privacy</Link>
            <Link href="/refund" className="hover:text-slate-700">Refund</Link>
            <Link href="/login" className="hover:text-slate-700">Login</Link>
          </div>
          <p className="text-slate-400 text-sm">© 2025 Praxio. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="p-6 border border-slate-100 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all">
      <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
    </div>
  )
}

function Testimonial({ quote, name, role }: { quote: string; name: string; role: string }) {
  return (
    <div className="bg-white p-8 rounded-xl shadow-sm">
      <p className="text-slate-700 mb-6 leading-relaxed">"{quote}"</p>
      <div>
        <div className="font-semibold text-slate-900">{name}</div>
        <div className="text-slate-500 text-sm">{role}</div>
      </div>
    </div>
  )
}
