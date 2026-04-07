export const CREDIT_COSTS = {
  evaluation: 10,
  pdf: 3,
  cover_letter: 5,
  portal_scan: 8,
  apply_assist: 5,
  linkedin_message: 2,
  deep_research: 3,
  training_eval: 2,
  project_eval: 2,
  compare_offers: 5,
  batch_per_offer: 10,
} as const

export type CreditAction = keyof typeof CREDIT_COSTS

export const CREDIT_PACKS = [
  { id: 'starter', name: 'Starter', credits: 100, price: 500, priceDisplay: '$5' },
  { id: 'professional', name: 'Professional', credits: 350, price: 1500, priceDisplay: '$15' },
  { id: 'power_user', name: 'Power User', credits: 800, price: 3000, priceDisplay: '$30' },
] as const

export const SUBSCRIPTION_PLANS = [
  {
    id: 'starter_monthly',
    name: 'Starter',
    credits: 120,
    priceMonthly: 1500,       // $15/mo
    priceMonthlyDisplay: '$15',
    priceAnnually: 1200,       // $12/mo billed annually
    priceAnnuallyDisplay: '$12',
    priceAnnualTotal: 14400,   // $144/yr
    priceAnnualTotalDisplay: '$144',
    badge: null,
    features: ['120 credits/month', 'Unused credits roll over', 'All features included'],
  },
  {
    id: 'growth_monthly',
    name: 'Growth',
    credits: 300,
    priceMonthly: 3500,
    priceMonthlyDisplay: '$35',
    priceAnnually: 2800,
    priceAnnuallyDisplay: '$28',
    priceAnnualTotal: 33600,
    priceAnnualTotalDisplay: '$336',
    badge: 'Most Popular',
    features: ['300 credits/month', 'Unused credits roll over', 'Priority processing', 'All features included'],
  },
  {
    id: 'scale_monthly',
    name: 'Scale',
    credits: 750,
    priceMonthly: 7900,
    priceMonthlyDisplay: '$79',
    priceAnnually: 6300,
    priceAnnuallyDisplay: '$63',
    priceAnnualTotal: 75600,
    priceAnnualTotalDisplay: '$756',
    badge: null,
    features: ['750 credits/month', 'Unused credits roll over', 'Priority processing', 'Dedicated support', 'All features included'],
  },
] as const

export const FREE_TIER = {
  evaluations_per_month: 3,
} as const

export function getActionLabel(action: CreditAction): string {
  const labels: Record<CreditAction, string> = {
    evaluation: 'Job Match Report',
    pdf: 'Resume',
    cover_letter: 'Cover Letter',
    portal_scan: 'Portal Scan',
    apply_assist: 'Apply Assistant',
    linkedin_message: 'LinkedIn Message',
    deep_research: 'Deep Research',
    training_eval: 'Training Evaluation',
    project_eval: 'Project Evaluation',
    compare_offers: 'Compare Offers',
    batch_per_offer: 'Batch (per offer)',
  }
  return labels[action]
}
