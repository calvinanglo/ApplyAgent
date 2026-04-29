import { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Platform, Linking } from 'react-native'
import { getAccountCredits, type AccountCredits } from '../lib/api'

/**
 * Billing & credits dashboard.
 *
 * - Shows current credit balance and plan status.
 * - Lists recent credit transactions (last 10).
 * - "Upgrade" button opens the Paywall (RevenueCat IAP).
 * - On Android, also shows a "Manage on web" link (Play allows it post-2024).
 *   On iOS we hide the web link to comply with App Store anti-steering rules.
 */
export function BillingScreen({ navigation }: any) {
  const [credits, setCredits] = useState<AccountCredits | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const c = await getAccountCredits()
      setCredits(c)
    } catch {
      // fall through
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>
  }

  const sub = credits?.subscription
  const planLabel = sub?.status === 'active' ? sub.plan_id : 'Free'
  const renewalText = sub?.current_period_end
    ? `Renews ${new Date(sub.current_period_end).toLocaleDateString()}`
    : 'No active subscription'

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load() }} />}
    >
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Credit balance</Text>
        <Text style={styles.balanceNumber}>{credits?.balance ?? 0}</Text>
      </View>

      <View style={styles.planCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.planLabel}>Plan</Text>
          <Text style={styles.planName}>{planLabel}</Text>
          <Text style={styles.planRenewal}>{renewalText}</Text>
        </View>
        {sub?.provider === 'revenuecat' ? (
          <View style={styles.providerBadge}>
            <Text style={styles.providerText}>{Platform.OS === 'ios' ? 'App Store' : 'Play Store'}</Text>
          </View>
        ) : sub?.provider === 'stripe' ? (
          <View style={styles.providerBadge}>
            <Text style={styles.providerText}>Web</Text>
          </View>
        ) : null}
      </View>

      <TouchableOpacity style={styles.upgradeBtn} onPress={() => navigation.navigate('Paywall')}>
        <Text style={styles.upgradeText}>{sub?.status === 'active' ? 'Buy Credits' : 'Upgrade'}</Text>
      </TouchableOpacity>

      {sub?.provider === 'revenuecat' && (
        <TouchableOpacity
          style={styles.manageBtn}
          onPress={() => {
            const url = Platform.OS === 'ios'
              ? 'https://apps.apple.com/account/subscriptions'
              : 'https://play.google.com/store/account/subscriptions'
            void Linking.openURL(url)
          }}
        >
          <Text style={styles.manageText}>Manage Subscription</Text>
        </TouchableOpacity>
      )}

      {/* Android: Stripe is the only billing path. iOS: anti-steering rules
          (App Store Guideline 3.1.3) forbid linking to web billing from
          inside the app, so this button is hidden. iOS users will use
          RevenueCat IAP via the Paywall when configured. */}
      {Platform.OS === 'android' && (
        <TouchableOpacity
          style={styles.manageBtn}
          onPress={() => Linking.openURL('https://applyagent.ca/billing')}
        >
          <Text style={styles.manageText}>
            {sub?.provider === 'stripe' && sub.status === 'active'
              ? 'Manage subscription on the web'
              : 'Buy credits or subscribe →'}
          </Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionLabel}>Recent activity</Text>
      {(credits?.recent_transactions || []).length === 0 ? (
        <Text style={styles.emptyTx}>No transactions yet</Text>
      ) : (
        (credits?.recent_transactions || []).map((tx, i) => (
          <View key={i} style={styles.txRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.txAction}>{tx.description || tx.action}</Text>
              <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleString()}</Text>
            </View>
            <Text style={[styles.txAmount, { color: tx.amount > 0 ? '#16a34a' : '#dc2626' }]}>
              {tx.amount > 0 ? '+' : ''}{tx.amount}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  balanceCard: { padding: 24, borderRadius: 12, backgroundColor: '#000', marginBottom: 12, alignItems: 'center' },
  balanceLabel: { color: '#999', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceNumber: { color: '#fff', fontSize: 48, fontWeight: '700', marginTop: 4 },
  planCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16 },
  planLabel: { fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 },
  planName: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  planRenewal: { fontSize: 12, color: '#666', marginTop: 2 },
  providerBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#e5e7eb' },
  providerText: { fontSize: 11, fontWeight: '600' },
  upgradeBtn: { backgroundColor: '#000', borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 8 },
  upgradeText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  manageBtn: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 8 },
  manageText: { fontSize: 14, fontWeight: '600' },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  emptyTx: { fontSize: 13, color: '#999', textAlign: 'center', padding: 24 },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  txAction: { fontSize: 13, fontWeight: '500' },
  txDate: { fontSize: 11, color: '#999', marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '700' },
})
