'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, ChevronDown, ChevronUp, List } from 'lucide-react'
import { CreditConfirmButton } from '@/components/ui/credit-confirm'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { LocationCombobox } from '@/components/ui/location-combobox'

// Scanner auto-detects which ATS platform a company uses (Greenhouse, Lever, or Ashby)

// Verified companies across Greenhouse, Lever, Ashby, SmartRecruiters
const ALL_COMPANIES: Company[] = [
  // ── Tech ──
  { name: 'Airbnb', slug: 'airbnb', platform: 'greenhouse' },
  { name: 'Airtable', slug: 'airtable', platform: 'greenhouse' },
  { name: 'Amplitude', slug: 'amplitude', platform: 'greenhouse' },
  { name: 'Asana', slug: 'asana', platform: 'greenhouse' },
  { name: 'Cloudflare', slug: 'cloudflare', platform: 'greenhouse' },
  { name: 'CockroachDB', slug: 'cockroachlabs', platform: 'greenhouse' },
  { name: 'Coinbase', slug: 'coinbase', platform: 'greenhouse' },
  { name: 'Confluent', slug: 'confluent', platform: 'greenhouse' },
  { name: 'Databricks', slug: 'databricks', platform: 'greenhouse' },
  { name: 'Datadog', slug: 'datadog', platform: 'greenhouse' },
  { name: 'Discord', slug: 'discord', platform: 'greenhouse' },
  { name: 'DoorDash', slug: 'doordash', platform: 'greenhouse' },
  { name: 'Dropbox', slug: 'dropbox', platform: 'greenhouse' },
  { name: 'Elastic', slug: 'elastic', platform: 'greenhouse' },
  { name: 'Faire', slug: 'faire', platform: 'greenhouse' },
  { name: 'Fastly', slug: 'fastly', platform: 'greenhouse' },
  { name: 'Figma', slug: 'figma', platform: 'greenhouse' },
  { name: 'GitLab', slug: 'gitlab', platform: 'greenhouse' },
  { name: 'HubSpot', slug: 'hubspot', platform: 'greenhouse' },
  { name: 'Intercom', slug: 'intercom', platform: 'greenhouse' },
  { name: 'Mixpanel', slug: 'mixpanel', platform: 'greenhouse' },
  { name: 'Okta', slug: 'okta', platform: 'greenhouse' },
  { name: 'PagerDuty', slug: 'pagerduty', platform: 'greenhouse' },
  { name: 'Reddit', slug: 'reddit', platform: 'greenhouse' },
  { name: 'Samsara', slug: 'samsara', platform: 'greenhouse' },
  { name: 'Tailscale', slug: 'tailscale', platform: 'greenhouse' },
  { name: 'Twilio', slug: 'twilio', platform: 'greenhouse' },
  { name: 'Twitch', slug: 'twitch', platform: 'greenhouse' },
  { name: 'Zscaler', slug: 'zscaler', platform: 'greenhouse' },
  { name: 'Netflix', slug: 'netflix', platform: 'lever' },
  { name: 'Spotify', slug: 'spotify', platform: 'lever' },
  { name: 'Linear', slug: 'linear', platform: 'ashby' },
  { name: 'Notion', slug: 'notion', platform: 'ashby' },
  { name: 'OpenAI', slug: 'openai', platform: 'ashby' },
  { name: 'Supabase', slug: 'supabase', platform: 'ashby' },
  { name: 'Vercel', slug: 'vercel', platform: 'ashby' },
  // ── Finance & Fintech ──
  { name: 'Stripe', slug: 'stripe', platform: 'greenhouse' },
  { name: 'Chime', slug: 'chime', platform: 'greenhouse' },
  { name: 'Gusto', slug: 'gusto', platform: 'greenhouse' },
  { name: 'Robinhood', slug: 'robinhood', platform: 'greenhouse' },
  { name: 'Point72', slug: 'point72', platform: 'greenhouse' },
  { name: 'Brex', slug: 'brex', platform: 'greenhouse' },
  { name: 'SoFi', slug: 'sofi', platform: 'greenhouse' },
  { name: 'Affirm', slug: 'affirm', platform: 'greenhouse' },
  { name: 'Nubank', slug: 'nubank', platform: 'greenhouse' },
  { name: 'Block', slug: 'block', platform: 'greenhouse' },
  { name: 'Mercury', slug: 'mercury', platform: 'greenhouse' },
  { name: 'Toast', slug: 'toast', platform: 'greenhouse' },
  { name: 'Marqeta', slug: 'marqeta', platform: 'greenhouse' },
  { name: 'N26', slug: 'n26', platform: 'greenhouse' },
  { name: 'Plaid', slug: 'plaid', platform: 'lever' },
  { name: 'Ramp', slug: 'ramp', platform: 'ashby' },
  { name: 'Wealthsimple', slug: 'wealthsimple', platform: 'ashby' },
  { name: 'Deel', slug: 'deel', platform: 'ashby' },
  { name: 'Visa', slug: 'Visa', platform: 'smartrecruiters' },
  { name: 'Wise', slug: 'wise', platform: 'smartrecruiters' },
  // ── Healthcare & Pharma ──
  { name: 'Oscar Health', slug: 'oscar', platform: 'greenhouse' },
  { name: 'Zocdoc', slug: 'zocdoc', platform: 'greenhouse' },
  { name: 'Flatiron Health', slug: 'flatironhealth', platform: 'greenhouse' },
  { name: 'Veracyte', slug: 'veracyte', platform: 'greenhouse' },
  { name: 'Ro', slug: 'ro', platform: 'lever' },
  { name: 'AbbVie', slug: 'abbvie', platform: 'smartrecruiters' },
  { name: 'Guardant Health', slug: 'guardanthealth', platform: 'smartrecruiters' },
  // ── Retail & E-commerce ──
  { name: 'Instacart', slug: 'instacart', platform: 'greenhouse' },
  { name: 'Peloton', slug: 'peloton', platform: 'greenhouse' },
  { name: 'Gap Inc', slug: 'gapinc', platform: 'smartrecruiters' },
  { name: 'Wayfair', slug: 'wayfair', platform: 'smartrecruiters' },
  // ── Consulting ──
  { name: 'Accenture Federal', slug: 'AccentureFederalServices', platform: 'greenhouse' },
  { name: 'Oliver Wyman', slug: 'oliverwyman', platform: 'lever' },
  // ── Manufacturing & Automotive ──
  { name: 'Lucid Motors', slug: 'lucidmotors', platform: 'greenhouse' },
  { name: 'Bosch', slug: 'BoschGroup', platform: 'smartrecruiters' },
  { name: 'Continental', slug: 'Continental', platform: 'smartrecruiters' },
  { name: 'Parker Hannifin', slug: 'parker', platform: 'ashby' },
  // ── Media & Entertainment ──
  { name: 'New York Times', slug: 'thenewyorktimes', platform: 'greenhouse' },
  { name: 'Take-Two', slug: 'taketwo', platform: 'greenhouse' },
  { name: 'Fox', slug: 'fox', platform: 'greenhouse' },
  { name: 'Live Nation', slug: 'livenationentertainment', platform: 'smartrecruiters' },
  // ── Insurance ──
  { name: 'Coalition', slug: 'coalition', platform: 'greenhouse' },
  { name: 'MetLife', slug: 'metlife', platform: 'lever' },
  { name: 'Lemonade', slug: 'lemonade', platform: 'ashby' },
  // ── Transport & Logistics ──
  { name: 'Lyft', slug: 'lyft', platform: 'greenhouse' },
  { name: 'Flexport', slug: 'flexport', platform: 'greenhouse' },
  { name: 'Uber', slug: 'uber', platform: 'smartrecruiters' },
  // ── Food & Beverage ──
  { name: 'Anheuser-Busch InBev', slug: 'abinbev', platform: 'greenhouse' },
  { name: 'Sodexo', slug: 'sodexo', platform: 'smartrecruiters' },
  { name: "McDonald's", slug: 'McDonaldsCorporation', platform: 'smartrecruiters' },
  // ── Energy ──
  { name: 'ChargePoint', slug: 'chargepoint', platform: 'greenhouse' },
  { name: 'Vattenfall', slug: 'Vattenfall', platform: 'smartrecruiters' },
  // ── Real Estate ──
  { name: 'Opendoor', slug: 'opendoor', platform: 'greenhouse' },
  { name: 'Colliers', slug: 'colliers', platform: 'smartrecruiters' },
  // ── Education ──
  { name: 'Duolingo', slug: 'duolingo', platform: 'greenhouse' },
  { name: 'Khan Academy', slug: 'khanacademy', platform: 'greenhouse' },
  { name: 'Udemy', slug: 'udemy', platform: 'greenhouse' },
  { name: 'Coursera', slug: 'coursera', platform: 'greenhouse' },
  { name: 'Handshake', slug: 'handshake', platform: 'ashby' },
  // ── Defense & Government ──
  { name: 'Anduril', slug: 'andurilindustries', platform: 'greenhouse' },
  { name: 'Palantir', slug: 'palantir', platform: 'lever' },
  { name: 'Shield AI', slug: 'shieldai', platform: 'lever' },
  { name: 'CACI', slug: 'caci', platform: 'smartrecruiters' },
  // ── Hospitality ──
  { name: 'Four Seasons', slug: 'fourseasons', platform: 'greenhouse' },
  { name: 'Equinox', slug: 'equinox', platform: 'smartrecruiters' },
  { name: 'Accor', slug: 'accor', platform: 'smartrecruiters' },
  // ── Workday ──
  { name: 'NVIDIA', slug: 'nvidia/wd5/NVIDIAExternalCareerSite', platform: 'workday' },
  { name: 'Intel', slug: 'intel/wd1/External', platform: 'workday' },
  { name: 'PayPal', slug: 'paypal/wd1/Jobs', platform: 'workday' },
  { name: 'Salesforce', slug: 'salesforce/wd12/External_Career_Site', platform: 'workday' },
  { name: 'NXP', slug: 'nxp/wd3/careers', platform: 'workday' },
  { name: 'Marvell', slug: 'marvell/wd1/MarvellCareers', platform: 'workday' },
]

