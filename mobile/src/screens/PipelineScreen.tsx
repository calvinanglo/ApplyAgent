import { useEffect, useState, useCallback } from 'react'
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native'
import { authFetch } from '../lib/api'

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

/**
 * Pipeline = URL inbox + bulk evaluation queue.
 *
 * Mobile UX:
 *   - Status tabs scroll horizontally (FlatList → ScrollView for simplicity)
 *   - Add URL field at top
 *   - Item rows show company / role / score badge / source / time
 *   - Tap done item → ReportDetail
 *   - "Process All" button on Pending tab fires batch evaluation
 *
 * Note: this v1 doesn't include swipe-to-delete or department filter from
 * the web version — those can ship in a later polish round.
 */
export function PipelineScreen({ navigation }: any) {
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
      /* soft-fail, pull-to-refresh recovers */
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
      // Backend kicks off via after() — poll for updates by reloading every
      // 5s until pending=0 or 2 min elapsed.
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

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>
  }

  return (
    <View style={styles.container}>
      {/* Add URL form (always at top) */}
      <View style={styles.addCard}>
        <TextInput
          style={styles.urlInput}
          placeholder="Paste a job posting URL"
          value={newUrl}
          onChangeText={setNewUrl}
          autoCapitalize="none"
          keyboardType="url"
          placeholderTextColor="#999"
          onSubmitEditing={handleAddUrl}
        />
        <TouchableOpacity
          style={[styles.addBtn, (!newUrl.trim() || adding) && styles.btnDisabled]}
          onPress={handleAddUrl}
          disabled={!newUrl.trim() || adding}
        >
          {adding ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addBtnText}>Add</Text>}
        </TouchableOpacity>
      </View>

      {/* Status tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow} contentContainerStyle={styles.tabsContent}>
        {(['pending', 'processing', 'done', 'error'] as Status[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {TAB_LABELS[t]} ({counts[t === 'error' ? 'error' : t] || 0})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bulk actions */}
      {activeTab === 'pending' && counts.pending > 0 && (
        <View style={styles.bulkRow}>
          <TouchableOpacity
            style={[styles.bulkBtn, styles.bulkPrimary]}
            onPress={handleProcessAll}
            disabled={processing}
          >
            {processing ? <ActivityIndicator color="#fff" size="small" /> : (
              <Text style={styles.bulkPrimaryText}>Process all ({counts.pending})</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.bulkBtn} onPress={() => handleClear('pending')}>
            <Text style={styles.bulkText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'done' && counts.done > 0 && (
        <View style={styles.bulkRow}>
          <TouchableOpacity style={styles.bulkBtn} onPress={() => handleClear('done')}>
            <Text style={styles.bulkText}>Clear done</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'error' && counts.error > 0 && (
        <View style={styles.bulkRow}>
          <TouchableOpacity style={styles.bulkBtn} onPress={() => handleClear('errors')}>
            <Text style={styles.bulkText}>Clear errors</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load() }} />}
      >
        {visible.length === 0 ? (
          <Text style={styles.empty}>No {activeTab} items</Text>
        ) : (
          visible.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.item}
              activeOpacity={item.status === 'done' && item.report_id ? 0.6 : 1}
              onPress={() => {
                if (item.status === 'done' && item.report_id) {
                  navigation.navigate('ReportDetail', { reportId: item.report_id })
                }
              }}
            >
              <View style={{ flex: 1 }}>
                <View style={styles.itemHeaderRow}>
                  {item.company ? <Text style={styles.itemCompany}>{item.company}</Text> : null}
                  {item.score !== null && (
                    <View style={[styles.scoreBadge, { backgroundColor: item.score >= 4.5 ? '#16a34a' : item.score >= 3.5 ? '#ca8a04' : '#dc2626' }]}>
                      <Text style={styles.scoreText}>{Number(item.score).toFixed(1)}</Text>
                    </View>
                  )}
                </View>
                {item.title ? <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text> : null}
                <View style={styles.itemMeta}>
                  <Text style={styles.itemSource}>{item.source}</Text>
                  {item.error_message ? <Text style={styles.itemError} numberOfLines={1}>{item.error_message}</Text> : null}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  addCard: { flexDirection: 'row', padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  urlInput: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: '#fafafa' },
  addBtn: { backgroundColor: '#000', paddingHorizontal: 16, justifyContent: 'center', borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
  tabsRow: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6', maxHeight: 48, flexShrink: 0 },
  tabsContent: { paddingHorizontal: 12, alignItems: 'center', paddingVertical: 4 },
  tab: { paddingHorizontal: 12, paddingVertical: 8, marginRight: 4, borderRadius: 6 },
  tabActive: { backgroundColor: '#000' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#fff' },
  bulkRow: { flexDirection: 'row', padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  bulkBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#e5e7eb' },
  bulkPrimary: { backgroundColor: '#000', borderColor: '#000' },
  bulkPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  bulkText: { fontSize: 13, fontWeight: '600' },
  list: { flex: 1 },
  listContent: { padding: 12 },
  empty: { textAlign: 'center', color: '#999', fontSize: 13, padding: 32 },
  item: { padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8, backgroundColor: '#fff' },
  itemHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  itemCompany: { fontSize: 14, fontWeight: '700', flex: 1 },
  scoreBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  scoreText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  itemTitle: { fontSize: 13, color: '#444', marginBottom: 4 },
  itemMeta: { flexDirection: 'row', alignItems: 'center' },
  itemSource: { fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.3 },
  itemError: { fontSize: 11, color: '#dc2626', flex: 1, marginLeft: 8 },
})
