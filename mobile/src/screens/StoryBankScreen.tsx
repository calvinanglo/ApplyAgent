import { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

interface Story {
  id: string
  title: string
  jd_requirement: string | null
  situation: string | null
  task: string | null
  action: string | null
  result: string | null
  reflection: string | null
  tags: string[] | null
  source_report_id: string | null
  created_at: string
}

/**
 * Story Bank — searchable library of STAR+R stories collected from
 * evaluations + voice samples. Mobile UX shows expandable cards (tap to
 * expand the full S/T/A/R/Reflection breakdown).
 */
export function StoryBankScreen() {
  const { user } = useAuth()
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const { data } = await (supabase as any)
        .from('story_bank')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setStories((data || []) as Story[])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id])

  useEffect(() => { void load() }, [load])

  async function handleDelete(id: string) {
    Alert.alert(
      'Delete story?',
      'This story will be permanently removed from your bank.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await (supabase as any).from('story_bank').delete().eq('id', id)
              setStories(prev => prev.filter(s => s.id !== id))
            } catch (err: any) {
              Alert.alert('Error', err.message)
            }
          },
        },
      ]
    )
  }

  // Collect all unique tags for the filter row
  const allTags = Array.from(new Set(stories.flatMap(s => s.tags || []))).sort()
  const visible = activeTag
    ? stories.filter(s => (s.tags || []).includes(activeTag))
    : stories

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>
  }

  return (
    <View style={styles.container}>
      {allTags.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsRow} contentContainerStyle={styles.tagsContent}>
          <TouchableOpacity
            style={[styles.tagChip, !activeTag && styles.tagChipActive]}
            onPress={() => setActiveTag(null)}
          >
            <Text style={[styles.tagText, !activeTag && styles.tagTextActive]}>All ({stories.length})</Text>
          </TouchableOpacity>
          {allTags.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tagChip, activeTag === t && styles.tagChipActive]}
              onPress={() => setActiveTag(t)}
            >
              <Text style={[styles.tagText, activeTag === t && styles.tagTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load() }} />}
      >
        {visible.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No stories yet</Text>
            <Text style={styles.emptyText}>
              Evaluate a job posting and the AI extracts STAR-format stories from your CV automatically. They'll appear here.
            </Text>
          </View>
        ) : (
          visible.map(s => {
            const isExpanded = expanded === s.id
            return (
              <View key={s.id} style={styles.card}>
                <TouchableOpacity onPress={() => setExpanded(isExpanded ? null : s.id)}>
                  <Text style={styles.cardTitle}>{s.title}</Text>
                  {s.jd_requirement ? (
                    <Text style={styles.cardReq} numberOfLines={isExpanded ? undefined : 1}>
                      For: {s.jd_requirement}
                    </Text>
                  ) : null}
                  {(s.tags && s.tags.length > 0) && (
                    <View style={styles.cardTags}>
                      {s.tags.map(t => (
                        <View key={t} style={styles.cardTagBadge}>
                          <Text style={styles.cardTagText}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.expanded}>
                    <Section label="Situation" value={s.situation} />
                    <Section label="Task" value={s.task} />
                    <Section label="Action" value={s.action} />
                    <Section label="Result" value={s.result} />
                    <Section label="Reflection" value={s.reflection} />

                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(s.id)}>
                      <Text style={styles.deleteText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )
          })
        )}
      </ScrollView>
    </View>
  )
}

function Section({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={styles.sectionText}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tagsRow: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6', maxHeight: 48, flexShrink: 0 },
  tagsContent: { paddingHorizontal: 12, alignItems: 'center', paddingVertical: 4 },
  tagChip: { paddingHorizontal: 12, paddingVertical: 6, marginRight: 6, borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  tagChipActive: { backgroundColor: '#000', borderColor: '#000' },
  tagText: { fontSize: 12, color: '#666' },
  tagTextActive: { color: '#fff', fontWeight: '600' },
  list: { flex: 1 },
  listContent: { padding: 16 },
  empty: { padding: 32, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptyText: { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 18 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardReq: { fontSize: 12, color: '#666', marginTop: 4 },
  cardTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  cardTagBadge: { backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  cardTagText: { fontSize: 10, color: '#666' },
  expanded: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  section: { marginBottom: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  sectionText: { fontSize: 13, lineHeight: 19, color: '#333' },
  deleteBtn: { marginTop: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#fecaca', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  deleteText: { color: '#dc2626', fontSize: 12, fontWeight: '600' },
})
