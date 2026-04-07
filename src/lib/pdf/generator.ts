import path from 'path'
import fs from 'fs'

export interface PdfContent {
  keywords_extracted?: string[]
  keyword_coverage_pct?: number
  paper_format?: 'letter' | 'a4'
  lang?: string
  name?: string
  email?: string
  linkedin_url?: string
  linkedin_display?: string
  portfolio_url?: string
  portfolio_display?: string
  location?: string
  summary?: string
  competencies?: string[]
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

  // Build competencies HTML
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

  // Build projects HTML — only render section if projects exist
  const hasProjects = (content.projects || []).length > 0
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

  // Build certifications HTML
  const certificationsHtml = (content.certifications || []).map(c => `
  <div class="cert-item">
    <span class="cert-title"><span class="cert-org">${escHtml(c.issuer || '')}</span>${c.issuer ? ' \u2014 ' : ''}${escHtml(c.name)}</span>
    ${c.dates ? `<span class="cert-year">${escHtml(c.dates)}</span>` : ''}
  </div>`).join('\n')

  // Build skills HTML
  const skillsHtml = (content.skills || []).map(s => `
  <div class="skill-line">
    <span class="skill-category">${escHtml(s.category)}:</span> ${s.items.map(i => escHtml(i)).join(' \u00b7 ')}
  </div>`).join('\n')

  // Build contact row — only include portfolio if it exists
  const hasPortfolio = !!(content.portfolio_display || content.portfolio_url)
  const contactRowHtml = `
      <div class="contact-row">
        <span>${escHtml(content.email || '')}</span>
        <span class="separator">|</span>
        <a href="${content.linkedin_url || '#'}">${escHtml(content.linkedin_display || content.linkedin_url || '')}</a>
        ${hasPortfolio ? `
        <span class="separator">|</span>
        <a href="${content.portfolio_url || '#'}">${escHtml(content.portfolio_display || content.portfolio_url || '')}</a>` : ''}
        <span class="separator">|</span>
        <span>${escHtml(content.location || '')}</span>
      </div>`

  // Replace contact row placeholder — keep the template's static contact row
  // but override it dynamically built above
  const replacements: Record<string, string> = {
    '{{LANG}}': lang,
    '{{PAGE_WIDTH}}': pageWidth,
    '{{NAME}}': escHtml(content.name || ''),
    '{{EMAIL}}': escHtml(content.email || ''),
    '{{LINKEDIN_URL}}': content.linkedin_url || '#',
    '{{LINKEDIN_DISPLAY}}': escHtml(content.linkedin_display || content.linkedin_url || ''),
    '{{PORTFOLIO_URL}}': content.portfolio_url || '#',
    '{{PORTFOLIO_DISPLAY}}': escHtml(content.portfolio_display || content.portfolio_url || ''),
    '{{LOCATION}}': escHtml(content.location || ''),
    '{{SECTION_SUMMARY}}': 'Professional Summary',
    '{{SUMMARY_TEXT}}': escHtml(content.summary || ''),
    '{{SECTION_COMPETENCIES}}': 'Core Competencies',
    '{{COMPETENCIES}}': competenciesHtml,
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

  // Post-process: remove empty sections (header present but no content)
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
