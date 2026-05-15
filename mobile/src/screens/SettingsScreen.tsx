import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Linking } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useAuth } from '../lib/auth'
import { useTheme, type ThemeMode } from '../lib/theme'
import { supabase } from '../lib/supabase'
import { Card, Badge, H2, P, Caption, CenteredSpinner } from '../components/ui'

interface ProfileSummary {
  full_name: string | null
  email: string | null
  has_cv: boolean
  cv_chars: number
}

export function SettingsScreen({ navigation }: any) {
  const { user } = useAuth()
  const { theme, mode, setMode } = useTheme()
  const [summary, setSummary] = useState<ProfileSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { void loadSummary() }, [user?.id])

  async function loadSummary() {
    if (!user) return
    try {
      const [profileRes, cvRes] = await Promise.all([
        (supabase as any).from('profiles').select('full_name, email').eq('id', user.id).single(),
        (supabase as any).from('cv_documents').select('content').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
      ])
      const cvContent = cvRes.data?.content || ''
      setSummary({
        full_name: profileRes.data?.full_name || null,
        email: profileRes.data?.email || user.email || null,
        has_cv: cvContent.trim().length > 0,
        cv_chars: cvContent.length,
      })
    } catch {
      // soft-fail
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <CenteredSpinner />

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Profile card */}
      <Card style={{ marginBottom: 16 }}>
        <View style={styles.profileRow}>
          <View style={[styles.avatar, { backgroundColor: theme.muted }]}>
            <Feather name="user" size={22} color={theme.foreground} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.foreground, fontSize: 16, fontWeight: '700' }}>
              {summary?.full_name || 'Welcome'}
            </Text>
            <Text style={{ color: theme.mutedForeground, fontSize: 13, marginTop: 2 }}>
              {summary?.email}
            </Text>
          </View>
        </View>
      </Card>

      <Caption style={{ marginTop: 8, marginBottom: 8 }}>Profile</Caption>
      <Row icon="user" title="Edit Profile" subtitle="Name, contact, target roles, salary, preferences" onPress={() => navigation.navigate('ProfileEdit')} />
      <Row
        icon="file-text"
        title="Resume / CV"
        subtitle={summary?.has_cv ? `${Math.round((summary.cv_chars || 0) / 100) / 10}k chars saved` : 'Upload your resume to get started'}
        rightSlot={
          <Badge tone={summary?.has_cv ? 'success' : 'warning'}>
            {summary?.has_cv ? 'Active' : 'Required'}
          </Badge>
        }
        onPress={() => navigation.navigate('CvUpload')}
      />

      <Caption style={{ marginTop: 16, marginBottom: 8 }}>Workspace</Caption>
      <Row icon="briefcase" title="Applications" subtitle="All evaluated jobs and reports" onPress={() => navigation.navigate('Applications')} />
      <Row icon="book-open" title="Story Bank" subtitle="STAR-format stories from your evaluations" onPress={() => navigation.navigate('StoryBank')} />
      <Row icon="tool" title="Tools" subtitle="LinkedIn outreach, compare offers, and more" onPress={() => navigation.navigate('Tools')} />

      <Caption style={{ marginTop: 16, marginBottom: 8 }}>Appearance</Caption>
      <Card padded={false}>
        <View style={styles.themeRow}>
          {(['light', 'dark', 'system'] as ThemeMode[]).map((m, i) => {
            const active = mode === m
            const icon = m === 'light' ? 'sun' : m === 'dark' ? 'moon' : 'smartphone'
            return (
              <TouchableOpacity
                key={m}
                activeOpacity={0.7}
                style={[
                  styles.themeChip,
                  { borderRightWidth: i < 2 ? 1 : 0, borderRightColor: theme.border },
                  active && { backgroundColor: theme.muted },
                ]}
                onPress={() => setMode(m)}
              >
                <Feather name={icon} size={16} color={active ? theme.foreground : theme.mutedForeground} />
                <Text
                  style={{
                    color: active ? theme.foreground : theme.mutedForeground,
                    fontWeight: active ? '700' : '500',
                    fontSize: 13,
                    textTransform: 'capitalize',
                  }}
                >
                  {m}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </Card>

      <Caption style={{ marginTop: 16, marginBottom: 8 }}>Account</Caption>
      <Row icon="credit-card" title="Billing & Credits" subtitle="Plan, balance, and purchases" onPress={() => navigation.navigate('Billing')} />
      <Row icon="settings" title="Account" subtitle="Sign out or delete your account" onPress={() => navigation.navigate('Account')} />

      <Caption style={{ marginTop: 16, marginBottom: 8 }}>About</Caption>
      <Row icon="shield" title="Privacy Policy" onPress={() => Linking.openURL('https://applyagent.ca/privacy')} />
      <Row icon="file" title="Terms of Service" onPress={() => Linking.openURL('https://applyagent.ca/terms')} />
      <Row icon="globe" title="Visit applyagent.ca" onPress={() => Linking.openURL('https://applyagent.ca')} />

      <Text style={{ color: theme.mutedForeground, fontSize: 11, textAlign: 'center', marginTop: 24 }}>
        ApplyAgent v1.0.0
      </Text>
    </ScrollView>
  )
}

function Row({
  icon, title, subtitle, rightSlot, onPress,
}: {
  icon: keyof typeof Feather.glyphMap
  title: string
  subtitle?: string
  rightSlot?: React.ReactNode
  onPress: () => void
}) {
  const { theme } = useTheme()
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <Card style={{ marginBottom: 6 }} padded={false}>
        <View style={[styles.row, { padding: 14 }]}>
          <View style={[styles.iconWrap, { backgroundColor: theme.muted }]}>
            <Feather name={icon} size={16} color={theme.foreground} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.foreground, fontSize: 15, fontWeight: '600' }}>{title}</Text>
            {subtitle ? (
              <Text style={{ color: theme.mutedForeground, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {rightSlot || <Feather name="chevron-right" size={16} color={theme.mutedForeground} />}
        </View>
      </Card>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  themeRow: { flexDirection: 'row' },
  themeChip: { flex: 1, paddingVertical: 14, alignItems: 'center', gap: 4 },
})
