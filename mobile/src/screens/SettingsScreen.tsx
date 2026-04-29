import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

interface ProfileSummary {
  full_name: string | null
  email: string | null
  has_cv: boolean
  cv_chars: number
}

/**
 * Settings root screen. Acts as a hub linking to:
 *   - CV upload / paste
 *   - Billing (credits + plan)
 *   - Account (sign out / delete)
 *
 * The full edit-everything settings page on web is intentionally NOT mirrored
 * here — long forms are an awful mobile UX. Mobile focuses on the high-impact
 * actions (CV, billing, sign-out). Edit profile fields lives in v1.1.
 */
export function SettingsScreen({ navigation }: any) {
  const { user } = useAuth()
  const [summary, setSummary] = useState<ProfileSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void loadSummary()
  }, [user?.id])

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
      // Soft-fail
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <Text style={styles.profileName}>{summary?.full_name || 'Welcome'}</Text>
        <Text style={styles.profileEmail}>{summary?.email}</Text>
      </View>

      <Text style={styles.sectionLabel}>Profile</Text>
      <Row
        title="Edit Profile"
        subtitle="Name, contact, target roles, salary range, work preferences"
        onPress={() => navigation.navigate('ProfileEdit')}
      />
      <Row
        title="Resume / CV"
        subtitle={summary?.has_cv ? `${Math.round((summary.cv_chars || 0) / 100) / 10}k chars saved` : 'Upload your resume to get started'}
        badge={summary?.has_cv ? 'Active' : 'Required'}
        badgeStyle={summary?.has_cv ? 'success' : 'warning'}
        onPress={() => navigation.navigate('CvUpload')}
      />

      <Text style={styles.sectionLabel}>Workspace</Text>
      <Row
        title="Applications"
        subtitle="All evaluated jobs and reports"
        onPress={() => navigation.navigate('Applications')}
      />
      <Row
        title="Story Bank"
        subtitle="STAR-format stories from your evaluations"
        onPress={() => navigation.navigate('StoryBank')}
      />
      <Row
        title="Tools"
        subtitle="LinkedIn outreach, compare offers, and more"
        onPress={() => navigation.navigate('Tools')}
      />

      <Text style={styles.sectionLabel}>Account</Text>
      <Row
        title="Billing & Credits"
        subtitle="Plan, credit balance, and purchases"
        onPress={() => navigation.navigate('Billing')}
      />
      <Row
        title="Account"
        subtitle="Sign out or delete your account"
        onPress={() => navigation.navigate('Account')}
      />

      <Text style={styles.sectionLabel}>About</Text>
      <Row
        title="Privacy Policy"
        onPress={() => Alert.alert('Privacy Policy', 'Visit applyagent.ca/privacy in your browser.')}
      />
      <Row
        title="Terms of Service"
        onPress={() => Alert.alert('Terms', 'Visit applyagent.ca/terms in your browser.')}
      />
      <Text style={styles.version}>ApplyAgent v1.0.0</Text>
    </ScrollView>
  )
}

function Row({
  title,
  subtitle,
  badge,
  badgeStyle,
  onPress,
}: {
  title: string
  subtitle?: string
  badge?: string
  badgeStyle?: 'success' | 'warning'
  onPress: () => void
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.6}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {badge ? (
        <View style={[styles.badge, badgeStyle === 'success' ? styles.badgeOk : styles.badgeWarn]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : (
        <Text style={styles.chevron}>›</Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileCard: { padding: 16, borderRadius: 12, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16 },
  profileName: { fontSize: 18, fontWeight: '700' },
  profileEmail: { fontSize: 13, color: '#666', marginTop: 4 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 8, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowSubtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  chevron: { fontSize: 22, color: '#999' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeOk: { backgroundColor: '#dcfce7' },
  badgeWarn: { backgroundColor: '#fef3c7' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  version: { textAlign: 'center', color: '#999', fontSize: 11, marginTop: 24 },
})
