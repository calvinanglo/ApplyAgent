import { useState } from 'react'
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { authFetch } from '../lib/api'

interface Offer {
  company: string
  role: string
  jd_or_offer_text: string
}

const EMPTY_OFFER: Offer = { company: '', role: '', jd_or_offer_text: '' }

export function CompareOffersScreen() {
  const [offers, setOffers] = useState<Offer[]>([{ ...EMPTY_OFFER }, { ...EMPTY_OFFER }])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  function addOffer() {
    if (offers.length >= 4) return
    setOffers([...offers, { ...EMPTY_OFFER }])
  }

  function removeOffer(idx: number) {
    if (offers.length <= 2) return
    setOffers(offers.filter((_, i) => i !== idx))
  }

  function updateOffer(idx: number, field: keyof Offer, value: string) {
    setOffers(offers.map((o, i) => i === idx ? { ...o, [field]: value } : o))
  }

  async function handleCompare() {
    const valid = offers.filter(o => o.company.trim() && o.role.trim() && o.jd_or_offer_text.trim())
    if (valid.length < 2) {
      Alert.alert('Need at least 2 offers', 'Fill out company, role, and offer text for at least 2 offers.')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await authFetch('/api/compare-offers', {
        method: 'POST',
        body: JSON.stringify({ offers: valid }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Compare failed')
      setResult(data.comparison || data)
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Compare Offers</Text>
      <Text style={styles.subtitle}>Side-by-side AI analysis of comp, growth, and fit (5 credits).</Text>

      {offers.map((offer, idx) => (
        <View key={idx} style={styles.offerCard}>
          <View style={styles.offerHeader}>
            <Text style={styles.offerLabel}>Offer #{idx + 1}</Text>
            {offers.length > 2 && (
              <TouchableOpacity onPress={() => removeOffer(idx)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Company"
            value={offer.company}
            onChangeText={v => updateOffer(idx, 'company', v)}
            placeholderTextColor="#999"
          />
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            placeholder="Role"
            value={offer.role}
            onChangeText={v => updateOffer(idx, 'role', v)}
            placeholderTextColor="#999"
          />
          <TextInput
            style={[styles.input, { marginTop: 8, height: 100, textAlignVertical: 'top' }]}
            placeholder="Paste offer text or JD..."
            value={offer.jd_or_offer_text}
            onChangeText={v => updateOffer(idx, 'jd_or_offer_text', v)}
            multiline
            placeholderTextColor="#999"
          />
        </View>
      ))}

      {offers.length < 4 && (
        <TouchableOpacity style={styles.addBtn} onPress={addOffer}>
          <Text style={styles.addText}>+ Add another offer</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleCompare}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Compare (5 credits)</Text>}
      </TouchableOpacity>

      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Comparison</Text>
          <Text style={styles.resultText}>{typeof result === 'string' ? result : JSON.stringify(result, null, 2)}</Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4, marginBottom: 16 },
  offerCard: { padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
  offerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  offerLabel: { fontSize: 13, fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 },
  removeText: { fontSize: 12, color: '#dc2626', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: '#fafafa' },
  addBtn: { borderWidth: 1, borderColor: '#000', borderStyle: 'dashed', borderRadius: 8, padding: 12, alignItems: 'center' },
  addText: { fontSize: 13, fontWeight: '600' },
  btn: { backgroundColor: '#000', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 16 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  resultCard: { padding: 16, borderRadius: 10, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', marginTop: 16 },
  resultTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  resultText: { fontSize: 12, color: '#333', lineHeight: 18, fontFamily: 'monospace' },
})
