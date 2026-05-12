<div align="center">

# ApplyAgent

**An end-to-end job search command center. CV evaluation, tailored document generation, automated career portal scanning, and pipeline tracking in one app.**

[![Live](https://img.shields.io/badge/Live-applyagent.ca-22c55e?style=for-the-badge)](https://applyagent.ca)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ecf8e?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-635bff?style=for-the-badge&logo=stripe&logoColor=white)](https://stripe.com)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

[Live App](https://applyagent.ca) · [Demo Video](#) · [Author](https://github.com/calvinanglo)

</div>

---

## The Problem

The average job seeker submits 100+ applications, manually rewriting their resume and cover letter for each one, copy-pasting between LinkedIn tabs, and losing track of which version they sent where. The work is repetitive, time-consuming, and high-friction in exactly the way software is good at fixing.

## The Solution

ApplyAgent collapses the workflow into one app. Upload a CV once, and the system scores it against any job description, generates ATS-friendly tailored documents in PDF and DOCX, scrapes new postings from company career portals and major boards, and tracks the entire pipeline with the exact document version sent for each application.

## Features

### CV and Profile Management

- Upload resumes as PDF or DOCX and parse them into structured data via `pdf-parse` and `mammoth`.
- Store multiple resume versions per user (e.g., a security variant and an infrastructure variant).
- Extract and edit experience, skills, education, and contact details in a structured editor.
- Set a default CV used as the base for all tailoring and evaluations.

### AI-Powered Job Evaluation

- Paste a job description or import one from a scraped listing.
- Get a numeric match score representing how well the CV fits the role.
- Surface keyword gaps, missing skills, and resume strengths the posting rewards.
- Receive concrete suggestions for which experience to emphasize and what to add.
- Cached evaluations so re-scoring the same CV and job pair costs nothing.

### Tailored Document Generation

- Generate a tailored resume for any job description in one click.
- Generate a matching cover letter with tone and length controls.
- ATS-friendly templates that parse cleanly through Workday, Greenhouse, Lever, and Taleo.
- Export to PDF via `@react-pdf/renderer` and `jspdf`.
- Export to DOCX via the `docx` library, fully editable in Word.
- Version every generated document and link it back to the application it was sent for.

### Job Discovery and Scraping

- Scan company career portals using a headless browser pipeline (Puppeteer + Cheerio).
- Pull listings from major job boards into a unified feed.
- Normalize roles into a consistent schema with title, company, location, remote flag, salary (when listed), posted date, and source URL.
- Deduplicate listings across sources so the same role does not appear twice.
- Filter by country, region, role keyword, remote status, and posted-within window.
- Save searches and revisit results without re-running the scraper.

### Application Pipeline Tracker

- Track every application with status (Saved, Applied, Interviewing, Offer, Rejected, Withdrawn).
- Log the exact resume and cover letter version sent for each application.
- Record contacts (recruiter, hiring manager, referral) per application.
- Add notes and timeline entries for interview rounds, follow-ups, and recruiter calls.
- Filter and sort the pipeline by status, company, date, or stage.
- See aggregate stats: applications submitted, response rate, interview rate, time-to-response.

### Account, Auth, and Billing

- Email-based sign up and login through Supabase Auth with SSR session handling.
- Tiered plans gated through Stripe Checkout (free tier, paid tiers for higher generation and scraping volume).
- Stripe Customer Portal for self-serve subscription management, cancellation, and invoice access.
- Webhook-driven subscription state synced to Postgres so feature gates always reflect the source of truth.
- Per-tier usage limits enforced server-side before any billable operation runs.

### Platform and UX

- Dark and light themes via `next-themes`.
- Responsive layout that works on phone, tablet, and desktop.
- Toast notifications via `sonner` for async actions (uploads, generations, scrapes).
- Built on shadcn/ui and Base UI primitives with Tailwind v4 styling.
- Country and region pickers via `country-state-city` for location-aware filtering.
- Vercel Analytics integrated for usage insights.

### Coming Soon

- Browser extension for one-click apply on LinkedIn and Indeed.
- Interview prep mode that generates likely questions from the job description.
- Outreach assistant for tailored recruiter and hiring manager messages.
- Mobile app feature parity (scaffold exists under `mobile/`).
- Multi-resume profile presets (e.g., switch between security and infrastructure CVs per application).

## Screenshots

> _Screenshots and a short demo video go here. See [applyagent.ca](https://applyagent.ca) for the live product._

| Dashboard | Job Evaluation | Document Generator |
|---|---|---|
| _coming soon_ | _coming soon_ | _coming soon_ |

## Engineering Highlights

A few decisions worth calling out:

- **Server-only LLM calls with response caching.** API keys never reach the client. Evaluations are hashed on (CV + JD) and cached in Postgres, so re-scoring the same pair is free and predictable.
- **Row Level Security on every user-owned table.** Postgres RLS policies enforce isolation at the database layer, not just in the application code. A bug in a route handler cannot leak another user's applications.
- **Serverless-compatible headless browser.** Pairing `puppeteer-core` with `@sparticuz/chromium-min` lets the scraper run identically on local dev and on Vercel functions, with a system-Chromium fallback for self-hosted deployments.
- **Signed Stripe webhooks.** Subscription state is the source of truth in Postgres, updated only through signature-verified webhook handlers. Feature gates read from that table.
- **Pre-flight env validation.** A `check-env.mjs` script fails the build if required secrets are missing, so misconfigured deploys never silently break in production.
- **Dual-format document output.** PDFs via `@react-pdf/renderer` for composable layouts, `jspdf` for simpler cases, and `docx` for outputs that stay editable in Word. Real users want both.

## Tech Stack

| Area | Tools |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Base UI, lucide-react |
| Backend | Next.js server actions and route handlers, Supabase (Postgres + SSR auth) |
| AI | LLM-powered evaluation, tailoring, and content generation |
| Scraping | Puppeteer Core, `@sparticuz/chromium-min`, Cheerio |
| Document Pipeline | `pdf-parse` and `mammoth` for parsing, `@react-pdf/renderer`, `jspdf`, and `docx` for generation |
| Payments | Stripe (Checkout + Webhooks) |
| Infra | Vercel (hosting and analytics), Supabase Cloud |
| DX | ESLint, TypeScript strict, shadcn/ui generators |

## Architecture

```
┌──────────────────┐      ┌────────────────────────┐      ┌─────────────────┐
│   Next.js App    │ ───► │   Server Actions /     │ ───► │   Supabase      │
│   (React 19)     │      │   Route Handlers       │      │   Postgres + RLS│
└──────────────────┘      └────────────────────────┘      └─────────────────┘
                                     │
                          ┌──────────┼──────────┐
                          ▼          ▼          ▼
                    ┌─────────┐ ┌─────────┐ ┌──────────┐
                    │   LLM   │ │ Scraper │ │  Stripe  │
                    │  (eval) │ │(Pptr+   │ │(billing) │
                    │         │ │ Cheerio)│ │          │
                    └─────────┘ └─────────┘ └──────────┘
```

- **Authentication** flows through `@supabase/ssr`. Server components read the session from cookies and use the service-role client only for trusted server work.
- **AI requests** are isolated to server-side handlers, with usage metered against the user's subscription tier before the call is made.
- **Scrapers** run on a schedule via `scripts/` and on-demand via API routes, deduping listings into a normalized `jobs` table.
- **Documents** are generated server-side and streamed to the client, so the user gets a download without large files crossing the client boundary unnecessarily.

## Security and Reliability

Built with a security-engineer mindset:

- Secrets are never exposed to the client. All `NEXT_PUBLIC_` variables are reviewed and limited to non-sensitive identifiers.
- Database access is governed by Row Level Security policies, with the service-role key used only in audited server paths.
- Webhook handlers verify Stripe signatures before mutating state.
- LLM responses are validated and parsed defensively. Untrusted scraped HTML is sanitized before storage.
- Environment configuration is validated at build time to fail loudly on missing or misconfigured secrets.

## Project Structure

```
applyagent/
├── src/             Next.js routes, components, server actions, lib
├── public/          Static assets
├── supabase/        Migrations, PLpgSQL functions, RLS policies
├── scripts/         Scrapers, batch jobs, maintenance tooling
├── templates/       Resume and cover letter templates
├── mobile/          Mobile companion app (early scaffold)
├── check-env.mjs    Pre-flight env var validator
├── components.json  shadcn/ui config
└── next.config.ts
```

## Skills Demonstrated

- **Full-stack TypeScript** across Next.js App Router, React Server Components, and server actions
- **Production database design** with Postgres, PLpgSQL functions, and Row Level Security
- **Third-party API integration** for payments (Stripe), LLM providers, and document tooling
- **Web scraping at scale** with headless browser automation and HTML parsing
- **Secure-by-default architecture** with secret isolation, signed webhooks, and defense in depth
- **Product thinking** translating a real pain point into a working, billable product
- **Shipping and operating** a live app on a real domain with paying-tier infrastructure

## Local Setup

<details>
<summary>Click to expand</summary>

### Prerequisites

- Node.js 20+
- A Supabase project
- An LLM provider API key
- A Stripe account (test keys are fine)

### Install

```bash
git clone https://github.com/calvinanglo/applyagent.git
cd applyagent
npm install
```

### Environment

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

LLM_API_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Validate: `node check-env.mjs`

### Database

```bash
npx supabase link --project-ref YOUR-PROJECT-REF
npx supabase db push
```

### Run

```bash
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000).

</details>

## About the Author

Built solo by **Calvin Anglo**, an IT and security professional based in Winnipeg, Canada. Background in infrastructure, detection engineering, and security automation across 30+ remote sites at a Canadian co-operative. Certifications include CCNA, Security+, AZ-104, ISC2 CC, and ITIL 4.

---

<div align="center">

_Built because rewriting the same cover letter 100 times is a software problem._

</div>
