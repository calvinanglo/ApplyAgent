import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  FileDown,
  Mail,
  Inbox,
  List,
  Settings,
  CreditCard,
  Briefcase,
  BookOpen,
  Wrench,
  ArrowRight,
  LayoutDashboard,
  MessageSquare,
  FlaskConical,
  GraduationCap,
  GitCompare,
  Globe,
} from 'lucide-react'

const sections = [
  {
    icon: Settings,
    title: '1. Set Up Your Profile',
    badge: 'Free',
    content: [
      'Go to Profile and fill in your details. Upload your resume (PDF, DOCX, or paste as Markdown). This is the source of truth for all AI-generated content.',
      'Add your LinkedIn, GitHub, and Portfolio URLs. GitHub projects automatically appear on generated resumes.',
      'Change your password anytime (requires current password, min 8 chars with number + special character).',
      'Unsaved changes are detected — you\'ll be prompted to save before navigating away.',
    ],
  },
  {
    icon: LayoutDashboard,
    title: '2. Dashboard',
    badge: 'Free',
    content: [
      'Your home screen shows your credit balance, free uses remaining, pipeline stats, and total evaluations.',
      'Quick action cards give one-click access to every feature: Evaluate, Documents, Tools, Scanner, and Pipeline.',
      'Recent evaluations list shows your last 5 evaluations with scores, company names, and status.',
    ],
  },
  {
    icon: Search,
    title: '3. Evaluate a Job Posting',
    badge: '10 credits',
    content: [
      'Evaluating is optional — you can skip straight to generating resumes or cover letters from any job description.',
      'Go to Evaluate, paste a job description (or upload PDF/DOCX), and click Evaluate.',
      'The AI analyzes the role across multiple dimensions: Role Summary, CV Match, Level & Strategy, Compensation & Demand, Customization Tips, Interview Prep, and Draft Answers.',
      'You get a score out of 5 with detailed feedback streamed in real-time.',
      'For high-scoring jobs (4.5+), a Full Pipeline button generates both a resume and cover letter in one click (6 additional credits).',
      'Each evaluation costs 10 credits or uses one of your 3 free uses.',
    ],
  },
  {
    icon: Briefcase,
    title: '4. Track Applications',
    badge: 'Free',
    content: [
      'Every evaluation automatically creates an entry in your Applications tracker.',
      'The table shows: sequence number, company, role, score, status, resume generated, cover letter generated, and date.',
      'Click any row to view the full evaluation report. From there, generate a resume or cover letter.',
      'Multi-select checkboxes let you select and delete multiple applications at once.',
      'Update status as you progress: Evaluated, Applied, Interview, Offer, Rejected, Withdrawn, Accepted.',
      'Sort by score, company, or date. Search by company or role. Filter by status.',
    ],
  },
  {
    icon: FileDown,
    title: '5. Documents — Resume & Cover Letter',
    badge: '3-35 credits',
    content: [
      'Resume and Cover Letter generation are unified under one Documents page with tabs.',
      'Choose your AI model: Fast (Haiku, 3 cr), Balanced (Sonnet, 8 cr — best value), or Premium (Opus, 35 cr).',
      'Select from your previously evaluated jobs (searchable), or paste a new job description directly.',
      'Generate both resume and cover letter simultaneously with the combo option.',
      'Resume tab: generates an ATS-optimized, 1-page Garamond PDF. The AI injects keywords from the JD, reorders bullet points by relevance, and auto-sizes font to fit one page.',
      'If your Profile includes a GitHub URL, your most relevant projects appear on the resume with JD-tailored descriptions.',
      'Cover Letter tab: generates a tailored cover letter with proper header, greeting, 3-4 body paragraphs, closing, and signature. References specific JD requirements with real CV evidence.',
      'Both tabs: download as PDF or DOCX. Cover letters also have a Copy to clipboard button.',
      'Results show keyword coverage percentage (resume) or word count (cover letter).',
      'Generation history is saved — re-download previous resumes and cover letters anytime.',
      'Duplicate detection warns you if you already generated a document for the same job.',
    ],
  },
  {
    icon: Inbox,
    title: '6. Scanner',
    badge: '3 credits',
    content: [
      'The Scanner searches company career pages and job boards for openings matching your profile.',
      '109 companies pre-loaded across 15 industries: tech, finance, healthcare, retail, manufacturing, media, defense, education, hospitality, and more.',
      'Supports 5 ATS platforms: Greenhouse, Lever, Ashby, SmartRecruiters, and Workday.',
      '4 job boards: LinkedIn, Talent.com, CareerJet, and Jooble.',
      'Smart role autocomplete with 70+ suggestions across engineering, IT, product, business, finance, and more.',
      'Unified Filters panel: companies, keywords, location, job type, work arrangement, date posted, and salary with currency selector.',
      'Salary filters support 7 currencies (CAD, USD, EUR, GBP, AUD, CHF, INR) with preset chips and cross-currency matching.',
      'Toggle companies on/off with one click. Use "All" or "None" for bulk selection. Add custom companies by name.',
      'All filter state persists in localStorage — your settings are saved between sessions.',
      'Results show: total scraped, matched roles, duplicates skipped, and new items added to your pipeline.',
    ],
  },
  {
    icon: List,
    title: '7. Pipeline',
    badge: '10 credits/item',
    content: [
      'The Pipeline is your inbox of discovered jobs from the Scanner or manually added URLs.',
      'Add items manually by pasting a job posting URL.',
      'Tabs: Pending, Done, Errors, Processing — with counts for each.',
      'Click the play button to process a single item. The AI fetches the job description, evaluates it, and adds it to Applications.',
      '"Process All" runs every pending item in sequence with a progress bar and cancel button.',
      'Processing persists across tab switches — no progress lost when you switch away and come back.',
      'Each item shows: company, role, score, location, source platform, and relative timestamp.',
      'Retry button on errored items. "Requeue Failed" moves all errors back to pending.',
      '"Clear All Pending" and "Clear Done" buttons with confirmation for bulk cleanup.',
      'Select multiple items with checkboxes for bulk delete.',
    ],
  },
  {
    icon: BookOpen,
    title: '8. Story Bank',
    badge: 'Free',
    content: [
      'The Story Bank collects STAR+R interview stories (Situation, Task, Action, Result + Reflection) from your evaluations.',
      'Stories are real examples from your experience, mapped to common JD requirements and interview questions.',
      'Each story shows: title, JD requirement it addresses, and tags for categorization.',
      'Expand any story to see the full STAR+R breakdown.',
      'Filter by tag to find stories relevant to specific topics (e.g., leadership, security, networking).',
      'Stories accumulate automatically as you evaluate more jobs — no extra cost.',
    ],
  },
  {
    icon: Wrench,
    title: '9. Tools',
    badge: '2-5 credits',
    content: [
      'Five specialized AI tools for different parts of your job search:',
    ],
    subItems: [
      { icon: MessageSquare, name: 'LinkedIn Message Generator', cost: '2 credits', desc: 'Generates a 300-character connection request tailored to the role. Suggests the best person to contact and provides 2-3 alternative targets with personalized messages. Copy any message with one click.' },
      { icon: Search, name: 'Deep Research Prompt', cost: '3 credits', desc: 'Generates a structured research prompt for Perplexity or ChatGPT. Includes quick questions to answer, your unique positioning angle, and a full copy-paste prompt for external AI tools.' },
      { icon: FlaskConical, name: 'Project Evaluator', cost: '2 credits', desc: 'Analyzes whether a portfolio project is worth building. Returns a BUILD/SKIP/MAYBE verdict with scores across relevance, complexity, portfolio appeal, and time investment. Includes a Week 1 action plan for BUILD verdicts.' },
      { icon: GraduationCap, name: 'Training Evaluator', cost: '2 credits', desc: 'Analyzes whether a course or certification is worth pursuing. Returns a DO IT/SKIP/MAYBE verdict with timeframe, recruiter signal score, risks, and better alternatives if applicable.' },
      { icon: GitCompare, name: 'Compare Offers', cost: '5 credits', desc: 'Compare 2+ job offers across 10 dimensions: North Star alignment, CV match, level, compensation, growth, remote flexibility, company reputation, tech stack, speed to impact, and culture. Shows a scored comparison table with a final recommendation.' },
    ],
  },
  {
    icon: CreditCard,
    title: '10. Credits & Billing',
    badge: 'Free uses included',
    content: [
      'Every new account gets 3 free uses that work on any feature — not just evaluations.',
      'After your free uses, buy credit packs or subscribe:',
    ],
    table: [
      { pack: 'Starter', credits: '100', price: '$9.99', perCredit: '$0.100' },
      { pack: 'Professional', credits: '300', price: '$24.99', perCredit: '$0.083' },
      { pack: 'Power User', credits: '600', price: '$45', perCredit: '$0.075' },
    ],
    extraContent: [
      'Subscription plans also available: Starter ($15/mo, 120 credits), Growth ($35/mo, 300 credits), Scale ($79/mo, 750 credits). Annual billing saves ~20%.',
      'Your credit balance is always visible in the top bar.',
      'Every action shows a confirmation with the credit cost before spending.',
      'View your full transaction history on the Billing page.',
      'Payments are processed securely via Stripe.',
    ],
  },
  {
    icon: Globe,
    title: '11. International Support',
    badge: 'Global',
    content: [
      'ApplyAgent works for job seekers in any country.',
      'The Scanner includes 109 companies worldwide across 15 industries. Greenhouse, Lever, Ashby, SmartRecruiters, and Workday are used globally.',
      'Location combobox includes 170+ cities across Canada, US, UK, Europe, Asia Pacific, Middle East, Africa, and Latin America.',
      'Currency support includes CAD, USD, EUR, GBP, AUD, INR, and more.',
      'AI suggestions consider your location when recommending companies to scan.',
    ],
  },
]

