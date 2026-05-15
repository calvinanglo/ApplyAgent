import { useState } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { evaluate, pollJob } from '../lib/api'
import { useTheme } from '../lib/theme'
import { Button, Textarea, Card, Badge, H1, H3, P, Caption } from '../components/ui'

interface Block {
  key: string
  title: string
  content: any
}

interface EvaluationResult {
  report_id?: string
  score?: number
  blocks?: Block[]
  archetype?: string
}

export function EvaluateScreen({ navigation }: any) {
  const { theme } = useTheme()
  const [jdText, setJdText] = useState('')
  const [loading, setLoading] = useState(false)
  const [progressMessage, setProgressMessage] = useState('')
  const [score, setScore] = useState<number | null>(null)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [reportId, setReportId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function handleEvaluate() {
    if (!jdText.trim()) return
    setLoading(true)
    setError('')
    setBlocks([])
    setScore(null)
    setReportId(null)
    setProgressMessage('Starting evaluation…')

    try {
      const { job_id } = await evaluate(jdText)
      setProgressMessage("Analyzing job description… we'll notify you when it's ready, even if you close the app.")

      const status = await pollJob<EvaluationResult>(job_id, { intervalMs: 2500 })
      if (status.status === 'failed') throw new Error(status.error || 'Evaluation failed')

      const result = status.result
      if (result?.score != null) setScore(result.score)
      if (result?.blocks) setBlocks(result.blocks)
      if (result?.report_id) setReportId(result.report_id)
    } catch (err: any) {
      setError(err.message || 'Evaluation failed')
    } finally {
      setLoading(false)
      setProgressMessage('')
    }
  }

  const scoreTone = score !== null
    ? score >= 4.5 ? 'success' : score >= 3.5 ? 'warning' : 'destructive'
    : 'default'

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <H1>Evaluate Job Posting</H1>
      <P muted style={{ marginTop: 4, marginBottom: 16 }}>
        Paste a job description for an AI evaluation across 7 dimensions.
      </P>

      <Caption style={{ marginBottom: 6 }}>Job description</Caption>
      <Textarea
        rows={8}
        placeholder="Paste the full job description here…"
        value={jdText}
        onChangeText={setJdText}
        editable={!loading}
        style={{ marginBottom: 12 }}
      />

      <Button
        loading={loading}
        disabled={!jdText.trim()}
        onPress={handleEvaluate}
        leftIcon={<Feather name="zap" size={16} color={theme.primaryForeground} />}
      >
        Evaluate (10 credits)
      </Button>

      {loading && progressMessage ? (
        <View style={[styles.progressBox, { backgroundColor: theme.muted, borderColor: theme.border }]}>
          <Feather name="loader" size={14} color={theme.mutedForeground} />
          <Text style={{ color: theme.mutedForeground, fontSize: 13, flex: 1, lineHeight: 18 }}>
            {progressMessage}
          </Text>
        </View>
      ) : null}

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: theme.destructive + '15', borderColor: theme.destructive + '30' }]}>
          <Feather name="alert-circle" size={16} color={theme.destructive} />
          <Text style={{ color: theme.destructive, fontSize: 13, flex: 1 }}>{error}</Text>
        </View>
      ) : null}

      {score !== null && (
        <Card style={{ marginTop: 20, alignItems: 'center', paddingVertical: 24 }}>
          <Badge tone={scoreTone as any} style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700' }}>{Number(score).toFixed(1)}</Text>
          </Badge>
          <Text style={{ color: theme.mutedForeground, fontSize: 12, marginTop: 6 }}>out of 5</Text>

          {reportId && (
            <Button
              variant="outline"
              onPress={() => navigation.navigate('ReportDetail', { reportId })}
              rightIcon={<Feather name="arrow-right" size={14} color={theme.foreground} />}
              style={{ marginTop: 16 }}
            >
              View full report
            </Button>
          )}
        </Card>
      )}

      {blocks.map((block, i) => (
        <Card key={i} style={{ marginTop: 12 }}>
          <H3 style={{ marginBottom: 6 }}>{block.title}</H3>
          <Text style={{ color: theme.foreground, fontSize: 13, lineHeight: 19 }}>
            {typeof block.content === 'string' ? block.content : JSON.stringify(block.content, null, 2)}
          </Text>
        </Card>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  progressBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, borderWidth: 1, marginTop: 12 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, borderWidth: 1, marginTop: 12 },
})
