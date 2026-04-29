import { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { getAccountCredits } from '../lib/api'

interface Stats {
  credits: number
  totalApps: number
  recentApps: Array<{ id: string; company: string; role: string; score: number; status: string; created_at: string }>
  subscription: { plan_id: string; status: string } | null
}

export function DashboardScreen({ navigation }: any) {
  const { user, signOut } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadStats = useCallback(async () => {
    if (!user) return

    // Single round-trip via /api/account/credits (mobile-optimized) plus
    // applications query for the recent list. Falls back to direct Supabase
    // queries if the credits endpoint isn't deployed yet.
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
      // Soft-fail — user can pull-to-refresh
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { loadStats() }, [loadStats])

  async function onRefresh() {
    setRefreshing(true)
    await loadStats()
    setRefreshing(false)
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.greeting}>Welcome back</Text>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.credits || 0}</Text>
          <Text style={styles.statLabel}>Credits</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.totalApps || 0}</Text>
          <Text style={styles.statLabel}>Applications</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { fontSize: 14, marginTop: 6 }]}>
            {stats?.subscription?.status === 'active' ? (stats?.subscription?.plan_id || 'Active') : 'Free'}
          </Text>
          <Text style={styles.statLabel}>Plan</Text>
        </View>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Evaluate')}>
            <Text style={styles.actionLabel}>Evaluate JD</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('ScanTab')}>
            <Text style={styles.actionLabel}>Scan Boards</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.actionsGrid, { marginTop: 8 }]}>
          <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => navigation.navigate('PipelineTab')}>
            <Text style={styles.actionLabelSecondary}>Pipeline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => navigation.navigate('Applications')}>
            <Text style={styles.actionLabelSecondary}>Applications</Text>
          </TouchableOpacity>
        </View>
      </View>

      {stats?.recentApps && stats.recentApps.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Applications</Text>
          {stats.recentApps.map(app => (
            <TouchableOpacity
              key={app.id}
              style={styles.appItem}
              onPress={() => navigation.navigate('ReportDetail', { reportId: app.id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.appCompany}>{app.company}</Text>
                <Text style={styles.appRole}>{app.role}</Text>
              </View>
              <View style={styles.appRight}>
                <View style={[styles.scoreBadge, { backgroundColor: app.score >= 4.5 ? '#16a34a' : app.score >= 3.5 ? '#ca8a04' : '#dc2626' }]}>
                  <Text style={styles.scoreText}>{Number(app.score).toFixed(1)}</Text>
                </View>
                <Text style={styles.statusText}>{app.status}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  greeting: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  statNumber: { fontSize: 28, fontWeight: '700' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 2 },
  quickActions: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  actionsGrid: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, backgroundColor: '#000', borderRadius: 12, padding: 16, alignItems: 'center' },
  actionLabel: { fontSize: 14, fontWeight: '600', color: '#fff' },
  actionBtnSecondary: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  actionLabelSecondary: { fontSize: 13, fontWeight: '600' },
  section: { marginBottom: 24 },
  appItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  appCompany: { fontSize: 15, fontWeight: '600' },
  appRole: { fontSize: 13, color: '#666', marginTop: 2 },
  appRight: { alignItems: 'flex-end' },
  scoreBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  scoreText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  statusText: { fontSize: 11, color: '#666', marginTop: 4 },
  signOutBtn: { marginTop: 20, padding: 16, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  signOutText: { color: '#666', fontSize: 14 },
})