const EXAMPLE_COMPANIES: Company[] = [
  ALL_COMPANIES.find(c => c.name === 'Cloudflare')!,
  ALL_COMPANIES.find(c => c.name === 'GitLab')!,
  ALL_COMPANIES.find(c => c.name === 'Datadog')!,
  ALL_COMPANIES.find(c => c.name === 'Netflix')!,
  ALL_COMPANIES.find(c => c.name === 'Notion')!,
  ALL_COMPANIES.find(c => c.name === 'OpenAI')!,
]

interface Company {
  name: string
  slug?: string | null
  platform?: string
  // backwards compat
  greenhouse_slug?: string | null
}

interface ScanResult {
  stats: {
    found: number
    filtered: number
    skipped_title: number
    skipped_filters: number
    skipped_dup: number
    added: number
  }
  new_items: Array<{ title: string; url: string; company: string; source: string }>
}

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Permanent', 'Fixed Term'] as const
const WORK_ARRANGEMENTS = ['Remote', 'Hybrid', 'On-site'] as const
// Boards grouped by category. UI can render the groups so users understand
// which boards cover which kinds of work.
const BOARD_SOURCES = [
  // Universal — every industry (use these for non-tech roles too)
  { id: 'linkedin', label: 'LinkedIn', category: 'Universal' },
  { id: 'indeed', label: 'Indeed', category: 'Universal' },
  { id: 'simplyhired', label: 'SimplyHired', category: 'Universal' },
  { id: 'talent', label: 'Talent.com', category: 'Universal' },
  { id: 'careerjet', label: 'CareerJet', category: 'Universal' },
  { id: 'jooble', label: 'Jooble', category: 'Universal' },
  { id: 'adzuna', label: 'Adzuna', category: 'Universal' },
  { id: 'workopolis', label: 'Workopolis', category: 'Universal (Canada)' },
  { id: 'eluta', label: 'Eluta', category: 'Universal (Canada)' },
  // Government / public sector
  { id: 'jobbank', label: 'Job Bank Canada', category: 'Government' },
  { id: 'usajobs', label: 'USAJobs (Federal)', category: 'Government' },
  { id: 'govjobs', label: 'GovernmentJobs.com', category: 'Government' },
  // Hourly / retail / trades / hospitality
  { id: 'snagajob', label: 'Snagajob', category: 'Hourly / Trades / Retail' },
  // Curated / professional
  { id: 'themuse', label: 'The Muse', category: 'Professional' },
  // Tech-only (return 0 results for non-tech roles)
  { id: 'remoteok', label: 'Remote OK', category: 'Tech only' },
  { id: 'remotive', label: 'Remotive', category: 'Tech only' },
  { id: 'weworkremotely', label: 'We Work Remotely', category: 'Tech only' },
  { id: 'himalayas', label: 'Himalayas', category: 'Tech only' },
  { id: 'arbeitnow', label: 'Arbeitnow', category: 'Tech only' },
  { id: 'findwork', label: 'FindWork', category: 'Tech only' },
  { id: 'hnhiring', label: 'HN Who is Hiring', category: 'Tech only' },
] as const
const DATE_OPTIONS = [
  { value: 'any', label: 'Any time' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '3d', label: 'Last 3 days' },
  { value: '7d', label: 'Last 7 days' },
  { value: '14d', label: 'Last 14 days' },
] as const

