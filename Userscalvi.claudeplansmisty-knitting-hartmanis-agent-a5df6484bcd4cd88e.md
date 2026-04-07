# ApplyAgent Marketing Features Implementation Plan

## Codebase Summary

- **Framework**: Next.js 16.2.2, React 19.2.4, Tailwind CSS 4, shadcn/ui
- **Auth/DB**: Supabase (PostgreSQL), @supabase/ssr
- **Payments**: Stripe (one-time credit packs, not subscriptions)
- **Route groups**: (marketing), (auth), (app)
- **Deployment**: Vercel at applyagent.ca
- **Config**: next.config.ts with CSP headers, security headers, serverExternalPackages
- **Existing marketing pages**: / (landing), /privacy, /terms, /contact
- **No existing**: analytics, blog, email capture, referral system, JSON-LD, dynamic OG images

---

## Feature 1: Vercel Analytics Integration

**Priority**: Highest (minimal effort, immediate value)
**Risk of conflict**: LOW

### Step 1A: Install packages
Run: npm install @vercel/analytics @vercel/speed-insights

### Step 1B: Modify src/app/layout.tsx (EDIT)
Add imports for Analytics from @vercel/analytics/react and SpeedInsights from @vercel/speed-insights/next.
Add Analytics and SpeedInsights components inside body after CookieConsent.

### Step 1C: Update CSP in next.config.ts (EDIT)
Add to connect-src: https://va.vercel-scripts.com https://vitals.vercel-insights.com
Add to script-src: https://va.vercel-scripts.com

### Files touched
| File | Action |
|------|--------|
| src/app/layout.tsx | EDIT -- add 2 imports, 2 JSX tags |
| next.config.ts | EDIT -- extend CSP connect-src and script-src |

---

## Feature 2: Landing Page Improvements

**Priority**: High
**Risk of conflict**: MODERATE

### Step 2A: Broaden metadata in src/app/layout.tsx (EDIT)
Change description to universal targeting (remove IT/security/Canada narrowing).
New: "Evaluate job postings, generate tailored resumes, and track applications with AI. Your AI-powered job search command center."
Also update openGraph.description and twitter.description.

### Step 2B: Create new section components (NEW FILES)

**src/components/marketing/how-it-works.tsx** (NEW)
Server component. Three-step flow with Lucide icons (Upload, ClipboardPaste, Sparkles). Uses shadcn Card.

**src/components/marketing/testimonials.tsx** (NEW)
Server component. Hardcoded testimonials. Grid of Cards with initials avatar, quote, name, title.

**src/components/marketing/email-capture.tsx** (NEW)
Client component. Email input + submit button. Calls POST /api/email-capture. Shows success state.

### Step 2C: Modify src/app/(marketing)/page.tsx (EDIT)
Insert HowItWorks after Features, Testimonials after HowItWorks, EmailCapture after Pricing before Footer. Add Blog link to nav and footer.

### Files touched
| File | Action |
|------|--------|
| src/app/layout.tsx | EDIT -- update metadata description |
| src/app/(marketing)/page.tsx | EDIT -- import 3 components, insert sections, add blog link |
| src/components/marketing/how-it-works.tsx | NEW |
| src/components/marketing/testimonials.tsx | NEW |
| src/components/marketing/email-capture.tsx | NEW |

---

## Feature 3: Email Capture Backend

**Priority**: High
**Risk of conflict**: NONE

### Step 3A: Database migration (NEW)
supabase/migrations/YYYYMMDDHHMMSS_add_email_subscribers.sql
Table: email_subscribers (id UUID PK, email TEXT UNIQUE, source TEXT, subscribed_at, unsubscribed_at, is_active). RLS enabled.

### Step 3B: API route (NEW)
src/app/api/email-capture/route.ts
Public POST. Validates email. Rate limits by IP (5/min). Upserts via service role client. Returns 200/400/429.

### Step 3C: Update Supabase types (EDIT)
src/lib/supabase/types.ts -- add email_subscribers table type.

### Files touched
| File | Action |
|------|--------|
| supabase/migrations/YYYYMMDDHHMMSS_add_email_subscribers.sql | NEW |
| src/app/api/email-capture/route.ts | NEW |
| src/lib/supabase/types.ts | EDIT -- add email_subscribers type |

---

## Feature 4: Referral System

