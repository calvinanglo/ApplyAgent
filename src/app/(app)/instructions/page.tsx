import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
} from 'lucide-react'

const sections = [
  {
    icon: Settings,
    title: '1. Set Up Your Profile',
    content: `Start by going to Profile and filling in your details. Upload your resume (PDF, DOCX, or paste as Markdown) — this is the source of truth for all evaluations and generated documents. Set your target roles (comma-separated) and optionally your salary range and currency. The more complete your profile, the better your results.`,
  },
  {
    icon: Search,
    title: '2. Evaluate a Job Posting',
    content: `This step is optional — you can skip straight to generating resumes or cover letters after setting up your profile. But if you want a full analysis, go to Evaluate, paste a job description (or upload a PDF/DOCX), and click Evaluate. The AI will analyze the role across multiple dimensions: role match, CV gaps, salary assessment, interview prep, and more. You'll get an A-F score with detailed feedback. Each evaluation costs 10 credits (or uses one of your 3 free uses).`,
  },
  {
    icon: Briefcase,
    title: '3. Track Applications',
    content: `Every evaluation automatically creates an entry in your Applications tracker. You can update the status (Applied, Interview, Offer, etc.), add notes, and keep track of all your job applications in one place. Use filters and sorting to stay organized.`,
  },
  {
    icon: FileDown,
    title: '4. Generate Tailored Resumes',
    content: `Go to Resume PDF to generate an ATS-optimized, 1-page resume tailored to a specific job description. The AI injects relevant keywords from the JD, reorders your bullet points for relevance, and auto-sizes the font to fit exactly one page in Garamond format. Costs 3 credits.`,
  },
  {
    icon: Mail,
    title: '5. Generate Cover Letters',
    content: `Go to Cover Letter and paste a job description to generate a tailored cover letter. The AI writes in a natural, professional voice matched to the specific role and company. You can also generate directly from an evaluation report. Costs 5 credits.`,
  },
  {
    icon: Inbox,
    title: '6. Scan Job Portals',
    content: `The Scanner automatically checks company job boards (via Greenhouse ATS API) for new openings matching your target roles. On your first visit, it suggests companies based on your resume. You can add/remove companies and they'll be saved. New matches get added to your Pipeline for batch processing. Costs 8 credits per scan.`,
  },
  {
    icon: List,
    title: '7. Process Your Pipeline',
    content: `The Pipeline is your inbox of discovered job URLs. Items arrive from the Scanner or can be added manually. Click Process to run a full evaluation on each one — the AI fetches the job description, evaluates it, and adds it to your Applications tracker. Costs 10 credits per item processed.`,
  },
  {
    icon: BookOpen,
    title: '8. Build Your Story Bank',
    content: `The Story Bank collects STAR+R stories (Situation, Task, Action, Result + Reflection) from your evaluations. These are real examples from your experience that map to common interview questions. Use them to prepare for interviews with concrete, structured answers.`,
  },
  {
    icon: Wrench,
    title: '9. Use Additional Tools',
    content: `The Tools page includes: LinkedIn message generator (2 credits), deep research prompts (3 credits), training/certification evaluator (2 credits), project evaluator (2 credits), and offer comparison (5 credits). Each tool is specialized for a specific part of your job search.`,
  },
  {
    icon: CreditCard,
    title: '10. Manage Credits',
    content: `You start with 3 free uses (any feature). After that, buy credit packs: Starter ($5 for 100 credits), Professional ($15 for 350 credits), or Power User ($30 for 800 credits). Check your balance anytime in the top bar. View your usage history on the Billing page.`,
  },
]

export default function InstructionsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">How It Works</h1>
        <p className="text-muted-foreground">
          A step-by-step guide to getting the most out of ApplyAgent
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Start</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Profile</span>
            <ArrowRight className="size-3" />
            <span className="font-medium text-foreground">Evaluate</span>
            <ArrowRight className="size-3" />
            <span className="font-medium text-foreground">Resume PDF</span>
            <ArrowRight className="size-3" />
            <span className="font-medium text-foreground">Cover Letter</span>
            <ArrowRight className="size-3" />
            <span className="font-medium text-foreground">Apply</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload your resume, then generate a tailored resume and cover letter for any job. Evaluating a posting first is optional but gives you deeper insights. That's the core workflow.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-3 text-base">
                <section.icon className="size-5 text-primary" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
