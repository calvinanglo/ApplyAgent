import { useEffect, useState } from 'react'
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { authFetch } from '../lib/api'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

const BOARD_SOURCES = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'indeed', label: 'Indeed' },
  { id: 'talent', label: 'Talent.com' },
  { id: 'careerjet', label: 'CareerJet' },
  { id: 'jooble', label: 'Jooble' },
  { id: 'adzuna', label: 'Adzuna' },
  { id: 'jobbank', label: 'Job Bank Canada' },
  { id: 'usajobs', label: 'USAJobs' },
  { id: 'themuse', label: 'The Muse' },
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

/**
 * Mobile job-board scanner.
 *
 * Flow: enter keywords + location → choose boards (default all on) → tap Scan
 * → backend hits up to 16 sources in parallel → results inserted into the
 * pipeline_items table → user reviews on Pipeline screen.
 *
 * Mobile UX adaptations vs web's 700-line scanner:
 *   - Boards are toggleable chips, NOT a long checkbox list
 *   - Filters live below in a single column (no two-column desktop layout)
 *   - Salary filter omitted in v1 (low usage on mobile per web telemetry)
 */
export function ScanScreen({ navigation }: any) {
  const { user } = useAuth()
  const [keywords, setKeywords] = useState('')
  const [location, setLocation] = useState('')
  const [targetRoles, setTargetRoles] = useState<string[]>([])
  const [selectedSources, setSelectedSources] = useState<Set<string>>(
    new Set(BOARD_SOURCES.map(s => s.id))
  )
  const [selectedJobTypes, setSelectedJobTypes] = useState<Set<string>>(new Set())
  const [selectedArrangements, setSelectedArrangements] = useState<Set<string>>(new Set())
  const [datePosted, setDatePosted] = useState<string>('any')
  const [scanning, setScanning] = useState(false)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [stats, setStats] = useState<ScanStats | null>(null)

  // Pull target_roles from profile so the scanner can title-filter results
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Job Board Scanner</Text>
      <Text style={styles.subtitle}>
        Searches up to {BOARD_SOURCES.length} boards in parallel. Matching jobs go to your Pipeline for evaluation.
      </Text>

      <Text style={styles.label}>Keywords</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. security analyst"
        value={keywords}
        onChangeText={setKeywords}
        placeholderTextColor="#999"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Location</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Toronto, ON"
        value={location}
        onChangeText={setLocation}
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>Job Boards ({selectedSources.size}/{BOARD_SOURCES.length})</Text>
      <View style={styles.chipRow}>
        {BOARD_SOURCES.map(({ id, label }) => {
          const active = selectedSources.has(id)
          return (
            <TouchableOpacity
              key={id}
              style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
              onPress={() => toggleSet(selectedSources, id, setSelectedSources)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <TouchableOpacity onPress={() => setFiltersExpanded(!filtersExpanded)} style={styles.filtersHeader}>
        <Text style={styles.filtersHeaderText}>
          Filters {(selectedJobTypes.size + selectedArrangements.size + (datePosted !== 'any' ? 1 : 0)) > 0
            ? `(${selectedJobTypes.size + selectedArrangements.size + (datePosted !== 'any' ? 1 : 0)})`
            : ''}
        </Text>
        <Text style={styles.filtersChevron}>{filtersExpanded ? '⌃' : '⌄'}</Text>
      </TouchableOpacity>

      {filtersExpanded && (
        <View style={styles.filterSection}>
          <Text style={styles.label}>Job Type</Text>
          <View style={styles.chipRow}>
            {JOB_TYPES.map(t => {
              const active = selectedJobTypes.has(t)
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                  onPress={() => toggleSet(selectedJobTypes, t, setSelectedJobTypes)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <Text style={styles.label}>Work Arrangement</Text>
          <View style={styles.chipRow}>
            {WORK_ARRANGEMENTS.map(a => {
              const active = selectedArrangements.has(a)
              return (
                <TouchableOpacity
                  key={a}
                  style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                  onPress={() => toggleSet(selectedArrangements, a, setSelectedArrangements)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{a}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <Text style={styles.label}>Posted Within</Text>
          <View style={styles.chipRow}>
            {DATE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, datePosted === opt.value ? styles.chipActive : styles.chipInactive]}
                onPress={() => setDatePosted(opt.value)}
              >
                <Text style={[styles.chipText, datePosted === opt.value && styles.chipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.scanBtn, scanning && styles.btnDisabled]}
        onPress={handleScan}
        disabled={scanning}
      >
        {scanning ? <ActivityIndicator color="#fff" /> : <Text style={styles.scanBtnText}>Scan {selectedSources.size} boards (3 credits)</Text>}
      </TouchableOpacity>

      {stats && (
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Scan complete</Text>
          <StatRow label="Found" value={stats.found} />
          <StatRow label="Added to pipeline" value={stats.added} highlight />
          <StatRow label="Filtered out (title)" value={stats.skipped_title} />
          <StatRow label="Filtered out (filters)" value={stats.skipped_filters} />
          <StatRow label="Already in pipeline" value={stats.skipped_dup} />

          {stats.added > 0 && (
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => navigation.navigate('Pipeline')}
            >
              <Text style={styles.viewBtnText}>View {stats.added} new in Pipeline →</Text>
            </TouchableOpacity>
          )}

          <View style={{ marginTop: 12 }}>
            <Text style={styles.sourcesLabel}>By source:</Text>
            {Object.entries(stats.source_stats).map(([src, s]) => (
              <Text key={src} style={[styles.sourceLine, s.error && { color: '#dc2626' }]}>
                {BOARD_SOURCES.find(b => b.id === src)?.label || src}: {s.error ? 'failed' : `${s.found} found`}
              </Text>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  )
}

function StatRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && { color: '#16a34a', fontWeight: '700' }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4, marginBottom: 16, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: '#fafafa' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginBottom: 4 },
  chipActive: { backgroundColor: '#000', borderColor: '#000' },
  chipInactive: { backgroundColor: '#fff', borderColor: '#e5e7eb' },
  chipText: { fontSize: 12, color: '#666' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  filtersHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, marginTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  filtersHeaderText: { fontSize: 15, fontWeight: '600' },
  filtersChevron: { fontSize: 18, color: '#999' },
  filterSection: { paddingTop: 8 },
  scanBtn: { backgroundColor: '#000', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 20 },
  scanBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
  statsCard: { marginTop: 20, padding: 16, borderRadius: 12, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb' },
  statsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  statLabel: { fontSize: 13, color: '#666' },
  statValue: { fontSize: 13, fontWeight: '600' },
  viewBtn: { marginTop: 12, backgroundColor: '#16a34a', borderRadius: 8, padding: 12, alignItems: 'center' },
  viewBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  sourcesLabel: { fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 8 },
  sourceLine: { fontSize: 11, color: '#999', paddingVertical: 1 },
})
