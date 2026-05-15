import { useState } from 'react'
import { View, Text, ScrollView, Alert } from 'react-native'
import { Feather } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import { authFetch } from '../lib/api'
import { useTheme } from '../lib/theme'
import { Button, Input, Textarea, Card, H1, P, Caption } from '../components/ui'

interface MessageVariant {
  variant?: string
  message: string
}

export function LinkedInMessageScreen() {
  const { theme } = useTheme()
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
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <H1>LinkedIn Outreach</H1>
      <P muted style={{ marginTop: 4, marginBottom: 16 }}>
        2-3 message variants for connection requests (2 credits).
      </P>

      <Caption style={{ marginBottom: 6 }}>Company</Caption>
      <Input
        leftIcon={<Feather name="briefcase" size={16} color={theme.mutedForeground} />}
        placeholder="e.g. Stripe"
        value={company}
        onChangeText={setCompany}
        style={{ marginBottom: 12 }}
      />

      <Caption style={{ marginBottom: 6 }}>Role</Caption>
      <Input
        leftIcon={<Feather name="user" size={16} color={theme.mutedForeground} />}
        placeholder="e.g. Senior Security Engineer"
        value={role}
        onChangeText={setRole}
        style={{ marginBottom: 12 }}
      />

      <Caption style={{ marginBottom: 6 }}>Job Description (optional)</Caption>
      <Textarea
        rows={5}
        placeholder="Paste the JD for more targeted messages..."
        value={jdText}
        onChangeText={setJdText}
        style={{ marginBottom: 16 }}
      />

      <Button
        loading={loading}
        onPress={handleGenerate}
        leftIcon={<Feather name="message-circle" size={16} color={theme.primaryForeground} />}
      >
        Generate (2 credits)
      </Button>

      {messages.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <Caption style={{ marginBottom: 8 }}>Generated messages</Caption>
          {messages.map((m, i) => (
            <Card key={i} style={{ marginBottom: 10 }}>
              {m.variant ? (
                <Text style={{ color: theme.mutedForeground, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                  {m.variant}
                </Text>
              ) : null}
              <Text style={{ color: theme.foreground, fontSize: 13, lineHeight: 19 }}>{m.message}</Text>
              <Button
                size="sm"
                variant="outline"
                onPress={() => copyToClipboard(m.message)}
                leftIcon={<Feather name="copy" size={12} color={theme.foreground} />}
                fullWidth={false}
                style={{ marginTop: 10, alignSelf: 'flex-start' }}
              >
                Copy
              </Button>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  )
}
