import { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

interface Application {
  id: string
  company: string
  role: string
  score: number
  status: string
  has_pdf: boolean
  has_cover_letter: boolean
  report_id: string | null
  created_at: string
}

const statusColors: Record<string, string> = {
  Evaluated: '#6b7280',
  Applied: '#2563eb',
  Interview: '#7c3aed',
  Offer: '#16a34a',
  Rejected: '#dc2626',
  Withdrawn: '#9ca3af',
}

export function ApplicationsScreen({ navigation }: any) {
  const { user } = useAuth()
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadApps = useCallback(async () => {
    if (!user) return
    const { data } = await (supabase as any)
      .from('applications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    setApps((data || []) as Application[])
    setLoading(false)
  }, [user])

  useEffect(() => { loadApps() }, [loadApps])

  async function onRefresh() {
    setRefreshing(true)
    await loadApps()
    setRefreshing(false)
  }

  function renderItem({ item }: { item: Application }) {
    const scoreColor = item.score >= 4.5 ? '#16a34a' : item.score >= 3.5 ? '#ca8a04' : '#dc2626'

    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => item.report_id && navigation.navigate('ReportDetail', { reportId: item.report_id })}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.company}>{item.company}</Text>
          <Text style={styles.role}>{item.role}</Text>
          <View style={styles.badges}>
            <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] || '#6b7280' }]}>
              <Text style={styles.badgeText}>{item.status}</Text>
            </View>
            {item.has_pdf && <View style={[styles.statusBadge, { backgroundColor: '#059669' }]}><Text style={styles.badgeText}>PDF</Text></View>}
            {item.has_cover_letter && <View style={[styles.statusBadge, { backgroundColor: '#0891b2' }]}><Text style={styles.badgeText}>CL</Text></View>}
          </View>
        </View>
        <View style={styles.scoreContainer}>
          <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
            <Text style={styles.scoreText}>{Number(item.score).toFixed(1)}</Text>
          </View>
          <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
      </TouchableOpacity>
    )
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={apps}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No applications yet</Text>
            <Text style={styles.emptySubtext}>Evaluate a job posting to get started</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  item: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', alignItems: 'center' },
  company: { fontSize: 16, fontWeight: '600' },
  role: { fontSize: 14, color: '#666', marginTop: 2 },
  badges: { flexDirection: 'row', gap: 6, marginTop: 6 },
  statusBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  scoreContainer: { alignItems: 'flex-end', marginLeft: 12 },
  scoreBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  scoreText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dateText: { fontSize: 11, color: '#999', marginTop: 4 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#666' },
  emptySubtext: { fontSize: 14, color: '#999', marginTop: 4 },
})
