import { useState } from 'react'
import { View, Text, KeyboardAvoidingView, Platform, TouchableOpacity, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'
import { Button, Input, H1, P, Caption } from '../components/ui'

export function LoginScreen({ navigation }: any) {
  const { signIn } = useAuth()
  const { theme } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!email.trim() || !password) return
    setLoading(true)
    setError('')
    try {
      await signIn(email.trim(), password)
      // AuthProvider's onAuthStateChange swaps the navigator automatically.
    } catch (err: any) {
      setError(err?.message || 'Login failed. Check your email and password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <View style={styles.brand}>
          <View style={[styles.logoCircle, { backgroundColor: theme.primary }]}>
            <Feather name="zap" size={24} color={theme.primaryForeground} />
          </View>
          <H1 style={{ marginTop: 16 }}>ApplyAgent</H1>
          <P muted style={{ marginTop: 4 }}>Sign in to your account</P>
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
          returnKeyType="next"
          style={{ marginBottom: 12 }}
        />

        <Caption style={{ marginBottom: 6 }}>Password</Caption>
        <Input
          leftIcon={<Feather name="lock" size={18} color={theme.mutedForeground} />}
          rightIcon={
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={theme.mutedForeground} />
            </TouchableOpacity>
          }
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          editable={!loading}
          returnKeyType="go"
          onSubmitEditing={handleLogin}
          style={{ marginBottom: 16 }}
        />

        <Button
          loading={loading}
          disabled={!email.trim() || !password}
          onPress={handleLogin}
          rightIcon={<Feather name="arrow-right" size={16} color={theme.primaryForeground} />}
        >
          Sign In
        </Button>

        <TouchableOpacity
          onPress={() => navigation.navigate('ForgotPassword')}
          disabled={loading}
          style={{ marginTop: 12, alignSelf: 'center' }}
        >
          <Text style={{ color: theme.mutedForeground, fontSize: 13 }}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Signup')} disabled={loading} style={{ marginTop: 16 }}>
          <Text style={{ color: theme.mutedForeground, fontSize: 14, textAlign: 'center' }}>
            Don't have an account?{' '}
            <Text style={{ color: theme.foreground, fontWeight: '600' }}>Sign up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  brand: { alignItems: 'center', marginBottom: 32 },
  logoCircle: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 16 },
})
