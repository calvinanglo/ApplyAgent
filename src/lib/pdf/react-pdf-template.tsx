/**
 * React-PDF resume template.
 *
 * Mirrors the Chromium HTML template visually using @react-pdf/renderer.
 * No Chromium / puppeteer needed — generates PDF natively in Node.js with
 * zero cold-start overhead and a ~40MB smaller Lambda bundle.
 *
 * Design decisions:
 *   - Times-Roman (built-in PDF font) ≈ Garamond visually — no font files to bundle
 *   - Base font 10.5pt — compact enough to fit a typical resume on one page
 *   - Sections use uppercase + bottom border, matching the HTML template
 *   - page-break avoidance via wrap={false} on job/cert/edu blocks
 */

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Link,
  StyleSheet,
} from '@react-pdf/renderer'
import type { PdfContent } from './generator'

// ── Styles ─────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 10.5,
    lineHeight: 1.3,
    color: '#000',
    paddingTop: 43,     // 0.6in ≈ 43pt
    paddingBottom: 43,
    paddingHorizontal: 43,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  name: {
    fontFamily: 'Times-Bold',
    fontSize: 19,
    marginBottom: 2,
  },
  rule: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    marginBottom: 3,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    fontSize: 9,
    color: '#333',
    marginBottom: 5,
    gap: 0,
  },
  contactItem: {
    color: '#333',
    marginRight: 0,
  },
  contactSep: {
    color: '#aaa',
    marginHorizontal: 5,
  },
  contactLink: {
    color: '#333',
    textDecoration: 'none',
  },

  // ── Section ───────────────────────────────────────────────────────────────
  section: {
    marginBottom: 5,
  },
  sectionTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 10.5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottomWidth: 0.75,
    borderBottomColor: '#000',
    paddingBottom: 1,
    marginBottom: 3,
  },

  // ── Summary ───────────────────────────────────────────────────────────────
  summaryText: {
    fontSize: 10.5,
    lineHeight: 1.35,
  },

  // ── Competencies / GitHub Projects ────────────────────────────────────────
  competenciesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },
  competencyTag: {
    fontSize: 9.5,
    marginRight: 4,
  },
  githubProject: {
    fontSize: 9.5,
    marginBottom: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  githubName: {
    fontFamily: 'Times-Bold',
    fontSize: 9.5,
    textDecoration: 'none',
    color: '#000',
  },
  githubDesc: {
    fontSize: 9.5,
    color: '#000',
  },

  // ── Experience ────────────────────────────────────────────────────────────
  job: {
    marginBottom: 5,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  jobCompany: {
    fontFamily: 'Times-Bold',
    fontSize: 10.5,
  },
  jobPeriod: {
    fontSize: 9.5,
    color: '#444',
  },
  jobRole: {
    fontFamily: 'Times-Italic',
    fontSize: 10.5,
    marginBottom: 1,
  },
  jobLocation: {
    fontSize: 9.5,
    color: '#444',
    marginBottom: 1,
  },
  bulletList: {
    paddingLeft: 10,
    marginTop: 1,
  },
  bullet: {
    flexDirection: 'row',
    marginBottom: 0.5,
  },
  bulletDot: {
    width: 10,
    fontSize: 10,
    color: '#000',
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.3,
  },

  // ── Projects ──────────────────────────────────────────────────────────────
  project: {
    marginBottom: 3,
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  projectTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 10.5,
  },
  projectBadge: {
    fontSize: 8,
    color: '#555',
  },
  projectDesc: {
    fontSize: 10,
    color: '#000',
  },
  projectTech: {
    fontSize: 9.5,
    color: '#444',
  },

  // ── Education ─────────────────────────────────────────────────────────────
  eduItem: {
    marginBottom: 2,
  },
  eduHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  eduTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 10.5,
  },
  eduOrg: {
    fontFamily: 'Times-Roman',
    fontSize: 10.5,
  },
  eduYear: {
    fontSize: 9.5,
    color: '#444',
  },
  eduDesc: {
    fontSize: 9.5,
    color: '#333',
  },

  // ── Certifications ────────────────────────────────────────────────────────
  certItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 1,
  },
  certOrg: {
    fontFamily: 'Times-Bold',
    fontSize: 10,
  },
  certName: {
    fontSize: 10,
  },
  certYear: {
    fontSize: 9.5,
    color: '#444',
  },

  // ── Skills ────────────────────────────────────────────────────────────────
  skillLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 1,
    fontSize: 10,
  },
  skillCategory: {
    fontFamily: 'Times-Bold',
    fontSize: 10,
    marginRight: 3,
  },
  skillItems: {
    flex: 1,
    fontSize: 10,
    color: '#000',
  },
})

// ── Helper components ───────────────────────────────────────────────────────

function ContactRow({ content }: { content: PdfContent }) {
  const parts: { label: string; href?: string }[] = []

  if (content.email) parts.push({ label: content.email })
  if (content.phone) parts.push({ label: content.phone })
  if (content.linkedin_display || content.linkedin_url)
    parts.push({ label: content.linkedin_display || 'LinkedIn', href: content.linkedin_url })
  if (content.github_display || content.github_url)
    parts.push({ label: content.github_display || 'GitHub', href: content.github_url })
  if (content.portfolio_display || content.portfolio_url)
    parts.push({ label: content.portfolio_display || 'Portfolio', href: content.portfolio_url })
  if (content.location) parts.push({ label: content.location })

  return (
    <View style={S.contactRow}>
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Text style={S.contactSep}>|</Text>}
          {p.href ? (
            <Link src={p.href} style={S.contactLink}><Text>{p.label}</Text></Link>
          ) : (
            <Text style={S.contactItem}>{p.label}</Text>
          )}
        </React.Fragment>
      ))}
    </View>
  )
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={S.sectionTitle}>{children.toUpperCase()}</Text>
}

