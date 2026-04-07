import { useState } from 'react'
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { evaluate } from '../lib/api'

interface Block {
  key: string
  title: string
  content: any
}

export function EvaluateScreen({ navigation }: any) {
  const [jdText, setJdText] = useState('')
  const [loading, setLoading] = useState(false)
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

    try {
      const res = await evaluate(jdText)
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      if (!reader) throw new Error('No response stream')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const event = JSON.parse(data)
              if (event.type === 'block') {
                setBlocks(prev => [...prev, event.data])
              } else if (event.type === 'score') {
                setScore(event.data.score)
              } else if (event.type === 'saved') {
                setReportId(event.data.report_id)
              } else if (event.type === 'error') {
                setError(event.data.message)
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Evaluation failed')
    } finally {
      setLoading(false)
    }
  }

  const scoreColor = score !== null
    ? score >= 4.5 ? '#16a34a' : score >= 3.5 ? '#ca8a04' : '#dc2626'
    : '#000'

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Evaluate Job Posting</Text>
      <Text style={styles.subtitle}>Paste a job description to get an A-F evaluation</Text>

      <TextInput
        style={styles.input}
        placeholder="Paste the full job description here..."
        value={jdText}
        onChangeText={setJdText}
        multiline
        numberOfLines={8}
        textAlignVertical="top"
        placeholderTextColor="#999"
      />

      <TouchableOpacity
        style={[styles.button, (!jdText.trim() || loading) && styles.buttonDisabled]}
        onPress={handleEvaluate}
        disabled={loading || !jdText.trim()}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Evaluate (10 credits)</Text>
        )}
      </TouchableOpacity>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {score !== null && (
        <View style={styles.scoreCard}>
          <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
            <Text style={styles.scoreNumber}>{Number(score).toFixed(1)}</Text>
            <Text style={styles.scoreLabel}>/ 5</Text>
          </View>

          {reportId && score >= 4.5 && (
            <TouchableOpacity
              style={styles.pipelineBtn}
              onPress={() => navigation.navigate('ReportDetail', { reportId })}
            >
              <Text style={styles.pipelineBtnText}>View Report & Generate Documents</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {blocks.map((block, i) => (
        <View key={i} style={styles.blockCard}>
          <Text style={styles.blockTitle}>{block.title}</Text>
          <Text style={styles.blockContent}>
            {typeof block.content === 'string' ? block.content : JSON.stringify(block.content, null, 2)}
          </Text>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 14, fontSize: 14, minHeight: 160, marginBottom: 12, backgroundColor: '#fafafa', fontFamily: 'monospace' },
  button: { backgroundColor: '#000', borderRadius: 8, padding: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#dc2626', fontSize: 14, marginTop: 12, backgroundColor: '#fef2f2', padding: 12, borderRadius: 8 },
  scoreCard: { marginTop: 20, alignItems: 'center', padding: 20, backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  scoreBadge: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, flexDirection: 'row', alignItems: 'baseline' },
  scoreNumber: { color: '#fff', fontSize: 36, fontWeight: '700' },
  scoreLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 16, marginLeft: 4 },
  pipelineBtn: { marginTop: 16, backgroundColor: '#16a34a', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 },
  pipelineBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  blockCard: { marginTop: 16, padding: 16, backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  blockTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  blockContent: { fontSize: 13, color: '#374151', lineHeight: 20, fontFamily: 'monospace' },
})
