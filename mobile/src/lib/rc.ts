/**
 * RevenueCat in-app purchases client.
 *
 * iOS uses StoreKit, Android uses Google Play Billing — RC abstracts both.
 * Subscriptions and consumable credit packs are configured in the RC dashboard.
 *
 * Initialization flow:
 *   1. App boots → Purchases.configure() with the platform-specific public key.
 *   2. After sign-in → Purchases.logIn(supabaseUserId) so RC tracks
 *      entitlements per Supabase user (not per device).
 *   3. Webhook events from RC POST to /api/webhooks/revenuecat to sync state.
 *
 * Public keys (NOT secrets — safe to ship in app):
 *   - EXPO_PUBLIC_RC_KEY_IOS
 *   - EXPO_PUBLIC_RC_KEY_ANDROID
 *
 * Lazy-loaded — Purchases is a native module, only initialized when needed.
 */

import { Platform } from 'react-native'

// Android uses Stripe via web — RevenueCat is iOS-only for now. iOS can add
// RC later when App Store IAP is configured. Trying to use RC on Android
// would also work, but we're intentionally bypassing Play Billing to use
// Stripe directly (lower fees, parity with web pricing).
export const RC_ENABLED = Platform.OS === 'ios'

let configured = false
let purchasesModule: any = null

async function getPurchases(): Promise<any | null> {
  if (!RC_ENABLED) return null
  if (purchasesModule) return purchasesModule
  try {
    const mod = await import('react-native-purchases')
    purchasesModule = mod.default
    return purchasesModule
  } catch {
    // Module not installed yet (eg. dev build hasn't been rebuilt).
    return null
  }
}

export async function configurePurchases(): Promise<boolean> {
  if (!RC_ENABLED) return false
  if (configured) return true
  const Purchases = await getPurchases()
  if (!Purchases) return false

  const apiKey = process.env.EXPO_PUBLIC_RC_KEY_IOS
  if (!apiKey) {
    console.warn('[rc] No RevenueCat iOS API key configured')
    return false
  }

  try {
    Purchases.configure({ apiKey })
    configured = true
    return true
  } catch (err) {
    console.warn('[rc] configure failed:', err)
    return false
  }
}

export async function loginPurchases(supabaseUserId: string): Promise<void> {
  if (!RC_ENABLED) return
  const Purchases = await getPurchases()
  if (!Purchases) return
  await configurePurchases()
  try {
    await Purchases.logIn(supabaseUserId)
  } catch (err) {
    console.warn('[rc] logIn failed:', err)
  }
}

export async function logoutPurchases(): Promise<void> {
  if (!RC_ENABLED) return
  const Purchases = await getPurchases()
  if (!Purchases) return
  try {
    await Purchases.logOut()
  } catch {
    // anonymized — non-fatal
  }
}

export interface PaywallPackage {
  identifier: string
  productId: string
  title: string
  description: string
  priceString: string
  type: 'subscription' | 'consumable'
}

export interface PaywallOffering {
  identifier: string
  packages: PaywallPackage[]
}

/** Fetch the configured offerings from RC. Returns null if SDK unavailable. */
export async function getOfferings(): Promise<PaywallOffering[] | null> {
  const Purchases = await getPurchases()
  if (!Purchases) return null
  await configurePurchases()
  try {
    const offerings = await Purchases.getOfferings()
    const list: PaywallOffering[] = []
    const all = offerings?.all || {}
    for (const key of Object.keys(all)) {
      const offering = all[key]
      list.push({
        identifier: offering.identifier,
        packages: (offering.availablePackages || []).map((p: any) => ({
          identifier: p.identifier,
          productId: p.product?.identifier || '',
          title: p.product?.title || '',
          description: p.product?.description || '',
          priceString: p.product?.priceString || '',
          type: (p.product?.productCategory === 'NON_SUBSCRIPTION') ? 'consumable' : 'subscription',
        })),
      })
    }
    return list
  } catch (err) {
    console.warn('[rc] getOfferings failed:', err)
    return null
  }
}

export async function purchasePackage(packageIdentifier: string): Promise<{ ok: boolean; error?: string }> {
  const Purchases = await getPurchases()
  if (!Purchases) return { ok: false, error: 'IAP not available' }
  await configurePurchases()
  try {
    const offerings = await Purchases.getOfferings()
    const all = offerings?.all || {}
    let target: any = null
    for (const key of Object.keys(all)) {
      const offering = all[key]
      const pkg = (offering.availablePackages || []).find((p: any) => p.identifier === packageIdentifier)
      if (pkg) { target = pkg; break }
    }
    if (!target) return { ok: false, error: 'Package not found' }

    await Purchases.purchasePackage(target)
    return { ok: true }
  } catch (err: any) {
    if (err?.userCancelled) return { ok: false, error: 'Cancelled' }
    return { ok: false, error: err?.message || 'Purchase failed' }
  }
}

export async function restorePurchases(): Promise<{ ok: boolean; error?: string }> {
  const Purchases = await getPurchases()
  if (!Purchases) return { ok: false, error: 'IAP not available' }
  await configurePurchases()
  try {
    await Purchases.restorePurchases()
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Restore failed' }
  }
}
