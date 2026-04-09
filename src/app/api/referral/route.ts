import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

// Common disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'guerrillamail.info',
  'grr.la', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamail.de',
  'sharklasers.com', 'guerrillamailblock.com', 'pokemail.net', 'spam4.me',
  'dispostable.com', 'yopmail.com', 'yopmail.fr', 'cool.fr.nf', 'jetable.fr.nf',
  'nospam.ze.tc', 'nomail.xl.cx', 'mega.zik.dj', 'speed.1s.fr', 'courriel.fr.nf',
  'moncourrier.fr.nf', 'monemail.fr.nf', 'monmail.fr.nf', 'mailinator.com',
  'mailinator.net', 'mailinator2.com', 'maildrop.cc', 'discard.email',
  'discardmail.com', 'discardmail.de', 'trashmail.com', 'trashmail.me',
  'trashmail.net', 'trashmail.org', 'trashymail.com', 'trashymail.net',
  '10minutemail.com', '10minute.email', 'tempail.com', 'tempr.email',
  'temp-mail.org', 'temp-mail.io', 'emailondeck.com', 'fakeinbox.com',
  'fakemailgenerator.com', 'generator.email', 'harakirimail.com',
  'mailcatch.com', 'mailexpire.com', 'mailforspam.com', 'mailnesia.com',
  'mailnull.com', 'mailsac.com', 'mailscrap.com', 'mailshell.com',
  'mailslurp.com', 'mailtemp.info', 'mailtothis.com', 'mailzilla.com',
  'mintemail.com', 'mohmal.com', 'mt2015.com', 'mytemp.email',
  'nomail.ch', 'nowmymail.com', 'sharklasers.com', 'spambox.us',
  'spamcero.com', 'spamcorner.net', 'spamex.com', 'spamfree24.org',
  'spamgourmet.com', 'spamherelots.com', 'spaml.com', 'spamspot.com',
  'spamthis.co.uk', 'temporaryemail.net', 'temporaryforwarding.com',
  'temporaryinbox.com', 'thanksnospam.info', 'throwam.com',
  'tmail.ws', 'tmails.net', 'tmpmail.net', 'tmpmail.org',
  'uggsrock.com', 'wegwerfmail.de', 'wegwerfmail.net', 'wetrainbayarea.com',
  'wh4f.org', 'whyspam.me', 'willselfdestruct.com', 'xagloo.com',
  'zehnminuten.de', 'zoemail.org', 'mailnator.com', 'binkmail.com',
  'bobmail.info', 'chammy.info', 'devnullmail.com', 'getairmail.com',
  'greymail.net', 'haltospam.com', 'imails.info', 'inboxalias.com',
  'incognitomail.org', 'lroid.com', 'mailblocks.com', 'mailhazard.com',
  'mailmoat.com', 'meltmail.com', 'neverbox.com', 'nobulk.com',
  'oneoffemail.com', 'safetymail.info', 'spamavert.com', 'spamday.com',
  'spamfighter.cf', 'spamfighter.ga', 'spamfighter.gq', 'spamfighter.ml',
  'spamfighter.tk', 'getnada.com', 'mailseal.de', 'tempinbox.com',
])

/** Normalize email to catch alias abuse (gmail +tags, dots) */
function normalizeEmail(email: string): string {
  const [local, domain] = email.toLowerCase().trim().split('@')
  if (!local || !domain) return email.toLowerCase()

  // Gmail/Google: remove dots and +tags from local part
  // googlemail.com is the same as gmail.com
  const gmailDomains = ['gmail.com', 'googlemail.com']
  if (gmailDomains.includes(domain)) {
    const cleaned = local.split('+')[0].replace(/\./g, '')
    return `${cleaned}@gmail.com`
  }

  // Outlook/Hotmail: remove +tags (dots are significant)
  const outlookDomains = ['outlook.com', 'hotmail.com', 'live.com', 'msn.com']
  if (outlookDomains.includes(domain)) {
    const cleaned = local.split('+')[0]
    return `${cleaned}@${domain}`
  }

  // Yahoo: remove -tags (yahoo uses - not +)
  const yahooDomains = ['yahoo.com', 'yahoo.ca', 'yahoo.co.uk', 'ymail.com']
  if (yahooDomains.includes(domain)) {
    const cleaned = local.split('-')[0]
    return `${cleaned}@${domain}`
  }

  // For other providers, still strip +tags (common convention)
  const cleaned = local.split('+')[0]
  return `${cleaned}@${domain}`
}

