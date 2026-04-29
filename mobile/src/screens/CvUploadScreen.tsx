import { useEffect, useState } from 'react'
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { authFetch } from '../lib/api'

/**
 * CV upload + paste-edit screen.
 *
 * Flow:
 *   1. Tap "Choose file" → expo-document-picker (PDF / DOCX / TXT / MD)
 *   2. Multipart POST to /api/parse-file → returns extracted text
 *   3. User can review/edit the text
 *   4. Save → upsert into cv_documents (active)
 *
 * The same screen can be used to paste text directly without uploading a file.
 */
export function CvUploadScreen({ navigation }: any) {
  const { user } = useAuth()
  const [cvText, setCvText] = useState('')
  const [loading, setLoading] = useState(true)
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filename, setFilename] = useState<string | null>(null)

  useEffect(() => {
    void loadCv()
  }, [user?.id])

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

      // Read the file's bytes (mobile file://) and POST as multipart so the
      // backend's parse-file endpoint runs the same mammoth + pdf-parse path
      // it does for web uploads.
      const formData = new FormData()
      // RN's FormData accepts { uri, name, type } object for files.
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
      // Upsert active CV (same logic as web settings page)
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

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Your Resume / CV</Text>
      <Text style={styles.subtitle}>
        Upload a PDF or DOCX, or paste your CV text. Used as the source of truth for all generated documents.
      </Text>

      <TouchableOpacity style={styles.uploadBtn} onPress={handlePickFile} disabled={parsing || saving}>
        {parsing ? <ActivityIndicator color="#000" /> : (
          <>
            <Text style={styles.uploadIcon}>+</Text>
            <Text style={styles.uploadLabel}>{filename || 'Upload PDF / DOCX'}</Text>
          </>
        )}
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Or paste your CV text here..."
        value={cvText}
        onChangeText={setCvText}
        multiline
        textAlignVertical="top"
        placeholderTextColor="#999"
      />

      <View style={styles.charCount}>
        <Text style={styles.charCountText}>{cvText.length.toLocaleString()} characters</Text>
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, (!cvText.trim() || saving) && styles.btnDisabled]}
        onPress={handleSave}
        disabled={!cvText.trim() || saving}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save CV</Text>}
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 80 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4, marginBottom: 16, lineHeight: 18 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000', borderStyle: 'dashed', borderRadius: 12, padding: 18, marginBottom: 16 },
  uploadIcon: { fontSize: 18, fontWeight: '700', marginRight: 8 },
  uploadLabel: { fontSize: 15, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 14, fontSize: 13, minHeight: 280, backgroundColor: '#fafafa', fontFamily: 'monospace' },
  charCount: { alignItems: 'flex-end', marginTop: 6, marginBottom: 16 },
  charCountText: { fontSize: 11, color: '#999' },
  saveBtn: { backgroundColor: '#000', borderRadius: 8, padding: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
