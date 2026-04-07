import Link from 'next/link'
import { Mail, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with ApplyAgent support.',
}

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-2 text-3xl font-bold">Contact Us</h1>
      <p className="mb-8 text-muted-foreground">
        Have a question, issue, or feedback? We&apos;d love to hear from you.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Mail className="size-5 text-primary" />
              <CardTitle className="text-lg">Email Support</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              For general inquiries, technical issues, or billing questions.
            </p>
            <a
              href="mailto:support@applyagent.ca"
              className="text-sm font-medium text-primary hover:underline"
            >
              support@applyagent.ca
            </a>
            <p className="mt-3 text-xs text-muted-foreground">
              We typically respond within 1-2 business days.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileText className="size-5 text-primary" />
              <CardTitle className="text-lg">Legal &amp; Privacy</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              For data requests, privacy concerns, or legal inquiries.
            </p>
            <a
              href="mailto:legal@applyagent.ca"
              className="text-sm font-medium text-primary hover:underline"
            >
              legal@applyagent.ca
            </a>
            <p className="mt-3 text-xs text-muted-foreground">
              For data deletion or export requests, include your account email.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 rounded-lg border bg-muted/50 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Before reaching out, you might find your answer in our{' '}
          <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          {' '}or{' '}
          <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>.
        </p>
      </div>

      <div className="mt-12 border-t pt-6 text-center">
        <Link href="/" className="text-sm text-primary hover:underline">Back to home</Link>
      </div>
    </div>
  )
}
