import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../lib/theme'
import { Card, H1, P, Caption } from '../components/ui'

interface ToolDef {
  id: string
  icon: keyof typeof Feather.glyphMap
  title: string
  description: string
  credits: number
  route: string
}

const TOOLS: ToolDef[] = [
  {
    id: 'linkedin-message',
    icon: 'message-circle',
    title: 'LinkedIn Outreach',
    description: 'Generate connection request messages for a target company + role.',
    credits: 2,
    route: 'LinkedInMessage',
  },
  {
    id: 'compare-offers',
    icon: 'layers',
    title: 'Compare Offers',
    description: 'Side-by-side analysis of two or more job offers (comp, growth, fit).',
    credits: 5,
    route: 'CompareOffers',
  },
]

export function ToolsScreen({ navigation }: any) {
  const { theme } = useTheme()
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <H1>Tools</H1>
      <P muted style={{ marginTop: 4, marginBottom: 16 }}>
        Quick AI-powered helpers for your job search.
      </P>

      {TOOLS.map(t => (
        <TouchableOpacity key={t.id} activeOpacity={0.7} onPress={() => navigation.navigate(t.route)}>
          <Card style={{ marginBottom: 10 }}>
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: theme.muted }]}>
                <Feather name={t.icon} size={18} color={theme.foreground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.foreground, fontSize: 15, fontWeight: '700' }}>{t.title}</Text>
                <Text style={{ color: theme.mutedForeground, fontSize: 12, marginTop: 4, lineHeight: 17 }}>
                  {t.description}
                </Text>
              </View>
              <View style={[styles.creditBadge, { backgroundColor: theme.muted }]}>
                <Text style={{ color: theme.foreground, fontSize: 16, fontWeight: '700' }}>{t.credits}</Text>
                <Text style={{ color: theme.mutedForeground, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.3 }}>credits</Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      ))}

      <Text style={{ color: theme.mutedForeground, fontSize: 12, textAlign: 'center', marginTop: 24 }}>
        More tools coming soon.
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  creditBadge: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
})
