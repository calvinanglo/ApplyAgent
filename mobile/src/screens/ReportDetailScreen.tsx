import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Alert, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'
import { generateCoverLetter, generatePdf, pollJob } from '../lib/api'
import { downloadAndShare } from '../lib/files'
import { Card, Badge, Button, Caption, CenteredSpinner } from '../components/ui'

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
  block_a: 'Role Summary',
  block_b: 'CV Match',
  block_c: 'Level & Strategy',
  block_d: 'Comp & Demand',
  block_e: 'Customization Plan',
  block_f: 'Interview Plan',
  block_g: 'Draft Answers',
}

export function ReportDetailScreen({ route }: any) {
  const { user } = useAuth()
  const { theme } = useTheme()
  const { reportId } = route.params
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeBlock, setActiveBlock] = useState('block_a')
  const [clLoading, setClLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pageLength, setPageLength] = useState<1 | 2>(1)

  useEffect(() => { loadReport() }, [reportId])

  async function loadReport() {
    if (!user) return
    const { data } = await (supabase as any).from('reports').select('*').eq('id', reportId).single()
    setReport(data as Report)
    setLoading(false)
  }

  async function handleCoverLetter() {
    setClLoading(true)
    try {
      const { job_id } = await generateCoverLetter(reportId)
      const status = await pollJob<{ storage_path?: string; cover_letter?: any }>(job_id, { intervalMs: 2500 })
      if (status.status === 'failed') throw new Error(status.error || 'Cover letter generation failed')

      const storagePath = status.result?.storage_path
      if (storagePath) {
        try {
          await downloadAndShare(storagePath)
        } catch {
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
      cl.greeting || 'Dear Hiring Manager,', '',
      ...(cl.body_paragraphs || []), '',
      cl.closing || 'Best regards,',
    ].join('\n\n')
    Alert.alert('Cover Letter Generated', fullText.substring(0, 500) + (fullText.length > 500 ? '…' : ''))
  }

  async function handleResumePdf() {
    setPdfLoading(true)
    try {
      const { job_id } = await generatePdf(reportId, 'fast', pageLength)
      const status = await pollJob<{ storage_path?: string }>(job_id, { intervalMs: 3000 })
      if (status.status === 'failed') throw new Error(status.error || 'Resume generation failed')
      const storagePath = status.result?.storage_path
      if (!storagePath) throw new Error('Resume file not found')
      await downloadAndShare(storagePath)
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setPdfLoading(false)
    }
  }

  if (loading) return <CenteredSpinner />
  if (!report) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <Text style={{ color: theme.foreground }}>Report not found</Text>
      </View>
    )
  }

  const scoreTone = report.score >= 4.5 ? 'success' : report.score >= 3.5 ? 'warning' : 'destructive'
  const blockKeys = Object.keys(BLOCK_LABELS).filter(k => (report as any)[k])

  function renderBlockContent(content: any): string {
    if (!content) return 'No data'
    if (typeof content === 'string') return content
    return JSON.stringify(content, null, 2)
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.foreground, fontSize: 18, fontWeight: '700' }}>{report.company}</Text>
            <Text style={{ color: theme.mutedForeground, fontSize: 14, marginTop: 2 }}>{report.role}</Text>
            {report.archetype && (
              <View style={{ marginTop: 8 }}>
                <Badge tone="outline">{report.archetype}</Badge>
              </View>
            )}
          </View>
          <Badge tone={scoreTone as any} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>{Number(report.score).toFixed(1)}</Text>
          </Badge>
        </View>
      </Card>

      {report.score >= 4.5 && (
        <View style={{ marginTop: 12, gap: 8 }}>
          <Caption>Resume length</Caption>
          <View style={{ flexDirection: 'row', backgroundColor: theme.muted, borderRadius: 8, padding: 4 }}>
            {([1, 2] as const).map(n => {
              const active = pageLength === n
              return (
                <View key={n} style={{ flex: 1 }}>
                  <Text
                    onPress={() => setPageLength(n)}
                    style={{
                      textAlign: 'center', paddingVertical: 8, borderRadius: 6,
                      backgroundColor: active ? theme.background : 'transparent',
                      color: active ? theme.foreground : theme.mutedForeground,
                      fontWeight: active ? '700' : '500',
                      fontSize: 13,
                      overflow: 'hidden',
                    }}
                  >
                    {n} page{n === 2 ? 's' : ''}
                  </Text>
                </View>
              )
            })}
          </View>
          <Button
            loading={pdfLoading}
            disabled={clLoading}
            onPress={handleResumePdf}
            leftIcon={<Feather name="file-text" size={16} color={theme.primaryForeground} />}
          >
            Tailored Resume PDF
          </Button>
          <Button
            variant="outline"
            loading={clLoading}
            disabled={pdfLoading}
            onPress={handleCoverLetter}
            leftIcon={<Feather name="mail" size={16} color={theme.foreground} />}
          >
            Cover Letter
          </Button>
        </View>
      )}

      {report.keywords && report.keywords.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Caption style={{ marginBottom: 8 }}>Key requirements</Caption>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            {report.keywords.slice(0, 12).map((kw, i) => (
              <Badge key={i} tone="secondary">{kw}</Badge>
            ))}
          </View>
        </View>
      )}

      <Caption style={{ marginTop: 20, marginBottom: 8 }}>Report sections</Caption>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {blockKeys.map(key => {
          const active = activeBlock === key
          return (
            <View
              key={key}
              style={{
                paddingHorizontal: 12, paddingVertical: 8, marginRight: 6, borderRadius: 16, borderWidth: 1,
                borderColor: active ? theme.primary : theme.border,
                backgroundColor: active ? theme.primary : 'transparent',
              }}
            >
              <Text
                onPress={() => setActiveBlock(key)}
                style={{ fontSize: 12, fontWeight: '600', color: active ? theme.primaryForeground : theme.foreground }}
              >
                {BLOCK_LABELS[key]}
              </Text>
            </View>
          )
        })}
      </ScrollView>

      <Card>
        <Text style={{ color: theme.foreground, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
          {BLOCK_LABELS[activeBlock]}
        </Text>
        <Text style={{ color: theme.foreground, fontSize: 13, lineHeight: 19 }}>
          {renderBlockContent((report as any)[activeBlock])}
        </Text>
      </Card>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
})
