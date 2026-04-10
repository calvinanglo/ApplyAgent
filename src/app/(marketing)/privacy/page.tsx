import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'ApplyAgent Privacy Policy — how we collect, use, and protect your data.',
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-2 text-3xl font-bold">Privacy Policy</h1>
      <p className="mb-8 text-sm text-muted-foreground">Last updated: April 6, 2026</p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">1. Information We Collect</h2>
          <p><strong>Account Information:</strong> When you create an account, we collect your name, email address, and password. You may optionally provide your phone number, location, LinkedIn URL, GitHub URL, and portfolio URL.</p>
          <p className="mt-2"><strong>Resume and Career Data:</strong> You may provide your resume/CV content, target roles, salary expectations, and job descriptions for evaluation. This information is used solely to provide our services.</p>
          <p className="mt-2"><strong>Usage Data:</strong> We collect information about how you interact with our services, including pages visited, features used, and evaluation history.</p>
          <p className="mt-2"><strong>Payment Information:</strong> Payment processing is handled by Stripe. We do not store credit card numbers or banking details on our servers.</p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">2. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Provide AI-powered job evaluation, resume generation, and cover letter services</li>
            <li>Process payments and manage your account credits</li>
            <li>Communicate with you about your account and service updates</li>
            <li>Improve and develop our services</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">3. AI Processing</h2>
          <p>Your job descriptions, resume content, and related data are processed using third-party AI services to generate evaluations, resumes, and cover letters. This data is transmitted securely and is not used to train AI models. We recommend not including sensitive personal identifiers beyond what is necessary for resume and job evaluation purposes.</p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">4. Data Sharing</h2>
          <p>We do not sell your personal information. We share data only with:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li><strong>AI Provider:</strong> For AI-powered evaluations and content generation</li>
            <li><strong>Stripe:</strong> For secure payment processing</li>
            <li><strong>Supabase:</strong> For secure data storage and authentication</li>
          </ul>
          <p className="mt-2">We may also disclose information if required by law or to protect our rights.</p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">5. Data Security</h2>
          <p>We implement industry-standard security measures including encryption in transit (TLS), row-level security on our database, and secure authentication. However, no method of transmission over the internet is 100% secure.</p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">6. Data Retention</h2>
          <p>We retain your account data and evaluation history for as long as your account is active. You may request deletion of your account and associated data at any time through your account settings or by contacting us.</p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">7. Your Rights</h2>
          <p>Depending on your jurisdiction, you may have the right to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Export your data in a portable format</li>
            <li>Withdraw consent for data processing</li>
          </ul>
          <p className="mt-2">To exercise these rights, contact us at <a href="mailto:support@applyagent.ca" className="text-primary hover:underline">support@applyagent.ca</a>.</p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">8. Cookies</h2>
          <p>We use essential cookies for authentication and session management. These cookies are necessary for the service to function and cannot be disabled. We do not use advertising or tracking cookies.</p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">9. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page and updating the &quot;Last updated&quot; date.</p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">10. Contact Us</h2>
          <p>If you have questions about this Privacy Policy, contact us at <a href="mailto:support@applyagent.ca" className="text-primary hover:underline">support@applyagent.ca</a>.</p>
        </section>
      </div>

      <div className="mt-12 border-t pt-6 text-center">
        <Link href="/" className="text-sm text-primary hover:underline">Back to home</Link>
      </div>
    </div>
  )
}
