import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { authFetch } from '../lib/api'
import { useTheme } from '../lib/theme'
import { Button, Input, Card, Badge, CenteredSpinner } from '../components/ui'

type Status = 'pending' | 'processing' | 'done' | 'error'

interface PipelineItem {
  id: string
  url: string
  company: string | null
  title: string | null
  source: string
  status: Status
  score: number | null
  report_id: string | null
  error_message: string | null
  created_at: string
  processed_at: string | null
}

interface Counts {
  pending: number
  processing: number
  done: number
  error: number
}

const TAB_LABELS: Record<Status, string> = {
  pending: 'Pending',
  processing: 'Processing',
  done: 'Done',
  error: 'Errors',
}

export function PipelineScreen({ navigation }: any) {
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState<Status>('pending')
  const [items, setItems] = useState<PipelineItem[]>([])
  const [counts, setCounts] = useState<Counts>({ pending: 0, processing: 0, done: 0, error: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [newUrl, setNewUrl] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await authFetch('/api/pipeline?status=all&limit=100')
      const data = await res.json()
      if (res.ok) {
        setItems(data.items || [])
        if (data.counts) setCounts(data.counts)
      }
    } catch {
      /* soft-fail */
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function handleAddUrl() {
    if (!newUrl.trim()) return
    setAdding(true)
    try {
      const res = await authFetch('/api/pipeline', {
        method: 'POST',
        body: JSON.stringify({ url: newUrl.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to add URL')
      }
      setNewUrl('')
      await load()
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setAdding(false)
    }
  }

  async function handleProcessAll() {
    const pendingItems = items.filter(i => i.status === 'pending')
    if (pendingItems.length === 0) return

    Alert.alert(
      `Process ${pendingItems.length} pending items?`,
      `This will use ${pendingItems.length * 10} credits.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Process', onPress: () => doProcess(pendingItems.map(i => i.id)) },
      ]
    )
  }

  async function doProcess(ids: string[]) {
    setProcessing(true)
    try {
      const res = await authFetch('/api/pipeline/process-batch', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Batch processing failed')
      }
      const start = Date.now()
      while (Date.now() - start < 120_000) {
        await new Promise(r => setTimeout(r, 5000))
        await load()
        if (!items.some(i => i.status === 'processing' || i.status === 'pending')) break
      }
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setProcessing(false)
    }
  }

  async function handleClear(type: 'pending' | 'done' | 'errors') {
    Alert.alert(
      `Clear all ${type}?`,
      'This permanently removes them from your pipeline.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await authFetch('/api/pipeline', {
                method: 'DELETE',
                body: JSON.stringify({ clear: type }),
              })
              await load()
            } catch { /* ignore */ }
          },
        },
      ]
    )
  }

  const visible = items.filter(i =>
    activeTab === 'error' ? i.status === 'error' : i.status === activeTab
  )

  if (loading) return <CenteredSpinner />

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Add URL form */}
      <View style={[styles.addCard, { borderBottomColor: theme.border, padding: 12 }]}>
        <View style={{ flex: 1 }}>
          <Input
            leftIcon={<Feather name="link" size={16} color={theme.mutedForeground} />}
            placeholder="Paste a job posting URL"
            value={newUrl}
            onChangeText={setNewUrl}
            autoCapitalize="none"
            keyboardType="url"
            onSubmitEditing={handleAddUrl}
          />
        </View>
        <Button
          size="default"
          loading={adding}
          disabled={!newUrl.trim()}
          onPress={handleAddUrl}
          fullWidth={false}
          style={{ paddingHorizontal: 14, marginLeft: 8 }}
        >
          Add
        </Button>
      </View>

      {/* Status tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabsRow, { borderBottomColor: theme.border }]} contentContainerStyle={styles.tabsContent}>
        {(['pending', 'processing', 'done', 'error'] as Status[]).map(t => {
          const active = activeTab === t
          const count = counts[t === 'error' ? 'error' : t] || 0
          return (
            <TouchableOpacity
              key={t}
              activeOpacity={0.7}
              onPress={() => setActiveTab(t)}
              style={[
                styles.tab,
                { backgroundColor: active ? theme.primary : 'transparent' },
              ]}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: active ? theme.primaryForeground : theme.mutedForeground }}>
                {TAB_LABELS[t]} ({count})
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Bulk actions */}
      {activeTab === 'pending' && counts.pending > 0 && (
        <View style={[styles.bulkRow, { borderBottomColor: theme.border }]}>
          <Button
            size="sm"
            loading={processing}
            onPress={handleProcessAll}
            leftIcon={<Feather name="play" size={14} color={theme.primaryForeground} />}
            fullWidth={false}
            style={{ flex: 1 }}
          >
            Process all ({counts.pending})
          </Button>
          <Button
            size="sm"
            variant="outline"
            onPress={() => handleClear('pending')}
            fullWidth={false}
            style={{ marginLeft: 8 }}
          >
            Clear
          </Button>
        </View>
      )}

      {activeTab === 'done' && counts.done > 0 && (
        <View style={[styles.bulkRow, { borderBottomColor: theme.border }]}>
          <Button size="sm" variant="outline" onPress={() => handleClear('done')} fullWidth={false}>
            Clear done
          </Button>
        </View>
      )}

      {activeTab === 'error' && counts.error > 0 && (
        <View style={[styles.bulkRow, { borderBottomColor: theme.border }]}>
          <Button size="sm" variant="outline" onPress={() => handleClear('errors')} fullWidth={false}>
            Clear errors
          </Button>
        </View>
      )}

      {/* List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load() }} tintColor={theme.foreground} />}
      >
        {visible.length === 0 ? (
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Feather name="inbox" size={32} color={theme.mutedForeground} />
            <Text style={{ color: theme.mutedForeground, fontSize: 13, marginTop: 8 }}>
              No {activeTab} items
            </Text>
          </View>
        ) : (
          visible.map(item => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={item.status === 'done' && item.report_id ? 0.7 : 1}
              onPress={() => {
                if (item.status === 'done' && item.report_id) {
                  navigation.navigate('ReportDetail', { reportId: item.report_id })
                }
              }}
            >
              <Card style={{ marginBottom: 8, padding: 12 }}>
                <View style={styles.itemHeaderRow}>
                  {item.company && (
                    <Text style={{ color: theme.foreground, fontSize: 14, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                      {item.company}
                    </Text>
                  )}
                  {item.score !== null && (
                    <Badge tone={item.score >= 4.5 ? 'success' : item.score >= 3.5 ? 'warning' : 'destructive'}>
                      {Number(item.score).toFixed(1)}
                    </Badge>
                  )}
                </View>
                {item.title && (
                  <Text style={{ color: theme.mutedForeground, fontSize: 13, marginTop: 4 }} numberOfLines={1}>
                    {item.title}
                  </Text>
                )}
                <View style={styles.itemMeta}>
                  <View style={styles.metaRow}>
                    <Feather name="globe" size={11} color={theme.mutedForeground} />
                    <Text style={{ color: theme.mutedForeground, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                      {item.source}
                    </Text>
                  </View>
                  {item.error_message ? (
                    <Text style={{ color: theme.destructive, fontSize: 11, marginLeft: 8, flex: 1 }} numberOfLines={1}>
                      {item.error_message}
                    </Text>
                  ) : null}
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  addCard: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  tabsRow: { borderBottomWidth: 1, maxHeight: 50, flexShrink: 0 },
  tabsContent: { paddingHorizontal: 12, alignItems: 'center', paddingVertical: 6 },
  tab: { paddingHorizontal: 12, paddingVertical: 6, marginRight: 4, borderRadius: 6 },
  bulkRow: { flexDirection: 'row', padding: 12, gap: 8, borderBottomWidth: 1 },
  itemHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
})
