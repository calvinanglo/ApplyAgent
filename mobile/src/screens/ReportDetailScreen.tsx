import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { generateCoverLetter, generatePdf, pollJob } from '../lib/api'
import { downloadAndShare } from '../lib/files'

interface Report {
  id: string
  company: string
  role: string
  archetype: string
  score: number
  block_a: any
  block_b: any
  block_c: any
  block_d: any
  block_e: any
  block_f: any
  block_g: any
  keywords: string[]
  created_at: string
}

const BLOCK_LABELS: Record<string, string> = {
  block_a: 'A) Role Summary',
  block_b: 'B) CV Match',
  block_c: 'C) Level & Strategy',
  block_d: 'D) Comp & Demand',
  block_e: 'E) Customization Plan',
  block_f: 'F) Interview Plan',
  block_g: 'G) Draft Answers',
}

export function ReportDetailScreen({ route }: any) {
  const { user } = useAuth()
  const { reportId } = route.params
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeBlock, setActiveBlock] = useState('block_a')
  const [clLoading, setClLoading] = useState(false)

  useEffect(() => {
    loadReport()
  }, [reportId])

  async function loadReport() {
    if (!user) return
    const { data } = await (supabase as any)
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single()

    setReport(data as Report)
    setLoading(false)
  }

  async function handleCoverLetter() {
    setClLoading(true)
    try {
      // Job pattern: POST returns { job_id }, poll status, then download
      // generated file via signed URL.
      const { job_id } = await generateCoverLetter(reportId)
      const status = await pollJob<{ storage_path?: string; cover_letter?: any }>(job_id, { intervalMs: 2500 })
      if (status.status === 'failed') {
        throw new Error(status.error || 'Cover letter generation failed')
      }

      // If the generator stored a JSON file, offer to download it. Otherwise
      // show the inline content.
      const storagePath = status.result?.storage_path
      if (storagePath) {
        try {
          await downloadAndShare(storagePath)
        } catch {
          // Fall back to inline preview on share-sheet failure
          showInlineCoverLetter(status.result?.cover_letter)
        }
      } else {
        showInlineCoverLetter(status.result?.cover_letter)
      }
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setClLoading(false)
    }
  }

  function showInlineCoverLetter(cl: any) {
    if (!cl) {
      Alert.alert('Cover letter ready', 'Open the web app to view the full content.')
      return
    }
    const fullText = [
      cl.greeting || 'Dear Hiring Manager,',
      '',
      ...(cl.body_paragraphs || []),
      '',
      cl.closing || 'Best regards,',
    ].join('\n\n')
    Alert.alert('Cover Letter Generated', fullText.substring(0, 500) + (fullText.length > 500 ? '…' : ''))
  }

  const [pdfLoading, setPdfLoading] = useState(false)
  async function handleResumePdf() {
    setPdfLoading(true)
    try {
      const { job_id } = await generatePdf(reportId, 'fast')
      const status = await pollJob<{ storage_path?: string }>(job_id, { intervalMs: 3000 })
      if (status.status === 'failed') {
        throw new Error(status.error || 'Resume generation failed')
      }
      const storagePath = status.result?.storage_path
      if (!storagePath) throw new Error('Resume file not found')
      await downloadAndShare(storagePath)
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setPdfLoading(false)
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>
  }

  if (!report) {
    return <View style={styles.center}><Text>Report not found</Text></View>
  }

  const scoreColor = report.score >= 4.5 ? '#16a34a' : report.score >= 3.5 ? '#ca8a04' : '#dc2626'
  const blockKeys = Object.keys(BLOCK_LABELS).filter(k => (report as any)[k])

  function renderBlockContent(content: any): string {
    if (!content) return 'No data'
    if (typeof content === 'string') return content
    return JSON.stringify(content, null, 2)
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.company}>{report.company}</Text>
          <Text style={styles.role}>{report.role}</Text>
          <Text style={styles.archetype}>{report.archetype}</Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
          <Text style={styles.scoreText}>{Number(report.score).toFixed(1)}</Text>
        </View>
      </View>

      {report.score >= 4.5 && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleResumePdf} disabled={pdfLoading || clLoading}>
            {pdfLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.actionBtnText}>Tailored Resume PDF</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { marginTop: 8 }]} onPress={handleCoverLetter} disabled={clLoading || pdfLoading}>
            {clLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.actionBtnText}>Cover Letter</Text>}
          </TouchableOpacity>
        </View>
      )}

      {report.keywords && report.keywords.length > 0 && (
        <View style={styles.keywords}>
          {report.keywords.slice(0, 10).map((kw, i) => (
            <View key={i} style={styles.kwBadge}>
              <Text style={styles.kwText}>{kw}</Text>
            </View>
          ))}
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {blockKeys.map(key => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, activeBlock === key && styles.tabActive]}
            onPress={() => setActiveBlock(key)}
          >
            <Text style={[styles.tabText, activeBlock === key && styles.tabTextActive]}>
              {BLOCK_LABELS[key]?.split(')')[0]}){/* Just show "A)" etc */}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.blockCard}>
        <Text style={styles.blockTitle}>{BLOCK_LABELS[activeBlock]}</Text>
        <Text style={styles.blockContent}>{renderBlockContent((report as any)[activeBlock])}</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  company: { fontSize: 22, fontWeight: '700' },
  role: { fontSize: 16, color: '#374151', marginTop: 2 },
  archetype: { fontSize: 13, color: '#666', marginTop: 4 },
  scoreBadge: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, marginLeft: 12 },
  scoreText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionBtn: { flex: 1, backgroundColor: '#16a34a', borderRadius: 8, padding: 14, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  keywords: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  kwBadge: { backgroundColor: '#f3f4f6', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  kwText: { fontSize: 12, color: '#374151' },
  tabs: { marginBottom: 16 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f3f4f6', marginRight: 8 },
  tabActive: { backgroundColor: '#000' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#fff' },
  blockCard: { padding: 16, backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  blockTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  blockContent: { fontSize: 13, color: '#374151', lineHeight: 20, fontFamily: 'monospace' },
})
