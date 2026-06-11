export const metadata = { title: 'Terms of Service — Praxio' }

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <a href="/" className="text-blue-600 text-sm hover:underline">← Back to Praxio</a>
        <h1 className="text-3xl font-bold text-slate-900 mt-8 mb-2">Terms of Service</h1>
        <p className="text-slate-500 text-sm mb-10">Last updated: June 11, 2025</p>

        <div className="prose prose-slate max-w-none space-y-8 text-slate-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using Praxio ("Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service. Praxio is operated as a software-as-a-service product for licensed mental health professionals in private practice.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Description of Service</h2>
            <p>Praxio provides appointment scheduling, client record management, session notes, and automated email reminder functionality for solo therapy practitioners. The Service is not a medical device and does not provide medical advice, diagnosis, or treatment.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Eligibility</h2>
            <p>You must be at least 18 years old and a licensed mental health professional (or operate under appropriate supervision) to use Praxio. By using the Service, you represent that you meet these requirements.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Account Registration</h2>
            <p>You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. Notify us immediately at support@praxio.app if you suspect unauthorized access.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Subscription and Billing</h2>
            <p>Praxio is offered on a subscription basis at $29 per month (or equivalent annual rate). Your subscription begins after the 14-day free trial. Billing is processed through our payment provider. You may cancel at any time; cancellation takes effect at the end of the current billing period. No partial-month refunds are issued unless required by law.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Client Data and HIPAA</h2>
            <p>You are responsible for ensuring your use of Praxio complies with applicable healthcare privacy laws, including HIPAA where applicable. You retain full ownership of all client data you enter into Praxio. We process that data only to provide the Service as described in our Privacy Policy. We do not sell or share client data with third parties for marketing purposes.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Acceptable Use</h2>
            <p>You agree not to: (a) use the Service for unlawful purposes; (b) upload content that infringes third-party rights; (c) attempt to gain unauthorized access to any part of the Service; (d) use the Service to store or transmit malicious code; (e) resell or sublicense access to the Service without written permission.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Availability and Uptime</h2>
            <p>We aim to maintain high availability but do not guarantee uninterrupted access. Scheduled maintenance will be communicated in advance where possible. We are not liable for losses resulting from service downtime.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">9. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Praxio's total liability to you for any claim arising from these Terms or your use of the Service shall not exceed the amount you paid us in the three months preceding the claim. We are not liable for indirect, incidental, or consequential damages.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">10. Termination</h2>
            <p>We may suspend or terminate your account if you violate these Terms. You may delete your account at any time from the Settings page. Upon termination, your data will be retained for 30 days then permanently deleted, except where we are required by law to retain it longer.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">11. Changes to Terms</h2>
            <p>We may update these Terms from time to time. We will notify you by email at least 14 days before material changes take effect. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">12. Governing Law</h2>
            <p>These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles. Any disputes shall be resolved in the courts of Delaware.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">13. Contact</h2>
            <p>Questions about these Terms? Email us at <a href="mailto:support@praxio.app" className="text-blue-600 hover:underline">support@praxio.app</a>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