function isDisposableEmail(email: string): boolean {
  const domain = email.toLowerCase().split('@')[1]
  return DISPOSABLE_DOMAINS.has(domain)
}

const MAX_REFERRALS_PER_USER = 20
const REFERRAL_REWARD = 20

// GET — get user's referral code and stats
export async function GET() {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    // Get or create referral code
    let { data: profile } = await db.from('profiles').select('referral_code').eq('id', user.id).single()
    if (!profile?.referral_code) {
      const code = user.id.slice(0, 8).toLowerCase()
      await db.from('profiles').update({ referral_code: code }).eq('id', user.id)
      profile = { referral_code: code }
    }

    // Count referrals
    const { count } = await db.from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', user.id)

    return Response.json({
      code: profile.referral_code,
      referrals: count || 0,
      max_referrals: MAX_REFERRALS_PER_USER,
      link: `https://applyagent.ca/signup?ref=${profile.referral_code}`,
    })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}

// POST — apply referral code (called during signup callback)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    // Rate limit per user — 3 attempts per 5 minutes
    const { success: withinLimit } = rateLimit(`referral:${user.id}`, 3, 300_000)
    if (!withinLimit) return Response.json({ error: 'Too many attempts. Please wait.' }, { status: 429 })

    const { code } = await request.json()
    if (!code || typeof code !== 'string' || code.length > 20 || !/^[a-z0-9]+$/.test(code.toLowerCase())) {
      return Response.json({ error: 'Invalid referral code format' }, { status: 400 })
    }

    // --- Abuse Prevention Checks ---

    // 1. Require email verification (Supabase sets email_confirmed_at after verification)
    if (!user.email_confirmed_at) {
      return Response.json({ error: 'Please verify your email first' }, { status: 403 })
    }

    // 2. Block disposable emails
    if (user.email && isDisposableEmail(user.email)) {
      return Response.json({ error: 'Disposable email addresses are not eligible for referral rewards' }, { status: 403 })
    }

    // 3. Account must be at least 2 minutes old (prevent automated signup+claim scripts)
    const accountAge = Date.now() - new Date(user.created_at).getTime()
    if (accountAge < 2 * 60 * 1000) {
      return Response.json({ error: 'Please wait a moment before applying a referral code' }, { status: 429 })
    }

    // 4. Find referrer
    const { data: referrer } = await db.from('profiles')
      .select('id, email')
      .eq('referral_code', code.toLowerCase())
      .single()
    if (!referrer) return Response.json({ error: 'Invalid referral code' }, { status: 404 })

    // 5. Self-referral check
    if (referrer.id === user.id) {
      return Response.json({ error: 'Cannot refer yourself' }, { status: 400 })
    }

    // 6. Email alias check — normalize both emails and compare
    if (user.email && referrer.email) {
      const normalizedNew = normalizeEmail(user.email)
      const normalizedReferrer = normalizeEmail(referrer.email)
      if (normalizedNew === normalizedReferrer) {
        return Response.json({ error: 'Cannot use referral from the same email' }, { status: 400 })
      }
    }

    // 7. Check if the referrer's normalized email matches any other accounts
    //    that already referred this referrer (circular referral ring detection)
    //    e.g., A refers B, B refers C, C tries to refer A
    const { data: referrerProfile } = await db.from('profiles')
      .select('referred_by')
      .eq('id', referrer.id)
      .single()
    if (referrerProfile?.referred_by) {
      // Check if the referrer was referred by the current user
      const { data: currentUserProfile } = await db.from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single()
      if (currentUserProfile?.referral_code === referrerProfile.referred_by) {
        return Response.json({ error: 'Circular referrals are not allowed' }, { status: 400 })
      }
    }

    // --- Award Credits Atomically via Postgres Function ---
    const { data: result } = await db.rpc('award_referral_credits', {
      p_referrer_id: referrer.id,
      p_referred_id: user.id,
      p_referral_code: code.toLowerCase(),
      p_reward: REFERRAL_REWARD,
    }) as any

    if (!result?.success) {
      return Response.json({ error: result?.error || 'Failed to apply referral' }, { status: 400 })
    }

    return Response.json({ success: true, credits_awarded: REFERRAL_REWARD })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
