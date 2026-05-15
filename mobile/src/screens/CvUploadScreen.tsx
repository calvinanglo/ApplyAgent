import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'
import { supabase } from '../lib/supabase'
import { authFetch } from '../lib/api'
import { Button, Textarea, H1, P, Caption, CenteredSpinner } from '../components/ui'

export function CvUploadScreen({ navigation }: any) {
  const { user } = useAuth()
  const { theme } = useTheme()
  const [cvText, setCvText] = useState('')
  const [loading, setLoading] = useState(true)
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filename, setFilename] = useState<string | null>(null)

  useEffect(() => { void loadCv() }, [user?.id])

  async function loadCv() {
    if (!user) return
    try {
      const { data } = await (supabase as any)
        .from('cv_documents')
        .select('content, filename')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()
      if (data?.content) {
        setCvText(data.content)
        setFilename(data.filename || null)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  async function handlePickFile() {
    setParsing(true)
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown'],
        copyToCacheDirectory: true,
        multiple: false,
      })
      if (picked.canceled || !picked.assets?.[0]) {
        setParsing(false)
        return
      }
      const asset = picked.assets[0]

      const formData = new FormData()
      formData.append('file', {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || 'application/octet-stream',
      } as any)

      const res = await authFetch('/api/parse-file', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to parse file')

      setCvText(data.text || '')
      setFilename(asset.name)
      Alert.alert('CV parsed', `Extracted ${data.text?.length || 0} characters from ${asset.name}. Review and tap Save.`)
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to read file')
    } finally {
      setParsing(false)
    }
  }

  async function handleSave() {
    if (!user || !cvText.trim()) return
    setSaving(true)
    try {
      const db = supabase as any
      const { data: existing } = await db
        .from('cv_documents')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()
      if (existing) {
        await db.from('cv_documents').update({ content: cvText, filename }).eq('id', existing.id)
      } else {
        await db.from('cv_documents').insert({ user_id: user.id, content: cvText, filename, is_active: true })
      }
      Alert.alert('Saved', 'Your CV is now active. All resume + cover letter generations will use this version.')
      navigation.goBack()
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save CV')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <CenteredSpinner />

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <H1>Resume / CV</H1>
      <P muted style={{ marginTop: 4, marginBottom: 16 }}>
        Upload a PDF or DOCX, or paste your CV text. Used as the source of truth for all generated documents.
      </P>

      <TouchableOpacity
        style={[styles.uploadBtn, { borderColor: theme.foreground }]}
        onPress={handlePickFile}
        disabled={parsing || saving}
        activeOpacity={0.7}
      >
        {parsing ? (
          <Feather name="loader" size={20} color={theme.foreground} />
        ) : (
          <>
            <Feather name="upload" size={20} color={theme.foreground} />
            <Text style={{ color: theme.foreground, fontSize: 15, fontWeight: '600' }}>
              {filename || 'Upload PDF / DOCX'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      <Caption style={{ marginBottom: 6 }}>Or paste your CV</Caption>
      <Textarea
        rows={14}
        placeholder="Paste your CV text here..."
        value={cvText}
        onChangeText={setCvText}
      />

      <Text style={{ color: theme.mutedForeground, fontSize: 11, textAlign: 'right', marginTop: 4, marginBottom: 16 }}>
        {cvText.length.toLocaleString()} characters
      </Text>

      <Button
        loading={saving}
        disabled={!cvText.trim()}
        onPress={handleSave}
        leftIcon={<Feather name="check" size={16} color={theme.primaryForeground} />}
      >
        Save CV
      </Button>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
  },
})
