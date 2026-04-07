export const ARCHETYPES = [
  {
    id: 'security-analyst',
    name: 'Security Analyst / SOC',
    keywords: [
      'SIEM', 'SOC', 'incident response', 'threat detection', 'vulnerability management',
      'security monitoring', 'AgileBlue', 'Arctic Wolf', 'endpoint security', 'PCI-DSS',
      'security analyst', 'cybersecurity', 'threat intelligence', 'Splunk', 'QRadar',
    ],
    thematicAxes: 'SIEM, incident response, threat detection, vulnerability management',
    whatTheyBuy: 'Someone who monitors, detects, and responds to security threats',
    frameAs: 'security practitioner with real SIEM, endpoint, and compliance experience in production',
    proofPriorities: ['SIEM deployments', 'incidents responded', 'compliance audits', 'endpoints secured'],
  },
  {
    id: 'network-engineer',
    name: 'Network Engineer / Analyst',
    keywords: [
      'routing', 'switching', 'firewall', 'VPN', 'CCNA', 'network architecture',
      'Cisco Meraki', 'SonicWALL', 'VLANs', 'TCP/IP', 'BGP', 'OSPF', 'network monitoring',
      'network engineer', 'network analyst', 'WAN', 'LAN', 'Starlink',
    ],
    thematicAxes: 'Routing & switching, firewalls, VLANs, VPN, network monitoring',
    whatTheyBuy: 'Someone who designs, maintains, and troubleshoots enterprise networks',
    frameAs: 'CCNA-certified engineer managing firewalls, routing, and connectivity in challenging remote environments',
    proofPriorities: ['sites managed', 'network uptime', 'migrations completed', 'connectivity deployments'],
  },
  {
    id: 'cloud-engineer',
    name: 'Cloud Engineer / Administrator',
    keywords: [
      'Azure', 'AWS', 'GCP', 'IaC', 'Terraform', 'Kubernetes', 'cloud', 'hybrid infrastructure',
      'Azure AD', 'Entra', 'M365', 'Intune', 'Hyper-V', 'cloud security', 'cloud engineer',
      'cloud administrator', 'DevOps', 'cloud migration',
    ],
    thematicAxes: 'Azure, AWS, IaC, cloud security, hybrid infrastructure',
    whatTheyBuy: 'Someone who builds and manages cloud infrastructure',
    frameAs: 'Azure AD/M365 administrator driving cloud-first infrastructure modernization',
    proofPriorities: ['cloud migrations', 'cost savings', 'infrastructure scale', 'automation coverage'],
  },
  {
    id: 'it-sysadmin',
    name: 'IT Systems Administrator',
    keywords: [
      'Active Directory', 'Windows Server', 'Linux', 'VMware', 'backup', 'disaster recovery',
      'systems administrator', 'sysadmin', 'NinjaOne', 'RMM', 'WDS', 'Citrix',
      'Group Policy', 'virtualization', 'server administration',
    ],
    thematicAxes: 'Active Directory, M365, MDM, Windows Server, virtualization',
    whatTheyBuy: 'Someone who keeps enterprise systems running and secure',
    frameAs: 'full-stack IT administrator managing Active Directory, Windows Server, and virtualization at scale',
    proofPriorities: ['systems managed', 'uptime SLA', 'user base', 'automation scripts'],
  },
  {
    id: 'it-specialist',
    name: 'Information Technology Specialist',
    keywords: [
      'helpdesk', 'troubleshooting', 'desktop support', 'ITIL', 'ticketing', 'IT support',
      'IT specialist', 'IT technician', 'end user support', 'service desk', 'ITSM',
      'technology specialist', 'IT operations',
    ],
    thematicAxes: 'End-to-end IT support, infrastructure, security, compliance',
    whatTheyBuy: 'Someone who owns IT operations across the stack',
    frameAs: 'full-stack IT professional covering security, networking, and systems with 4 industry certifications',
    proofPriorities: ['ticket resolution', 'user satisfaction', 'systems supported', 'certifications'],
  },
] as const

export type ArchetypeId = typeof ARCHETYPES[number]['id']

export function detectArchetype(jdText: string): typeof ARCHETYPES[number] {
  const text = jdText.toLowerCase()
  let bestMatch: typeof ARCHETYPES[number] = ARCHETYPES[0]
  let bestScore = 0

  for (const archetype of ARCHETYPES) {
    const score = archetype.keywords.reduce((acc, kw) => {
      return acc + (text.includes(kw.toLowerCase()) ? 1 : 0)
    }, 0)
    if (score > bestScore) {
      bestScore = score
      bestMatch = archetype
    }
  }

  return bestMatch
}

export const CANDIDATE_PROFILE = {
  location: 'Manitoba, Canada',
  timezone: 'CST',
  certifications: ['Security+', 'CCNA', 'ITIL 4', 'ISC2 CC'],
  compTarget: { min: 80000, max: 115000, currency: 'CAD' },
  differentiator: '30+ remote Arctic locations experience',
  crossCuttingFrame: 'Certified IT professional with hands-on experience securing and managing infrastructure across 30+ remote locations',
} as const

export const EXIT_NARRATIVE = {
  summary: 'Bridge from current role (Arctic Co-ops, 30+ remote locations) to target role domain',
  pdfSummary: 'Now applying the same infrastructure and security expertise to [JD domain].',
  starContext: 'Real experiences from Arctic Co-ops: 30+ remote locations, challenging connectivity, mission-critical retail systems',
  draftAnswers: 'Career progression narrative should appear in the first response',
  keywords: ['remote support', 'independent', 'self-starter', 'multi-site'],
  note: 'When JD asks for remote support, independent, self-starter, or multi-site: this is the #1 differentiator. Increase match weight.',
} as const

export const NEGOTIATION_SCRIPTS = {
  salary: 'Based on market data for this role in Canada, I am targeting CAD $80K-115K. I am flexible on structure. What matters is the total package and growth opportunity.',
  certValue: 'I hold Security+, CCNA, ITIL 4, and ISC2 CC. These represent validated skills that reduce onboarding time and risk.',
  remoteValue: 'I currently support 30+ remote locations across Northern Canada with challenging connectivity. I am comfortable working independently and managing infrastructure remotely.',
  belowTarget: 'I am evaluating opportunities in the $80K-115K range based on my certifications and experience. I am drawn to [company] because of [reason]. Can we explore that range?',
} as const

export const TIME_TO_OFFER = {
  rule: 'Certifications + real experience > perfection. Apply sooner > learn more. 80/20 approach, timebox everything.',
} as const

export const COMP_INTELLIGENCE = {
  govRoles: 'Government roles (federal CS-02/CS-03) have published pay scales. Reference them when evaluating.',
  usdExchange: 'Remote roles from US companies may offer USD which provides favorable exchange.',
} as const

export const LOCATION_SCORES = {
  remote: 5.0,
  hybridCanadian: 4.0,
  onsiteLocal: 5.0,  // Winnipeg/Manitoba
  onsiteNonLocal: 2.0,
} as const