const ROLE_SUGGESTIONS = [
  // ── Engineering & Software ──────────────────────────────────────
  'Software Engineer', 'Software Developer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'Mobile Developer', 'iOS Developer', 'Android Developer', 'React Native Developer', 'Flutter Developer',
  'Web Developer', 'WordPress Developer', 'Shopify Developer',
  'Game Developer', 'Unity Developer', 'Unreal Engine Developer',
  'Embedded Systems Engineer', 'Firmware Engineer', 'Hardware Engineer', 'Electrical Engineer',
  'Mechanical Engineer', 'Civil Engineer', 'Structural Engineer', 'Chemical Engineer',
  'Industrial Engineer', 'Manufacturing Engineer', 'Process Engineer', 'Quality Engineer',
  'Aerospace Engineer', 'Biomedical Engineer', 'Environmental Engineer', 'Petroleum Engineer',

  // ── DevOps, Cloud & Infrastructure ──────────────────────────────
  'DevOps Engineer', 'Site Reliability Engineer', 'Cloud Engineer', 'Platform Engineer',
  'Infrastructure Engineer', 'Infrastructure Analyst', 'Systems Engineer', 'Systems Administrator',
  'Network Engineer', 'Network Administrator', 'Network Architect',
  'Cloud Architect', 'Solutions Architect', 'Enterprise Architect', 'Technical Architect',
  'Database Administrator', 'Database Engineer', 'Database Developer',

  // ── Cybersecurity ───────────────────────────────────────────────
  'Security Analyst', 'Security Engineer', 'Cybersecurity Analyst', 'Cybersecurity Engineer',
  'SOC Analyst', 'Threat Intelligence Analyst', 'Incident Responder', 'Penetration Tester',
  'Vulnerability Analyst', 'GRC Analyst', 'Information Security Officer', 'CISO',
  'IAM Engineer', 'Application Security Engineer', 'Cloud Security Engineer',

  // ── Data, AI & ML ───────────────────────────────────────────────
  'Data Engineer', 'Data Scientist', 'Data Analyst', 'Analytics Engineer',
  'Machine Learning Engineer', 'AI Engineer', 'MLOps Engineer', 'Research Scientist',
  'Business Intelligence Analyst', 'BI Developer', 'Data Architect',
  'Quantitative Analyst', 'Statistician',

  // ── QA & Testing ────────────────────────────────────────────────
  'QA Engineer', 'QA Analyst', 'Test Engineer', 'Automation Engineer', 'SDET',
  'Performance Engineer', 'Quality Assurance Lead',

  // ── IT Support & Operations ─────────────────────────────────────
  'IT Analyst', 'IT Support Specialist', 'IT Administrator', 'IT Consultant', 'IT Manager',
  'Technical Support Engineer', 'Help Desk Analyst', 'Help Desk Technician',
  'Desktop Support Technician', 'Field Service Technician', 'Service Desk Analyst',

  // ── Product & Design ────────────────────────────────────────────
  'Product Manager', 'Senior Product Manager', 'Product Owner', 'Product Analyst',
  'Technical Product Manager', 'Group Product Manager', 'Director of Product',
  'UX Designer', 'UI Designer', 'UX Researcher', 'Product Designer', 'Visual Designer',
  'Graphic Designer', 'Motion Designer', 'Industrial Designer', 'Interaction Designer',
  'Design Lead', 'Design Director', 'Brand Designer', 'Web Designer', 'Illustrator',

  // ── Project & Program Management ────────────────────────────────
  'Project Manager', 'Program Manager', 'Scrum Master', 'Agile Coach',
  'Project Coordinator', 'PMO Analyst', 'Technical Program Manager',
  'Construction Project Manager', 'IT Project Manager',

  // ── Business & Strategy ─────────────────────────────────────────
  'Business Analyst', 'Business Operations Analyst', 'Strategy Analyst', 'Operations Analyst',
  'Management Consultant', 'Strategy Consultant', 'Technology Consultant',
  'Business Development Manager', 'Corporate Development Analyst',
  'Chief of Staff', 'COO', 'General Manager',

  // ── Finance & Accounting ────────────────────────────────────────
  'Financial Analyst', 'Senior Financial Analyst', 'FP&A Analyst', 'Investment Analyst',
  'Investment Banker', 'Equity Analyst', 'Portfolio Manager', 'Wealth Manager',
  'Risk Analyst', 'Credit Analyst', 'Underwriter', 'Loan Officer',
  'Accountant', 'Senior Accountant', 'Staff Accountant', 'Cost Accountant',
  'Auditor', 'Internal Auditor', 'Controller', 'Treasurer', 'CFO',
  'Tax Analyst', 'Tax Accountant', 'Bookkeeper', 'Payroll Specialist',
  'Actuary', 'Financial Advisor', 'Financial Planner',

  // ── Marketing ───────────────────────────────────────────────────
  'Marketing Manager', 'Marketing Analyst', 'Digital Marketing Specialist', 'Marketing Coordinator',
  'Content Strategist', 'Content Writer', 'Copywriter', 'Editorial Manager',
  'SEO Specialist', 'SEM Specialist', 'PPC Specialist', 'Email Marketing Manager',
  'Social Media Manager', 'Community Manager', 'Influencer Marketing Manager',
  'Brand Manager', 'Product Marketing Manager', 'Growth Marketer', 'Performance Marketer',
  'Marketing Director', 'CMO', 'Public Relations Specialist', 'PR Manager',
  'Event Coordinator', 'Event Manager',

  // ── Sales & Customer Success ────────────────────────────────────
  'Sales Representative', 'Sales Development Representative', 'SDR', 'BDR',
  'Account Executive', 'Senior Account Executive', 'Enterprise Account Executive',
  'Account Manager', 'Key Account Manager', 'Strategic Account Manager',
  'Sales Engineer', 'Solutions Engineer', 'Pre-Sales Consultant',
  'Sales Manager', 'Sales Director', 'VP of Sales', 'Chief Revenue Officer',
  'Customer Success Manager', 'Customer Success Associate', 'Customer Support Specialist',
  'Customer Service Representative', 'Call Center Agent', 'Technical Account Manager',
  'Retention Specialist', 'Onboarding Specialist',

  // ── HR & Recruiting ─────────────────────────────────────────────
  'HR Analyst', 'HR Generalist', 'HR Manager', 'HR Business Partner', 'HR Director', 'CHRO',
  'Recruiter', 'Senior Recruiter', 'Technical Recruiter', 'Executive Recruiter',
  'Talent Acquisition Specialist', 'Talent Acquisition Manager', 'Sourcer',
  'People Operations Specialist', 'People Operations Manager',
  'Compensation Analyst', 'Benefits Specialist', 'HRIS Analyst',
  'Learning & Development Manager', 'Training Specialist', 'Organizational Development Consultant',
  'Diversity & Inclusion Manager',

  // ── Operations & Supply Chain ───────────────────────────────────
  'Operations Manager', 'Operations Coordinator', 'Operations Director',
  'Supply Chain Analyst', 'Supply Chain Manager', 'Logistics Coordinator', 'Logistics Manager',
  'Procurement Analyst', 'Procurement Manager', 'Buyer', 'Sourcing Manager',
  'Inventory Manager', 'Warehouse Manager', 'Warehouse Associate',
  'Production Planner', 'Demand Planner', 'Materials Planner',
  'Distribution Manager', 'Fleet Manager',

  // ── Manufacturing & Production ──────────────────────────────────
  'Production Supervisor', 'Production Manager', 'Plant Manager', 'Factory Manager',
  'Machine Operator', 'CNC Operator', 'Assembler', 'Production Worker',
  'Maintenance Technician', 'Industrial Maintenance Mechanic',
  'Quality Control Inspector', 'Quality Assurance Inspector',

  // ── Skilled Trades & Construction ───────────────────────────────
  'Electrician', 'Apprentice Electrician', 'Plumber', 'Apprentice Plumber',
  'Carpenter', 'Welder', 'Pipefitter', 'Millwright', 'HVAC Technician',
  'Mechanic', 'Automotive Technician', 'Diesel Mechanic',
  'Construction Worker', 'Site Supervisor', 'Foreman', 'General Contractor',
  'Heavy Equipment Operator', 'Crane Operator', 'Roofer', 'Mason',
  'Painter', 'Drywall Installer', 'Flooring Installer', 'Glazier',
  'Estimator', 'Surveyor',

  // ── Healthcare & Life Sciences ──────────────────────────────────
  'Registered Nurse', 'RN', 'Licensed Practical Nurse', 'LPN', 'Nurse Practitioner',
  'Physician', 'Doctor', 'Family Physician', 'General Practitioner', 'Resident Physician',
  'Surgeon', 'Anesthesiologist', 'Cardiologist', 'Pediatrician', 'Psychiatrist',
  'Pharmacist', 'Pharmacy Technician', 'Medical Assistant', 'Medical Office Assistant',
  'Physician Assistant', 'Dental Hygienist', 'Dentist', 'Dental Assistant',
  'Physical Therapist', 'Occupational Therapist', 'Speech-Language Pathologist',
  'Respiratory Therapist', 'Radiologic Technologist', 'Ultrasound Technician',
  'Lab Technician', 'Medical Laboratory Technologist', 'Phlebotomist',
  'Healthcare Administrator', 'Hospital Administrator', 'Clinical Manager',
  'Public Health Analyst', 'Epidemiologist', 'Health Data Analyst',
  'Personal Support Worker', 'PSW', 'Caregiver', 'Home Health Aide',
  'Veterinarian', 'Veterinary Technician', 'Veterinary Assistant',
  'Clinical Research Associate', 'Biostatistician', 'Bioinformatician',
  'Counsellor', 'Therapist', 'Social Worker', 'Mental Health Worker',
  'Paramedic', 'EMT',

  // ── Education ───────────────────────────────────────────────────
  'Teacher', 'Elementary Teacher', 'Secondary Teacher', 'Substitute Teacher',
  'Special Education Teacher', 'ESL Teacher', 'Tutor', 'Math Tutor',
  'Professor', 'Assistant Professor', 'Adjunct Professor', 'Lecturer',
  'Teaching Assistant', 'Research Assistant', 'Academic Advisor',
  'School Counselor', 'School Principal', 'Assistant Principal', 'School Administrator',
  'Curriculum Developer', 'Instructional Designer', 'Education Coordinator',
  'Early Childhood Educator', 'Daycare Worker', 'Librarian', 'Library Assistant',

  // ── Legal & Compliance ──────────────────────────────────────────
  'Lawyer', 'Attorney', 'Associate Attorney', 'Corporate Lawyer', 'Litigation Attorney',
  'Paralegal', 'Legal Assistant', 'Legal Counsel', 'In-House Counsel', 'General Counsel',
  'Compliance Analyst', 'Compliance Officer', 'Compliance Manager',
  'Privacy Officer', 'Data Protection Officer', 'Contract Manager', 'Contracts Specialist',
  'Notary', 'Court Reporter', 'Mediator', 'Arbitrator',

  // ── Hospitality & Food Service ──────────────────────────────────
  'Server', 'Waiter', 'Waitress', 'Bartender', 'Host', 'Hostess', 'Busser',
  'Line Cook', 'Prep Cook', 'Sous Chef', 'Executive Chef', 'Pastry Chef', 'Baker',
  'Restaurant Manager', 'Kitchen Manager', 'Food and Beverage Director',
  'Hotel Manager', 'Front Desk Agent', 'Concierge', 'Housekeeper', 'Housekeeping Supervisor',
  'Event Planner', 'Catering Manager', 'Sommelier', 'Barista',

  // ── Retail & E-commerce ─────────────────────────────────────────
  'Retail Associate', 'Sales Associate', 'Cashier', 'Store Manager', 'Assistant Store Manager',
  'Visual Merchandiser', 'Merchandiser', 'Buyer', 'Category Manager',
  'E-commerce Manager', 'E-commerce Specialist', 'Marketplace Manager', 'Amazon Specialist',
  'Loss Prevention Specialist', 'District Manager', 'Regional Manager',

  // ── Transportation & Driving ────────────────────────────────────
  'Truck Driver', 'Long Haul Driver', 'Class 1 Driver', 'CDL Driver',
  'Delivery Driver', 'Courier', 'Rideshare Driver', 'Bus Driver', 'School Bus Driver',
  'Forklift Operator', 'Pilot', 'First Officer', 'Flight Attendant',
  'Train Conductor', 'Locomotive Engineer', 'Captain', 'Marine Officer',
  'Dispatcher', 'Logistics Dispatcher',

  // ── Real Estate ─────────────────────────────────────────────────
  'Real Estate Agent', 'Realtor', 'Real Estate Broker', 'Real Estate Analyst',
  'Property Manager', 'Leasing Consultant', 'Mortgage Broker', 'Mortgage Specialist',
  'Real Estate Appraiser', 'Real Estate Investor', 'Commercial Real Estate Broker',

  // ── Media, Communications & Writing ─────────────────────────────
  'Journalist', 'Reporter', 'News Anchor', 'Editor', 'Managing Editor', 'Copy Editor',
  'Technical Writer', 'Grant Writer', 'Speechwriter', 'Ghostwriter',
  'Communications Manager', 'Communications Specialist', 'Internal Communications Manager',
  'Spokesperson', 'Public Affairs Officer',

  // ── Arts, Entertainment & Creative ──────────────────────────────
  'Photographer', 'Videographer', 'Video Editor', 'Film Editor', 'Sound Engineer',
  'Animator', '3D Artist', 'Concept Artist', 'Game Designer', 'Level Designer',
  'Musician', 'Music Producer', 'DJ', 'Composer', 'Sound Designer',
  'Actor', 'Voice Actor', 'Stage Manager', 'Director',
  'Tattoo Artist', 'Makeup Artist', 'Hairstylist', 'Hair Stylist', 'Esthetician', 'Barber',
  'Fashion Designer', 'Interior Designer', 'Floral Designer',

  // ── Science & Research ──────────────────────────────────────────
  'Research Scientist', 'Postdoctoral Researcher', 'Lab Manager', 'Research Coordinator',
  'Biologist', 'Microbiologist', 'Molecular Biologist', 'Geneticist',
  'Chemist', 'Analytical Chemist', 'Organic Chemist',
  'Physicist', 'Astronomer', 'Geologist', 'Geophysicist', 'Hydrologist',
  'Meteorologist', 'Climate Scientist', 'Oceanographer',

  // ── Government & Non-profit ─────────────────────────────────────
  'Policy Analyst', 'Public Policy Analyst', 'Legislative Aide', 'Legislative Analyst',
  'Program Officer', 'Grant Manager', 'Fundraising Manager', 'Development Officer',
  'Non-profit Director', 'Executive Director', 'Volunteer Coordinator',
  'Diplomat', 'Foreign Service Officer', 'Intelligence Analyst',
  'Urban Planner', 'City Planner', 'Civil Servant', 'Government Affairs Manager',

  // ── Public Safety ───────────────────────────────────────────────
  'Police Officer', 'Detective', 'Investigator', 'Private Investigator',
  'Firefighter', 'Fire Chief', 'Fire Inspector',
  'Security Guard', 'Loss Prevention Officer', 'Bouncer', 'Bodyguard',
  'Correctional Officer', 'Probation Officer', 'Parole Officer',
  'Border Services Officer', 'Customs Officer',
  'Lifeguard',

  // ── Agriculture, Environment & Energy ───────────────────────────
  'Farmer', 'Farm Manager', 'Agricultural Technician', 'Agronomist',
  'Forester', 'Park Ranger', 'Conservation Officer', 'Wildlife Biologist',
  'Environmental Consultant', 'Sustainability Analyst', 'ESG Analyst',
  'Solar Installer', 'Wind Turbine Technician', 'Energy Auditor',
  'Mining Engineer', 'Oil Rig Worker',

  // ── Personal Services ───────────────────────────────────────────
  'Personal Trainer', 'Fitness Instructor', 'Yoga Instructor', 'Nutritionist', 'Dietitian',
  'Massage Therapist', 'Chiropractor', 'Acupuncturist',
  'Life Coach', 'Career Coach', 'Wedding Planner', 'Funeral Director',
  'Pet Groomer', 'Dog Walker', 'Pet Sitter',

  // ── Administrative ──────────────────────────────────────────────
  'Administrative Assistant', 'Executive Assistant', 'Office Manager',
  'Receptionist', 'Office Coordinator', 'Office Administrator',
  'Data Entry Clerk', 'Records Clerk', 'File Clerk',
  'Virtual Assistant', 'Personal Assistant',

  // ── Co-op & Internships (entry level) ───────────────────────────
  'Software Engineering Intern', 'Data Science Intern', 'IT Co-op', 'Engineering Co-op',
  'Business Analyst Intern', 'Product Management Intern', 'Marketing Intern',
  'Finance Intern', 'HR Intern', 'Sales Intern', 'Design Intern', 'Research Intern',
  'Legal Intern', 'Communications Intern', 'Operations Intern',
]