**Priority**: Medium-high
**Risk of conflict**: LOW -- mostly new files

### Step 4A: Database migration (NEW)
supabase/migrations/YYYYMMDDHHMMSS_add_referral_system.sql
- ALTER profiles ADD COLUMN referral_code TEXT UNIQUE (with backfill)
- CREATE TABLE referrals (id, referrer_id FK, referred_id FK UNIQUE, referral_code, credits_awarded, status, timestamps)
- RLS + indexes

### Step 4B-C: API routes (NEW)
- src/app/api/referrals/claim/route.ts -- POST, auth required, validates code, awards 50 credits
- src/app/api/referrals/stats/route.ts -- GET, auth required, returns code + stats

### Step 4D-E: UI components (NEW)
- src/components/referral/referral-section.tsx -- client component for settings page
- src/components/referral/referral-claim.tsx -- silent client component in app layout

### Step 4F-I: Integration edits
- src/app/(auth)/signup/page.tsx EDIT -- store ref query param
- src/app/(app)/settings/page.tsx EDIT -- render ReferralSection
- src/app/(app)/layout.tsx EDIT -- render ReferralClaim
- src/lib/supabase/types.ts EDIT -- add referral types
- src/lib/credits.ts EDIT -- add REFERRAL_BONUS = 50

---

## Feature 5: Blog Infrastructure

**Priority**: Medium
**Risk of conflict**: NONE except sitemap.ts

### Design: TSX-based content (no MDX dependency)

### New files
- src/app/(marketing)/blog/layout.tsx
- src/app/(marketing)/blog/page.tsx
- src/app/(marketing)/blog/[slug]/page.tsx (generateStaticParams + generateMetadata)
- src/lib/blog/posts.ts (typed BlogPost array)
- src/content/blog/ai-job-search-2026.tsx
- src/content/blog/ats-resume-tips.tsx
- src/content/blog/cover-letter-mistakes.tsx
- src/content/blog/interview-prep-guide.tsx
- src/content/blog/salary-negotiation.tsx

### Edit: src/app/sitemap.ts -- add blog URLs

---

## Feature 6: Dynamic OG Images

**Priority**: Medium
**Risk of conflict**: NONE

### New files
- src/app/opengraph-image.tsx (root OG, ImageResponse from next/og, 1200x630)
- src/app/(marketing)/blog/[slug]/opengraph-image.tsx (dynamic per post)

### Edit: src/app/layout.tsx -- twitter.card to summary_large_image

---

## Feature 7: Structured Data (JSON-LD)

**Priority**: Medium-low

### New files
- src/components/marketing/json-ld.tsx (SoftwareApplication schema)
- src/components/marketing/faq-json-ld.tsx (FAQPage schema)

### Edit: src/app/(marketing)/page.tsx -- render JSON-LD components

---

## Complete Edited-File Manifest

| File | Features | Scope |
|------|----------|-------|
| src/app/layout.tsx | 1, 2, 6 | Analytics, metadata, twitter.card |
| next.config.ts | 1 | CSP extensions |
| src/app/(marketing)/page.tsx | 2, 7 | New sections, blog link, JSON-LD |
| src/lib/supabase/types.ts | 3, 4 | New table types |
| src/app/sitemap.ts | 5 | Blog URLs |
| src/app/(auth)/signup/page.tsx | 4 | Ref param storage |
| src/app/(app)/settings/page.tsx | 4 | ReferralSection |
| src/app/(app)/layout.tsx | 4 | ReferralClaim |
| src/lib/credits.ts | 4 | REFERRAL_BONUS constant |

## Implementation Sequence

### Phase 1: Zero-conflict
1. Feature 1: Vercel Analytics
2. Feature 7: JSON-LD

### Phase 2: New infrastructure
3. Feature 5: Blog
4. Feature 3: Email capture backend

### Phase 3: Landing page (coordinate)
5. Feature 2: Landing page improvements

### Phase 4: Complex features
6. Feature 6: OG Images
7. Feature 4: Referral system

## Dependencies: npm install @vercel/analytics @vercel/speed-insights

## Challenges
1. CSP must allow Vercel analytics domains
2. OG Image 500KB Satori bundle limit
3. Referral credit-awarding must be atomic
4. Submit sitemap to Google Search Console after deploy
5. Consider honeypot field for email capture spam protection