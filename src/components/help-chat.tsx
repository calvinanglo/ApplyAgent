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
    answer: 'Welcome to ApplyAgent! Here\'s how to get started:\n\n1. Go to Profile — fill in your name, email, and upload your resume\n2. Go to Evaluate — paste a job description to get a detailed AI analysis\n3. Go to Documents — generate a tailored resume or cover letter\n\nYou get 3 free uses before needing credits. Check the How It Works page for a complete guide.',
    links: [{ label: 'Go to Profile', href: '/settings' }, { label: 'How It Works', href: '/instructions' }] },
  // Profile
  { keywords: ['profile', 'settings', 'account info'],
    answer: 'Your Profile is where you set up your identity for the AI. Required fields:\n\n- Full Name (used on resumes and cover letters)\n- Email (used on generated documents)\n- CV/Resume (source of truth for all AI content)\n\nOptional: phone, LinkedIn URL, GitHub URL, portfolio URL, and location.\n\nJob search preferences (target roles, salary, work arrangement, job type) are configured directly in the Scanner filters.',
    links: [{ label: 'Go to Profile', href: '/settings' }] },
  { keywords: ['cv', 'resume upload', 'upload resume', 'paste resume', 'markdown'],
    answer: 'To upload your CV:\n\n1. Go to Profile\n2. Under "CV / Resume", click the upload area or drag a file\n3. Supported formats: PDF, DOCX, TXT, Markdown\n4. The text is extracted and shown in the textarea — you can edit it\n5. Click Save Changes\n\nTip: The better formatted your CV is, the better the AI outputs.',
    links: [{ label: 'Go to Profile', href: '/settings' }] },
  { keywords: ['target role', 'roles', 'add role'],
    answer: 'Target roles filter scanner results to only show matching jobs:\n\n1. Go to Scanner and open Filters\n2. Under "Target Roles / Keywords", start typing — you\'ll see autocomplete suggestions from 70+ common roles\n3. Click a suggestion or type your own and press Enter\n4. Click X on any role pill to remove it\n\nLeaving target roles empty includes all jobs. All filter settings are saved automatically.',
    links: [{ label: 'Go to Scanner', href: '/scan' }] },
  { keywords: ['autofill', 'auto fill', 'auto-fill', 'prefill'],
    answer: 'When you upload a CV, ApplyAgent automatically detects and fills in:\n- Full name\n- Email address\n- Phone number\n- Location (city, province, country)\n- LinkedIn URL\n- GitHub URL\n\nIt only fills empty fields — it won\'t overwrite data you\'ve already entered.' },
  // Evaluate
  { keywords: ['evaluate', 'evaluation', 'analyze', 'job description', 'jd', 'paste job'],
    answer: 'To evaluate a job posting:\n\n1. Go to Evaluate\n2. Paste the job description text or upload a PDF/DOCX\n3. Click Evaluate (10 credits or 1 free use)\n4. The AI streams results in real-time across sections:\n   - Role Summary\n   - CV Match\n   - Level & Strategy\n   - Compensation & Demand\n   - Customization Tips\n   - Interview Prep\n   - Draft Answers\n\nFor high-scoring jobs (4.5+), a Full Pipeline button generates resume + cover letter in one click.',
    links: [{ label: 'Go to Evaluate', href: '/evaluate' }] },
  { keywords: ['score', 'rating', 'good score', 'bad score', 'what score'],
    answer: 'Scores are out of 5:\n\n- 4.5+ (green) = Great match — apply immediately\n- 3.5-4.4 (yellow) = Good match — worth applying\n- Below 3.5 (red) = Weak match — consider skipping\n\nThe score considers: role fit, CV match percentage, level alignment, compensation range, and growth potential. Click into any report to see the detailed breakdown.' },
  { keywords: ['full pipeline', 'one click', 'generate both'],
    answer: 'When a job scores 4.5+, a Full Pipeline button appears. Clicking it:\n\n1. Generates a tailored cover letter (3 credits)\n2. Generates a tailored resume PDF (3 credits)\n3. Shows download links for both\n\nTotal: 16 credits for evaluation + both documents.' },
  // Documents (Resume + Cover Letter)
  { keywords: ['resume pdf', 'generate resume', 'tailored resume', 'ats', 'one page'],
    answer: 'To generate a tailored resume:\n\n1. Go to Documents\n2. Stay on the Resume tab\n3. Select an evaluated job or paste a new JD\n4. Click Generate (3 credits)\n5. Preview the PDF inline, then download as PDF or DOCX\n\nThe AI injects keywords from the JD, reorders experience by relevance, auto-sizes font to fit 1 page, and includes relevant GitHub projects if linked.',
    links: [{ label: 'Go to Documents', href: '/resume' }] },
  { keywords: ['github', 'projects', 'github projects', 'repos', 'repository'],
    answer: 'If your Profile has a GitHub URL, the resume generator:\n\n1. Fetches your 10 most recent repos from the GitHub API\n2. Filters out forks and repos without descriptions\n3. Picks the 3-4 most relevant to the job description\n4. Writes a tailored 1-line description for each\n\nTo enable this: go to Profile and add your GitHub URL.',
    links: [{ label: 'Go to Profile', href: '/settings' }] },
  { keywords: ['keyword', 'keywords', 'ats keyword', 'coverage'],
    answer: 'After generating a resume, you\'ll see:\n- Keyword coverage percentage (how many JD keywords were included)\n- List of injected keywords as tags\n\nThe AI reformulates your real experience using JD vocabulary. It never invents experience — it only reframes what\'s already in your CV to match what the job asks for.' },
  { keywords: ['cover letter', 'letter', 'generate letter'],
    answer: 'To generate a cover letter:\n\n1. Go to Documents\n2. Switch to the Cover Letter tab\n3. Select an evaluated job or paste a new JD\n4. Click Generate (3 credits)\n5. Preview, then download as DOCX, PDF, or Copy to clipboard\n\nThe letter includes your name, email, phone, location, and date in the header. It references specific JD requirements with real CV evidence.',
    links: [{ label: 'Go to Documents', href: '/resume?tab=cover-letter' }] },
  { keywords: ['copy', 'clipboard'],
    answer: 'On the Documents page (Cover Letter tab), click the "Copy" button to copy the full letter text to your clipboard — including header, greeting, body, closing, and signature. You can then paste it into any application form or email.' },
  { keywords: ['document', 'documents page', 'resume and cover letter'],
    answer: 'Resume and Cover Letter are unified under one Documents page with tabs:\n\n- Resume tab: ATS-optimized 1-page PDF with keyword injection\n- Cover Letter tab: Professional letter with header, body, and signature\n\nChoose your AI model tier: Fast (Haiku, 3 cr), Balanced (Sonnet, 8 cr — best value), or Premium (Opus, 35 cr). Both tabs share the same job selector. Generation history is saved for re-downloading.',
    links: [{ label: 'Go to Documents', href: '/resume' }] },
  // Scanner
  { keywords: ['scan', 'scanner', 'find jobs', 'search jobs', 'companies', 'job search'],
    answer: 'The Scanner finds new jobs matching your profile:\n\n1. Go to Scanner\n2. Open Filters — everything is in one place: target roles (with autocomplete), companies, location, job type, work arrangement, date posted, and salary (with currency selector)\n3. Select companies or leave empty to scan all 110+\n4. Click Scan (3-6 credits)\n5. New matches go to your Pipeline\n\nScans 5 ATS platforms (Greenhouse, Lever, Ashby, SmartRecruiters, Workday) plus 4 job boards (LinkedIn, Talent.com, CareerJet, Jooble). Salary data is extracted where available.',
    links: [{ label: 'Go to Scanner', href: '/scan' }] },
  { keywords: ['filter', 'remote', 'hybrid', 'on-site', 'full-time', 'part-time', 'contract', 'date posted', 'location filter'],
    answer: 'All Scanner settings are unified under one Filters section:\n\n- Target Roles: autocomplete with 70+ role suggestions\n- Companies: toggle individual companies on/off, or use All/None\n- Location: city/region for both board search and career pages\n- Job Type: Full-time, Part-time, Contract, Temporary, Permanent, Fixed Term\n- Work Arrangement: Remote, Hybrid, On-site\n- Date Posted: Last 24h, 3 days, 7 days, 14 days\n- Minimum Salary: preset chips ($40K-$150K) or custom amount, with currency selector (CAD, USD, EUR, GBP, AUD, CHF, INR)\n\nAll settings save automatically and persist across sessions.' },
  { keywords: ['greenhouse', 'lever', 'ashby', 'smartrecruiters', 'workday', 'ats', 'platform', 'which companies'],
    answer: 'We scan 5 ATS platforms:\n\n- Greenhouse — Cloudflare, GitLab, Datadog, Figma, Elastic, Stripe, Airbnb, and many more\n- Lever — Netflix, Spotify, Plaid, MetLife, Palantir\n- Ashby — Notion, Linear, Ramp, OpenAI, Wealthsimple, Deel\n- SmartRecruiters — Visa, Bosch, AbbVie, Uber, McDonald\'s, Continental\n- Workday — NVIDIA, Intel, PayPal, Salesforce\n\n110+ companies across 14 industries.' },
  { keywords: ['suggest', 'ai suggest', 'reset companies', 'recommend'],
    answer: 'Click "AI Suggest" on the Scanner page to get personalized company recommendations based on your resume, target roles, and location. The AI suggests companies that use supported ATS platforms and verifies each slug works before showing it.' },
  { keywords: ['no results', 'zero results', 'nothing found', '0 found', 'scan failed'],
    answer: 'If the scanner returns 0 results:\n\n1. Check your filters — they might be too restrictive (try removing location or job type filters)\n2. Make sure companies are toggled on (use "All" button)\n3. Try adding different companies\n4. Some companies may have no current openings\n\nNote: Many large traditional companies (banks, telcos) use Workday/Taleo which have limited API support.' },
  // Pipeline
  { keywords: ['pipeline', 'inbox', 'pending', 'process', 'batch'],
    answer: 'Pipeline is your job evaluation inbox:\n\n- Tabs: Pending, Done, Errors, Processing — with counts\n- Add jobs manually by pasting a URL\n- Click play to evaluate one job (10 credits)\n- "Process All" evaluates everything in batch with progress bar\n- Cancel button during batch processing\n- "Clear All Pending" and "Clear Done" for bulk cleanup\n- Select multiple items with checkboxes\n- Each item shows company, role, location, source, and timestamp',
    links: [{ label: 'Go to Pipeline', href: '/pipeline' }] },
  { keywords: ['stuck', 'processing', 'timeout', 'timed out', 'frozen'],
    answer: 'If pipeline items are stuck at "processing":\n\n1. Refresh the page — items stuck for 5+ minutes auto-convert to errors\n2. Click the retry button on any errored item\n3. Make sure you have enough credits\n4. If it keeps timing out, the job URL might be blocking our scraper — try adding the JD manually via Evaluate instead' },
  { keywords: ['insufficient', 'not enough credits', 'ran out', 'requeue', 'failed'],
    answer: 'If items show "Insufficient credits":\n\n1. Look for the "Requeue Failed" button at the top of Pipeline\n2. Click it to move all failed items back to Pending\n3. Go to Billing and buy more credits\n4. Come back and click "Process All"\n\nThe batch processor auto-stops when credits run out — remaining items stay pending.' },
  { keywords: ['cancel', 'stop processing', 'abort'],
    answer: 'During batch processing:\n- A red Cancel button appears in the progress bar\n- Click it to stop immediately\n- Items already processed stay done\n- Remaining items stay pending\n- The progress bar shows credits used and remaining' },
  { keywords: ['clear', 'delete all', 'remove all'],
    answer: 'Pipeline cleanup options:\n\n- "Clear All Pending" — removes all pending items\n- "Clear Done" — removes all completed/errored items\n\nBoth show a confirmation before deleting. You get an "Undo" toast for 5 seconds after clearing. Individual items can be deleted with the trash icon.' },
  // Applications
  { keywords: ['application', 'tracker', 'track', 'applied', 'interview', 'status', 'history'],
    answer: 'Applications tracks every job you\'ve evaluated:\n\n- Click any row to view the full evaluation report\n- From a report, generate a resume or cover letter\n- Statuses: Evaluated, Applied, Interview, Offer, Rejected, Withdrawn, Accepted\n- Resume and Cover Letter columns show check/dash for generated status\n- Sort by score, company, or date. Search and filter by status\n- Select multiple applications with checkboxes to bulk delete\n\nJobs from both Evaluate and Pipeline appear here.',
    links: [{ label: 'Go to Applications', href: '/applications' }] },
  // Tools
  { keywords: ['tool', 'tools page', 'what tools'],
    answer: 'The Tools page has 5 specialized AI tools:\n\n1. LinkedIn Message (2 cr) — personalized connection requests with target suggestions\n2. Deep Research (3 cr) — structured research prompts for Perplexity/Claude\n3. Project Evaluator (2 cr) — BUILD/SKIP/MAYBE verdict for portfolio projects\n4. Training Evaluator (2 cr) — DO IT/SKIP verdict for courses/certifications\n5. Compare Offers (5 cr) — 10-dimension scoring matrix for multiple offers',
    links: [{ label: 'Go to Tools', href: '/tools' }] },
  { keywords: ['linkedin', 'message', 'connection request', 'outreach'],
    answer: 'LinkedIn Message Generator (2 credits):\n\n1. Enter company name and role\n2. Optionally paste the JD for better targeting\n3. Get a 300-character message for the best person to contact\n4. Also shows 2-3 alternative targets with messages\n5. Click Copy on any message to use it',
    links: [{ label: 'Go to Tools', href: '/tools' }] },
  { keywords: ['compare', 'offer comparison', 'which offer', 'multiple offers'],
    answer: 'Compare Offers (5 credits):\n\n1. Add 2+ offers with company name, role, and optional JD\n2. Get a scored comparison across 10 dimensions:\n   North Star, CV Match, Level, Compensation, Growth, Remote, Reputation, Tech Stack, Speed to Impact, Culture\n3. Color-coded table with a recommendation',
    links: [{ label: 'Go to Tools', href: '/tools' }] },
  { keywords: ['research', 'deep research', 'perplexity'],
    answer: 'Deep Research Prompt (3 credits):\n\n1. Enter company and role\n2. Get quick questions to answer, your positioning angle, and a full research prompt\n3. Copy the prompt and paste it into Perplexity, Claude, or ChatGPT\n4. The prompt is structured to give you insider knowledge about the company',
    links: [{ label: 'Go to Tools', href: '/tools' }] },
  // Story Bank
  { keywords: ['story', 'star', 'interview prep', 'behavioral', 'story bank'],
    answer: 'Story Bank collects STAR+R interview stories:\n\n- Stories are automatically extracted from evaluation Interview Prep sections\n- Each has: Situation, Task, Action, Result, Reflection\n- Filter by tags (leadership, security, networking, etc.)\n- Expand any story to see the full breakdown\n- Use these to prepare for behavioral interviews\n\nStories accumulate as you evaluate more jobs — no extra cost.',
    links: [{ label: 'Go to Story Bank', href: '/story-bank' }] },
  // Credits & Billing
  { keywords: ['credit', 'cost', 'price', 'billing', 'pay', 'buy', 'purchase', 'how much'],
    answer: 'Credit costs:\n\n| Action | Credits |\n| Evaluation | 10 |\n| Resume/Cover Letter | 3-35 (depends on model tier) |\n| Scanner | 3-6 |\n| Pipeline Item | 10 |\n| LinkedIn Message | 2 |\n| Deep Research | 3 |\n| Project/Training Eval | 2 |\n| Compare Offers | 5 |\n\nModel tiers for documents: Fast (Haiku, 3 cr), Balanced (Sonnet, 8 cr — best value), Premium (Opus, 35 cr).\n\nCredit packs:\n- Starter: $9.99 = 100 credits\n- Professional: $24.99 = 300 credits (Popular)\n- Power User: $45 = 600 credits (Best Value — $0.075/cr)\n\nSubscriptions also available starting at $15/mo.',
    links: [{ label: 'Go to Billing', href: '/billing' }] },
  { keywords: ['subscription', 'monthly', 'plan', 'subscribe'],
    answer: 'Subscription plans (credits roll over):\n\n- Starter: $15/mo (120 credits) — $12/mo annually\n- Growth: $35/mo (300 credits) — $28/mo annually\n- Scale: $79/mo (750 credits) — $63/mo annually\n\nAll plans include all features. Annual billing saves ~20%. Unused credits roll over month to month.',
    links: [{ label: 'Go to Billing', href: '/billing' }] },
  { keywords: ['free', 'trial', 'free tier', 'free uses', 'no cost'],
    answer: 'Every new account gets 3 free uses:\n\n- Works on ANY feature (not just evaluations)\n- Use them on resumes, cover letters, scans, tools — anything\n- After 3 uses, buy credit packs starting at $9 or subscribe\n- Your credit balance shows in the top bar\n- All actions show a confirmation with cost before spending' },
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
    answer: 'Google Sign-In troubleshooting:\n\n- Make sure third-party cookies are enabled\n- On mobile, the redirect might take a moment\n- If it goes to the landing page, try clicking Sign In again\n- Clear your browser cache if it keeps failing\n- You can also create an account with email/password instead' },
  // Download
  { keywords: ['download', 'docx', 'word', 'save', 'export'],
    answer: 'Download options on the Documents page:\n\nResume tab: Preview (inline), Download PDF, Download DOCX\nCover Letter tab: Copy to clipboard, Download PDF, Download DOCX\n\nAll files are named: [Type]-[Initials]-[Company]-[Role]\nExample: Resume-CA-Cloudflare-Systems-Engineer.pdf\n\nGeneration history is saved — re-download previous documents anytime.' },
  // Mobile
  { keywords: ['mobile', 'phone', 'responsive', 'small screen'],
    answer: 'ApplyAgent is fully responsive:\n\n- Use the hamburger menu (top-left) to open the sidebar\n- All features work on mobile: scanning, evaluating, generating documents\n- Credit confirmation buttons stack vertically on small screens\n- The help chatbot works on mobile too' },
  // Undo
  { keywords: ['undo', 'revert', 'mistake', 'oops', 'wrong'],
    answer: 'Undo is available for destructive actions:\n\n- Pipeline: delete item, clear pending/done — 5-second undo toast\n- Scanner: remove company, clear all — 5-second undo toast\n- Profile: save changes — "Undo" button reverts to previous values\n\nLook for the toast notification at the bottom of the screen.' },
  // How it works
  { keywords: ['how it works', 'instructions', 'help page', 'documentation'],
    answer: 'The "How It Works" page has a complete guide covering all 11 features with detailed instructions, credit costs, and tips. It also includes a credit cost reference card at the bottom.',
    links: [{ label: 'Go to How It Works', href: '/instructions' }] },
  // General workflow
  { keywords: ['workflow', 'best way', 'recommended', 'optimal', 'efficient'],
    answer: 'Recommended workflow:\n\n1. Profile — upload CV, set name, email, location\n2. Scanner — set target roles, companies, and filters, then scan\n3. Pipeline — batch evaluate all found jobs\n4. Applications — review scores, focus on 4.0+\n5. Documents — generate resume + cover letter for top matches (use Balanced tier for best value)\n6. Tools — LinkedIn messages, research prompts\n7. Story Bank — prep for interviews\n\nThis flow maximizes your credits and gives you the most tailored results.' },
  // Troubleshooting
  { keywords: ['error', 'bug', 'broken', 'not working', 'issue', 'problem', 'help'],
    answer: 'Common issues and fixes:\n\n- "Insufficient credits" — buy more on the Billing page\n- Pipeline stuck — refresh the page, items auto-fix after 5 minutes\n- Scanner returns 0 — check filters in the unified Filters section\n- Google login redirect — clear cache, enable cookies, try again\n- Resume not tailored — make sure you selected a job or pasted a JD\n- Slow generation — PDF and evaluation take 15-30 seconds\n- Pipeline progress keeps running even if you switch tabs\n\nStill stuck? Email support@applyagent.ca' },
  { keywords: ['slow', 'loading', 'takes long', 'waiting'],
    answer: 'Generation times:\n\n- Evaluation: 15-30 seconds (streaming)\n- Resume: 10-20 seconds\n- Cover Letter: 5-15 seconds\n- Scanner: 5-10 seconds\n- Tools: 3-10 seconds\n\nDon\'t navigate away during generation — results are lost. After completion, they\'re saved so you can switch tabs.' },
  { keywords: ['contact', 'support', 'email', 'help human'],
    answer: 'Need human help?\n\n- Email: support@applyagent.ca (1-2 business day response)\n- Legal/Privacy: legal@applyagent.ca\n\nInclude your email address and a description of the issue.',
    links: [{ label: 'Contact Page', href: '/contact' }] },
  // Privacy & Security
  { keywords: ['privacy', 'data', 'secure', 'safe', 'who sees'],
    answer: 'Your data is secure:\n\n- Stored in Supabase (encrypted at rest)\n- Your CV and documents are only accessible to you\n- AI processing uses Anthropic\'s Claude API (data not stored by them)\n- Payments processed securely via Stripe\n- You can delete all your data anytime from Profile\n\nSee our Privacy Policy for full details.',
    links: [{ label: 'Privacy Policy', href: '/privacy' }] },
  // Referral
  { keywords: ['referral', 'refer', 'invite', 'friend'],
    answer: 'Share your referral link from the Dashboard. When someone signs up and makes their first purchase, you both get 20 bonus credits. Maximum 20 referrals per account.' },
  // Duplicate
  { keywords: ['duplicate', 'already generated', 'regenerate'],
    answer: 'If you try to generate a resume or cover letter for a job you\'ve already generated one for, you\'ll see a duplicate warning with the date of the previous generation. You can either dismiss it or click "Regenerate Anyway" to spend credits on a fresh version.' },
]

// Context-aware suggestions based on current page
const PAGE_SUGGESTIONS: Record<string, string[]> = {
  '/dashboard': ['How do I get started?', 'What should I do first?', 'How do credits work?'],
  '/evaluate': ['How does evaluation work?', 'What do scores mean?', 'What is Full Pipeline?'],
  '/applications': ['How do I track applications?', 'What do the status columns mean?'],
  '/resume': ['How does resume tailoring work?', 'How are cover letters generated?', 'Download as DOCX?'],
  '/scan': ['How does the scanner work?', 'How many companies are available?', 'How do filters work?'],
  '/pipeline': ['How to process jobs?', 'Items are stuck processing', 'How to requeue failed items?'],
  '/settings': ['What fields are required?', 'How to upload my CV?', 'How to change password?'],
  '/billing': ['How much do credits cost?', 'Do I get free uses?', 'What subscription plans exist?'],
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
