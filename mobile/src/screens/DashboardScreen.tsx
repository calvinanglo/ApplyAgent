import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'
import { getAccountCredits } from '../lib/api'
import { Card, Badge, H2, H3, P, Caption, CenteredSpinner } from '../components/ui'

interface Stats {
  credits: number
  totalApps: number
  recentApps: Array<{ id: string; company: string; role: string; score: number; status: string; created_at: string }>
  subscription: { plan_id: string; status: string } | null
}

export function DashboardScreen({ navigation }: any) {
  const { user } = useAuth()
  const { theme } = useTheme()
  const [stats, setStats] = useState<Stats | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadStats = useCallback(async () => {
    if (!user) return
    try {
      const [credits, appsRes] = await Promise.all([
        getAccountCredits().catch(() => null),
        (supabase as any)
          .from('applications')
          .select('id, company, role, score, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ])
      const apps = appsRes.data || []
      setStats({
        credits: credits?.balance ?? 0,
        totalApps: apps.length,
        recentApps: apps,
        subscription: credits?.subscription
          ? { plan_id: credits.subscription.plan_id, status: credits.subscription.status }
          : null,
      })
    } catch {
      // soft-fail
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { void loadStats() }, [loadStats])

  async function onRefresh() {
    setRefreshing(true)
    await loadStats()
    setRefreshing(false)
  }

  if (loading) return <CenteredSpinner />

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.foreground} />}
    >
      {/* Credit + plan summary card */}
      <Card style={{ marginBottom: 16 }}>
        <View style={styles.summaryRow}>
          <View style={{ flex: 1 }}>
            <Caption>Credit balance</Caption>
            <Text style={[styles.bigNumber, { color: theme.foreground }]}>{stats?.credits ?? 0}</Text>
          </View>
          <View style={[styles.planChip, { backgroundColor: theme.muted }]}>
            <Feather name={stats?.subscription?.status === 'active' ? 'star' : 'circle'} size={12} color={theme.foreground} />
            <Text style={{ color: theme.foreground, fontSize: 12, fontWeight: '600' }}>
              {stats?.subscription?.status === 'active' ? (stats?.subscription?.plan_id || 'Pro') : 'Free'}
            </Text>
          </View>
        </View>
      </Card>

      {/* Quick actions grid */}
      <H3 style={{ marginBottom: 10 }}>Quick actions</H3>
      <View style={styles.actionsGrid}>
        <ActionTile icon="zap" label="Evaluate JD" subtitle="Paste a job description" onPress={() => navigation.navigate('Evaluate')} primary />
        <ActionTile icon="search" label="Scan Boards" subtitle="16 job sources" onPress={() => navigation.navigate('ScanTab')} primary />
      </View>
      <View style={[styles.actionsGrid, { marginTop: 8 }]}>
        <ActionTile icon="inbox" label="Pipeline" subtitle="URL inbox" onPress={() => navigation.navigate('PipelineTab')} />
        <ActionTile icon="briefcase" label="Applications" subtitle="History" onPress={() => navigation.navigate('Applications')} />
      </View>

      {/* Recent applications */}
      <View style={{ marginTop: 24 }}>
        <View style={styles.sectionHeader}>
          <H3>Recent applications</H3>
          {stats && stats.recentApps.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('Applications')}>
              <Text style={{ color: theme.mutedForeground, fontSize: 13, fontWeight: '600' }}>View all →</Text>
            </TouchableOpacity>
          )}
        </View>

        {stats && stats.recentApps.length > 0 ? (
          stats.recentApps.map(app => (
            <TouchableOpacity
              key={app.id}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ReportDetail', { reportId: app.id })}
            >
              <Card style={{ marginBottom: 8 }}>
                <View style={styles.appRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.foreground, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
                      {app.company}
                    </Text>
                    <Text style={{ color: theme.mutedForeground, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
                      {app.role}
                    </Text>
                  </View>
                  <View style={styles.appRight}>
                    {app.score !== null && (
                      <Badge tone={app.score >= 4.5 ? 'success' : app.score >= 3.5 ? 'warning' : 'destructive'}>
                        {Number(app.score).toFixed(1)}
                      </Badge>
                    )}
                    <Feather name="chevron-right" size={16} color={theme.mutedForeground} />
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        ) : (
          <Card>
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <Feather name="briefcase" size={28} color={theme.mutedForeground} />
              <Text style={{ color: theme.mutedForeground, fontSize: 13, marginTop: 8, textAlign: 'center' }}>
                No applications yet — paste a JD on the Evaluate tab to start.
              </Text>
            </View>
          </Card>
        )}
      </View>
    </ScrollView>
  )
}

function ActionTile({ icon, label, subtitle, onPress, primary }: {
  icon: keyof typeof Feather.glyphMap
  label: string
  subtitle: string
  onPress: () => void
  primary?: boolean
}) {
  const { theme } = useTheme()
  const bg = primary ? theme.primary : theme.card
  const fg = primary ? theme.primaryForeground : theme.foreground
  const subFg = primary ? theme.primaryForeground + 'cc' : theme.mutedForeground
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[
        styles.actionTile,
        { backgroundColor: bg, borderColor: theme.border, borderWidth: primary ? 0 : 1 },
      ]}
      onPress={onPress}
    >
      <Feather name={icon} size={18} color={fg} />
      <Text style={{ color: fg, fontSize: 14, fontWeight: '700', marginTop: 6 }}>{label}</Text>
      <Text style={{ color: subFg, fontSize: 11, marginTop: 2 }}>{subtitle}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  bigNumber: { fontSize: 36, fontWeight: '700', marginTop: 2 },
  planChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  actionsGrid: { flexDirection: 'row', gap: 8 },
  actionTile: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'flex-start' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  appRow: { flexDirection: 'row', alignItems: 'center' },
  appRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
})
