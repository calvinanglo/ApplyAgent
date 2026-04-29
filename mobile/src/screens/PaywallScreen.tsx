import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { getOfferings, purchasePackage, restorePurchases, RC_ENABLED, type PaywallPackage } from '../lib/rc'
import { getAccountCredits } from '../lib/api'

// Web billing URL (Stripe Checkout) — used on Android.
// iOS cannot link to this from inside the app (Apple anti-steering rule).
const WEB_BILLING_URL = 'https://applyagent.ca/billing'

/**
 * Paywall — platform-specific billing flow.
 *
 *   Android: opens Stripe Checkout in the in-app browser. After the user
 *            pays, Stripe webhook updates Supabase, and we refresh the
 *            credits via /api/account/credits when they return.
 *
 *   iOS:     uses RevenueCat IAP (when configured). App Store rules require
 *            Apple In-App Purchase for digital goods. RevenueCat is the
 *            wrapper that talks to StoreKit.
 *
 * The user clarified: Android ships first with Stripe, iOS comes later
 * with proper IAP setup.
 */
export function PaywallScreen({ navigation }: any) {
  // ── Android: Stripe-via-web flow ─────────────────────────────────────
  if (Platform.OS === 'android') {
    return <AndroidStripePaywall navigation={navigation} />
  }
  // ── iOS: RevenueCat IAP (deferred) ──────────────────────────────────
  return <IosIapPaywall navigation={navigation} />
}

// ─────────────────────────────────────────────────────────────────────
// Android: opens Stripe Checkout in the system browser
// ─────────────────────────────────────────────────────────────────────
function AndroidStripePaywall({ navigation }: any) {
  const [opening, setOpening] = useState(false)

  async function handleOpenWeb() {
    setOpening(true)
    try {
      const result = await WebBrowser.openBrowserAsync(WEB_BILLING_URL, {
        toolbarColor: '#000000',
        showTitle: true,
      })
      // After they close the browser, refresh credits in case the Stripe
      // webhook has already landed.
      if (result.type !== 'cancel') {
        await new Promise(r => setTimeout(r, 1500))
        await getAccountCredits().catch(() => null)
      }
    } catch (err: any) {
      Alert.alert('Could not open browser', err.message)
    } finally {
      setOpening(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Upgrade</Text>
      <Text style={styles.subtitle}>
        Choose a subscription or buy credits at applyagent.ca/billing — fast, secure card checkout.
      </Text>

      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>What you get</Text>
        <Bullet>120-800 credits per month (subscription)</Bullet>
        <Bullet>Or 100/300/600 credit packs (one-time)</Bullet>
        <Bullet>All AI features — evaluations, resumes, cover letters, scanner</Bullet>
        <Bullet>Cancel anytime, instant access</Bullet>
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, opening && styles.btnDisabled]}
        onPress={handleOpenWeb}
        disabled={opening}
      >
        {opening ? <ActivityIndicator color="#fff" /> : (
          <Text style={styles.primaryBtnText}>Continue to checkout →</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.legal}>
        Secure payment powered by Stripe. After purchase, your credits update automatically inside the app.
      </Text>
    </ScrollView>
  )
}

function Bullet({ children }: { children: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────────
// iOS: RevenueCat IAP (App Store In-App Purchases)
// ─────────────────────────────────────────────────────────────────────
function IosIapPaywall({ navigation }: any) {
  const [packages, setPackages] = useState<PaywallPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)

  useEffect(() => {
    void loadOfferings()
  }, [])

  async function loadOfferings() {
    setLoading(true)
    try {
      if (!RC_ENABLED) {
        setPackages([])
        return
      }
      const offerings = await getOfferings()
      if (!offerings || offerings.length === 0) {
        setPackages([])
      } else {
        const all = offerings.flatMap(o => o.packages)
        setPackages(all)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handlePurchase(pkg: PaywallPackage) {
    setPurchasing(pkg.identifier)
    try {
      const result = await purchasePackage(pkg.identifier)
      if (!result.ok) {
        if (result.error !== 'Cancelled') {
          Alert.alert('Purchase failed', result.error || 'Something went wrong')
        }
        return
      }
      await new Promise(r => setTimeout(r, 2000))
      await getAccountCredits().catch(() => null)
      Alert.alert('Thank you', 'Your purchase is being processed. Credits will appear shortly.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } finally {
      setPurchasing(null)
    }
  }

  async function handleRestore() {
    setRestoring(true)
    try {
      const result = await restorePurchases()
      if (!result.ok) {
        Alert.alert('Restore failed', result.error || 'Could not restore purchases')
        return
      }
      Alert.alert('Done', 'Any active subscriptions or unredeemed purchases will sync within a few seconds.')
    } finally {
      setRestoring(false)
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Upgrade</Text>
      <Text style={styles.subtitle}>
        Choose a plan or buy credits via the App Store.
      </Text>

      {packages.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>In-app purchases coming soon</Text>
          <Text style={styles.emptyText}>
            We&apos;re finalizing App Store integration. Until then, please contact support@applyagent.ca for billing.
          </Text>
        </View>
      ) : (
        packages.map(pkg => (
          <TouchableOpacity
            key={pkg.identifier}
            style={styles.pkgCard}
            onPress={() => handlePurchase(pkg)}
            disabled={purchasing !== null}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.pkgTitle}>{pkg.title || pkg.productId}</Text>
              {pkg.description ? <Text style={styles.pkgDesc}>{pkg.description}</Text> : null}
              <Text style={styles.pkgType}>{pkg.type === 'subscription' ? 'Subscription' : 'One-time purchase'}</Text>
            </View>
            <View style={styles.priceWrap}>
              {purchasing === pkg.identifier ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.price}>{pkg.priceString || '—'}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))
      )}

      <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={restoring}>
        {restoring ? <ActivityIndicator color="#666" size="small" /> : <Text style={styles.restoreText}>Restore Purchases</Text>}
      </TouchableOpacity>

      <Text style={styles.legal}>
        Subscriptions auto-renew until canceled. Manage in Settings → Apple ID → Subscriptions.
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 24, lineHeight: 20 },
  heroCard: { padding: 20, borderRadius: 12, backgroundColor: '#000', marginBottom: 20 },
  heroLabel: { fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  bulletRow: { flexDirection: 'row', marginBottom: 8 },
  bulletDot: { color: '#fff', fontSize: 14, marginRight: 8 },
  bulletText: { color: '#fff', fontSize: 14, flex: 1, lineHeight: 20 },
  primaryBtn: { backgroundColor: '#000', borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  empty: { padding: 32, alignItems: 'center', borderRadius: 12, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb' },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptyText: { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 18 },
  pkgCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 10 },
  pkgTitle: { fontSize: 16, fontWeight: '700' },
  pkgDesc: { fontSize: 13, color: '#666', marginTop: 4 },
  pkgType: { fontSize: 11, color: '#999', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  priceWrap: { paddingLeft: 12 },
  price: { fontSize: 18, fontWeight: '700' },
  restoreBtn: { padding: 14, alignItems: 'center', marginTop: 16 },
  restoreText: { color: '#666', fontSize: 14, fontWeight: '600' },
  legal: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 20, lineHeight: 17 },
})