export default function InstructionsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">How It Works</h1>
        <p className="text-muted-foreground">
          Everything you can do with ApplyAgent — a complete guide
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Start</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {['Profile', 'Evaluate', 'Documents', 'Apply'].map((step, i) => (
              <span key={step} className="flex items-center gap-2">
                {i > 0 && <ArrowRight className="size-3" />}
                <span className="font-medium text-foreground">{step}</span>
              </span>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload your resume, then generate a tailored resume and cover letter for any job. Evaluating a posting first is optional but gives deeper insights and better tailoring.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-3 text-base">
                <section.icon className="size-5 text-primary shrink-0" />
                <span className="flex-1">{section.title}</span>
                {section.badge && (
                  <Badge variant="secondary" className="text-xs shrink-0">{section.badge}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-1.5">
                {section.content.map((item, i) => (
                  <li key={i} className="text-sm text-muted-foreground leading-relaxed flex gap-2">
                    <span className="text-primary mt-1 shrink-0">&#8226;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {section.subItems && (
                <div className="space-y-3 pt-2">
                  {section.subItems.map((sub) => (
                    <div key={sub.name} className="rounded-md border p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <sub.icon className="size-4 text-primary shrink-0" />
                        <span className="text-sm font-medium">{sub.name}</span>
                        <Badge variant="outline" className="text-xs">{sub.cost}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{sub.desc}</p>
                    </div>
                  ))}
                </div>
              )}

              {section.table && (
                <div className="overflow-x-auto pt-1">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-1.5 font-medium">Pack</th>
                        <th className="py-1.5 font-medium">Credits</th>
                        <th className="py-1.5 font-medium">Price</th>
                        <th className="py-1.5 font-medium">Per Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.table.map((row) => (
                        <tr key={row.pack} className="border-b last:border-0">
                          <td className="py-1.5">{row.pack}</td>
                          <td className="py-1.5 font-mono">{row.credits}</td>
                          <td className="py-1.5">{row.price}</td>
                          <td className="py-1.5 text-muted-foreground">{row.perCredit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {section.extraContent && (
                <ul className="space-y-1.5">
                  {section.extraContent.map((item, i) => (
                    <li key={i} className="text-sm text-muted-foreground leading-relaxed flex gap-2">
                      <span className="text-primary mt-1 shrink-0">&#8226;</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Credit Cost Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { action: 'Job Evaluation', cost: 10 },
              { action: 'Resume (Fast)', cost: 3 },
              { action: 'Resume (Balanced)', cost: 8 },
              { action: 'Resume (Premium)', cost: 35 },
              { action: 'Cover Letter (Fast)', cost: 3 },
              { action: 'Cover Letter (Balanced)', cost: 8 },
              { action: 'Cover Letter (Premium)', cost: 35 },
              { action: 'Scanner', cost: 3 },
              { action: 'Pipeline Item', cost: 10 },
              { action: 'LinkedIn Message', cost: 2 },
              { action: 'Deep Research', cost: 3 },
              { action: 'Project Eval', cost: 2 },
              { action: 'Training Eval', cost: 2 },
              { action: 'Compare Offers', cost: 5 },
            ].map(({ action, cost }) => (
              <div key={action} className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="text-sm">{action}</span>
                <Badge variant="secondary" className="text-xs">{cost} cr</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
