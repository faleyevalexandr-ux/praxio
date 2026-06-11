export const metadata = { title: 'Refund Policy — Praxio' }

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <a href="/" className="text-blue-600 text-sm hover:underline">← Back to Praxio</a>
        <h1 className="text-3xl font-bold text-slate-900 mt-8 mb-2">Refund Policy</h1>
        <p className="text-slate-500 text-sm mb-10">Last updated: June 11, 2025</p>

        <div className="space-y-8 text-slate-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Free trial</h2>
            <p>Praxio offers a 14-day free trial. No credit card is required to start your trial. You will not be charged until your trial period ends and you choose to continue with a paid subscription.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Cancellation</h2>
            <p>You may cancel your subscription at any time from the Billing page in your dashboard. Cancellation takes effect at the end of your current billing period. You will retain full access to Praxio until that date.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Refunds</h2>
            <p className="mb-3">We offer refunds in the following situations:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Within 7 days of first charge:</strong> If you are charged for the first time after your trial and decide Praxio is not right for you, contact us within 7 days for a full refund — no questions asked.</li>
              <li><strong>Service outage:</strong> If Praxio experiences downtime exceeding 24 consecutive hours in a billing period, you are entitled to a pro-rated credit for that period.</li>
              <li><strong>Accidental double charge:</strong> If you are charged twice for the same period, we will refund the duplicate charge immediately upon verification.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Non-refundable situations</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Partial months after the 7-day new-subscriber window</li>
              <li>Annual plans after the 7-day window (except as required by law)</li>
              <li>Accounts terminated for violations of our Terms of Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">How to request a refund</h2>
            <p>Email <a href="mailto:support@praxio.app" className="text-blue-600 hover:underline">support@praxio.app</a> with the subject line "Refund Request" and include your account email. We process refunds within 5 business days. Refunds are returned to the original payment method.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Questions</h2>
            <p>Contact us at <a href="mailto:support@praxio.app" className="text-blue-600 hover:underline">support@praxio.app</a> — we respond within 1 business day.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
