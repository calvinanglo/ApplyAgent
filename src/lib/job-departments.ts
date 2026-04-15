// Job title → department classification via keyword matching.
// Order matters: more specific patterns must come first (e.g. "DevOps Engineer"
// must match DevOps before "Engineer" matches Engineering).

export const DEPARTMENTS = [
  'Cybersecurity',
  'Cloud / DevOps',
  'Data / Analytics',
  'AI / Machine Learning',
  'Software Engineering',
  'IT / Infrastructure',
  'IT Support / Help Desk',
  'Product Management',
  'Project Management',
  'Design / UX',
  'QA / Testing',
  'Marketing',
  'Sales',
  'Customer Success',
  'HR / People',
  'Finance / Accounting',
  'Legal / Compliance',
  'Operations',
  'Procurement / Supply Chain',
  'Healthcare',
  'Education',
  'Research',
  'Administrative',
  'Other',
] as const

export type Department = typeof DEPARTMENTS[number]

const RULES: Array<{ dept: Department; patterns: RegExp[] }> = [
  { dept: 'Cybersecurity', patterns: [
    /\b(security|cyber|infosec|soc|siem|grc|pentest|penetration\s*test|threat|incident\s*response|vulnerability|iam|identity|compliance.*security|ciso|appsec|netsec|cloud\s*security)\b/i,
  ]},
  { dept: 'Cloud / DevOps', patterns: [
    /\b(devops|sre|site\s*reliability|platform\s*engineer|cloud\s*engineer|cloud\s*architect|kubernetes|aws\s*engineer|azure\s*engineer|gcp\s*engineer|infrastructure\s*engineer|systems\s*reliability)\b/i,
  ]},
  { dept: 'AI / Machine Learning', patterns: [
    /\b(machine\s*learning|ml\s*engineer|ai\s*engineer|data\s*scientist|nlp|computer\s*vision|deep\s*learning|llm|prompt\s*engineer|mlops)\b/i,
  ]},
  { dept: 'Data / Analytics', patterns: [
    /\b(data\s*engineer|data\s*analyst|business\s*intelligence|bi\s*developer|analytics\s*engineer|data\s*architect|etl|warehouse|tableau|power\s*bi|database\s*administrator|dba)\b/i,
  ]},
  { dept: 'Software Engineering', patterns: [
    /\b(software\s*engineer|software\s*developer|full[\s-]*stack|frontend|front[\s-]*end|backend|back[\s-]*end|web\s*developer|mobile\s*developer|ios\s*developer|android\s*developer|application\s*developer|programmer|swe|sde)\b/i,
  ]},
  { dept: 'QA / Testing', patterns: [
    /\b(qa|quality\s*assurance|test\s*engineer|sdet|automation\s*engineer|tester)\b/i,
  ]},
  { dept: 'IT Support / Help Desk', patterns: [
    /\b(help[\s-]*desk|service\s*desk|support\s*technician|desktop\s*support|technical\s*support|it\s*support|user\s*support|tier\s*[123]|level\s*[123]\s*support)\b/i,
  ]},
  { dept: 'IT / Infrastructure', patterns: [
    /\b(network\s*(engineer|administrator|specialist|technician)|system\s*(administrator|engineer|specialist)|sysadmin|netadmin|infrastructure|telecom|voip|server\s*administrator|it\s*(specialist|administrator|technician|analyst|coordinator|manager)|technical\s*(specialist|analyst))\b/i,
  ]},
  { dept: 'Product Management', patterns: [
    /\b(product\s*manager|product\s*owner|product\s*lead|head\s*of\s*product|cpo|technical\s*product\s*manager|tpm)\b/i,
  ]},
  { dept: 'Project Management', patterns: [
    /\b(project\s*manager|program\s*manager|scrum\s*master|delivery\s*manager|pmo|project\s*coordinator|project\s*lead)\b/i,
  ]},
  { dept: 'Design / UX', patterns: [
    /\b(ux|ui|user\s*experience|user\s*interface|product\s*designer|graphic\s*designer|visual\s*designer|web\s*designer|interaction\s*designer|design\s*lead|creative\s*director)\b/i,
  ]},
  { dept: 'Marketing', patterns: [
    /\b(marketing|brand|seo|sem|content\s*writer|copywriter|growth|social\s*media|digital\s*marketing|marketing\s*manager|cmo|communications)\b/i,
  ]},
  { dept: 'Sales', patterns: [
    /\b(sales|account\s*executive|business\s*development|bdr|sdr|account\s*manager|sales\s*engineer|inside\s*sales|outside\s*sales|sales\s*representative|cro)\b/i,
  ]},
  { dept: 'Customer Success', patterns: [
    /\b(customer\s*success|customer\s*support|customer\s*service|client\s*success|technical\s*account\s*manager|tam|customer\s*experience|cx|support\s*specialist)\b/i,
  ]},
  { dept: 'HR / People', patterns: [
    /\b(human\s*resources|hr|recruiter|talent|people\s*operations|peopleops|chief\s*people|chro|onboarding|learning\s*and\s*development|l&d)\b/i,
  ]},
  { dept: 'Finance / Accounting', patterns: [
    /\b(finance|accountant|accounting|bookkeeper|controller|cfo|treasurer|auditor|fp&a|financial\s*analyst|payroll|tax)\b/i,
  ]},
  { dept: 'Legal / Compliance', patterns: [
    /\b(legal|attorney|lawyer|paralegal|counsel|compliance\s*officer|regulatory|risk\s*manager|policy)\b/i,
  ]},
  { dept: 'Procurement / Supply Chain', patterns: [
    /\b(procurement|purchasing|supply\s*chain|logistics|warehouse|inventory|sourcing|buyer|vendor\s*manager|fulfillment)\b/i,
  ]},
  { dept: 'Healthcare', patterns: [
    /\b(nurse|physician|doctor|medical|clinical|pharmacy|pharmacist|therapist|healthcare|health\s*care|patient|caregiver)\b/i,
  ]},
  { dept: 'Education', patterns: [
    /\b(teacher|professor|instructor|tutor|educator|curriculum|principal|dean|academic|faculty)\b/i,
  ]},
  { dept: 'Research', patterns: [
    /\b(researcher|research\s*scientist|research\s*engineer|r&d|laboratory|lab\s*technician)\b/i,
  ]},
  { dept: 'Operations', patterns: [
    /\b(operations|ops\s*manager|coo|business\s*operations|biz\s*ops|general\s*manager)\b/i,
  ]},
  { dept: 'Administrative', patterns: [
    /\b(administrative|admin\s*assistant|executive\s*assistant|office\s*manager|receptionist|secretary|clerk|coordinator)\b/i,
  ]},
]

export function detectDepartment(title: string | null | undefined): Department {
  if (!title) return 'Other'
  const t = title.trim()
  if (!t) return 'Other'
  for (const { dept, patterns } of RULES) {
    for (const p of patterns) {
      if (p.test(t)) return dept
    }
  }
  return 'Other'
}
