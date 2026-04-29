import { useState } from 'react'
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { authFetch } from '../lib/api'

interface MessageVariant {
  variant?: string
  message: string
}

/**
 * LinkedIn outreach message generator.
 *
 * Inputs: company + role + optional JD text
 * Output: 2-3 message variants the user can copy with one tap.
 */
export function LinkedInMessageScreen() {
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [jdText, setJdText] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<MessageVariant[]>([])

  async function handleGenerate() {
    if (!company.trim() || !role.trim()) {
      Alert.alert('Missing fields', 'Company and role are required.')
      return
    }
    setLoading(true)
    setMessages([])
    try {
      const res = await authFetch('/api/linkedin-message', {
        method: 'POST',
        body: JSON.stringify({
          company: company.trim(),
          role: role.trim(),
          jd_text: jdText.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')

      // The API returns { messages: [...] } where each item has { variant, message }
      const list = Array.isArray(data.messages)
        ? data.messages
        : Array.isArray(data.messages?.variants)
        ? data.messages.variants
        : []
      setMessages(list)
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setLoading(false)
    }
  }

  async function copyToClipboard(text: string) {
    await Clipboard.setStringAsync(text)
    Alert.alert('Copied', 'Message copied to clipboard.')
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>LinkedIn Outreach</Text>
      <Text style={styles.subtitle}>2-3 message variants for connection requests (2 credits).</Text>

      <Text style={styles.label}>Company</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Stripe"
        value={company}
        onChangeText={setCompany}
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>Role</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Senior Security Engineer"
        value={role}
        onChangeText={setRole}
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>Job Description (optional)</Text>
      <TextInput
        style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
        placeholder="Paste the JD for more targeted messages..."
        value={jdText}
        onChangeText={setJdText}
        multiline
        placeholderTextColor="#999"
      />

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleGenerate}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Generate (2 credits)</Text>}
      </TouchableOpacity>

      {messages.length > 0 && (
        <View style={styles.messagesWrap}>
          <Text style={styles.label}>Generated messages</Text>
          {messages.map((m, i) => (
            <View key={i} style={styles.messageCard}>
              {m.variant ? <Text style={styles.variantLabel}>{m.variant}</Text> : null}
              <Text style={styles.messageText}>{m.message}</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={() => copyToClipboard(m.message)}>
                <Text style={styles.copyText}>Copy</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: '#fafafa' },
  btn: { backgroundColor: '#000', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 20 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  messagesWrap: { marginTop: 12 },
  messageCard: { padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 10, backgroundColor: '#f9fafb' },
  variantLabel: { fontSize: 11, fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  messageText: { fontSize: 13, color: '#333', lineHeight: 19 },
  copyBtn: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#000' },
  copyText: { fontSize: 12, fontWeight: '600' },
})
