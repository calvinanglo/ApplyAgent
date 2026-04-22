/**
 * React-PDF resume template with scalable font sizes.
 *
 * All font sizes are computed from a `scale` prop (0.65–1.0) so the
 * auto-sizing loop in react-pdf.ts can binary-search for the largest
 * scale that still fits on one page — same visual result as Chromium's
 * auto-font-sizing, but ~10x faster (<100ms per render pass).
 *
 * Design parity with the Chromium HTML template:
 *   - Times-Roman ≈ Garamond (built-in PDF font, no bundle)
 *   - Uppercase section titles with bottom border
 *   - Company/period on same line, role in italic below
 *   - Bullet points with tight spacing
 *   - Contact row with pipe separators
 */

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Link,
} from '@react-pdf/renderer'
import type { PdfContent } from './generator'

// ── Scaled style factory ────────────────────────────────────────────────────

function makeStyles(scale: number) {
  const s = (base: number) => Math.round(base * scale * 100) / 100

  return {
    page: {
      fontFamily: 'Times-Roman' as const,
      fontSize: s(10.5),
      lineHeight: 1.3,
      color: '#000',
      paddingTop: 43,
      paddingBottom: 43,
      paddingHorizontal: 43,
    },

    // Header
    name: {
      fontFamily: 'Times-Bold' as const,
      fontSize: s(20),
      marginBottom: 2,
    },
    rule: {
      borderBottomWidth: 1 as const,
      borderBottomColor: '#000',
      marginBottom: s(3),
    },
    contactRow: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      fontSize: s(9.5),
      color: '#333',
      marginBottom: s(5),
    },
    contactItem: { color: '#333' },
    contactSep: { color: '#aaa', marginHorizontal: s(5) },
    contactLink: { color: '#333', textDecoration: 'none' as const },

    // Section
    section: { marginBottom: s(5) },
    sectionTitle: {
      fontFamily: 'Times-Bold' as const,
      fontSize: s(10.5),
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
      borderBottomWidth: 0.75 as const,
      borderBottomColor: '#000',
      paddingBottom: 1,
      marginBottom: s(3),
    },

    // Summary
    summaryText: { fontSize: s(10.5), lineHeight: 1.35 },

    // Competencies / GitHub
    competenciesRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const },
    competencyTag: { fontSize: s(9.5), marginRight: s(4) },
    githubProject: { fontSize: s(9.5), marginBottom: s(1), flexDirection: 'row' as const, flexWrap: 'wrap' as const },
    githubName: { fontFamily: 'Times-Bold' as const, fontSize: s(9.5), textDecoration: 'none' as const, color: '#000' },
    githubDesc: { fontSize: s(9.5), color: '#000' },

    // Experience
    job: { marginBottom: s(5) },
    jobHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'flex-end' as const },
    jobCompany: { fontFamily: 'Times-Bold' as const, fontSize: s(10.5) },
    jobPeriod: { fontSize: s(9.5), color: '#444' },
    jobRole: { fontFamily: 'Times-Italic' as const, fontSize: s(10.5), marginBottom: s(1) },
    jobLocation: { fontSize: s(9.5), color: '#444', marginBottom: s(1) },
    bulletList: { paddingLeft: s(12), marginTop: s(1) },
    bullet: { flexDirection: 'row' as const, marginBottom: s(0.5) },
    bulletDot: { width: s(8), fontSize: s(10), color: '#000' },
    bulletText: { flex: 1 as const, fontSize: s(10), lineHeight: 1.3 },

    // Projects
    project: { marginBottom: s(3) },
    projectHeader: { flexDirection: 'row' as const, alignItems: 'flex-end' as const, gap: s(3) },
    projectTitle: { fontFamily: 'Times-Bold' as const, fontSize: s(10.5) },
    projectBadge: { fontSize: s(8), color: '#555' },
    projectDesc: { fontSize: s(10), color: '#000' },
    projectTech: { fontSize: s(9.5), color: '#444' },

    // Education
    eduItem: { marginBottom: s(2) },
    eduHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'flex-end' as const },
    eduTitle: { fontFamily: 'Times-Bold' as const, fontSize: s(10.5) },
    eduOrg: { fontFamily: 'Times-Roman' as const, fontSize: s(10.5) },
    eduYear: { fontSize: s(9.5), color: '#444' },
    eduDesc: { fontSize: s(9.5), color: '#333' },

    // Certifications
    certItem: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'flex-end' as const, marginBottom: s(1) },
    certOrg: { fontFamily: 'Times-Bold' as const, fontSize: s(10) },
    certName: { fontSize: s(10) },
    certYear: { fontSize: s(9.5), color: '#444' },

    // Skills
    skillLine: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, marginBottom: s(1), fontSize: s(10) },
    skillCategory: { fontFamily: 'Times-Bold' as const, fontSize: s(10), marginRight: s(3) },
    skillItems: { flex: 1 as const, fontSize: s(10), color: '#000' },
  }
}

// ── Components ──────────────────────────────────────────────────────────────