function BulletPoint({ text }: { text: string }) {
  return (
    <View style={S.bullet}>
      <Text style={S.bulletDot}>•</Text>
      <Text style={S.bulletText}>{text}</Text>
    </View>
  )
}

// ── Main document ───────────────────────────────────────────────────────────

export function ResumeDocument({ content }: { content: PdfContent }) {
  const pageSize = content.paper_format === 'a4' ? 'A4' : 'LETTER'

  const hasGithubProjects = (content.github_projects || []).length > 0
  const hasProjects = !hasGithubProjects && (content.projects || []).length > 0

  return (
    <Document>
      <Page size={pageSize} style={S.page}>

        {/* ── Header ───────────────────────────────────────────────── */}
        {content.name && <Text style={S.name}>{content.name}</Text>}
        <View style={S.rule} />
        <ContactRow content={content} />

        {/* ── Professional Summary ─────────────────────────────────── */}
        {content.summary && (
          <View style={S.section}>
            <SectionTitle>Professional Summary</SectionTitle>
            <Text style={S.summaryText}>{content.summary}</Text>
          </View>
        )}

        {/* ── GitHub Projects / Core Competencies ──────────────────── */}
        {hasGithubProjects && (
          <View style={S.section}>
            <SectionTitle>GitHub Projects</SectionTitle>
            {(content.github_projects || []).map((p, i) => (
              <View key={i} style={S.githubProject}>
                <Link src={p.url} style={S.githubName}><Text>{p.name}</Text></Link>
                <Text style={S.githubDesc}> — {p.description}</Text>
              </View>
            ))}
          </View>
        )}

        {!hasGithubProjects && (content.competencies || []).length > 0 && (
          <View style={S.section}>
            <SectionTitle>Core Competencies</SectionTitle>
            <View style={S.competenciesRow}>
              {(content.competencies || []).map((c, i, arr) => (
                <Text key={i} style={S.competencyTag}>
                  {c}{i < arr.length - 1 ? ' ·' : ''}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* ── Work Experience ──────────────────────────────────────── */}
        {(content.experience || []).length > 0 && (
          <View style={S.section}>
            <SectionTitle>Work Experience</SectionTitle>
            {(content.experience || []).map((job, i) => (
              <View key={i} style={S.job} wrap={false}>
                <View style={S.jobHeader}>
                  <Text style={S.jobCompany}>{job.company}</Text>
                  <Text style={S.jobPeriod}>{job.period}</Text>
                </View>
                <Text style={S.jobRole}>{job.role}</Text>
                {job.location && <Text style={S.jobLocation}>{job.location}</Text>}
                <View style={S.bulletList}>
                  {(job.bullets || []).map((b, j) => (
                    <BulletPoint key={j} text={b} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Projects ─────────────────────────────────────────────── */}
        {hasProjects && (
          <View style={S.section} wrap={false}>
            <SectionTitle>Projects</SectionTitle>
            {(content.projects || []).map((p, i) => (
              <View key={i} style={S.project}>
                <View style={S.projectHeader}>
                  <Text style={S.projectTitle}>{p.title}</Text>
                  {p.badge && <Text style={S.projectBadge}>[{p.badge}]</Text>}
                </View>
                <Text style={S.projectDesc}>{p.description}</Text>
                {p.tech && <Text style={S.projectTech}>{p.tech}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* ── Education ────────────────────────────────────────────── */}
        {(content.education || []).length > 0 && (
          <View style={S.section} wrap={false}>
            <SectionTitle>Education</SectionTitle>
            {(content.education || []).map((e, i) => (
              <View key={i} style={S.eduItem}>
                <View style={S.eduHeader}>
                  <Text>
                    <Text style={S.eduTitle}>{e.degree}</Text>
                    <Text style={S.eduOrg}> — {e.institution}</Text>
                  </Text>
                  {e.year && <Text style={S.eduYear}>{e.year}</Text>}
                </View>
                {e.notes && <Text style={S.eduDesc}>{e.notes}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* ── Certifications ────────────────────────────────────────── */}
        {(content.certifications || []).length > 0 && (
          <View style={S.section} wrap={false}>
            <SectionTitle>Certifications</SectionTitle>
            {(content.certifications || []).map((c, i) => (
              <View key={i} style={S.certItem}>
                <Text>
                  {c.issuer && <Text style={S.certOrg}>{c.issuer} — </Text>}
                  <Text style={S.certName}>{c.name}</Text>
                </Text>
                {c.dates && <Text style={S.certYear}>{c.dates}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* ── Skills ────────────────────────────────────────────────── */}
        {(content.skills || []).length > 0 && (
          <View style={S.section} wrap={false}>
            <SectionTitle>Skills</SectionTitle>
            {(content.skills || []).map((s, i) => (
              <View key={i} style={S.skillLine}>
                <Text style={S.skillCategory}>{s.category}:</Text>
                <Text style={S.skillItems}> {s.items.join(' · ')}</Text>
              </View>
            ))}
          </View>
        )}

      </Page>
    </Document>
  )
}
