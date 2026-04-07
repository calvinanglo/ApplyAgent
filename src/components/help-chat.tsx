'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { HelpCircle, X, Send, Bot, RotateCcw, ExternalLink } from 'lucide-react'

interface Message {
  role: 'user' | 'bot'
  text: string
  links?: Array<{ label: string; href: string }>
}

const KNOWLEDGE: Array<{ keywords: string[]; answer: string; links?: Array<{ label: string; href: string }> }> = [
  // Getting started
  { keywords: ['start', 'begin', 'new', 'first', 'setup', 'onboard', 'how to use', 'getting started', 'guide', 'tutorial'],
    answer: 'Welcome to ApplyAgent! Here\'s how to get started:\n\n1. Go to Profile — fill in your name, email, target roles, and upload your resume\n2. Go to Evaluate — paste a job description to get a detailed AI analysis\n3. Go to Resume — generate a tailored 1-page resume\n4. Go to Cover Letter — generate a tailored cover letter\n\nYou get 3 free uses before needing credits. Check the How It Works page for a complete guide.',
    links: [{ label: 'Go to Profile', href: '/settings' }, { label: 'How It Works', href: '/instructions' }] },
  // Profile
  { keywords: ['profile', 'settings', 'account info'],
    answer: 'Your Profile is where you set up your identity for the AI. Required fields:\n\n- Full Name (used on resumes and cover letters)\n- Email (used on generated documents)\n- CV/Resume (source of truth for all AI content)\n- Target Roles (used for scanner filtering)\n\nOptional: phone, LinkedIn URL, GitHub URL, portfolio URL, salary range, work arrangement, and job type preferences.',
    links: [{ label: 'Go to Profile', href: '/settings' }] },
  { keywords: ['cv', 'resume upload', 'upload resume', 'paste resume', 'markdown'],
    answer: 'To upload your CV:\n\n1. Go to Profile\n2. Under "CV / Resume", click the upload area or drag a file\n3. Supported formats: PDF, DOCX, TXT, Markdown\n4. The text is extracted and shown in the textarea — you can edit it\n5. Click Save Changes\n\nTip: The better formatted your CV is, the better the AI outputs. Use the sample template as a guide if you\'re not sure about formatting.',
    links: [{ label: 'Go to Profile', href: '/settings' }] },
  { keywords: ['target role', 'roles', 'add role'],
    answer: 'Target roles tell the AI what jobs to match you with:\n\n1. Go to Profile\n2. In the Target Roles field, type a role title\n3. Press Enter or comma to lock it in as a tag\n4. Add as many as you want\n5. Press Backspace to remove the last tag\n6. Click the X on any tag to remove it\n\nExamples: "Security Analyst", "Network Engineer", "Cloud Administrator"',
    links: [{ label: 'Go to Profile', href: '/settings' }] },
  { keywords: ['autofill', 'auto fill', 'auto-fill', 'prefill'],
    answer: 'When you upload a CV, ApplyAgent automatically detects and fills in:\n- Full name\n- Email address\n- Phone number\n- Location (city, province, country)\n- LinkedIn URL\n- GitHub URL\n\nIt only fills empty fields — it won\'t overwrite data you\'ve already entered.' },
  // Evaluate
  { keywords: ['evaluate', 'evaluation', 'analyze', 'job description', 'jd', 'paste job'],
    answer: 'To evaluate a job posting:\n\n1. Go to Evaluate\n2. Paste the job description text or upload a PDF/DOCX\n3. Click Evaluate (10 credits or 1 free use)\n4. The AI streams results in real-time across multiple sections:\n   - Role Summary\n   - CV Match\n   - Level & Strategy\n   - Compensation & Demand\n   - Customization Tips\n   - Interview Prep\n\nFor high-scoring jobs (4.5+), a "Full Pipeline" button generates resume + cover letter in one click.',
    links: [{ label: 'Go to Evaluate', href: '/evaluate' }] },
  { keywords: ['score', 'rating', 'good score', 'bad score', 'what score'],
    answer: 'Scores are out of 5:\n\n- 4.5+ (green) = Great match — apply immediately\n- 3.5-4.4 (yellow) = Good match — worth applying\n- Below 3.5 (red) = Weak match — consider skipping\n\nThe score considers: role fit, CV match percentage, level alignment, compensation range, and growth potential. Click into any report to see the detailed breakdown.' },
  { keywords: ['full pipeline', 'one click', 'generate both'],
    answer: 'When a job scores 4.5+, a "Full Pipeline" button appears on the evaluation results. Clicking it:\n\n1. Generates a tailored cover letter (5 credits)\n2. Generates a tailored resume PDF (3 credits)\n3. Shows download links for both\n\nTotal: 13 credits for evaluation + both documents.' },
  // Resume
  { keywords: ['resume pdf', 'generate resume', 'tailored resume', 'ats', 'one page'],
    answer: 'To generate a tailored resume:\n\n1. Go to Resume\n2. Select an evaluated job from the list, or paste a new JD\n3. Click Generate PDF (3 credits)\n4. Preview the PDF inline on the page\n5. Download as PDF (ATS-formatted) or DOCX (editable)\n\nThe AI:\n- Injects keywords from the JD into your bullet points\n- Reorders experience to match the role\n- Auto-sizes font to fit exactly 1 page\n- Includes relevant GitHub projects if linked\n\nFile names include your initials + company + role.',
    links: [{ label: 'Go to Resume', href: '/resume' }] },
  { keywords: ['github', 'projects', 'github projects', 'repos', 'repository'],
    answer: 'If your Profile has a GitHub URL, the resume generator:\n\n1. Fetches your 10 most recent repos from the GitHub API\n2. Filters out forks and repos without descriptions\n3. Picks the 3-4 most relevant to the job description\n4. Writes a tailored 1-line description for each\n\nTo enable this: go to Profile and add your GitHub URL (e.g. https://github.com/username).',
    links: [{ label: 'Go to Profile', href: '/settings' }] },
  { keywords: ['keyword', 'keywords', 'ats keyword', 'coverage'],
    answer: 'After generating a resume, you\'ll see:\n- Keyword coverage percentage (how many JD keywords were included)\n- List of injected keywords as tags\n\nThe AI reformulates your real experience using JD vocabulary. It never invents experience — it only reframes what\'s already in your CV to match what the job asks for.' },
  // Cover Letter
  { keywords: ['cover letter', 'letter', 'generate letter'],
    answer: 'To generate a cover letter:\n\n1. Go to Cover Letter\n2. Select an evaluated job or paste a new JD\n3. Click Generate (5 credits)\n4. Preview the formatted letter with header and signature\n5. Download as DOCX, save as PDF, or Copy to clipboard\n\nThe letter includes:\n- Your name, email, phone, location, and date in the header\n- The exact job title and company name in the opening\n- 3-4 paragraphs connecting your CV to their requirements\n- Professional closing with your full name',
    links: [{ label: 'Go to Cover Letter', href: '/cover-letter' }] },
  { keywords: ['copy', 'clipboard'],
    answer: 'On the Cover Letter page, click the "Copy" button to copy the full letter text to your clipboard — including header, greeting, body, closing, and signature. You can then paste it into any application form or email.' },
  // Scanner
  { keywords: ['scan', 'scanner', 'find jobs', 'search jobs', 'companies', 'job search'],
    answer: 'The Scanner finds new jobs matching your profile:\n\n1. Go to Scanner\n2. Add companies by name (or click "AI Suggest" for recommendations)\n3. Optionally set filters (job type, remote/hybrid, date posted, location)\n4. Click Run Scan (8 credits)\n5. New matches go to your Pipeline\n\nWe check 4 ATS platforms automatically for each company: Greenhouse, Lever, Ashby, and SmartRecruiters.',
    links: [{ label: 'Go to Scanner', href: '/scan' }] },
  { keywords: ['filter', 'remote', 'hybrid', 'on-site', 'full-time', 'part-time', 'contract', 'date posted', 'location filter'],
    answer: 'Scanner filters (expand the "Filters" section):\n\n- Job Type: Full-time, Part-time, Contract, Temporary, Permanent, Fixed Term\n- Work Arrangement: Remote, Hybrid, On-site\n- Date Posted: Last 24h, 3 days, 7 days, 14 days\n- Location: Type a country, state/province, or city\n\nFilters default to your Profile preferences. Jobs with unknown types/arrangements are always included.' },
  { keywords: ['greenhouse', 'lever', 'ashby', 'smartrecruiters', 'ats', 'platform', 'which companies'],
    answer: 'We scan 4 ATS platforms (all free, no API keys):\n\n- Greenhouse — Cloudflare, GitLab, Datadog, Figma, Elastic, Okta\n- Lever — Netflix\n- Ashby — Notion, Linear, Ramp\n- SmartRecruiters — Visa\n\nJust type the company name — we try all 4 automatically. Not all companies use these platforms (banks like TD/BMO use Workday which has no free API).' },
  { keywords: ['suggest', 'ai suggest', 'reset companies', 'recommend'],
    answer: 'Click "AI Suggest" on the Scanner page to get personalized company recommendations based on your resume, target roles, and location. The AI suggests companies that use Greenhouse, Lever, Ashby, or SmartRecruiters — and verifies each slug works before showing it.' },
  { keywords: ['no results', 'zero results', 'nothing found', '0 found', 'scan failed'],
    answer: 'If the scanner returns 0 results:\n\n1. The companies might not use Greenhouse/Lever/Ashby/SmartRecruiters\n2. Click "AI Suggest" to get companies that actually work\n3. Try adding known tech companies: Cloudflare, GitLab, Datadog, Netflix, Notion\n4. Check your filters — they might be too restrictive\n\nBig banks (TD, BMO) and telcos (Bell, Rogers) use Workday which doesn\'t have a free API.' },
  // Pipeline
  { keywords: ['pipeline', 'inbox', 'pending', 'process', 'batch'],
    answer: 'Pipeline is your job evaluation inbox:\n\n- Pending tab: Jobs waiting to be evaluated\n- Done tab: Completed evaluations + errors\n- Add jobs manually with the URL form at the top\n- Click play to evaluate one job (10 credits)\n- "Process All" evaluates everything in batch\n- Progress bar shows during batch processing with a Cancel button\n- Pagination at the bottom for large lists',
    links: [{ label: 'Go to Pipeline', href: '/pipeline' }] },
  { keywords: ['stuck', 'processing', 'timeout', 'timed out', 'frozen'],
    answer: 'If pipeline items are stuck at "processing":\n\n1. Refresh the page — items stuck for 5+ minutes auto-convert to errors\n2. Click the retry button on any errored item\n3. Make sure you have enough credits\n4. If it keeps timing out, the job URL might be blocking our scraper — try adding the JD manually via Evaluate instead' },
  { keywords: ['insufficient', 'not enough credits', 'ran out', 'requeue', 'failed'],
    answer: 'If items show "Insufficient credits":\n\n1. Look for the "Requeue X Failed" button at the top of Pipeline\n2. Click it to move all failed items back to Pending\n3. Go to Billing and buy more credits\n4. Come back and click "Process All"\n\nThe batch processor also auto-stops when credits run out — remaining items stay pending.' },
  { keywords: ['cancel', 'stop processing', 'abort'],
    answer: 'During batch processing:\n- A red Cancel button appears in the progress bar\n- Click it to stop immediately (aborts the current request)\n- Items already processed stay done\n- Remaining items stay pending\n- The progress bar shows credits used and remaining' },
  { keywords: ['clear', 'delete all', 'remove all'],
    answer: 'Pipeline has two clear buttons:\n\n- "Clear Pending" — removes all pending items\n- "Clear Done" — removes all completed/errored items\n\nBoth show a confirmation before deleting. You also get an "Undo" toast for 5 seconds after clearing. Individual items can be deleted with the trash icon.' },
  // Applications
  { keywords: ['application', 'tracker', 'track', 'applied', 'interview', 'status', 'history'],
    answer: 'Applications tracks every job you\'ve evaluated:\n\n- Click any row to view the full evaluation report\n- From a report, generate a resume or cover letter\n- Statuses: Evaluated, Applied, Interview, Offer, Rejected, Withdrawn, Accepted\n- Shows: score, PDF generated, cover letter generated, date\n\nJobs from both Evaluate and Pipeline appear here.',
    links: [{ label: 'Go to Applications', href: '/applications' }] },
  // Tools
  { keywords: ['tool', 'tools page', 'what tools'],
    answer: 'The Tools page has 5 specialized AI tools:\n\n1. LinkedIn Message (2 cr) — generates personalized connection requests with target selection\n2. Deep Research (3 cr) — creates structured research prompts for Perplexity/Claude\n3. Project Evaluator (2 cr) — BUILD/SKIP/MAYBE verdict for portfolio projects\n4. Training Evaluator (2 cr) — DO IT/SKIP verdict for courses/certifications\n5. Compare Offers (5 cr) — 10-dimension scoring matrix for multiple offers',
    links: [{ label: 'Go to Tools', href: '/tools' }] },
  { keywords: ['linkedin', 'message', 'connection request', 'outreach'],
    answer: 'LinkedIn Message Generator (2 credits):\n\n1. Enter company name and role\n2. Optionally paste the JD for better targeting\n3. Get a 300-character message for the best person to contact\n4. Also shows 2-3 alternative targets with messages\n5. Click Copy on any message to use it\n\nEach message is personalized to the role and company.',
    links: [{ label: 'Go to Tools', href: '/tools' }] },
  { keywords: ['compare', 'offer comparison', 'which offer', 'multiple offers'],
    answer: 'Compare Offers (5 credits):\n\n1. Add 2+ offers with company name, role, and optional JD\n2. Get a scored comparison across 10 dimensions:\n   North Star, CV Match, Level, Compensation, Growth, Remote, Reputation, Tech Stack, Speed to Impact, Culture\n3. Color-coded table with a recommendation\n4. Great for deciding between multiple offers.',
    links: [{ label: 'Go to Tools', href: '/tools' }] },
  { keywords: ['research', 'deep research', 'perplexity'],
    answer: 'Deep Research Prompt (3 credits):\n\n1. Enter company and role\n2. Get quick questions to answer, your positioning angle, and a full research prompt\n3. Copy the prompt and paste it into Perplexity, Claude, or ChatGPT\n4. The prompt is structured to give you insider knowledge about the company',
    links: [{ label: 'Go to Tools', href: '/tools' }] },
  // Story Bank
  { keywords: ['story', 'star', 'interview prep', 'behavioral', 'story bank'],
    answer: 'Story Bank collects STAR+R interview stories:\n\n- Stories are automatically extracted from evaluation Block F (Interview Prep)\n- Each has: Situation, Task, Action, Result, Reflection\n- Filter by tags (leadership, security, networking, etc.)\n- Expand any story to see the full breakdown\n- Use these to prepare for behavioral interviews\n\nStories accumulate as you evaluate more jobs.',
    links: [{ label: 'Go to Story Bank', href: '/story-bank' }] },
  // Credits & Billing
  { keywords: ['credit', 'cost', 'price', 'billing', 'pay', 'buy', 'purchase', 'how much'],
    answer: 'Credit costs:\n\n| Action | Credits |\n| Evaluation | 10 |\n| Resume | 3 |\n| Cover Letter | 5 |\n| Portal Scan | 8 |\n| Pipeline Item | 10 |\n| LinkedIn Message | 2 |\n| Deep Research | 3 |\n| Project/Training Eval | 2 |\n| Compare Offers | 5 |\n\nCredit packs:\n- Starter: $5 = 100 credits\n- Professional: $15 = 350 credits\n- Power User: $30 = 800 credits',
    links: [{ label: 'Go to Billing', href: '/billing' }] },
  { keywords: ['free', 'trial', 'free tier', 'free uses', 'no cost'],
    answer: 'Every new account gets 3 free uses:\n\n- Works on ANY feature (not just evaluations)\n- Use them on resumes, cover letters, scans, tools — anything\n- After 3 uses, buy credit packs starting at $5\n- Your credit balance shows in the top bar\n- All actions show a confirmation with cost before spending' },
  { keywords: ['refund', 'money back'],
    answer: 'Credits are non-refundable once purchased. However, if an action fails (e.g. PDF generation error), credits are automatically refunded by the system. Check your transaction history on the Billing page to see all credit movements.' },
  // Account
  { keywords: ['password', 'change password'],
    answer: 'To change your password:\n\n1. Go to Profile\n2. Scroll to "Change Password"\n3. Enter your current password\n4. Enter new password (8+ chars, must include number + special character)\n5. Confirm new password\n6. Click Update Password\n\nForgot your password? Click "Forgot password?" on the login page.' },
  { keywords: ['forgot password', 'reset password'],
    answer: 'If you forgot your password:\n\n1. Go to the login page\n2. Click "Forgot password?"\n3. Enter your email\n4. Check your inbox for a reset link\n5. Click the link and set a new password\n\nIf you signed up with Google, you don\'t need a password — just use "Continue with Google".' },
  { keywords: ['delete account', 'remove account', 'close account'],
    answer: 'To delete your account:\n\n1. Go to Profile\n2. Scroll to the bottom "Danger Zone"\n3. Click "Delete Account"\n4. Confirm the deletion\n\nThis permanently deletes ALL your data: evaluations, reports, resumes, cover letters, pipeline items, and credit history. This cannot be undone.' },
  { keywords: ['google', 'sign in', 'login', 'oauth', 'can\'t login', 'cant login'],
    answer: 'Google Sign-In troubleshooting:\n\n- Make sure third-party cookies are enabled\n- On mobile, the redirect might take a moment — wait for the "Signing you in..." screen\n- If it goes to the landing page, try clicking Sign In again\n- Clear your browser cache if it keeps failing\n- You can also create an account with email/password instead' },
  // Download
  { keywords: ['download', 'docx', 'word', 'save', 'export'],
    answer: 'Download options:\n\nResume: Preview (inline), Download PDF, Download DOCX\nCover Letter: Copy to clipboard, Download PDF (print), Download DOCX\n\nAll files are named: [Type]-[Initials]-[Company]-[Role].pdf/.docx\nExample: Resume-CA-Cloudflare-Systems-Test-Engineer.pdf\n\nResults are saved in session — you can navigate away and come back without losing them.' },
  // Mobile
  { keywords: ['mobile', 'phone', 'responsive', 'small screen'],
    answer: 'ApplyAgent is fully responsive:\n\n- Use the hamburger menu (top-left) to open the sidebar\n- All features work on mobile: scanning, evaluating, generating documents\n- Credit confirmation buttons stack vertically on small screens\n- The help chatbot works on mobile too\n- Google Sign-In redirects may take a moment on mobile' },
  // Undo
  { keywords: ['undo', 'revert', 'mistake', 'oops', 'wrong'],
    answer: 'Undo is available for destructive actions:\n\n- Pipeline: delete item, clear pending/done — 5-second undo toast\n- Scanner: remove company, clear all — 5-second undo toast\n- Profile: save changes — "Undo" button reverts to previous values\n\nLook for the toast notification at the bottom of the screen after any delete/clear action.' },
  // How it works
  { keywords: ['how it works', 'instructions', 'help page', 'documentation'],
    answer: 'The "How It Works" page has a complete guide covering all 12 features with detailed instructions, credit costs, and tips. It also includes a credit cost reference card at the bottom.',
    links: [{ label: 'Go to How It Works', href: '/instructions' }] },
  // General workflow
  { keywords: ['workflow', 'best way', 'recommended', 'optimal', 'efficient'],
    answer: 'Recommended workflow:\n\n1. Profile — upload CV, set target roles\n2. Scanner — find jobs matching your profile\n3. Pipeline — batch evaluate all found jobs\n4. Applications — review scores, focus on 4.0+\n5. Resume — generate for top matches\n6. Cover Letter — generate for jobs you\'re applying to\n7. Tools — LinkedIn messages, research prompts\n8. Story Bank — prep for interviews\n\nThis flow maximizes your credits and gives you the most tailored results.' },
  // Troubleshooting
  { keywords: ['error', 'bug', 'broken', 'not working', 'issue', 'problem', 'help'],
    answer: 'Common issues and fixes:\n\n- "Insufficient credits" — buy more on the Billing page\n- Pipeline stuck — refresh the page, items auto-fix after 5 minutes\n- Scanner returns 0 — the companies don\'t use supported ATS platforms, try AI Suggest\n- Google login redirect — clear cache, enable cookies, try again\n- Resume not tailored — make sure you selected a job or pasted a JD\n- Slow generation — PDF and evaluation take 15-30 seconds, don\'t navigate away\n\nStill stuck? Email support@applyagent.ca' },
  { keywords: ['slow', 'loading', 'takes long', 'waiting'],
    answer: 'Generation times:\n\n- Evaluation: 15-30 seconds (streaming)\n- Resume: 10-20 seconds\n- Cover Letter: 5-15 seconds\n- Scanner: 5-10 seconds\n- Tools: 3-10 seconds\n\nDon\'t navigate away during generation — results are lost. After completion, they\'re saved in your session so you can switch tabs.' },
  { keywords: ['contact', 'support', 'email', 'help human'],
    answer: 'Need human help?\n\n- Email: support@applyagent.ca (1-2 business day response)\n- Legal/Privacy: legal@applyagent.ca\n\nInclude your email address and a description of the issue.',
    links: [{ label: 'Contact Page', href: '/contact' }] },
  // Privacy & Security
  { keywords: ['privacy', 'data', 'secure', 'safe', 'who sees'],
    answer: 'Your data is secure:\n\n- Stored in Supabase (encrypted at rest)\n- Your CV and documents are only accessible to you\n- AI processing uses Anthropic\'s Claude API (data not stored by them)\n- Payments processed securely via Stripe\n- You can delete all your data anytime from Profile\n\nSee our Privacy Policy for full details.',
    links: [{ label: 'Privacy Policy', href: '/privacy' }] },
]

