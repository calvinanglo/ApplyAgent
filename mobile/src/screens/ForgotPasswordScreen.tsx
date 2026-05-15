import { useState } from 'react'
import { View, Text, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/theme'
import { Button, Input, H1, P, Caption } from '../components/ui'

/**
 * Forgot password — sends a reset link to the user's email via Supabase.
 * The reset link redirects to a web page (applyagent.ca/reset-password)
 * since deep-link reset flows on mobile add complexity without much value.
 */
export function ForgotPasswordScreen({ navigation }: any) {
  const { theme } = useTheme()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSend() {
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'https://applyagent.ca/reset-password',
      })
      if (err) throw err
      setSent(true)
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <View style={[styles.iconCircle, { backgroundColor: theme.success + '20' }]}>
          <Feather name="mail" size={28} color={theme.success} />
        </View>
        <H1 style={{ marginTop: 20, textAlign: 'center' }}>Check your email</H1>
        <P muted style={{ marginTop: 8, textAlign: 'center' }}>
          We sent a password reset link to{'\n'}
          <Text style={{ fontWeight: '600', color: theme.foreground }}>{email}</Text>
        </P>
        <Button
          variant="outline"
          onPress={() => navigation.navigate('Login')}
          style={{ marginTop: 24 }}
          fullWidth={false}
        >
          Back to Sign In
        </Button>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <View style={styles.brand}>
          <View style={[styles.logoCircle, { backgroundColor: theme.muted }]}>
            <Feather name="key" size={24} color={theme.foreground} />
          </View>
          <H1 style={{ marginTop: 16 }}>Forgot password?</H1>
          <P muted style={{ marginTop: 4, textAlign: 'center' }}>
            Enter your email and we'll send you a reset link.
          </P>
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: theme.destructive + '15', borderColor: theme.destructive + '30' }]}>
            <Feather name="alert-circle" size={16} color={theme.destructive} />
            <Text style={{ color: theme.destructive, fontSize: 13, flex: 1 }}>{error}</Text>
          </View>
        ) : null}

        <Caption style={{ marginBottom: 6 }}>Email</Caption>
        <Input
          leftIcon={<Feather name="mail" size={18} color={theme.mutedForeground} />}
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!loading}
          style={{ marginBottom: 16 }}
        />

        <Button
          loading={loading}
          disabled={!email.trim()}
          onPress={handleSend}
          rightIcon={<Feather name="send" size={16} color={theme.primaryForeground} />}
        >
          Send reset link
        </Button>

        <Button
          variant="ghost"
          onPress={() => navigation.navigate('Login')}
          disabled={loading}
          style={{ marginTop: 12 }}
        >
          Back to Sign In
        </Button>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  brand: { alignItems: 'center', marginBottom: 32 },
  logoCircle: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 16 },
})