function ContactRow({ content, S }: { content: PdfContent; S: ReturnType<typeof makeStyles> }) {
  // Shorten display text: strip protocol + trailing slashes so we show
  // "credly.com/users/name" instead of "https://www.credly.com/users/name/".
  const shorten = (display: string | undefined, fallbackUrl: string | undefined, fallbackLabel: string): string => {
    const raw = (display || fallbackUrl || '').trim()
    if (!raw) return fallbackLabel
    return raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '')
  }
  const parts: { label: string; href?: string }[] = []
  if (content.email) parts.push({ label: content.email })
  if (content.phone) parts.push({ label: content.phone })
  if (content.linkedin_display || content.linkedin_url)
    parts.push({ label: shorten(content.linkedin_display, content.linkedin_url, 'LinkedIn'), href: content.linkedin_url })
  if (content.github_display || content.github_url)
    parts.push({ label: shorten(content.github_display, content.github_url, 'GitHub'), href: content.github_url })
  // Credly intentionally omitted from contact row — LinkedIn certs tab
  // handles verification via the "Verify on LinkedIn" link in the cert row.
  if (content.portfolio_display || content.portfolio_url)
    parts.push({ label: shorten(content.portfolio_display, content.portfolio_url, 'Portfolio'), href: content.portfolio_url })
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

function SectionTitle({ children, S }: { children: string; S: ReturnType<typeof makeStyles> }) {
  return <Text style={S.sectionTitle}>{children.toUpperCase()}</Text>
}

function BulletPoint({ text, S }: { text: string; S: ReturnType<typeof makeStyles> }) {
  return (
    <View style={S.bullet}>
      <Text style={S.bulletDot}>{'\u2022'}</Text>
      <Text style={S.bulletText}>{text}</Text>
    </View>
  )
}

// ── Document ────────────────────────────────────────────────────────────────

export function ResumeDocument({ content, scale = 1 }: { content: PdfContent; scale?: number }) {
  const pageSize = content.paper_format === 'a4' ? 'A4' : 'LETTER'
  const S = makeStyles(scale)
  const hasGithubProjects = (content.github_projects || []).length > 0
  const hasProjects = !hasGithubProjects && (content.projects || []).length > 0

  return (
    <Document>
      <Page size={pageSize} style={S.page}>

        {/* Header */}
        {content.name && <Text style={S.name}>{content.name}</Text>}
        <View style={S.rule} />
        <ContactRow content={content} S={S} />

        {/* Professional Summary */}
        {content.summary && (
          <View style={S.section}>
            <SectionTitle S={S}>Professional Summary</SectionTitle>
            <Text style={S.summaryText}>{content.summary}</Text>
          </View>
        )}

        {/* GitHub Projects */}
        {hasGithubProjects && (
          <View style={S.section}>
            <SectionTitle S={S}>GitHub Projects</SectionTitle>
            {(content.github_projects || []).map((p, i) => (
              <View key={i} style={S.githubProject}>
                <Link src={p.url} style={S.githubName}><Text>{p.name}</Text></Link>
                <Text style={S.githubDesc}> — {p.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Core Competencies (legacy) */}
        {!hasGithubProjects && (content.competencies || []).length > 0 && (
          <View style={S.section}>
            <SectionTitle S={S}>Core Competencies</SectionTitle>
            <View style={S.competenciesRow}>
              {(content.competencies || []).map((c, i, arr) => (
                <Text key={i} style={S.competencyTag}>
                  {c}{i < arr.length - 1 ? ' \u00b7' : ''}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Work Experience */}
        {(content.experience || []).length > 0 && (
          <View style={S.section}>
            <SectionTitle S={S}>Work Experience</SectionTitle>
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
                    <BulletPoint key={j} text={b} S={S} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Projects */}
        {hasProjects && (
          <View style={S.section} wrap={false}>
            <SectionTitle S={S}>Projects</SectionTitle>
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

        {/* Education */}
        {(content.education || []).length > 0 && (
          <View style={S.section} wrap={false}>
            <SectionTitle S={S}>Education</SectionTitle>
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

        {/* Certifications — single inline row, pipe-separated names, with a
            "Verify on LinkedIn" deep-link to the profile's certifications tab.
            Falls back to Credly only when no LinkedIn URL is available. */}
        {(content.certifications || []).length > 0 && (() => {
          const liUrl = (content.linkedin_url || '').trim()
          const liCertsUrl = liUrl && /linkedin\.com\/in\//i.test(liUrl)
            ? `${liUrl.replace(/\/+$/, '')}/details/certifications/`
            : ''
          const verifyUrl = liCertsUrl || content.credly_url || ''
          const verifyLabel = liCertsUrl ? 'Verify on LinkedIn' : 'Verify on Credly'
          return (
            <View style={S.section} wrap={false}>
              <SectionTitle S={S}>Certifications</SectionTitle>
              <Text style={S.certName}>
                {(content.certifications || []).map((c, i) => (
                  <Text key={i}>
                    {i > 0 && <Text style={{ color: '#999' }}> | </Text>}
                    <Text>{c.name}</Text>
                  </Text>
                ))}
                {verifyUrl && (
                  <Text>
                    <Text style={{ color: '#999' }}> — </Text>
                    <Link src={verifyUrl} style={{ color: '#000', textDecoration: 'underline' }}>
                      <Text>{verifyLabel}</Text>
                    </Link>
                  </Text>
                )}
              </Text>
            </View>
          )
        })()}

        {/* Skills */}
        {(content.skills || []).length > 0 && (
          <View style={S.section} wrap={false}>
            <SectionTitle S={S}>Skills</SectionTitle>
            {(content.skills || []).map((s, i) => (
              <View key={i} style={S.skillLine}>
                <Text style={S.skillCategory}>{s.category}:</Text>
                <Text style={S.skillItems}> {s.items.join(' \u00b7 ')}</Text>
              </View>
            ))}
          </View>
        )}

      </Page>
    </Document>
  )
}