// Context-aware suggestions based on current page
const PAGE_SUGGESTIONS: Record<string, string[]> = {
  '/dashboard': ['How do I get started?', 'What should I do first?', 'How do credits work?'],
  '/evaluate': ['How does evaluation work?', 'What do scores mean?', 'What is Full Pipeline?'],
  '/applications': ['How do I track applications?', 'Can I generate a resume from here?'],
  '/resume': ['How does resume tailoring work?', 'What about GitHub projects?', 'Download as DOCX?'],
  '/cover-letter': ['How are cover letters tailored?', 'Can I download as DOCX?', 'How to copy text?'],
  '/scan': ['How does the scanner work?', 'Scanner returns 0 results', 'How to add companies?'],
  '/pipeline': ['How to process jobs?', 'Items are stuck processing', 'How to requeue failed items?'],
  '/settings': ['What fields are required?', 'How to upload my CV?', 'How to add target roles?'],
  '/billing': ['How much do credits cost?', 'Do I get free uses?', 'What does each action cost?'],
  '/tools': ['What tools are available?', 'How does LinkedIn Message work?', 'How to compare offers?'],
  '/story-bank': ['How does Story Bank work?', 'Where do stories come from?', 'How to filter stories?'],
  '/instructions': ['What is the recommended workflow?', 'How do credits work?'],
}

