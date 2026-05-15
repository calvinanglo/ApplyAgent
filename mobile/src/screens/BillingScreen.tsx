import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, RefreshControl, Platform, Linking, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { getAccountCredits, type AccountCredits } from '../lib/api'
import { useTheme } from '../lib/theme'
import { Card, Button, Badge, Caption, CenteredSpinner } from '../components/ui'

export function BillingScreen({ navigation }: any) {
  const { theme } = useTheme()
  const [credits, setCredits] = useState<AccountCredits | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const c = await getAccountCredits()
      setCredits(c)
    } catch { /* fallthrough */ } finally {
      setLoading(false); setRefreshing(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])
  if (loading) return <CenteredSpinner />

  const sub = credits?.subscription
  const planLabel = sub?.status === 'active' ? sub.plan_id : 'Free'
  const renewalText = sub?.current_period_end
    ? `Renews ${new Date(sub.current_period_end).toLocaleDateString()}`
    : 'No active subscription'

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load() }} tintColor={theme.foreground} />}
    >
      {/* Big balance card */}
      <View style={[styles.balanceCard, { backgroundColor: theme.primary }]}>
        <Caption style={{ color: theme.primaryForeground + 'aa' }}>Credit balance</Caption>
        <Text style={{ color: theme.primaryForeground, fontSize: 48, fontWeight: '700', marginTop: 4 }}>
          {credits?.balance ?? 0}
        </Text>
      </View>

      <Card style={{ marginTop: 12 }}>
        <View style={styles.planRow}>
          <View style={{ flex: 1 }}>
            <Caption>Plan</Caption>
            <Text style={{ color: theme.foreground, fontSize: 16, fontWeight: '700', marginTop: 4 }}>{planLabel}</Text>
            <Text style={{ color: theme.mutedForeground, fontSize: 12, marginTop: 2 }}>{renewalText}</Text>
          </View>
          {sub?.provider ? (
            <Badge tone="outline">
              {sub.provider === 'revenuecat' ? (Platform.OS === 'ios' ? 'App Store' : 'Play') : 'Web'}
            </Badge>
          ) : null}
        </View>
      </Card>

      <Button
        onPress={() => navigation.navigate('Paywall')}
        leftIcon={<Feather name="zap" size={16} color={theme.primaryForeground} />}
        style={{ marginTop: 12 }}
      >
        {sub?.status === 'active' ? 'Buy Credits' : 'Upgrade'}
      </Button>

      {sub?.provider === 'revenuecat' && (
        <Button
          variant="outline"
          onPress={() => {
            const url = Platform.OS === 'ios'
              ? 'https://apps.apple.com/account/subscriptions'
              : 'https://play.google.com/store/account/subscriptions'
            void Linking.openURL(url)
          }}
          leftIcon={<Feather name="external-link" size={14} color={theme.foreground} />}
          style={{ marginTop: 8 }}
        >
          Manage Subscription
        </Button>
      )}

      {Platform.OS === 'android' && (
        <Button
          variant="outline"
          onPress={() => Linking.openURL('https://applyagent.ca/billing')}
          leftIcon={<Feather name="external-link" size={14} color={theme.foreground} />}
          style={{ marginTop: 8 }}
        >
          {sub?.provider === 'stripe' && sub.status === 'active'
            ? 'Manage subscription on the web'
            : 'Buy credits or subscribe (web)'}
        </Button>
      )}

      <Caption style={{ marginTop: 24, marginBottom: 8 }}>Recent activity</Caption>
      {(credits?.recent_transactions || []).length === 0 ? (
        <Card>
          <Text style={{ color: theme.mutedForeground, textAlign: 'center', fontSize: 13, paddingVertical: 16 }}>
            No transactions yet
          </Text>
        </Card>
      ) : (
        (credits?.recent_transactions || []).map((tx, i) => (
          <Card key={i} style={{ marginBottom: 6 }}>
            <View style={styles.txRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.foreground, fontSize: 13, fontWeight: '500' }} numberOfLines={1}>
                  {tx.description || tx.action}
                </Text>
                <Text style={{ color: theme.mutedForeground, fontSize: 11, marginTop: 2 }}>
                  {new Date(tx.created_at).toLocaleString()}
                </Text>
              </View>
              <Text style={{ color: tx.amount > 0 ? theme.success : theme.destructive, fontSize: 15, fontWeight: '700' }}>
                {tx.amount > 0 ? '+' : ''}{tx.amount}
              </Text>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  balanceCard: { padding: 24, borderRadius: 12, alignItems: 'flex-start' },
  planRow: { flexDirection: 'row', alignItems: 'center' },
  txRow: { flexDirection: 'row', alignItems: 'center' },
})
