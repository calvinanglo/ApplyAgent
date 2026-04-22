import path from 'path'
import fs from 'fs'

export interface PdfContent {
  target_company?: string
  target_role?: string
  keywords_extracted?: string[]
  keyword_coverage_pct?: number
  paper_format?: 'letter' | 'a4'
  lang?: string
  name?: string
  email?: string
  phone?: string
  linkedin_url?: string
  linkedin_display?: string
  github_url?: string
  github_display?: string
  credly_url?: string
  credly_display?: string
  portfolio_url?: string
  portfolio_display?: string
  location?: string
  summary?: string
  competencies?: string[]  // legacy, no longer generated
  github_projects?: Array<{
    name: string
    url: string
    description: string
  }>
  experience?: Array<{
    company: string
    role: string
    period: string
    location?: string
    bullets: string[]
  }>
  projects?: Array<{
    title: string
    badge?: string
    description: string
    tech?: string
  }>
  education?: Array<{
    degree: string
    institution: string
    year?: string
    notes?: string
  }>
  certifications?: Array<{
    name: string
    issuer?: string
    dates?: string
  }>
  skills?: Array<{
    category: string
    items: string[]
  }>
}

export interface CoverLetterContent {
  name?: string
  email?: string
  phone?: string
  linkedin_url?: string
  linkedin_display?: string
  location?: string
  lang?: string
  paper_format?: 'letter' | 'a4'
  date?: string
  recipient?: string
  greeting?: string
  body_paragraphs?: string[]
  closing?: string
}