function findAnswer(question: string): { text: string; links?: Array<{ label: string; href: string }> } {
  const q = question.toLowerCase()
  let bestMatch = { score: 0, answer: '', links: undefined as Array<{ label: string; href: string }> | undefined }

  for (const item of KNOWLEDGE) {
    let score = 0
    for (const kw of item.keywords) {
      if (q.includes(kw)) {
        score += kw.split(' ').length // multi-word keywords score higher
      }
    }
    if (score > bestMatch.score) {
      bestMatch = { score, answer: item.answer, links: item.links }
    }
  }

  if (bestMatch.score > 0) return { text: bestMatch.answer, links: bestMatch.links }

  return {
    text: "I'm not sure about that. Here are some things I can help with:\n\n- Getting started\n- Profile setup & CV upload\n- Evaluating job postings\n- Generating resumes & cover letters\n- Using the Scanner & Pipeline\n- Credits, billing & pricing\n- Tools (LinkedIn, Research, Compare)\n- Troubleshooting common issues\n\nTry asking about any of these, or email support@applyagent.ca for human help.",
    links: [{ label: 'How It Works', href: '/instructions' }, { label: 'Contact Support', href: '/contact' }],
  }
}

export function HelpChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: 'Hi! I\'m here to help you use ApplyAgent. Ask me anything, or pick a question below.' },
  ])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const suggestions = PAGE_SUGGESTIONS[pathname] || PAGE_SUGGESTIONS['/dashboard'] || []

  function handleSend(text?: string) {
    const question = text || input.trim()
    if (!question) return
    setInput('')
    const result = findAnswer(question)
    setMessages(prev => [...prev, { role: 'user', text: question }, { role: 'bot', text: result.text, links: result.links }])
  }

  function handleReset() {
    setMessages([{ role: 'bot', text: 'Chat reset. How can I help you?' }])
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg hover:opacity-90 transition-all hover:scale-105"
          aria-label="Open help chat"
        >
          <HelpCircle className="size-5" />
          <span className="text-sm font-medium hidden sm:inline">Help</span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] rounded-xl border bg-background shadow-2xl flex flex-col" style={{ height: '520px', maxHeight: 'calc(100vh - 4rem)' }}>
          <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="size-5 text-primary" />
              <div>
                <span className="font-semibold text-sm">ApplyAgent Help</span>
                <span className="text-xs text-muted-foreground ml-2">Always free</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleReset} className="text-muted-foreground hover:text-foreground p-1" title="Reset chat">
                <RotateCcw className="size-3.5" />
              </button>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i}>
                <div className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'bot' && <Bot className="size-5 text-primary shrink-0 mt-1" />}
                  <div className={`rounded-lg px-3 py-2 text-sm max-w-[85%] whitespace-pre-line ${
                    msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    {msg.text}
                  </div>
                </div>
                {msg.links && msg.links.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5 ml-7">
                    {msg.links.map((link, j) => (
                      <a key={j} href={link.href} onClick={() => setOpen(false)} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted transition-colors">
                        <ExternalLink className="size-3" />{link.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />

            {messages.length <= 1 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-xs text-muted-foreground font-medium">Suggested for this page:</p>
                {suggestions.map((q) => (
                  <button key={q} onClick={() => handleSend(q)} className="block w-full text-left rounded-md border px-3 py-2 text-xs hover:bg-muted transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t px-3 py-2 shrink-0">
            <form onSubmit={(e) => { e.preventDefault(); handleSend() }} className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                className="h-9 text-sm"
              />
              <Button type="submit" size="sm" className="h-9 px-3">
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
