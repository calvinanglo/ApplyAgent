import { useState } from 'react'
import { View, Text, ScrollView, Alert, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'
import { authFetch } from '../lib/api'
import { Card, Button, Caption, P } from '../components/ui'

export function AccountScreen() {
  const { user, signOut } = useAuth()
  const { theme } = useTheme()
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
      await signOut()
    } catch (err: any) {
      Alert.alert('Delete failed', err.message)
      setDeleting(false)
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card style={{ marginBottom: 16 }}>
        <Caption>Signed in as</Caption>
        <Text style={{ color: theme.foreground, fontSize: 16, fontWeight: '600', marginTop: 4 }}>
          {user?.email || '—'}
        </Text>
      </Card>

      <Button
        variant="outline"
        loading={signingOut}
        disabled={deleting}
        onPress={handleSignOut}
        leftIcon={<Feather name="log-out" size={16} color={theme.foreground} />}
      >
        Sign Out
      </Button>

      <View style={[styles.dangerBox, { backgroundColor: theme.destructive + '10', borderColor: theme.destructive + '30' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Feather name="alert-triangle" size={16} color={theme.destructive} />
          <Caption style={{ color: theme.destructive }}>Danger zone</Caption>
        </View>

        {!showDeleteConfirm ? (
          <Button
            variant="outline"
            onPress={() => setShowDeleteConfirm(true)}
            disabled={deleting}
            style={{ borderColor: theme.destructive }}
            leftIcon={<Feather name="trash-2" size={16} color={theme.destructive} />}
          >
            <Text style={{ color: theme.destructive, fontSize: 14, fontWeight: '600' }}>Delete Account</Text>
          </Button>
        ) : (
          <View>
            <P style={{ color: theme.destructive, marginBottom: 12 }}>
              This permanently deletes your account, all evaluations, generated documents, and credit balance. This cannot be undone.
            </P>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button variant="outline" onPress={() => setShowDeleteConfirm(false)} disabled={deleting} fullWidth={false} style={{ flex: 1 }}>
                Cancel
              </Button>
              <Button variant="destructive" loading={deleting} onPress={handleDelete} fullWidth={false} style={{ flex: 1 }}>
                Delete forever
              </Button>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  dangerBox: { padding: 16, borderRadius: 12, borderWidth: 1, marginTop: 32 },
})
