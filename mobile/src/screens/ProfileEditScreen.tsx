import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'
import { supabase } from '../lib/supabase'
import { Button, Input, Textarea, Caption, CenteredSpinner } from '../components/ui'

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
const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Permanent'] as const
const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'AUD'] as const

export function ProfileEditScreen({ navigation }: any) {
  const { user } = useAuth()
  const { theme } = useTheme()
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [targetRolesText, setTargetRolesText] = useState('')

  useEffect(() => { void load() }, [user?.id])

  async function load() {
    if (!user) return
    try {
      const { data } = await (supabase as any).from('profiles').select('*').eq('id', user.id).single()
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
    } catch { /* ignore */ } finally {
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
      const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
      return { ...prev, [field]: next }
    })
  }

  if (loading) return <CenteredSpinner />

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <SectionHeader>Basic info</SectionHeader>
        <Field theme={theme} label="Full Name" value={profile.full_name} onChange={v => setProfile({ ...profile, full_name: v })} icon="user" />
        <Field theme={theme} label="Email" value={profile.email} onChange={v => setProfile({ ...profile, email: v })} icon="mail" keyboardType="email-address" autoCapitalize="none" />
        <Field theme={theme} label="Phone" value={profile.phone} onChange={v => setProfile({ ...profile, phone: v })} icon="phone" keyboardType="phone-pad" />
        <Field theme={theme} label="Location" value={profile.location} onChange={v => setProfile({ ...profile, location: v })} icon="map-pin" placeholder="e.g. Toronto, ON, Canada" />

        <SectionHeader>Links</SectionHeader>
        <Field theme={theme} label="LinkedIn URL" value={profile.linkedin_url} onChange={v => setProfile({ ...profile, linkedin_url: v })} icon="link" placeholder="https://linkedin.com/in/..." keyboardType="url" autoCapitalize="none" />
        <Field theme={theme} label="GitHub URL" value={profile.github_url} onChange={v => setProfile({ ...profile, github_url: v })} icon="link" placeholder="https://github.com/..." keyboardType="url" autoCapitalize="none" />
        <Field theme={theme} label="Portfolio URL" value={profile.portfolio_url} onChange={v => setProfile({ ...profile, portfolio_url: v })} icon="globe" placeholder="https://..." keyboardType="url" autoCapitalize="none" />

        <SectionHeader>Job preferences</SectionHeader>
        <Caption style={{ marginTop: 10, marginBottom: 6 }}>Target Roles (comma-separated)</Caption>
        <Textarea
          rows={3}
          value={targetRolesText}
          onChangeText={setTargetRolesText}
          placeholder="Security Engineer, SOC Analyst, Cloud Engineer"
        />

        <Caption style={{ marginTop: 16, marginBottom: 6 }}>Salary Currency</Caption>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {CURRENCIES.map(c => {
            const active = profile.salary_currency === c
            return (
              <TouchableOpacity
                key={c}
                onPress={() => setProfile({ ...profile, salary_currency: c })}
                style={{
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1,
                  borderColor: active ? theme.primary : theme.border,
                  backgroundColor: active ? theme.primary : 'transparent',
                }}
              >
                <Text style={{ fontSize: 11, color: active ? theme.primaryForeground : theme.foreground, fontWeight: '600' }}>{c}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <Caption style={{ marginTop: 16, marginBottom: 6 }}>Salary Range (annual)</Caption>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Input
            placeholder="Min"
            value={profile.salary_min ? String(profile.salary_min) : ''}
            onChangeText={v => setProfile({ ...profile, salary_min: parseInt(v.replace(/\D/g, '') || '0', 10) })}
            keyboardType="numeric"
            style={{ flex: 1 }}
          />
          <Text style={{ color: theme.mutedForeground }}>—</Text>
          <Input
            placeholder="Max"
            value={profile.salary_max ? String(profile.salary_max) : ''}
            onChangeText={v => setProfile({ ...profile, salary_max: parseInt(v.replace(/\D/g, '') || '0', 10) })}
            keyboardType="numeric"
            style={{ flex: 1 }}
          />
        </View>

        <Caption style={{ marginTop: 16, marginBottom: 6 }}>Work Arrangement</Caption>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {WORK_ARRANGEMENTS.map(a => {
            const active = profile.work_arrangement.includes(a)
            return (
              <TouchableOpacity
                key={a}
                onPress={() => toggleArrayValue('work_arrangement', a)}
                style={{
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1,
                  borderColor: active ? theme.primary : theme.border,
                  backgroundColor: active ? theme.primary : 'transparent',
                }}
              >
                <Text style={{ fontSize: 12, color: active ? theme.primaryForeground : theme.foreground, fontWeight: '500' }}>{a}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <Caption style={{ marginTop: 16, marginBottom: 6 }}>Job Types</Caption>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {JOB_TYPES.map(t => {
            const active = profile.job_types.includes(t)
            return (
              <TouchableOpacity
                key={t}
                onPress={() => toggleArrayValue('job_types', t)}
                style={{
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1,
                  borderColor: active ? theme.primary : theme.border,
                  backgroundColor: active ? theme.primary : 'transparent',
                }}
              >
                <Text style={{ fontSize: 12, color: active ? theme.primaryForeground : theme.foreground, fontWeight: '500' }}>{t}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <SectionHeader>Voice sample (optional)</SectionHeader>
        <Text style={{ color: theme.mutedForeground, fontSize: 12, lineHeight: 17, marginBottom: 8 }}>
          Paste a short writing sample you wrote yourself. Generated content uses this as a style reference.
        </Text>
        <Textarea
          rows={6}
          value={profile.voice_sample}
          onChangeText={v => setProfile({ ...profile, voice_sample: v })}
          placeholder="Paste 1-3 short things you've written…"
          maxLength={2000}
        />
        <Text style={{ color: theme.mutedForeground, fontSize: 11, textAlign: 'right', marginTop: 4 }}>
          {profile.voice_sample.length}/2000
        </Text>

        <Button
          loading={saving}
          onPress={handleSave}
          leftIcon={<Feather name="check" size={16} color={theme.primaryForeground} />}
          style={{ marginTop: 24 }}
        >
          Save
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function SectionHeader({ children }: { children: string }) {
  return <Caption style={{ marginTop: 20, marginBottom: 8 }}>{children}</Caption>
}

interface FieldProps {
  theme: any
  label: string
  value: string
  onChange: (v: string) => void
  icon: keyof typeof Feather.glyphMap
  keyboardType?: any
  autoCapitalize?: any
  placeholder?: string
}

function Field({ theme, label, value, onChange, icon, keyboardType, autoCapitalize, placeholder }: FieldProps) {
  return (
    <View style={{ marginTop: 10 }}>
      <Caption style={{ marginBottom: 6 }}>{label}</Caption>
      <Input
        leftIcon={<Feather name={icon} size={16} color={theme.mutedForeground} />}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  )
}
