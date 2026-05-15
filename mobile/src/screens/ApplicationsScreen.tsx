import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'
import { Card, Badge, Caption, CenteredSpinner, Input, EmptyState } from '../components/ui'

interface Application {
  id: string
  company: string
  role: string
  score: number
  status: string
  archetype: string | null
  created_at: string
}

export function ApplicationsScreen({ navigation }: any) {
  const { user } = useAuth()
  const { theme } = useTheme()
  const [apps, setApps] = useState<Application[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const { data } = await (supabase as any)
        .from('reports')
        .select('id, company, role, score, status, archetype, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setApps((data || []) as Application[])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id])

  useEffect(() => { void load() }, [load])

  const filtered = search.trim()
    ? apps.filter(a => {
        const q = search.toLowerCase()
        return a.company?.toLowerCase().includes(q) || a.role?.toLowerCase().includes(q)
      })
    : apps

  if (loading) return <CenteredSpinner />

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.searchBar, { borderBottomColor: theme.border }]}>
        <Input
          leftIcon={<Feather name="search" size={16} color={theme.mutedForeground} />}
          placeholder="Search by company or role"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load() }} tintColor={theme.foreground} />}
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Feather name="briefcase" size={32} color={theme.mutedForeground} />}
            title={search ? 'No matches' : 'No applications yet'}
            description={search ? 'Try a different keyword.' : 'Evaluate a job posting to see it here.'}
          />
        ) : (
          <>
            <Caption style={{ marginBottom: 8 }}>{filtered.length} {filtered.length === 1 ? 'application' : 'applications'}</Caption>
            {filtered.map(app => (
              <TouchableOpacity
                key={app.id}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('ReportDetail', { reportId: app.id })}
              >
                <Card style={{ marginBottom: 8 }}>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.foreground, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
                        {app.company}
                      </Text>
                      <Text style={{ color: theme.mutedForeground, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
                        {app.role}
                      </Text>
                      {app.archetype && (
                        <View style={{ marginTop: 6 }}>
                          <Badge tone="outline">{app.archetype}</Badge>
                        </View>
                      )}
                    </View>
                    <View style={styles.rowRight}>
                      <Badge tone={app.score >= 4.5 ? 'success' : app.score >= 3.5 ? 'warning' : 'destructive'}>
                        {Number(app.score).toFixed(1)}
                      </Badge>
                      <Feather name="chevron-right" size={16} color={theme.mutedForeground} />
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  searchBar: { padding: 12, borderBottomWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
})
