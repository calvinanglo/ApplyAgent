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
  Download,
  Filter,
  RotateCcw,
  Trash2,
  Globe,
} from 'lucide-react'

const sections = [
  {
    icon: Settings,
    title: '1. Set Up Your Profile',
    badge: 'Free',
    content: [
      'Go to Profile and fill in your details. Upload your resume (PDF, DOCX, or paste as Markdown). This is the source of truth for all AI-generated content.',
      'Set your target roles (comma-separated). these are used to filter scanner results and tailor evaluations.',
      'Set your salary range, currency (CAD, USD, EUR, GBP, AUD, INR), and pay type (annual or hourly).',
      'Set your work arrangement preference (Remote, Hybrid, On-site) and job type preference (Full-time, Part-time, Contract, Temporary, Permanent, Fixed Term). these become default filters for the scanner.',
      'Add your LinkedIn, GitHub, and Portfolio URLs. GitHub projects will appear on your generated resume.',
      'Change your password anytime (requires current password, min 8 chars with number + special character).',
    ],
  },
  {
    icon: LayoutDashboard,
    title: '2. Dashboard',
    badge: 'Free',
    content: [
      'Your home screen shows your credit balance, free uses remaining, pipeline stats, and total evaluations.',
      'Quick action cards give one-click access to every feature: Evaluate, Cover Letter, Resume, Tools, Scanner, and Pipeline.',
      'Recent evaluations list shows your last 5 evaluations with scores, company names, and status.',
    ],
  },
  {
    icon: Search,
    title: '3. Evaluate a Job Posting',
    badge: '10 credits',
    content: [
      'This step is optional. You can skip straight to generating resumes or cover letters.',
      'Go to Evaluate, paste a job description (or upload PDF/DOCX), and click Evaluate.',
      'The AI analyzes the role across multiple dimensions: role summary, CV match, level & strategy, compensation & demand, customization tips, and interview prep.',
      'You get an overall score out of 5 with detailed feedback streamed in real-time.',
      'For high-scoring jobs (4.5+), a Full Pipeline button appears that generates both a cover letter and resume PDF in one click.',
      'You can also generate a tailored resume or cover letter directly from any evaluation report.',
      'Each evaluation costs 10 credits or uses one of your 3 free uses.',
    ],
  },
  {
    icon: Briefcase,
    title: '4. Track Applications',
    badge: 'Free',
    content: [
      'Every evaluation automatically creates an entry in your Applications tracker.',
      'The table shows: sequence number, company, role, score, status, PDF generated, cover letter generated, and date.',
      'Click any row to view the full evaluation report.',
      'Status options: Evaluated, Applied, Interview, Offer, Rejected, Withdrawn, Accepted.',
    ],
  },
  {
    icon: FileDown,
    title: '5. Generate Tailored Resumes',
    badge: '3 credits',
    content: [
      'Go to Resume to generate an ATS-optimized, 1-page resume in Garamond font.',
      'Select from your previously evaluated jobs (searchable by company or role), or paste a new job description.',
      'When coming from an evaluation report, the job is auto-selected. Just click Generate.',
      'The AI injects relevant keywords from the JD, reorders bullet points by relevance, and auto-sizes the font to fit exactly one page.',
      'If your CV includes a GitHub profile, your projects appear on the resume with JD-tailored descriptions.',
      'Download as PDF (ATS-formatted) or DOCX (editable Word document).',
      'Results show keyword coverage percentage and the keywords that were injected.',
    ],
  },
  {
    icon: Mail,
    title: '6. Generate Cover Letters',
    badge: '5 credits',
    content: [
      'Go to Cover Letter and select an evaluated job or paste a new job description.',
      'When coming from an evaluation report, the job is auto-selected.',
      'The AI writes a tailored cover letter in a natural, professional voice. No generic filler or cliches.',
      'The letter includes a proper header (your name, email, phone, location, date), greeting, body paragraphs, closing, and signature.',
      'Every letter references the specific company name and addresses 2-3 key JD requirements with real CV evidence.',
      'Download as DOCX (editable), PDF (via print dialog), or Copy to clipboard.',
    ],
  },
  {
    icon: Inbox,
    title: '7. Scan Job Portals',
    badge: '8 credits',
    content: [
      'The Scanner checks company job boards for new openings matching your target roles.',
      'Supports three ATS platforms: Greenhouse, Lever, and Ashby. All free, no API keys needed.',
      'Works internationally. Add companies from any country.',
      'On your first visit, AI suggests companies based on your resume and location. Only verified companies with working API slugs are shown.',
      'Add or remove companies anytime. Your list is saved between visits.',
      'Each company has a platform selector (Greenhouse/Lever/Ashby) and a board slug.',
      'Filter results by Job Type (Full-time, Part-time, Contract, etc.), Work Arrangement (Remote, Hybrid, On-site), and Date Posted (24h, 3 days, 7 days, 14 days).',
      'Filters default to your profile preferences but can be adjusted per scan.',
      'Results show: total found, relevant matches, duplicates skipped, and new items added to your pipeline.',
      'You can also add individual job posting URLs directly.',
    ],
  },
  {
    icon: List,
    title: '8. Process Your Pipeline',
    badge: '10 credits/item',
    content: [
      'The Pipeline is your inbox of discovered job URLs from the Scanner or manually added.',
      'Add items manually with URL, company name, and job title.',
      'Tabs: Pending (awaiting processing), Done (processed + errors), All.',
      'Click the play button to process a single item. The AI fetches the job description, evaluates it, and adds it to your Applications tracker.',
      'Process All runs every pending item in sequence (shows total credit cost).',
      'Retry button appears on errored items so you can re-process failed evaluations.',
      'Clear Pending and Clear Done buttons (with confirmation) for bulk cleanup.',
      'All actions have credit confirmation. You see the cost before spending.',
    ],
  },
  {
    icon: BookOpen,
    title: '9. Story Bank',
    badge: 'Free',
    content: [
      'The Story Bank collects STAR+R interview stories (Situation, Task, Action, Result + Reflection) from your evaluations.',
      'Stories are real examples from your experience mapped to common interview questions.',
      'Each story shows: title, JD requirement answered, and tags for categorization.',
      'Expand any story to see the full STAR+R breakdown.',
      'Filter by tag to find stories relevant to specific topics (e.g., leadership, security, networking).',
      'Use these to prepare for behavioral interviews with concrete, structured answers.',
    ],
  },
  {
    icon: Wrench,
    title: '10. Tools',
    badge: '2-5 credits',
    content: [
      'Five specialized tools for different parts of your job search:',
    ],
    subItems: [
      { icon: MessageSquare, name: 'LinkedIn Message Generator', cost: '2 credits', desc: 'Generates a 300-character connection request tailored to the role. Suggests the best person to contact and provides 2-3 alternative targets with personalized messages. Copy any message with one click.' },
      { icon: Search, name: 'Deep Research Prompt', cost: '3 credits', desc: 'Generates a structured research prompt for Perplexity or Claude. Includes quick questions to answer, your unique positioning angle, and a full copy-paste prompt for external AI tools.' },
      { icon: FlaskConical, name: 'Project Evaluator', cost: '2 credits', desc: 'Analyzes whether a portfolio project is worth building. Returns a BUILD/SKIP/MAYBE verdict with scores across relevance, complexity, portfolio appeal, and time investment. Includes a Week 1 action plan for BUILD verdicts.' },
      { icon: GraduationCap, name: 'Training Evaluator', cost: '2 credits', desc: 'Analyzes whether a course or certification is worth pursuing. Returns a DO IT/SKIP/MAYBE verdict with timeframe, recruiter signal score, risks, and better alternatives if applicable.' },
      { icon: GitCompare, name: 'Compare Offers', cost: '5 credits', desc: 'Compare 2+ job offers across 10 dimensions: North Star alignment, CV match, level, compensation, growth, remote flexibility, company reputation, tech stack, speed to impact, and culture. Shows a scored comparison table with a final recommendation.' },
    ],
  },
  {
    icon: CreditCard,
    title: '11. Credits & Billing',
    badge: 'Free uses included',
    content: [
      'Every new account gets 3 free uses that work on any feature. Not just evaluations.',
      'After your free uses, buy credit packs:',
    ],
    table: [
      { pack: 'Starter', credits: '100', price: '$5', perCredit: '$0.050' },
      { pack: 'Professional', credits: '350', price: '$15', perCredit: '$0.043' },
      { pack: 'Power User', credits: '800', price: '$30', perCredit: '$0.038' },
    ],
    extraContent: [
      'Your credit balance is always visible in the top bar.',
      'Every action shows a confirmation with the credit cost before spending.',
      'View your full transaction history on the Billing page.',
      'Payments are processed securely via Stripe.',
    ],
  },
  {
    icon: Globe,
    title: '12. International Support',
    badge: 'Global',
    content: [
      'ApplyAgent works for job seekers in any country.',
      'The Scanner supports companies worldwide. Greenhouse, Lever, and Ashby are used globally.',
      'Resumes are generated in Letter format for US/Canada and A4 for the rest of the world.',
      'Currency support includes CAD, USD, EUR, GBP, AUD, and INR.',
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
          Everything you can do with ApplyAgent. A complete guide
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Start</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {['Profile', 'Evaluate', 'Resume', 'Cover Letter', 'Apply'].map((step, i) => (
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
              { action: 'Resume', cost: 3 },
              { action: 'Cover Letter', cost: 5 },
              { action: 'Portal Scan', cost: 8 },
              { action: 'LinkedIn Message', cost: 2 },
              { action: 'Deep Research', cost: 3 },
              { action: 'Project Eval', cost: 2 },
              { action: 'Training Eval', cost: 2 },
              { action: 'Compare Offers', cost: 5 },
              { action: 'Pipeline Item', cost: 10 },
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
