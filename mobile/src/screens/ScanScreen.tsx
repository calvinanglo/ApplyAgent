import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { authFetch } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'
import { supabase } from '../lib/supabase'
import { Button, Input, Card, Badge, H1, H3, P, Caption } from '../components/ui'

const BOARD_SOURCES = [
  // Universal aggregators (every industry)
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'indeed', label: 'Indeed' },
  { id: 'simplyhired', label: 'SimplyHired' },
  { id: 'talent', label: 'Talent.com' },
  { id: 'careerjet', label: 'CareerJet' },
  { id: 'jooble', label: 'Jooble' },
  { id: 'adzuna', label: 'Adzuna' },
  { id: 'workopolis', label: 'Workopolis' },
  { id: 'eluta', label: 'Eluta' },
  // Government
  { id: 'jobbank', label: 'Job Bank CA' },
  { id: 'usajobs', label: 'USAJobs' },
  { id: 'govjobs', label: 'Gov Jobs' },
  // Hourly / trades / retail
  { id: 'snagajob', label: 'Snagajob' },
  // Curated
  { id: 'themuse', label: 'The Muse' },
  // Tech-only
  { id: 'remoteok', label: 'Remote OK' },
  { id: 'remotive', label: 'Remotive' },
  { id: 'weworkremotely', label: 'We Work Remotely' },
  { id: 'himalayas', label: 'Himalayas' },
  { id: 'arbeitnow', label: 'Arbeitnow' },
  { id: 'findwork', label: 'FindWork' },
  { id: 'hnhiring', label: 'HN Who is Hiring' },
] as const

const JOB_TYPES = ['full-time', 'part-time', 'contract', 'temporary'] as const
const WORK_ARRANGEMENTS = ['remote', 'hybrid', 'on-site'] as const
const DATE_OPTIONS = [
  { value: 'any', label: 'Any time' },
  { value: '24h', label: 'Last 24h' },
  { value: '3d', label: 'Last 3d' },
  { value: '7d', label: 'Last 7d' },
  { value: '14d', label: 'Last 14d' },
] as const

interface ScanStats {
  found: number
  filtered: number
  added: number
  skipped_title: number
  skipped_filters: number
  skipped_dup: number
  source_stats: Record<string, { found: number; error: boolean }>
}

