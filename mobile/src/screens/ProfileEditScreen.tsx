import { useEffect, useState } from 'react'
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

interface Profile {
  full_name: string
  email: string
  phone: string
  linkedin_url: string
  github_url: string
  portfolio_url: string
  location: string
  target_roles: string[]
  salary_min: number
  salary_max: number
  salary_currency: string
  work_arrangement: string[]
  job_types: string[]
  voice_sample: string
}

const EMPTY_PROFILE: Profile = {
  full_name: '', email: '', phone: '', linkedin_url: '', github_url: '', portfolio_url: '',
  location: '', target_roles: [], salary_min: 0, salary_max: 0, salary_currency: 'CAD',
  work_arrangement: [], job_types: [], voice_sample: '',
}

const WORK_ARRANGEMENTS = ['Remote', 'Hybrid', 'On-site'] as const
const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Permanent', 'Fixed Term'] as const
const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'AUD'] as const

/**
 * Full profile editor — every field the web settings page exposes.
 *
 * Sectioned layout: Basic info, Links, Job preferences, Voice sample.
 * Multi-select fields use chip toggles. Target roles is a comma-separated
 * text field for simplicity (matches web UX).
 */
export function ProfileEditScreen({ navigation }: any) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [targetRolesText, setTargetRolesText] = useState('')

  useEffect(() => { void load() }, [user?.id])

  async function load() {
    if (!user) return
    try {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (data) {
        setProfile({
          full_name: data.full_name || '',
          email: data.email || user.email || '',
          phone: data.phone || '',
          linkedin_url: data.linkedin_url || '',
          github_url: data.github_url || '',
          portfolio_url: data.portfolio_url || '',
          location: data.location || '',
          target_roles: data.target_roles || [],
          salary_min: data.salary_min || 0,
          salary_max: data.salary_max || 0,
          salary_currency: data.salary_currency || 'CAD',
          work_arrangement: data.work_arrangement || [],
          job_types: data.job_types || [],
          voice_sample: data.voice_sample || '',
        })
        setTargetRolesText((data.target_roles || []).join(', '))
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      const targetRoles = targetRolesText.split(',').map(r => r.trim()).filter(Boolean)
      const payload = { ...profile, target_roles: targetRoles, onboarding_completed: true }
      const { error } = await (supabase as any).from('profiles').update(payload).eq('id', user.id)
      if (error) throw error
      Alert.alert('Saved', 'Profile updated.')
      navigation.goBack()
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  function toggleArrayValue(field: 'work_arrangement' | 'job_types', value: string) {
    setProfile(prev => {
      const current = prev[field] || []
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value]
      return { ...prev, [field]: next }
    })
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SectionHeader>Basic info</SectionHeader>
        <Field label="Full Name" value={profile.full_name} onChange={v => setProfile({ ...profile, full_name: v })} />
        <Field label="Email" value={profile.email} onChange={v => setProfile({ ...profile, email: v })} keyboardType="email-address" autoCapitalize="none" />
        <Field label="Phone" value={profile.phone} onChange={v => setProfile({ ...profile, phone: v })} keyboardType="phone-pad" />
        <Field label="Location" value={profile.location} onChange={v => setProfile({ ...profile, location: v })} placeholder="e.g. Toronto, ON, Canada" />

        <SectionHeader>Links</SectionHeader>
        <Field label="LinkedIn URL" value={profile.linkedin_url} onChange={v => setProfile({ ...profile, linkedin_url: v })} keyboardType="url" autoCapitalize="none" placeholder="https://linkedin.com/in/..." />
        <Field label="GitHub URL" value={profile.github_url} onChange={v => setProfile({ ...profile, github_url: v })} keyboardType="url" autoCapitalize="none" placeholder="https://github.com/..." />
        <Field label="Portfolio URL" value={profile.portfolio_url} onChange={v => setProfile({ ...profile, portfolio_url: v })} keyboardType="url" autoCapitalize="none" placeholder="https://..." />

        <SectionHeader>Job preferences</SectionHeader>
        <Text style={styles.fieldLabel}>Target Roles (comma-separated)</Text>
        <TextInput
          style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
          value={targetRolesText}
          onChangeText={setTargetRolesText}
          placeholder="Security Engineer, SOC Analyst, Cloud Engineer"
          multiline
          placeholderTextColor="#999"
        />

        <Text style={styles.fieldLabel}>Salary Range (annual)</Text>
        <View style={styles.salaryRow}>
          <View style={styles.currencyPicker}>
            {CURRENCIES.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.currChip, profile.salary_currency === c && styles.chipActive]}
                onPress={() => setProfile({ ...profile, salary_currency: c })}
              >
                <Text style={[styles.currChipText, profile.salary_currency === c && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.salaryInputs}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={profile.salary_min ? String(profile.salary_min) : ''}
            onChangeText={v => setProfile({ ...profile, salary_min: parseInt(v.replace(/\D/g, '') || '0', 10) })}
            placeholder="Min"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
          <Text style={styles.salaryDash}>—</Text>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={profile.salary_max ? String(profile.salary_max) : ''}
            onChangeText={v => setProfile({ ...profile, salary_max: parseInt(v.replace(/\D/g, '') || '0', 10) })}
            placeholder="Max"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
        </View>

        <Text style={styles.fieldLabel}>Work Arrangement</Text>
        <View style={styles.chipRow}>
          {WORK_ARRANGEMENTS.map(a => {
            const active = profile.work_arrangement.includes(a)
            return (
              <TouchableOpacity
                key={a}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleArrayValue('work_arrangement', a)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{a}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={styles.fieldLabel}>Job Types</Text>
        <View style={styles.chipRow}>
          {JOB_TYPES.map(t => {
            const active = profile.job_types.includes(t)
            return (
              <TouchableOpacity
                key={t}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleArrayValue('job_types', t)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{t}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <SectionHeader>Voice sample (optional)</SectionHeader>
        <Text style={styles.helpText}>
          Paste a short writing sample you wrote yourself — a LinkedIn post, a project summary, a cover letter excerpt. Generated cover letters use this as a style reference so they read like you.
        </Text>
        <TextInput
          style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]}
          value={profile.voice_sample}
          onChangeText={v => setProfile({ ...profile, voice_sample: v })}
          multiline
          placeholder="Paste 1-3 short things you've written…"
          placeholderTextColor="#999"
          maxLength={2000}
        />
        <Text style={styles.charCount}>{profile.voice_sample.length}/2000</Text>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function SectionHeader({ children }: { children: string }) {
  return <Text style={styles.sectionHeader}>{children}</Text>
}

function Field({
  label, value, onChange, keyboardType, autoCapitalize, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  keyboardType?: any
  autoCapitalize?: any
  placeholder?: string
}) {
  return (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholder={placeholder}
        placeholderTextColor="#999"
      />
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionHeader: { fontSize: 11, fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '500', color: '#666', marginTop: 10, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: '#fafafa' },
  helpText: { fontSize: 12, color: '#666', lineHeight: 17, marginTop: 4, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#000', borderColor: '#000' },
  chipText: { fontSize: 12, color: '#666' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  salaryRow: { marginBottom: 8 },
  currencyPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  currChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#e5e7eb' },
  currChipText: { fontSize: 11, fontWeight: '600' },
  salaryInputs: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  salaryDash: { fontSize: 16, color: '#999' },
  charCount: { textAlign: 'right', fontSize: 11, color: '#999', marginTop: 4 },
  saveBtn: { backgroundColor: '#000', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 24 },
  btnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})
