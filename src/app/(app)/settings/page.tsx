'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, Save, CheckCircle2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { FileUpload } from '@/components/ui/file-upload'
import { LocationSelect } from '@/components/location-select'
import { useRouter } from 'next/navigation'
import { useNavigationBlocker } from '@/components/navigation-blocker'

// Example resume shown as placeholder to guide formatting. Fully fabricated —
// fake name, companies, schools, numbers. Purely an illustrative template.
const RESUME_TEMPLATE_PLACEHOLDER = `JORDAN PATEL
Ontario, Canada | jordan.patel@example.com | (416) 555-0123 | linkedin.com/in/jordan-patel | https://github.com/jordanpatel

PROFESSIONAL SUMMARY
Cybersecurity and IT Infrastructure professional with 4+ years of progressive experience in security monitoring, incident response, threat detection, system hardening, and compliance enforcement across enterprise and remote environments. Proven track record in SOC operations, SIEM-based triage, EDR/XDR management, endpoint security, SOC 2 audit readiness, and Zero Trust IAM implementation. Skilled in applying NIST and MITRE ATT&CK frameworks to translate technical findings into business risk impacts. Holds CCNA, CySA+, Security+, and AWS Certified Security – Specialty.

EXPERIENCE

Northern Logistics Group — Toronto, ON
Security Operations Analyst | Jun 2022 – Present
• Primary Incident Responder for 24/7 on-call rotations; perform SIEM triage (Splunk, CrowdStrike Falcon), log analysis, root-cause analysis, and escalation per MITRE ATT&CK and NIST incident response frameworks.
• Implement Zero Trust security posture with Conditional Access, MFA, RBAC, and IAM policies in Azure AD/Entra ID, reducing unauthorized access attempts by 40% year over year.
• Enforce SOC 2 and ISO 27001 controls and daily backup verification, maintaining audit-readiness and supporting change management to mitigate regulatory risk.
• Manage EDR/endpoint security across 800+ endpoints: patch management, vulnerability remediation, threat hunting, and remediation documentation.
• Configure and validate Palo Alto, Cisco, and AWS deployments including firewall rules, ACLs, network segmentation, and site-to-site VPN tunnels for 12 distributed offices.
• Triage security alerts via SIEM/SOAR workflows, reducing mean time to detect (MTTD) by 35% and mean time to respond (MTTR) by 28%.
• Collaborate with vendors, field teams, and leadership to align security operations with GRC frameworks and risk assessment procedures.

Pacific Retail Solutions — Vancouver, BC
IT Support Technician | Sep 2021 – Jun 2022
• Supported 300+ retail clients on POS and network systems, resolving 85% of tickets on first contact while maintaining PCI-DSS compliance and DLP controls for payment data.
• Built PowerShell and Python automation scripts to auto-remediate common incidents, reducing manual workload by 30% and improving SLA consistency.
• Authored internal runbooks and SOPs; trained junior staff, improving onboarding efficiency by 25%.
• Coordinated with vendors to resolve integration issues, ensuring 99.5% uptime and business continuity for mission-critical systems.

Summit Manufacturing Corp — Brandon, MB
IT Co-op Student | Jan 2020 – Aug 2020
• Configured SSO, MFA, and RBAC access policies via Active Directory and Group Policy, reducing unauthorized login attempts by 20%.
• Optimized ITSM ticket triage and escalation workflows, improving resolution speed and reducing backlog by 15%.
• Automated imaging and deployment with WDS and Group Policy, ensuring consistent configurations across 250+ devices.
• Tracked asset lifecycle data for compliance with IT inventory, audit, and change management requirements.

EDUCATION

Lakeshore Technical Institute | Sep 2017 – Apr 2021
Bachelor of Information Technology with Distinction — GPA: 3.85/4.0

CERTIFICATIONS
CompTIA Security+ (SY0-701) | CompTIA CySA+ (CS0-003) | AWS Certified Security – Specialty | Cisco CCNA | ITIL 4 Foundation — Verify on Credly

TECHNICAL SKILLS
Security & Compliance: SIEM (Splunk, CrowdStrike Falcon, Sentinel), EDR/XDR, IDS/IPS, SOAR, DLP, Threat Intelligence, Vulnerability Management, Penetration Testing, Digital Forensics, Incident Response, Threat Hunting, IoC Analysis, NIST, CIS Benchmarks, MITRE ATT&CK, SOC 2, ISO 27001, PCI-DSS, GRC, Risk Assessment, BCP/DR, Defense in Depth
Identity & Access: Azure AD/Entra ID, Active Directory, Zero Trust, Conditional Access, RBAC, MFA, SSO, SAML, OAuth 2.0, OIDC, LDAP, Kerberos, 802.1X, RADIUS, TACACS+, NAC, PKI, TLS/SSL, IPSec, Least Privilege
Networking: Cisco Routing & Switching, Palo Alto, OSPF, BGP, STP/RSTP, EtherChannel, HSRP, VLANs, 802.1Q, ACLs, Port Security, DHCP Snooping, Network Segmentation, TCP/IP, IPv4/IPv6, Subnetting, DNS, DHCP, NAT/PAT, VPN, QoS, SNMP, Syslog, SD-WAN, Wireshark
Systems & Automation: Windows Server, GPO, Microsoft 365, Intune MDM, Hyper-V, VMware, PowerShell, Python, Bash, Ansible, Terraform, REST APIs, Nessus, Qualys, GitHub Actions, WDS | Platforms: Windows, Linux/Ubuntu, macOS, AWS, Azure, GCP`

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isOAuthOnly, setIsOAuthOnly] = useState(false)
  const router = useRouter()
  const { setBlocked } = useNavigationBlocker()

  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
    location: '',
    target_roles: [] as string[],
    salary_min: 0,
    salary_max: 0,
    salary_currency: 'CAD',
    work_arrangement: [] as string[],
    job_types: [] as string[],
    voice_sample: '',
  })
  const [targetRolesText, setTargetRolesText] = useState('')
  const [cvContent, setCvContent] = useState('')
  const [userId, setUserId] = useState('')

  const [previousProfile, setPreviousProfile] = useState<typeof profile | null>(null)
  const [previousTargetRoles, setPreviousTargetRoles] = useState('')

  // Dirty tracking — snapshot of last-saved state
  const savedProfileRef = useRef('')
  const savedCvRef = useRef('')

  const isDirty = useCallback(() => {
    const currentSnapshot = JSON.stringify({ profile, cvContent })
    return savedProfileRef.current !== '' && currentSnapshot !== savedProfileRef.current
  }, [profile, cvContent])

  // Warn on browser navigation / tab close
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty()) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  // Block in-app navigation when dirty
  useEffect(() => {
    setBlocked(isDirty())
  }, [isDirty, setBlocked])

  // Unblock on unmount
  useEffect(() => {
    return () => setBlocked(false)
  }, [setBlocked])

  // Auto-fill profile fields from CV text
  function autofillFromCv(text: string) {
    if (!text) return
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    const updates: Partial<typeof profile> = {}

    // Email
    const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/i)
    if (emailMatch && !profile.email) updates.email = emailMatch[0]

    // Phone
    const phoneMatch = text.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)
    if (phoneMatch && !profile.phone) updates.phone = phoneMatch[0]

    // LinkedIn
    const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+\/?/i)
    if (linkedinMatch && !profile.linkedin_url) updates.linkedin_url = linkedinMatch[0].startsWith('http') ? linkedinMatch[0] : `https://${linkedinMatch[0]}`

    // GitHub
    const githubMatch = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+\/?/i)
    if (githubMatch && !profile.github_url) updates.github_url = githubMatch[0].startsWith('http') ? githubMatch[0] : `https://${githubMatch[0]}`

    // Portfolio (non-linkedin, non-github URLs)
    const urlMatches = text.match(/https?:\/\/[\w.-]+\.[\w]{2,}[\w/.-]*/gi) || []
    const portfolioUrl = urlMatches.find(u => !u.includes('linkedin.com') && !u.includes('github.com') && !u.includes('credly.com'))
    if (portfolioUrl && !profile.portfolio_url) updates.portfolio_url = portfolioUrl

    // Name — first non-empty line that looks like a name (2-4 capitalized words, no special chars)
    if (!profile.full_name) {
      for (const line of lines.slice(0, 5)) {
        const cleaned = line.replace(/[#*_]/g, '').trim()
        if (/^[A-Z][a-z]+ [A-Z][a-z]+/.test(cleaned) && cleaned.length < 40) {
          updates.full_name = cleaned
          break
        }
        // Also catch ALL CAPS names like "CALVIN ANGLO"
        if (/^[A-Z]{2,}\s+[A-Z]{2,}$/.test(cleaned) && cleaned.length < 40) {
          updates.full_name = cleaned.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
          break
        }
      }
    }

    // Location — look for patterns like "City, Province" or "City, Province, Country"
    if (!profile.location) {
      // Try "City, Province, Country" first
      const loc3 = text.match(/(?:^|\||\n)\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)?,\s*[A-Z][a-z]+(?:\s[A-Z][a-z]+)?,\s*[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s*(?:\||\n|$)/m)
      if (loc3) {
        updates.location = loc3[1].trim()
      } else {
        // Try "City, Province/State"
        const loc2 = text.match(/(?:^|\||\n)\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)?,\s*(?:[A-Z]{2}|[A-Z][a-z]+(?:\s[A-Z][a-z]+)?))\s*(?:\||\n|$)/m)
        if (loc2) updates.location = loc2[1].trim()
      }
    }

    if (Object.keys(updates).length > 0) {
      setProfile(prev => ({ ...prev, ...updates }))
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const hasPasswordIdentity = user.identities?.some((i: any) => i.provider === 'email')
    setIsOAuthOnly(!hasPasswordIdentity)

    const [profileRes, cvRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single() as any,
      supabase.from('cv_documents').select('content').eq('user_id', user.id).eq('is_active', true).single() as any,
    ])

    if (profileRes.data) {
      setProfile(profileRes.data)
      setTargetRolesText((profileRes.data.target_roles || []).join(', '))
    }
    const loadedCv = cvRes.data?.content || ''
    if (loadedCv) setCvContent(loadedCv)
    // Snapshot initial state for dirty tracking
    savedProfileRef.current = JSON.stringify({ profile: profileRes.data || profile, cvContent: loadedCv })
    savedCvRef.current = loadedCv
    setLoading(false)
  }

  // Input sanitization
  function sanitizeName(v: string) { return v.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '').slice(0, 100) }
  function sanitizeEmail(v: string) { return v.replace(/[^a-zA-Z0-9@._+-]/g, '').slice(0, 254) }
  function sanitizePhone(v: string) { return v.replace(/[^0-9()+\s.-]/g, '').slice(0, 20) }
  function sanitizeUrl(v: string) { return v.replace(/[^a-zA-Z0-9:/.?&=_%-]/g, '').slice(0, 500) }
  function sanitizeLocation(v: string) { return v.replace(/[^a-zA-ZÀ-ÿ\s,'-]/g, '').slice(0, 100) }

  async function handleSave() {
    setPreviousProfile({ ...profile })
    setPreviousTargetRoles(targetRolesText)
    setSaving(true)
    setSaved(false)
    const supabase = createClient()

    const targetRoles = targetRolesText.split(',').map(r => r.trim()).filter(Boolean)

    const db = supabase as any
    await db.from('profiles').update({
      ...profile,
      target_roles: targetRoles,
      onboarding_completed: true,
    }).eq('id', userId)

    // Upsert CV
    if (cvContent.trim()) {
      const { data: existing } = await db
        .from('cv_documents')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (existing) {
        await db.from('cv_documents').update({ content: cvContent }).eq('id', existing.id)
      } else {
        await db.from('cv_documents').insert({ user_id: userId, content: cvContent })
      }
    }

    // Sync profile state with the exact values we just saved (fixes dirty-tracking mismatch
    // when e.g. target_roles was null from DB but parsed to [] from text)
    const savedProfile = { ...profile, target_roles: targetRoles }
    setProfile(savedProfile)
    savedProfileRef.current = JSON.stringify({ profile: savedProfile, cvContent })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    toast('Profile saved', {
      action: {
        label: 'Undo',
        onClick: () => {
          if (previousProfile) {
            setProfile(previousProfile)
            setTargetRolesText(previousTargetRoles)
            toast('Changes reverted — click Save to apply')
          }
        },
      },
      duration: 5000,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-muted-foreground">Your profile and CV configuration</p>
        </div>
        <div className="flex items-center gap-3">
          {isDirty() && !saving && !saved && (
            <span className="text-xs text-amber-600 dark:text-amber-400 hidden sm:inline">Unsaved changes</span>
          )}
          <Button className="hidden sm:inline-flex" onClick={() => {
            if (!profile.full_name?.trim()) { alert('Full Name is required'); return }
            if (!profile.email?.trim()) { alert('Email is required'); return }
            if (!profile.phone?.trim()) { alert('Phone number is required'); return }
            if (!cvContent.trim()) { alert('Resume/CV is required — upload or paste your resume below'); return }
            handleSave()
          }} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="size-4" />
            ) : isDirty() ? (
              <span className="relative">
                <Save className="size-4" />
                <span className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-500" />
              </span>
            ) : (
              <Save className="size-4" />
            )}
            {saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Sticky save button on mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-3 sm:hidden">
        {isDirty() && !saving && !saved && (
          <p className="text-xs text-amber-600 dark:text-amber-400 text-center mb-2">You have unsaved changes</p>
        )}
        <Button className="w-full" size="lg" onClick={() => {
          if (!profile.full_name?.trim()) { alert('Full Name is required'); return }
          if (!profile.email?.trim()) { alert('Email is required'); return }
          if (!profile.phone?.trim()) { alert('Phone number is required'); return }
          if (!cvContent.trim()) { alert('Resume/CV is required — upload or paste your resume below'); return }
          handleSave()
        }} disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="size-4" />
          ) : isDirty() ? (
            <span className="relative">
              <Save className="size-4" />
              <span className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-500" />
            </span>
          ) : (
            <Save className="size-4" />
          )}
          {saved ? 'Saved!' : 'Save Changes'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your contact information and job search preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input
                value={profile.full_name || ''}
                onChange={(e) => setProfile({ ...profile, full_name: sanitizeName(e.target.value) })}
                required
                maxLength={100}
              />
              {!profile.full_name?.trim() && <p className="text-xs text-destructive">Required</p>}
            </div>
            <div className="space-y-2">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input
                type="email"
                value={profile.email || ''}
                onChange={(e) => setProfile({ ...profile, email: sanitizeEmail(e.target.value) })}
                required
                maxLength={254}
              />
              {!profile.email?.trim() && <p className="text-xs text-destructive">Required</p>}
            </div>
            <div className="space-y-2">
              <Label>Phone <span className="text-destructive">*</span></Label>
              <div className="flex gap-1.5">
                <select
                  className="h-9 w-[105px] shrink-0 rounded-md border border-input bg-background px-2 text-sm"
                  value={(profile.phone || '').match(/^\+\d+/)?.[0] || '+1'}
                  onChange={(e) => {
                    const currentNum = (profile.phone || '').replace(/^\+\d+\s*/, '')
                    setProfile({ ...profile, phone: `${e.target.value} ${currentNum}` })
                  }}
                >
                  {[
                    ['+1','CA/US'],['+44','UK'],['+61','AU'],['+64','NZ'],['+353','IE'],['+91','IN'],['+65','SG'],['+852','HK'],['+27','ZA'],['+971','AE'],['+63','PH'],['+234','NG'],['+254','KE'],['+1876','JM'],['+1868','TT'],
                    ['+93','AF'],['+355','AL'],['+213','DZ'],['+376','AD'],['+244','AO'],['+54','AR'],['+374','AM'],['+43','AT'],['+994','AZ'],['+973','BH'],['+880','BD'],['+375','BY'],['+32','BE'],['+501','BZ'],['+229','BJ'],
                    ['+975','BT'],['+591','BO'],['+387','BA'],['+267','BW'],['+55','BR'],['+673','BN'],['+359','BG'],['+226','BF'],['+257','BI'],['+855','KH'],['+237','CM'],['+238','CV'],['+236','CF'],['+235','TD'],['+56','CL'],
                    ['+86','CN'],['+57','CO'],['+269','KM'],['+242','CG'],['+243','CD'],['+506','CR'],['+385','HR'],['+53','CU'],['+357','CY'],['+420','CZ'],['+45','DK'],['+253','DJ'],['+593','EC'],['+20','EG'],['+503','SV'],
                    ['+240','GQ'],['+291','ER'],['+372','EE'],['+251','ET'],['+679','FJ'],['+358','FI'],['+33','FR'],['+241','GA'],['+220','GM'],['+995','GE'],['+49','DE'],['+233','GH'],['+30','GR'],['+502','GT'],['+224','GN'],
                    ['+592','GY'],['+509','HT'],['+504','HN'],['+36','HU'],['+354','IS'],['+62','ID'],['+98','IR'],['+964','IQ'],['+972','IL'],['+39','IT'],['+225','CI'],['+81','JP'],['+962','JO'],['+7','KZ'],['+82','KR'],
                    ['+965','KW'],['+996','KG'],['+856','LA'],['+371','LV'],['+961','LB'],['+266','LS'],['+231','LR'],['+218','LY'],['+423','LI'],['+370','LT'],['+352','LU'],['+261','MG'],['+265','MW'],['+60','MY'],['+960','MV'],
                    ['+223','ML'],['+356','MT'],['+222','MR'],['+230','MU'],['+52','MX'],['+373','MD'],['+377','MC'],['+976','MN'],['+382','ME'],['+212','MA'],['+258','MZ'],['+95','MM'],['+264','NA'],['+977','NP'],['+31','NL'],
                    ['+505','NI'],['+227','NE'],['+47','NO'],['+968','OM'],['+92','PK'],['+507','PA'],['+675','PG'],['+595','PY'],['+51','PE'],['+48','PL'],['+351','PT'],['+974','QA'],['+40','RO'],['+7','RU'],['+250','RW'],
                    ['+966','SA'],['+221','SN'],['+381','RS'],['+232','SL'],['+421','SK'],['+386','SI'],['+252','SO'],['+34','ES'],['+94','LK'],['+249','SD'],['+597','SR'],['+268','SZ'],['+46','SE'],['+41','CH'],['+886','TW'],
                    ['+992','TJ'],['+255','TZ'],['+66','TH'],['+228','TG'],['+216','TN'],['+90','TR'],['+993','TM'],['+256','UG'],['+380','UA'],['+598','UY'],['+998','UZ'],['+58','VE'],['+84','VN'],['+967','YE'],['+260','ZM'],['+263','ZW'],
                  ].map(([code, label]) => (
                    <option key={code + label} value={code}>{code} {label}</option>
                  ))}
                </select>
                <Input
                  type="tel"
                  placeholder="555-123-4567"
                  value={(profile.phone || '').replace(/^\+\d+\s*/, '')}
                  onChange={(e) => {
                    const code = (profile.phone || '').match(/^\+\d+/)?.[0] || '+1'
                    setProfile({ ...profile, phone: `${code} ${sanitizePhone(e.target.value)}` })
                  }}
                  maxLength={15}
                  required
                  className="flex-1"
                />
              </div>
              {!profile.phone?.trim() && <p className="text-xs text-destructive">Required</p>}
            </div>
          </div>

          <LocationSelect
            value={profile.location || ''}
            onChange={(loc) => setProfile({ ...profile, location: loc })}
          />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>LinkedIn URL</Label>
              <Input
                value={profile.linkedin_url || ''}
                onChange={(e) => setProfile({ ...profile, linkedin_url: sanitizeUrl(e.target.value) })}
                placeholder="https://linkedin.com/in/..."
                maxLength={500}
              />
            </div>
            <div className="space-y-2">
              <Label>GitHub URL</Label>
              <Input
                value={profile.github_url || ''}
                onChange={(e) => setProfile({ ...profile, github_url: sanitizeUrl(e.target.value) })}
                placeholder="https://github.com/..."
                maxLength={500}
              />
            </div>
            <div className="space-y-2">
              <Label>Portfolio URL</Label>
              <Input
                value={profile.portfolio_url || ''}
                onChange={(e) => setProfile({ ...profile, portfolio_url: sanitizeUrl(e.target.value) })}
                placeholder="https://..."
                maxLength={500}
              />
            </div>
          </div>

        </CardContent>
      </Card>

      {!isOAuthOnly && <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div />
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                placeholder="Min 8 chars, number + special character"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
              />
            </div>
          </div>
          <Button
            variant="outline"
            disabled={passwordSaving || !newPassword || !currentPassword}
            onClick={async () => {
              setPasswordError(null)
              if (!currentPassword) {
                setPasswordError('Please enter your current password.')
                return
              }
              if (newPassword.length < 8 || !/\d/.test(newPassword) || !/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
                setPasswordError('Password must be at least 8 characters with a number and special character.')
                return
              }
              if (newPassword !== confirmPassword) {
                setPasswordError('Passwords do not match.')
                return
              }
              setPasswordSaving(true)
              const supabase = createClient()
              // Verify current password by re-authenticating
              const { data: { user } } = await supabase.auth.getUser()
              const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user?.email || '',
                password: currentPassword,
              })
              if (signInError) {
                setPasswordError('Current password is incorrect.')
                setPasswordSaving(false)
                return
              }
              const { error } = await supabase.auth.updateUser({ password: newPassword })
              if (error) {
                setPasswordError(error.message)
              } else {
                setPasswordSaved(true)
                setNewPassword('')
                setConfirmPassword('')
                setCurrentPassword('')
                setTimeout(() => setPasswordSaved(false), 3000)
              }
              setPasswordSaving(false)
            }}
          >
            {passwordSaving ? <Loader2 className="size-4 animate-spin" /> : passwordSaved ? <CheckCircle2 className="size-4" /> : null}
            {passwordSaved ? 'Updated!' : 'Update Password'}
          </Button>
          {passwordError && (
            <p className="text-sm text-destructive">{passwordError}</p>
          )}
        </CardContent>
      </Card>}

      <Card>
        <CardHeader>
          <CardTitle>CV / Resume <span className="text-destructive">*</span></CardTitle>
          <CardDescription>
            Upload your resume (PDF, DOCX) or paste it in Markdown format. This is the source of truth for all evaluations and generated documents.
          </CardDescription>
          {!cvContent.trim() && <p className="text-xs text-destructive mt-1">Required — upload or paste your resume to use ApplyAgent</p>}
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUpload
            onTextExtracted={(text) => { setCvContent(text); autofillFromCv(text) }}
            accept=".pdf,.docx,.txt,.md"
            label="Upload your resume"
            description="PDF, DOCX, TXT, or Markdown. Text will be extracted and editable below."
          />
          <Textarea
            placeholder={RESUME_TEMPLATE_PLACEHOLDER}
            value={cvContent}
            onChange={(e) => setCvContent(e.target.value)}
            rows={20}
            className="font-mono text-sm max-h-[50vh] overflow-y-auto md:max-h-none placeholder:text-muted-foreground/40 placeholder:whitespace-pre-line"
          />
          <p className="text-xs text-muted-foreground">
            Tip: The greyed-out text above is an example of a well-formatted resume. Clear it and paste your own — or upload a file to auto-fill.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Writing Voice</CardTitle>
          <CardDescription>
            Paste a short sample of your own writing — a LinkedIn post, a project summary, a past cover letter, or an email you're proud of. Anything you wrote yourself, in your real voice. Generated cover letters and LinkedIn messages use this as a style reference so the output reads less like generic AI and more like you. Recruiters increasingly screen inbound text with AI detectors; this is the single most effective way to stay under the radar. Optional but strongly recommended.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            placeholder={`Paste 1\u20133 short things you've actually written. Plain text only. Example:\n\nFinished rolling out MFA to our Arctic sites last month. Fourteen locations, weird latency, no local IT staff. The trick ended up being a phased cut-over window that let each site validate sign-in before we pulled the fallback. Zero escalations, which I will take.`}
            value={profile.voice_sample || ''}
            onChange={(e) => setProfile({ ...profile, voice_sample: e.target.value.slice(0, 2000) })}
            rows={8}
            maxLength={2000}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {(profile.voice_sample || '').length} / 2000 characters
            {(profile.voice_sample || '').length > 0 && (profile.voice_sample || '').length < 40 && ' — aim for at least 40 characters to make this effective'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Data</CardTitle>
          <CardDescription>Download all your data as JSON (profile, CV, applications, reports, credits).</CardDescription>
        </CardHeader>
        <CardContent>
          <a href="/api/export" download>
            <Button variant="outline" size="sm">Download My Data</Button>
          </a>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>Permanently delete your account and all associated data.</CardDescription>
        </CardHeader>
        <CardContent>
          {!showDeleteConfirm ? (
            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
              Delete Account
            </Button>
          ) : (
            <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-destructive">
                This action is permanent. All your evaluations, reports, credits, and saved data will be deleted and cannot be recovered.
              </p>
              <p className="text-sm text-muted-foreground">
                Type <strong>DELETE MY ACCOUNT</strong> below to confirm:
              </p>
              <Input
                placeholder="Type DELETE MY ACCOUNT"
                id="delete-confirm-input"
                className="max-w-xs font-mono text-sm"
              />
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  disabled={deleting}
                  onClick={async () => {
                    const input = (document.getElementById('delete-confirm-input') as HTMLInputElement)?.value
                    if (input !== 'DELETE MY ACCOUNT') {
                      toast.error('Please type "DELETE MY ACCOUNT" exactly to confirm.')
                      return
                    }
                    setDeleting(true)
                    const res = await fetch('/api/account/delete', {
                      method: 'DELETE',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ confirmation: 'DELETE MY ACCOUNT' }),
                    })
                    if (!res.ok) {
                      const data = await res.json()
                      toast.error(data.error || 'Failed to delete account')
                      setDeleting(false)
                      return
                    }
                    const supabase = createClient()
                    await supabase.auth.signOut()
                    router.push('/login')
                  }}
                >
                  {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
                  {deleting ? 'Deleting...' : 'Permanently delete my account'}
                </Button>
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
