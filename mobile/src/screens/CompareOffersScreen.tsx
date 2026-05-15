import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { authFetch } from '../lib/api'
import { useTheme } from '../lib/theme'
import { Button, Input, Textarea, Card, H1, P, Caption } from '../components/ui'

interface Offer {
  company: string
  role: string
  jd_or_offer_text: string
}

const EMPTY_OFFER: Offer = { company: '', role: '', jd_or_offer_text: '' }

export function CompareOffersScreen() {
  const { theme } = useTheme()
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
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <H1>Compare Offers</H1>
      <P muted style={{ marginTop: 4, marginBottom: 16 }}>
        Side-by-side AI analysis of comp, growth, and fit (5 credits).
      </P>

      {offers.map((offer, idx) => (
        <Card key={idx} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Caption>Offer #{idx + 1}</Caption>
            {offers.length > 2 && (
              <TouchableOpacity onPress={() => removeOffer(idx)}>
                <Text style={{ color: theme.destructive, fontSize: 12, fontWeight: '600' }}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
          <Input
            placeholder="Company"
            value={offer.company}
            onChangeText={v => updateOffer(idx, 'company', v)}
            style={{ marginBottom: 8 }}
          />
          <Input
            placeholder="Role"
            value={offer.role}
            onChangeText={v => updateOffer(idx, 'role', v)}
            style={{ marginBottom: 8 }}
          />
          <Textarea
            rows={4}
            placeholder="Paste offer text or JD..."
            value={offer.jd_or_offer_text}
            onChangeText={v => updateOffer(idx, 'jd_or_offer_text', v)}
          />
        </Card>
      ))}

      {offers.length < 4 && (
        <Button
          variant="outline"
          onPress={addOffer}
          leftIcon={<Feather name="plus" size={14} color={theme.foreground} />}
        >
          Add another offer
        </Button>
      )}

      <Button
        loading={loading}
        onPress={handleCompare}
        leftIcon={<Feather name="layers" size={16} color={theme.primaryForeground} />}
        style={{ marginTop: 12 }}
      >
        Compare (5 credits)
      </Button>

      {result && (
        <Card style={{ marginTop: 16 }}>
          <Caption style={{ marginBottom: 8 }}>Comparison</Caption>
          <Text style={{ color: theme.foreground, fontSize: 12, lineHeight: 18, fontFamily: 'monospace' }}>
            {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
          </Text>
        </Card>
      )}
    </ScrollView>
  )
}