const STORAGE_KEY = 'applyagent_scan_companies'
const FILTERS_KEY = 'applyagent_scan_filters'

function loadSavedCompanies(): Company[] {
  if (typeof window === 'undefined') return []
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      // Migrate old format: greenhouse_slug → slug + platform
      return parsed.map((c: any) => ({
        name: c.name,
        slug: c.slug || c.greenhouse_slug || null,
        platform: c.platform || (c.greenhouse_slug ? 'greenhouse' : 'greenhouse'),
      }))
    } catch { /* fall through */ }
  }
  return []
}

export default function ScanPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newCompanySlug, setNewCompanySlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Board search state
  const [boardLocation, setBoardLocation] = useState('')
  const [boardLoading, setBoardLoading] = useState(false)
  const [boardResult, setBoardResult] = useState<any>(null)
  const [boardError, setBoardError] = useState<string | null>(null)
  const [boardSources, setBoardSources] = useState<Set<string>>(new Set(BOARD_SOURCES.map(s => s.id)))
  const [suggesting] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [companiesExpanded, setCompaniesExpanded] = useState(false)

  // Target roles state
  const [targetRoles, setTargetRoles] = useState<string[]>([])
  const [newRole, setNewRole] = useState('')
  const [showRoleSuggestions, setShowRoleSuggestions] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const roleInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const [userId, setUserId] = useState('')

  // Filter state
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([])
  const [selectedArrangements, setSelectedArrangements] = useState<string[]>([])
  const [datePosted, setDatePosted] = useState('any')
  const [salaryMin, setSalaryMin] = useState('')
  const [salaryCurrency, setSalaryCurrency] = useState('CAD')

  // Load saved companies + profile preferences
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      ;(supabase as any).from('profiles').select('work_arrangement, job_types, location, target_roles').eq('id', user.id).single()
        .then(({ data }: any) => {
          // Load saved scanner filters from localStorage — they override profile defaults
          const savedFilters = localStorage.getItem(FILTERS_KEY)
          if (savedFilters) {
            try {
              const f = JSON.parse(savedFilters)
              if (f.jobTypes?.length) setSelectedJobTypes(f.jobTypes)
              if (f.arrangements?.length) setSelectedArrangements(f.arrangements)
              if (f.datePosted) setDatePosted(f.datePosted)
              if (f.boardLocation !== undefined) setBoardLocation(f.boardLocation)
              if (f.salaryMin !== undefined) setSalaryMin(f.salaryMin)
              if (f.salaryCurrency) setSalaryCurrency(f.salaryCurrency)
              if (f.targetRoles?.length) setTargetRoles(f.targetRoles)
              if (f.boardSources?.length) setBoardSources(new Set(f.boardSources))
            } catch {}
          } else {
            // No saved scanner filters — fall back to profile defaults
            if (data?.work_arrangement?.length) setSelectedArrangements(data.work_arrangement)
            if (data?.job_types?.length) setSelectedJobTypes(data.job_types)
          }
          if (data?.location && !boardLocation) setBoardLocation(data.location)
          // Only use profile target_roles if no saved scanner overrides
          if (!savedFilters && data?.target_roles?.length) setTargetRoles(data.target_roles)
        })
    })

    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setCompanies(parsed.map((c: any) => ({
          name: c.name,
          slug: c.slug || c.greenhouse_slug || null,
          platform: c.platform || (c.greenhouse_slug ? 'greenhouse' : 'greenhouse'),
        })))
        return
      } catch { /* fall through to suggestions */ }
    }
    // First visit — start empty
    setCompanies([])
  }, [])

  // Persist companies
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(companies))
  }, [companies])

  // Persist scanner filters — overrides profile defaults on next load
  useEffect(() => {
    localStorage.setItem(FILTERS_KEY, JSON.stringify({
      jobTypes: selectedJobTypes,
      arrangements: selectedArrangements,
      datePosted,
      boardLocation,
      salaryMin,
      salaryCurrency,
      targetRoles,
      boardSources: Array.from(boardSources),
    }))
  }, [selectedJobTypes, selectedArrangements, datePosted, boardLocation, salaryMin, salaryCurrency, targetRoles, boardSources])

  function addCompany() {
    if (!newCompanyName) return
    // Auto-generate slug from company name (lowercase, no spaces)
    const autoSlug = newCompanySlug || newCompanyName.toLowerCase().replace(/[^a-z0-9]/g, '')
    setCompanies([...companies, { name: newCompanyName, slug: autoSlug }])
    setNewCompanyName('')
    setNewCompanySlug('')
  }

  function removeCompany(i: number) {
    const removed = companies[i]
    setCompanies(companies.filter((_, idx) => idx !== i))
    toast(`${removed.name} removed`, {
      action: {
        label: 'Undo',
        onClick: () => setCompanies(prev => [...prev.slice(0, i), removed, ...prev.slice(i)]),
      },
      duration: 10000,
    })
  }

  function resetCompanies() {
    localStorage.removeItem(STORAGE_KEY)
    setCompanies([])
    toast('Companies cleared')
  }

  function toggleChip(value: string, selected: string[], setSelected: (v: string[]) => void) {
    setSelected(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value])
  }

  async function handleScan() {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const scanCompanies = companies.length > 0 ? companies : [...ALL_COMPANIES]
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companies: scanCompanies,
          target_roles: targetRoles,
          filters: {
            job_types: selectedJobTypes.map(t => t.toLowerCase()),
            work_arrangement: selectedArrangements.map(a => a.toLowerCase()),
            date_posted: datePosted,
            location: boardLocation.trim() || undefined,
            salary_min: salaryMin ? parseInt(salaryMin, 10) : undefined,
            salary_currency: salaryCurrency,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Scan failed'); return }
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setLoading(false)
    }
  }

  function saveTargetRoles(roles: string[]) {
    setTargetRoles(roles)
    if (!userId) return
    const supabase = createClient()
    ;(supabase as any).from('profiles').update({ target_roles: roles }).eq('id', userId).then(() => {})
  }

  function addRole(roleOverride?: string) {
    const role = (roleOverride ?? newRole).trim()
    if (!role || targetRoles.includes(role)) return
    saveTargetRoles([...targetRoles, role])
    setNewRole('')
    setShowRoleSuggestions(false)
    setHighlightedIndex(-1)
  }

  const roleSuggestions = newRole.trim().length > 0
    ? ROLE_SUGGESTIONS.filter(r =>
        !targetRoles.includes(r) &&
        r.toLowerCase().includes(newRole.trim().toLowerCase())
      ).slice(0, 8)
    : []

  function handleRoleKeyDown(e: React.KeyboardEvent) {
    if (!showRoleSuggestions || roleSuggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(i => Math.min(i + 1, roleSuggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault()
      addRole(roleSuggestions[highlightedIndex])
    }
  }

  // Close suggestions on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          roleInputRef.current && !roleInputRef.current.contains(e.target as Node)) {
        setShowRoleSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function removeRole(role: string) {
    saveTargetRoles(targetRoles.filter(r => r !== role))
  }

  async function handleBoardSearch() {
    setBoardLoading(true)
    setBoardError(null)
    setBoardResult(null)
    try {
      const res = await fetch('/api/scan/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: targetRoles.join(', '),
          location: boardLocation,
          sources: Array.from(boardSources),
          target_roles: targetRoles,
          filters: {
            job_types: selectedJobTypes.map(t => t.toLowerCase()),
            work_arrangement: selectedArrangements.map(a => a.toLowerCase()),
            date_posted: datePosted,
            location: boardLocation.trim() || undefined,
            salary_min: salaryMin ? parseInt(salaryMin, 10) : undefined,
            salary_currency: salaryCurrency,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) { setBoardError(data.error || 'Search failed'); return }
      setBoardResult(data)
      toast(`Found ${data.stats.added} new jobs`)
    } catch (err) {
      setBoardError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setBoardLoading(false)
    }
  }

  const hasBoardSearch = targetRoles.length > 0 && boardLocation.trim() && boardSources.size > 0
  const hasCareerPages = true // always available — scans all companies when none selected
  const creditCost = (hasBoardSearch ? 3 : 0) + (hasCareerPages ? 3 : 0)
  const canScan = hasBoardSearch || hasCareerPages

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Scanner</h1>
        <p className="text-muted-foreground">Search job boards and company career pages — results go to your pipeline</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">

          {/* ── Filters (unified) ──────────────────────────────────── */}
          <div className="border rounded-lg">
            <button onClick={() => setFiltersOpen(!filtersOpen)} className="w-full flex items-center justify-between px-4 py-3 text-left">
              <div>
                <p className="text-sm font-medium">Filters</p>
                <p className="text-xs text-muted-foreground">
                  {targetRoles.length || companies.length || selectedJobTypes.length || selectedArrangements.length || datePosted !== 'any' || salaryMin || boardLocation.trim() || boardSources.size !== BOARD_SOURCES.length
                    ? [
                        targetRoles.join(', '),
                        companies.length > 0 ? `${companies.length} companies` : '',
                        boardLocation.trim(),
                        ...selectedJobTypes,
                        ...selectedArrangements,
                        datePosted !== 'any' ? DATE_OPTIONS.find(d => d.value === datePosted)?.label : '',
                        salaryMin ? `${salaryCurrency} ${parseInt(salaryMin).toLocaleString()}+` : '',
                        boardSources.size !== BOARD_SOURCES.length
                          ? `Boards: ${BOARD_SOURCES.filter(s => boardSources.has(s.id)).map(s => s.label).join('/') || 'none'}`
                          : '',
                      ].filter(Boolean).join(', ')
                    : 'No filters applied'}
                </p>
              </div>
              {filtersOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
            {filtersOpen && (
              <div className="px-4 pb-4 space-y-4">
                {/* Target Roles */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Target Roles / Keywords</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {targetRoles.map(role => (
                      <span key={role} className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-medium">
                        {role}
                        <button onClick={() => removeRole(role)} className="ml-0.5 text-muted-foreground hover:text-destructive">&times;</button>
                      </span>
                    ))}
                    {targetRoles.length === 0 && <span className="text-xs text-muted-foreground italic">No target roles — all jobs included</span>}
                  </div>
                  <form onSubmit={e => { e.preventDefault(); addRole() }} className="flex gap-2 relative">
                    <div className="relative flex-1">
                      <Input
                        ref={roleInputRef}
                        placeholder="Add a role (e.g. Infrastructure Analyst)"
                        value={newRole}
                        onChange={e => { setNewRole(e.target.value); setShowRoleSuggestions(true); setHighlightedIndex(-1) }}
                        onFocus={() => setShowRoleSuggestions(true)}
                        onKeyDown={handleRoleKeyDown}
                        className="h-8 text-sm"
                        autoComplete="off"
                      />
                      {showRoleSuggestions && roleSuggestions.length > 0 && (
                        <div ref={suggestionsRef} className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
                          {roleSuggestions.map((role, i) => (
                            <button
                              key={role}
                              type="button"
                              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors ${i === highlightedIndex ? 'bg-muted' : ''}`}
                              onMouseDown={(e) => { e.preventDefault(); addRole(role) }}
                            >
                              {role}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button type="submit" size="sm" variant="outline" disabled={!newRole.trim()}><Plus className="size-3.5 mr-1" />Add</Button>
                  </form>
                </div>

                {/* Companies */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-muted-foreground">Companies ({companies.length > 0 ? companies.length : 'All'})</label>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={() => setCompanies([...ALL_COMPANIES])}>All</Button>
                      <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={resetCompanies}>None</Button>
                      <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={() => setCompaniesExpanded(!companiesExpanded)}>
                        {companiesExpanded ? 'Collapse' : 'Expand'}
                      </Button>
                    </div>
                  </div>
                  {companies.length > 0 && !companiesExpanded && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {companies.map(c => (
                        <span key={c.slug} className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-medium">
                          {c.name}
                          <button onClick={() => setCompanies(prev => prev.filter(co => co.slug !== c.slug))} className="ml-0.5 text-muted-foreground hover:text-destructive">&times;</button>
                        </span>
                      ))}
                    </div>
                  )}
                  {companies.length === 0 && !companiesExpanded && (
                    <p className="text-xs text-muted-foreground italic mb-2">No companies selected — scans all {ALL_COMPANIES.length}</p>
                  )}
                  {companiesExpanded && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                        {ALL_COMPANIES.map(c => {
                          const active = companies.some(co => co.slug === c.slug)
                          return (
                            <button key={c.slug} onClick={() => {
                              if (active) setCompanies(prev => prev.filter(co => co.slug !== c.slug))
                              else setCompanies(prev => [...prev, c])
                            }}
                              className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted border-input text-muted-foreground'}`}>
                              {c.name}
                            </button>
                          )
                        })}
                      </div>
                      <div className="flex gap-2">
                        <Input placeholder="Add custom company" value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCompany() } }} className="flex-1 h-8 text-sm" />
                        <Button type="button" size="sm" variant="outline" onClick={addCompany}><Plus className="size-4" /></Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Location */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Location</label>
                  <LocationCombobox value={boardLocation} onChange={setBoardLocation} />
                </div>

                {/* Job Type */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Job Type</label>
                  <div className="flex flex-wrap gap-2">
                    {JOB_TYPES.map(type => (
                      <button key={type} onClick={() => toggleChip(type, selectedJobTypes, setSelectedJobTypes)}
                        className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${selectedJobTypes.includes(type) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted border-border'}`}>{type}</button>
                    ))}
                  </div>
                </div>

                {/* Job Boards (board search only — career pages are always scanned) */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">
                    Job Boards <span className="text-muted-foreground/60">(used when location is set)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {BOARD_SOURCES.map(({ id, label }) => {
                      const active = boardSources.has(id)
                      return (
                        <button
                          key={id}
                          onClick={() => {
                            setBoardSources(prev => {
                              const next = new Set(prev)
                              if (next.has(id)) next.delete(id)
                              else next.add(id)
                              return next
                            })
                          }}
                          className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted border-border'}`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Work Arrangement */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Work Arrangement</label>
                  <div className="flex flex-wrap gap-2">
                    {WORK_ARRANGEMENTS.map(arr => (
                      <button key={arr} onClick={() => toggleChip(arr, selectedArrangements, setSelectedArrangements)}
                        className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${selectedArrangements.includes(arr) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted border-border'}`}>{arr}</button>
                    ))}
                  </div>
                </div>

                {/* Date Posted */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Date Posted</label>
                  <div className="flex flex-wrap gap-2">
                    {DATE_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => setDatePosted(opt.value)}
                        className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${datePosted === opt.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted border-border'}`}>{opt.label}</button>
                    ))}
                  </div>
                </div>

                {/* Salary */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <label className="text-xs font-medium text-muted-foreground">Minimum Salary (annual)</label>
                    <select value={salaryCurrency} onChange={e => setSalaryCurrency(e.target.value)}
                      className="h-7 rounded-md border bg-background px-2 text-xs">
                      {/* Americas */}
                      <option value="CAD">CAD $ — Canada</option>
                      <option value="USD">USD $ — United States</option>
                      <option value="MXN">MXN $ — Mexico</option>
                      <option value="BRL">BRL R$ — Brazil</option>
                      <option value="ARS">ARS $ — Argentina</option>
                      <option value="COP">COP $ — Colombia</option>
                      <option value="CLP">CLP $ — Chile</option>
                      <option value="PEN">PEN S/ — Peru</option>
                      {/* Europe */}
                      <option value="EUR">EUR € — Europe</option>
                      <option value="GBP">GBP £ — United Kingdom</option>
                      <option value="CHF">CHF — Switzerland</option>
                      <option value="SEK">SEK kr — Sweden</option>
                      <option value="NOK">NOK kr — Norway</option>
                      <option value="DKK">DKK kr — Denmark</option>
                      <option value="PLN">PLN zł — Poland</option>
                      <option value="CZK">CZK Kč — Czech Republic</option>
                      <option value="RON">RON lei — Romania</option>
                      {/* Asia Pacific */}
                      <option value="AUD">AUD $ — Australia</option>
                      <option value="NZD">NZD $ — New Zealand</option>
                      <option value="JPY">JPY ¥ — Japan</option>
                      <option value="KRW">KRW ₩ — South Korea</option>
                      <option value="TWD">TWD NT$ — Taiwan</option>
                      <option value="SGD">SGD $ — Singapore</option>
                      <option value="HKD">HKD $ — Hong Kong</option>
                      <option value="CNY">CNY ¥ — China</option>
                      <option value="INR">INR ₹ — India</option>
                      <option value="THB">THB ฿ — Thailand</option>
                      <option value="IDR">IDR Rp — Indonesia</option>
                      <option value="MYR">MYR RM — Malaysia</option>
                      <option value="PHP">PHP ₱ — Philippines</option>
                      <option value="VND">VND ₫ — Vietnam</option>
                      {/* Middle East & Africa */}
                      <option value="AED">AED د.إ — UAE</option>
                      <option value="ILS">ILS ₪ — Israel</option>
                      <option value="SAR">SAR ﷼ — Saudi Arabia</option>
                      <option value="QAR">QAR ﷼ — Qatar</option>
                      <option value="ZAR">ZAR R — South Africa</option>
                      <option value="NGN">NGN ₦ — Nigeria</option>
                      <option value="KES">KES KSh — Kenya</option>
                      <option value="EGP">EGP £ — Egypt</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {['40000', '50000', '60000', '70000', '80000', '100000', '120000', '150000'].map(val => {
                      const CURRENCY_SYMBOLS: Record<string, string> = {
                        EUR: '€', GBP: '£', EGP: '£', INR: '₹', JPY: '¥', CNY: '¥',
                        KRW: '₩', PHP: '₱', VND: '₫', THB: '฿', ILS: '₪', NGN: '₦',
                        PLN: 'zł', CZK: 'Kč', BRL: 'R$', PEN: 'S/', ZAR: 'R', MYR: 'RM',
                        IDR: 'Rp', TWD: 'NT$', RON: 'lei', KES: 'KSh',
                        SEK: 'kr', NOK: 'kr', DKK: 'kr', AED: 'د.إ', SAR: '﷼', QAR: '﷼',
                      }
                      const sym = CURRENCY_SYMBOLS[salaryCurrency] || '$'
                      return (
                        <button key={val} onClick={() => setSalaryMin(salaryMin === val ? '' : val)}
                          className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${salaryMin === val ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted border-border'}`}>
                          {sym}{parseInt(val).toLocaleString()}+
                        </button>
                      )
                    })}
                  </div>
                  <Input type="number" placeholder="Or enter custom amount" value={!['40000', '50000', '60000', '70000', '80000', '100000', '120000', '150000'].includes(salaryMin) ? salaryMin : ''} onChange={e => setSalaryMin(e.target.value)} className="h-8 text-sm" />
                </div>

                {(selectedJobTypes.length > 0 || selectedArrangements.length > 0 || datePosted !== 'any' || salaryMin || boardLocation.trim() || companies.length > 0 || targetRoles.length > 0 || boardSources.size !== BOARD_SOURCES.length) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setBoardLocation('')
                      setSelectedJobTypes([])
                      setSelectedArrangements([])
                      setDatePosted('any')
                      setSalaryMin('')
                      setSalaryCurrency('CAD')
                      saveTargetRoles([])
                      setBoardSources(new Set(BOARD_SOURCES.map(s => s.id)))
                      resetCompanies()
                    }}
                    className="text-xs"
                  >
                    Clear all filters
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* ── Scan Button ──────────────────────────────── */}
          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-xs text-muted-foreground">
              {`Costs ${creditCost} credits`}
              {hasBoardSearch && ' (3 board + 3 career pages)'}
            </p>
            <CreditConfirmButton
              credits={creditCost || 3}
              label="Scan"
              loadingLabel="Scanning..."
              disabled={(loading || boardLoading) || !canScan}
              onConfirm={async () => {
                setResult(null); setBoardResult(null)
                const promises: Promise<void>[] = []
                if (hasBoardSearch) promises.push(handleBoardSearch())
                if (hasCareerPages) promises.push(handleScan())
                await Promise.all(promises)
              }}
              icon={<Search className="size-4" />}
            />
          </div>
        </CardContent>
      </Card>

      {(error || boardError) && (
        <Card className="border-destructive">
          <CardContent className="pt-6"><p className="text-sm text-destructive">{error || boardError}</p></CardContent>
        </Card>
      )}

      {/* ── Scan Results ─────────────────────────────────── */}
      {(result || boardResult) && (() => {
        const stats = {
          found: (result?.stats?.found || 0) + (boardResult?.stats?.found || 0),
          skipped_title: (result?.stats?.skipped_title || 0) + (boardResult?.stats?.skipped_title || 0),
          skipped_dup: (result?.stats?.skipped_dup || 0) + (boardResult?.stats?.skipped_dup || 0),
          added: (result?.stats?.added || 0) + (boardResult?.stats?.added || 0),
        }
        const items = [...(result?.new_items || []), ...(boardResult?.new_items || [])]
        const sourceStats = boardResult?.stats?.source_stats || null
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Results</CardTitle>
              {stats.added > 0 && <a href="/pipeline"><Button size="sm"><List className="size-4" />Go to Pipeline</Button></a>}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Scraped', value: stats.found, color: '' },
                  { label: 'Matched roles', value: stats.found - (stats.skipped_title || 0), color: 'text-blue-600' },
                  { label: 'Duplicates', value: stats.skipped_dup, color: 'text-muted-foreground' },
                  { label: 'Added', value: stats.added, color: stats.added > 0 ? 'text-green-600 font-bold' : 'text-red-500' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-md border p-3 text-center">
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
              {sourceStats && (
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {sourceStats.linkedin && <span>LinkedIn: {sourceStats.linkedin.found}{sourceStats.linkedin.error ? ' (error)' : ''}</span>}
                  {sourceStats.talent && <span>Talent.com: {sourceStats.talent.found}{sourceStats.talent.error ? ' (error)' : ''}</span>}
                  {sourceStats.careerjet && <span>CareerJet: {sourceStats.careerjet.found}{sourceStats.careerjet.error ? ' (error)' : ''}</span>}
                  {sourceStats.jooble && <span>Jooble: {sourceStats.jooble.found}{sourceStats.jooble.error ? ' (error)' : ''}</span>}
                </div>
              )}
              {stats.skipped_title > 0 && <p className="text-xs text-muted-foreground">{stats.skipped_title} didn't match your target roles</p>}
              {items.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Added to pipeline:</p>
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto md:max-h-none pr-1">
                  {items.map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 rounded-md border px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.company}</p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">{item.source}</Badge>
                    </div>
                  ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })()}
    </div>
  )
}
