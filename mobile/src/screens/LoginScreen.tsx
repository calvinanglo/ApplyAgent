import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useAuth } from '../lib/auth'
import { signInWithGoogle, signInWithApple, isAppleSignInAvailable } from '../lib/oauth'

export function LoginScreen({ navigation }: any) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null)
  const [appleAvailable, setAppleAvailable] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void isAppleSignInAvailable().then(setAppleAvailable)
  }, [])

  async function handleLogin() {
    if (!email || !password) return
    setLoading(true)
    setError('')
    try {
      await signIn(email, password)
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setOauthLoading('google')
    setError('')
    const result = await signInWithGoogle()
    setOauthLoading(null)
    if (!result.ok && result.error !== 'Cancelled') setError(result.error || 'Google sign-in failed')
  }

  async function handleApple() {
    setOauthLoading('apple')
    setError('')
    const result = await signInWithApple()
    setOauthLoading(null)
    if (!result.ok && result.error !== 'Cancelled') setError(result.error || 'Apple sign-in failed')
  }

  const anyLoading = loading || oauthLoading !== null

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <Text style={styles.title}>ApplyAgent</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* OAuth buttons appear above email/password — recommended UX. */}
        <TouchableOpacity style={styles.oauthBtn} onPress={handleGoogle} disabled={anyLoading}>
          {oauthLoading === 'google' ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.oauthText}>Continue with Google</Text>
          )}
        </TouchableOpacity>

        {appleAvailable ? (
          <TouchableOpacity style={[styles.oauthBtn, styles.appleBtn]} onPress={handleApple} disabled={anyLoading}>
            {oauthLoading === 'apple' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.oauthText, { color: '#fff' }]}>Continue with Apple</Text>
            )}
          </TouchableOpacity>
        ) : null}

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor="#999"
          editable={!anyLoading}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#999"
          editable={!anyLoading}
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={anyLoading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Signup')} disabled={anyLoading}>
          <Text style={styles.link}>Don't have an account? Sign up</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontSize: 32, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 32 },
  error: { color: '#dc2626', fontSize: 14, textAlign: 'center', marginBottom: 16, backgroundColor: '#fef2f2', padding: 12, borderRadius: 8 },
  oauthBtn: { borderWidth: 1, borderColor: '#000', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 10 },
  appleBtn: { backgroundColor: '#000' },
  oauthText: { fontSize: 15, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { color: '#999', fontSize: 12, marginHorizontal: 8 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 12, backgroundColor: '#fafafa' },
  button: { backgroundColor: '#000', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { color: '#666', fontSize: 14, textAlign: 'center', marginTop: 20 },
})