export function buildResumeHtml(content: PdfContent): string {
  const templatePath = path.join(process.cwd(), 'templates', 'cv-template.html')
  let html = fs.readFileSync(templatePath, 'utf-8')

  const pageWidth = content.paper_format === 'letter' ? '8.5in' : '210mm'
  const lang = content.lang || 'en'

  // Build GitHub projects HTML (replaces old competencies section)
  const hasGithubProjects = (content.github_projects || []).length > 0
  const githubProjectsHtml = hasGithubProjects
    ? (content.github_projects || []).map(p =>
      `<div class="github-project"><a href="${p.url}" class="github-link">${escHtml(p.name)}</a><span class="github-desc">${escHtml(p.description)}</span></div>`
    ).join('\n')
    : ''

  // Legacy competencies fallback (in case old format is returned)
  const competenciesHtml = (content.competencies || [])
    .map(c => `<span class="competency-tag">${escHtml(c)}</span>`)
    .join('\n      ')

  // Build experience HTML
  const experienceHtml = (content.experience || []).map(job => `
  <div class="job avoid-break">
    <div class="job-header">
      <span class="job-company">${escHtml(job.company)}</span>
      <span class="job-period">${escHtml(job.period)}</span>
    </div>
    <div class="job-role">${escHtml(job.role)}</div>
    ${job.location ? `<div class="job-location">${escHtml(job.location)}</div>` : ''}
    <ul>
      ${(job.bullets || []).map(b => `<li>${escHtml(b)}</li>`).join('\n      ')}
    </ul>
  </div>`).join('\n')

  // Skip Projects section entirely if GitHub Projects exists (avoids duplication)
  const hasProjects = !hasGithubProjects && (content.projects || []).length > 0
  const projectsHtml = hasProjects
    ? (content.projects || []).map(p => `
  <div class="project">
    <span class="project-title">${escHtml(p.title)}</span>${p.badge ? `<span class="project-badge">[${escHtml(p.badge)}]</span>` : ''}
    <div class="project-desc">${escHtml(p.description)}</div>
    ${p.tech ? `<div class="project-tech">${escHtml(p.tech)}</div>` : ''}
  </div>`).join('\n')
    : ''

  // Build education HTML
  const educationHtml = (content.education || []).map(e => `
  <div class="edu-item">
    <div class="edu-header">
      <span class="edu-title">${escHtml(e.degree)}<span class="edu-org"> — ${escHtml(e.institution)}</span></span>
      ${e.year ? `<span class="edu-year">${escHtml(e.year)}</span>` : ''}
    </div>
    ${e.notes ? `<div class="edu-desc">${escHtml(e.notes)}</div>` : ''}
  </div>`).join('\n')

  // Build certifications HTML — single inline row, pipe-separated.
  // Dates are omitted here (they'd clutter the line); issuer is hidden unless
  // the cert name doesn't already include it. Optional "Verify on Credly"
  // suffix appended when the candidate has a Credly profile URL.
  const certNames = (content.certifications || [])
    .map(c => escHtml(c.name))
    .filter(n => n.length > 0)
  let certificationsHtml = ''
  if (certNames.length > 0) {
    const inlineCerts = certNames.join(' <span class="cert-sep">|</span> ')
    const credlySuffix = content.credly_url
      ? ` <span class="cert-sep">\u2014</span> <a href="${safeUrl(content.credly_url)}" class="cert-verify">Verify on Credly</a>`
      : ''
    certificationsHtml = `
  <div class="cert-inline">${inlineCerts}${credlySuffix}</div>`
  }

  // Build skills HTML
  const skillsHtml = (content.skills || []).map(s => `
  <div class="skill-line">
    <span class="skill-category">${escHtml(s.category)}:</span> ${s.items.map(i => escHtml(i)).join(' \u00b7 ')}
  </div>`).join('\n')

  // Build contact row — LinkedIn | GitHub | Credly | Portfolio | Location
  // Shorten display text: strip protocol + trailing slashes so we show
  // "credly.com/users/calvin-anglo" instead of the full URL.
  const shortenDisplay = (display: string | undefined, fallbackUrl: string | undefined, fallbackLabel: string): string => {
    const raw = (display || fallbackUrl || '').trim()
    if (!raw) return fallbackLabel
    return raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '')
  }
  const hasLinkedin = !!(content.linkedin_display || content.linkedin_url)
  const hasGithub = !!(content.github_display || content.github_url)
  const hasCredly = !!(content.credly_display || content.credly_url)
  const hasPortfolio = !!(content.portfolio_display || content.portfolio_url)
  const hasPhone = !!content.phone
  const contactParts: string[] = []
  contactParts.push(`<span>${escHtml(content.email || '')}</span>`)
  if (hasPhone) contactParts.push(`<span>${escHtml(content.phone || '')}</span>`)
  if (hasLinkedin) contactParts.push(`<a href="${safeUrl(content.linkedin_url || '#')}">${escHtml(shortenDisplay(content.linkedin_display, content.linkedin_url, 'LinkedIn'))}</a>`)
  if (hasGithub) contactParts.push(`<a href="${safeUrl(content.github_url || '#')}">${escHtml(shortenDisplay(content.github_display, content.github_url, 'GitHub'))}</a>`)
  if (hasCredly) contactParts.push(`<a href="${safeUrl(content.credly_url || '#')}">${escHtml(shortenDisplay(content.credly_display, content.credly_url, 'Credly'))}</a>`)
  if (hasPortfolio) contactParts.push(`<a href="${safeUrl(content.portfolio_url || '#')}">${escHtml(shortenDisplay(content.portfolio_display, content.portfolio_url, 'Portfolio'))}</a>`)
  contactParts.push(`<span>${escHtml(content.location || '')}</span>`)
  const contactRowHtml = `
      <div class="contact-row">
        ${contactParts.join('\n        <span class="separator">|</span>\n        ')}
      </div>`

  // Replace contact row placeholder — keep the template's static contact row
  // but override it dynamically built above
  const replacements: Record<string, string> = {
    '{{LANG}}': lang,
    '{{PAGE_WIDTH}}': pageWidth,
    '{{NAME}}': escHtml(content.name || ''),
    '{{CONTACT_ROW}}': contactRowHtml,
    '{{EMAIL}}': escHtml(content.email || ''),
    '{{LINKEDIN_URL}}': safeUrl(content.linkedin_url || '#'),
    '{{LINKEDIN_DISPLAY}}': escHtml(content.linkedin_display || content.linkedin_url || ''),
    '{{GITHUB_URL}}': safeUrl(content.github_url || '#'),
    '{{GITHUB_DISPLAY}}': escHtml(content.github_display || content.github_url || ''),
    '{{PORTFOLIO_URL}}': safeUrl(content.portfolio_url || '#'),
    '{{PORTFOLIO_DISPLAY}}': escHtml(content.portfolio_display || content.portfolio_url || ''),
    '{{LOCATION}}': escHtml(content.location || ''),
    '{{SECTION_SUMMARY}}': 'Professional Summary',
    '{{SUMMARY_TEXT}}': escHtml(content.summary || ''),
    '{{SECTION_COMPETENCIES}}': hasGithubProjects ? 'GitHub Projects' : 'Core Competencies',
    '{{COMPETENCIES}}': hasGithubProjects ? githubProjectsHtml : competenciesHtml,
    '{{SECTION_EXPERIENCE}}': 'Work Experience',
    '{{EXPERIENCE}}': experienceHtml,
    '{{SECTION_PROJECTS}}': 'Projects',
    '{{PROJECTS}}': projectsHtml,
    '{{SECTION_EDUCATION}}': 'Education',
    '{{EDUCATION}}': educationHtml,
    '{{SECTION_CERTIFICATIONS}}': 'Certifications',
    '{{CERTIFICATIONS}}': certificationsHtml,
    '{{SECTION_SKILLS}}': 'Skills',
    '{{SKILLS}}': skillsHtml,
  }

  for (const [placeholder, value] of Object.entries(replacements)) {
    html = html.replaceAll(placeholder, value)
  }

  // Post-process: remove empty sections
  // Remove GitHub Projects / Competencies section when empty
  if (!hasGithubProjects && !(content.competencies || []).length) {
    html = html.replace(
      /<div class="section">\s*<div class="section-title">(?:Core Competencies|GitHub Projects)<\/div>\s*<div class="competencies-grid">\s*<\/div>\s*<\/div>/,
      ''
    )
  }

  // Remove Projects section entirely when empty
  if (!hasProjects) {
    html = html.replace(
      /<div class="section avoid-break">\s*<div class="section-title">Projects<\/div>\s*\n?\s*<\/div>/,
      ''
    )
  }

  // Fix contact row: remove the orphaned separator when portfolio is empty
  // The template has: LinkedIn | Portfolio | Location — when portfolio is blank,
  // we get: LinkedIn |  | Location — fix by collapsing consecutive separators
  html = html.replace(/(<span class="separator">\|<\/span>\s*){2,}/g, '<span class="separator">|</span>')
  // Also remove separator before empty anchor tags
  html = html.replace(/<span class="separator">\|<\/span>\s*<a href="#"><\/a>/g, '')

  return html
}

