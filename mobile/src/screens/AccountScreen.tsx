import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native'
import { useAuth } from '../lib/auth'
import { authFetch } from '../lib/api'

/**
 * Account screen — sign out + delete account.
 *
 * App Store rule 5.1.1(v) requires a visible account-deletion flow inside
 * the app for any app that lets users create an account.
 */
export function AccountScreen() {
  const { user, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut()
    } catch (err: any) {
      Alert.alert('Sign out failed', err.message)
    } finally {
      setSigningOut(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await authFetch('/api/account/delete', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete account')
      }
      // Account is gone. Sign out clears local session.
      await signOut()
    } catch (err: any) {
      Alert.alert('Delete failed', err.message)
      setDeleting(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Signed in as</Text>
        <Text style={styles.cardEmail}>{user?.email || '—'}</Text>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} disabled={signingOut || deleting}>
        {signingOut ? <ActivityIndicator color="#000" /> : <Text style={styles.signOutText}>Sign Out</Text>}
      </TouchableOpacity>

      <View style={styles.dangerZone}>
        <Text style={styles.dangerLabel}>Danger zone</Text>
        {!showDeleteConfirm ? (
          <TouchableOpacity style={styles.deleteBtn} onPress={() => setShowDeleteConfirm(true)} disabled={deleting}>
            <Text style={styles.deleteText}>Delete Account</Text>
          </TouchableOpacity>
        ) : (
          <View>
            <Text style={styles.deleteWarn}>
              This permanently deletes your account, all evaluations, generated documents, and credit balance. This cannot be undone.
            </Text>
            <View style={styles.confirmRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDeleteConfirm(false)} disabled={deleting}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDeleteBtn} onPress={handleDelete} disabled={deleting}>
                {deleting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmDeleteText}>Permanently delete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  card: { padding: 16, borderRadius: 12, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16 },
  cardLabel: { fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardEmail: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  signOutBtn: { borderWidth: 1, borderColor: '#000', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 32 },
  signOutText: { fontSize: 15, fontWeight: '600' },
  dangerZone: { padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#fee2e2', backgroundColor: '#fef2f2' },
  dangerLabel: { fontSize: 11, color: '#991b1b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, fontWeight: '600' },
  deleteBtn: { borderWidth: 1, borderColor: '#dc2626', borderRadius: 8, padding: 12, alignItems: 'center' },
  deleteText: { color: '#dc2626', fontSize: 14, fontWeight: '600' },
  deleteWarn: { fontSize: 13, color: '#7f1d1d', lineHeight: 18, marginBottom: 12 },
  confirmRow: { flexDirection: 'row', gap: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, alignItems: 'center', backgroundColor: '#fff' },
  cancelText: { fontSize: 14, fontWeight: '600' },
  confirmDeleteBtn: { flex: 1, backgroundColor: '#dc2626', borderRadius: 8, padding: 12, alignItems: 'center' },
  confirmDeleteText: { color: '#fff', fontSize: 14, fontWeight: '600' },
})
