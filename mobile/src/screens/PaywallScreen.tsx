import { useState } from 'react'
import { View, Text, ScrollView, Alert, Platform } from 'react-native'
import { Feather } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import { getAccountCredits } from '../lib/api'
import { useTheme } from '../lib/theme'
import { Button, Caption, P, H1 } from '../components/ui'

const WEB_BILLING_URL = 'https://applyagent.ca/billing'

/**
 * Paywall — Android opens Stripe via in-app browser. iOS path (RevenueCat
 * IAP) shows a placeholder until App Store Connect products are configured.
 */
export function PaywallScreen({ navigation }: any) {
  const { theme } = useTheme()
  const [opening, setOpening] = useState(false)

  async function handleOpenWeb() {
    setOpening(true)
    try {
      const result = await WebBrowser.openBrowserAsync(WEB_BILLING_URL, {
        toolbarColor: theme.background,
        showTitle: true,
      })
      if (result.type !== 'cancel') {
        await new Promise(r => setTimeout(r, 1500))
        await getAccountCredits().catch(() => null)
      }
    } catch (err: any) {
      Alert.alert('Could not open browser', err.message)
    } finally {
      setOpening(false)
    }
  }

  if (Platform.OS === 'ios') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        <H1>Upgrade</H1>
        <P muted style={{ marginTop: 4, marginBottom: 24 }}>
          App Store in-app purchases are coming soon to iOS.
        </P>

        <View style={{ padding: 24, borderRadius: 12, backgroundColor: theme.muted, borderWidth: 1, borderColor: theme.border, alignItems: 'center' }}>
          <Feather name="clock" size={32} color={theme.foreground} />
          <Text style={{ color: theme.foreground, fontSize: 16, fontWeight: '700', marginTop: 12 }}>
            In-app purchases coming soon
          </Text>
          <Text style={{ color: theme.mutedForeground, fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 18 }}>
            Until then, please contact support@applyagent.ca for billing.
          </Text>
        </View>
      </ScrollView>
    )
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
      <H1>Upgrade</H1>
      <P muted style={{ marginTop: 4, marginBottom: 24 }}>
        Choose a plan or buy credits at applyagent.ca/billing — fast, secure card checkout.
      </P>

      <View style={{ padding: 24, borderRadius: 12, backgroundColor: theme.primary, marginBottom: 16 }}>
        <Caption style={{ color: theme.primaryForeground + 'aa' }}>What you get</Caption>
        <Bullet theme={theme} text="120-800 credits per month (subscription)" />
        <Bullet theme={theme} text="Or 100/300/600 credit packs (one-time)" />
        <Bullet theme={theme} text="All AI features — evaluations, resumes, cover letters, scanner" />
        <Bullet theme={theme} text="Cancel anytime, instant access" />
      </View>

      <Button
        loading={opening}
        onPress={handleOpenWeb}
        rightIcon={<Feather name="arrow-right" size={16} color={theme.primaryForeground} />}
      >
        Continue to checkout
      </Button>

      <P muted style={{ fontSize: 12, textAlign: 'center', marginTop: 16, lineHeight: 17 }}>
        Secure payment powered by Stripe. After purchase, your credits update automatically inside the app.
      </P>
    </ScrollView>
  )
}

function Bullet({ theme, text }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 }}>
      <Feather name="check" size={14} color={theme.primaryForeground} style={{ marginTop: 3 }} />
      <Text style={{ color: theme.primaryForeground, fontSize: 13, flex: 1, lineHeight: 19 }}>{text}</Text>
    </View>
  )
}
