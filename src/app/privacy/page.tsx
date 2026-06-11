export const metadata = { title: 'Privacy Policy — Praxio' }

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <a href="/" className="text-blue-600 text-sm hover:underline">← Back to Praxio</a>
        <h1 className="text-3xl font-bold text-slate-900 mt-8 mb-2">Privacy Policy</h1>
        <p className="text-slate-500 text-sm mb-10">Last updated: June 11, 2025</p>

        <div className="space-y-8 text-slate-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">1. What we collect</h2>
            <p className="mb-3">We collect the following categories of information:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Account data:</strong> your name, email address, practice name, timezone, and phone number provided at signup or in Settings.</li>
              <li><strong>Client data:</strong> names, email addresses, appointment details, and session notes you enter about your clients.</li>
              <li><strong>Billing data:</strong> subscription status and customer ID. Full payment card details are handled by our payment processor (Paddle) and never stored on our servers.</li>
              <li><strong>Usage data:</strong> page views, feature interactions, and error logs used to improve the Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">2. How we use your data</h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>To provide and maintain the Service</li>
              <li>To send appointment reminder emails to your clients on your behalf</li>
              <li>To process subscription billing</li>
              <li>To send you transactional emails (login links, billing receipts)</li>
              <li>To detect and prevent fraud or abuse</li>
              <li>To improve the Service through aggregated, anonymized analytics</li>
            </ul>
            <p className="mt-3">We do <strong>not</strong> sell your data or your clients' data. We do not use client data for advertising.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Data storage and security</h2>
            <p>Data is stored on Supabase infrastructure (SOC 2 Type II certified). All data is encrypted at rest (AES-256) and in transit (TLS 1.2+). Access to production databases is restricted to authorized personnel only.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Third-party services</h2>
            <p className="mb-3">We share data with the following sub-processors only as necessary to provide the Service:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Supabase</strong> — database and authentication hosting</li>
              <li><strong>Vercel</strong> — application hosting and edge functions</li>
              <li><strong>Paddle</strong> — payment processing and subscription management</li>
              <li><strong>Resend</strong> — transactional email delivery</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Client data ownership</h2>
            <p>You own all client data you enter into Praxio. We are a data processor acting on your instructions. You are the data controller responsible for obtaining appropriate consent from your clients for the processing described above (including sending reminder emails).</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Data retention</h2>
            <p>We retain your data for as long as your account is active. If you delete your account, all associated data is permanently deleted within 30 days, except where we are required by law to retain it longer.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Your rights</h2>
            <p>You have the right to access, correct, export, or delete your data at any time. To exercise these rights, email <a href="mailto:support@praxio.app" className="text-blue-600 hover:underline">support@praxio.app</a>. We will respond within 30 days.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Cookies</h2>
            <p>We use only essential cookies required for authentication (session tokens). We do not use tracking, advertising, or analytics cookies.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">9. Changes to this policy</h2>
            <p>We will notify you by email at least 14 days before any material changes to this policy take effect.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">10. Contact</h2>
            <p>Privacy questions: <a href="mailto:support@praxio.app" className="text-blue-600 hover:underline">support@praxio.app</a></p>
          </section>
        </div>
      </div>
    </div>
  )
}