export function buildCoverLetterHtml(content: CoverLetterContent): string {
  const templatePath = path.join(process.cwd(), 'templates', 'cover-letter-template.html')
  let html = fs.readFileSync(templatePath, 'utf-8')

  const pageWidth = content.paper_format === 'letter' ? '8.5in' : '210mm'
  const bodyHtml = (content.body_paragraphs || []).map(p => `<p>${escHtml(p)}</p>`).join('\n    ')

  const replacements: Record<string, string> = {
    '{{LANG}}': content.lang || 'en',
    '{{PAGE_WIDTH}}': pageWidth,
    '{{NAME}}': escHtml(content.name || ''),
    '{{EMAIL}}': escHtml(content.email || ''),
    '{{PHONE}}': escHtml(content.phone || ''),
    '{{LINKEDIN_URL}}': content.linkedin_url || '#',
    '{{LINKEDIN_DISPLAY}}': escHtml(content.linkedin_display || ''),
    '{{LOCATION}}': escHtml(content.location || ''),
    '{{DATE}}': escHtml(content.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })),
    '{{RECIPIENT}}': escHtml(content.recipient || 'Hiring Manager'),
    '{{GREETING}}': escHtml(content.greeting || 'Dear Hiring Manager,'),
    '{{BODY}}': bodyHtml,
    '{{CLOSING}}': escHtml(content.closing || 'Best regards,'),
  }

  for (const [placeholder, value] of Object.entries(replacements)) {
    html = html.replaceAll(placeholder, value)
  }

  return html
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function safeUrl(url: string): string {
  if (!url || url === '#') return '#'
  // Block javascript:, data:, vbscript: protocols
  const lower = url.trim().toLowerCase()
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) return '#'
  return escHtml(url)
}
