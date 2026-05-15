import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'
import { Card, Badge, Button, Caption, CenteredSpinner, EmptyState } from '../components/ui'

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

export function StoryBankScreen() {
  const { user } = useAuth()
  const { theme } = useTheme()
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
    Alert.alert('Delete story?', 'This story will be permanently removed.', [
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
    ])
  }

  const allTags = Array.from(new Set(stories.flatMap(s => s.tags || []))).sort()
  const visible = activeTag ? stories.filter(s => (s.tags || []).includes(activeTag)) : stories

  if (loading) return <CenteredSpinner />

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {allTags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ borderBottomWidth: 1, borderBottomColor: theme.border, maxHeight: 50, flexShrink: 0 }}
          contentContainerStyle={{ paddingHorizontal: 12, alignItems: 'center', paddingVertical: 8 }}
        >
          <TouchableOpacity
            onPress={() => setActiveTag(null)}
            style={{
              paddingHorizontal: 12, paddingVertical: 6, marginRight: 6, borderRadius: 14, borderWidth: 1,
              borderColor: !activeTag ? theme.primary : theme.border,
              backgroundColor: !activeTag ? theme.primary : 'transparent',
            }}
          >
            <Text style={{ fontSize: 12, color: !activeTag ? theme.primaryForeground : theme.mutedForeground, fontWeight: '600' }}>
              All ({stories.length})
            </Text>
          </TouchableOpacity>
          {allTags.map(t => {
            const active = activeTag === t
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setActiveTag(t)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 6, marginRight: 6, borderRadius: 14, borderWidth: 1,
                  borderColor: active ? theme.primary : theme.border,
                  backgroundColor: active ? theme.primary : 'transparent',
                }}
              >
                <Text style={{ fontSize: 12, color: active ? theme.primaryForeground : theme.mutedForeground, fontWeight: active ? '600' : '500' }}>
                  {t}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load() }} tintColor={theme.foreground} />}
      >
        {visible.length === 0 ? (
          <EmptyState
            icon={<Feather name="book-open" size={32} color={theme.mutedForeground} />}
            title="No stories yet"
            description="Evaluate a job posting and the AI extracts STAR-format stories from your CV automatically."
          />
        ) : (
          visible.map(s => {
            const isExpanded = expanded === s.id
            return (
              <Card key={s.id} style={{ marginBottom: 10 }}>
                <TouchableOpacity onPress={() => setExpanded(isExpanded ? null : s.id)} activeOpacity={0.7}>
                  <Text style={{ color: theme.foreground, fontSize: 15, fontWeight: '700' }}>{s.title}</Text>
                  {s.jd_requirement ? (
                    <Text style={{ color: theme.mutedForeground, fontSize: 12, marginTop: 4 }} numberOfLines={isExpanded ? undefined : 1}>
                      For: {s.jd_requirement}
                    </Text>
                  ) : null}
                  {(s.tags && s.tags.length > 0) && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                      {s.tags.map(t => (
                        <Badge key={t} tone="secondary">{t}</Badge>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>

                {isExpanded && (
                  <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border }}>
                    <StorySection theme={theme} label="Situation" value={s.situation} />
                    <StorySection theme={theme} label="Task" value={s.task} />
                    <StorySection theme={theme} label="Action" value={s.action} />
                    <StorySection theme={theme} label="Result" value={s.result} />
                    <StorySection theme={theme} label="Reflection" value={s.reflection} />

                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => handleDelete(s.id)}
                      leftIcon={<Feather name="trash-2" size={12} color={theme.destructive} />}
                      fullWidth={false}
                      style={{ alignSelf: 'flex-start', borderColor: theme.destructive, marginTop: 4 }}
                    >
                      <Text style={{ color: theme.destructive, fontSize: 12, fontWeight: '600' }}>Delete</Text>
                    </Button>
                  </View>
                )}
              </Card>
            )
          })
        )}
      </ScrollView>
    </View>
  )
}

function StorySection({ theme, label, value }: { theme: any; label: string; value: string | null }) {
  if (!value) return null
  return (
    <View style={{ marginBottom: 12 }}>
      <Caption style={{ marginBottom: 4 }}>{label}</Caption>
      <Text style={{ color: theme.foreground, fontSize: 13, lineHeight: 19 }}>{value}</Text>
    </View>
  )
}