export function ScanScreen({ navigation }: any) {
  const { user } = useAuth()
  const { theme } = useTheme()
  const [keywords, setKeywords] = useState('')
  const [location, setLocation] = useState('')
  const [targetRoles, setTargetRoles] = useState<string[]>([])
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set(BOARD_SOURCES.map(s => s.id)))
  const [selectedJobTypes, setSelectedJobTypes] = useState<Set<string>>(new Set())
  const [selectedArrangements, setSelectedArrangements] = useState<Set<string>>(new Set())
  const [datePosted, setDatePosted] = useState<string>('any')
  const [scanning, setScanning] = useState(false)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [stats, setStats] = useState<ScanStats | null>(null)

  useEffect(() => {
    if (!user) return
    void (async () => {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('target_roles, location')
        .eq('id', user.id)
        .single()
      if (data?.target_roles) setTargetRoles(data.target_roles)
      if (data?.location && !location) setLocation(data.location)
    })()
  }, [user?.id])

  function toggleSet(set: Set<string>, key: string, setter: (s: Set<string>) => void) {
    const next = new Set(set)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setter(next)
  }

  async function handleScan() {
    if (!keywords.trim() || !location.trim()) {
      Alert.alert('Missing fields', 'Keywords and location are required.')
      return
    }
    if (selectedSources.size === 0) {
      Alert.alert('No boards selected', 'Choose at least one job board.')
      return
    }
    setScanning(true)
    setStats(null)
    try {
      const res = await authFetch('/api/scan/boards', {
        method: 'POST',
        body: JSON.stringify({
          keywords: keywords.trim(),
          location: location.trim(),
          sources: Array.from(selectedSources),
          target_roles: targetRoles,
          filters: {
            job_types: Array.from(selectedJobTypes),
            work_arrangement: Array.from(selectedArrangements),
            date_posted: datePosted === 'any' ? undefined : datePosted,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Scan failed')
      setStats(data.stats)
    } catch (err: any) {
      Alert.alert('Scan failed', err.message)
    } finally {
      setScanning(false)
    }
  }

  const filterCount = selectedJobTypes.size + selectedArrangements.size + (datePosted !== 'any' ? 1 : 0)

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <H1>Job Board Scanner</H1>
      <P muted style={{ marginTop: 4, marginBottom: 16 }}>
        Searches up to {BOARD_SOURCES.length} boards in parallel. Matches go to your Pipeline.
      </P>

      <Caption style={{ marginBottom: 6 }}>Keywords</Caption>
      <Input
        leftIcon={<Feather name="search" size={16} color={theme.mutedForeground} />}
        placeholder="e.g. security analyst"
        value={keywords}
        onChangeText={setKeywords}
        autoCapitalize="none"
        style={{ marginBottom: 12 }}
      />

      <Caption style={{ marginBottom: 6 }}>Location</Caption>
      <Input
        leftIcon={<Feather name="map-pin" size={16} color={theme.mutedForeground} />}
        placeholder="e.g. Toronto, ON"
        value={location}
        onChangeText={setLocation}
        style={{ marginBottom: 16 }}
      />

      <Caption style={{ marginBottom: 6 }}>Job Boards ({selectedSources.size}/{BOARD_SOURCES.length})</Caption>
      <View style={styles.chipRow}>
        {BOARD_SOURCES.map(({ id, label }) => {
          const active = selectedSources.has(id)
          return (
            <Chip key={id} label={label} active={active} onPress={() => toggleSet(selectedSources, id, setSelectedSources)} />
          )
        })}
      </View>

      <TouchableOpacity onPress={() => setFiltersExpanded(!filtersExpanded)} style={[styles.filtersToggle, { borderColor: theme.border }]}>
        <Feather name="filter" size={16} color={theme.foreground} />
        <Text style={{ color: theme.foreground, fontWeight: '600', flex: 1 }}>
          Filters {filterCount > 0 ? `(${filterCount})` : ''}
        </Text>
        <Feather name={filtersExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.mutedForeground} />
      </TouchableOpacity>

      {filtersExpanded && (
        <View style={{ marginTop: 12 }}>
          <Caption style={{ marginBottom: 6 }}>Job Type</Caption>
          <View style={styles.chipRow}>
            {JOB_TYPES.map(t => (
              <Chip key={t} label={t} active={selectedJobTypes.has(t)} onPress={() => toggleSet(selectedJobTypes, t, setSelectedJobTypes)} />
            ))}
          </View>

          <Caption style={{ marginTop: 12, marginBottom: 6 }}>Work Arrangement</Caption>
          <View style={styles.chipRow}>
            {WORK_ARRANGEMENTS.map(a => (
              <Chip key={a} label={a} active={selectedArrangements.has(a)} onPress={() => toggleSet(selectedArrangements, a, setSelectedArrangements)} />
            ))}
          </View>

          <Caption style={{ marginTop: 12, marginBottom: 6 }}>Posted Within</Caption>
          <View style={styles.chipRow}>
            {DATE_OPTIONS.map(opt => (
              <Chip key={opt.value} label={opt.label} active={datePosted === opt.value} onPress={() => setDatePosted(opt.value)} />
            ))}
          </View>
        </View>
      )}

      <Button
        loading={scanning}
        onPress={handleScan}
        leftIcon={<Feather name="search" size={16} color={theme.primaryForeground} />}
        style={{ marginTop: 20 }}
      >
        Scan {selectedSources.size} boards (3 credits)
      </Button>

      {stats && (
        <Card style={{ marginTop: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Feather name="check-circle" size={18} color={theme.success} />
            <H3>Scan complete</H3>
          </View>
          <StatRow label="Found" value={stats.found} />
          <StatRow label="Added to pipeline" value={stats.added} highlight />
          <StatRow label="Filtered out (title)" value={stats.skipped_title} />
          <StatRow label="Filtered out (filters)" value={stats.skipped_filters} />
          <StatRow label="Already in pipeline" value={stats.skipped_dup} />

          {stats.added > 0 && (
            <Button
              variant="outline"
              onPress={() => navigation.navigate('PipelineTab')}
              rightIcon={<Feather name="arrow-right" size={14} color={theme.foreground} />}
              style={{ marginTop: 12 }}
            >
              View {stats.added} new in Pipeline
            </Button>
          )}
        </Card>
      )}
    </ScrollView>
  )
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { theme } = useTheme()
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        marginRight: 6,
        marginBottom: 6,
        backgroundColor: active ? theme.primary : theme.card,
        borderColor: active ? theme.primary : theme.border,
      }}
    >
      <Text style={{ fontSize: 12, color: active ? theme.primaryForeground : theme.mutedForeground, fontWeight: active ? '600' : '500' }}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

function StatRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  const { theme } = useTheme()
  return (
    <View style={styles.statRow}>
      <Text style={{ color: theme.mutedForeground, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: highlight ? theme.success : theme.foreground, fontSize: 14, fontWeight: highlight ? '700' : '600' }}>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  filtersToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 12, marginTop: 16, borderRadius: 8, borderWidth: 1 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
})
