import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'

interface ToolDef {
  id: string
  title: string
  description: string
  credits: number
  route: string
}

const TOOLS: ToolDef[] = [
  {
    id: 'linkedin-message',
    title: 'LinkedIn Outreach',
    description: 'Generate connection request messages for a target company + role.',
    credits: 2,
    route: 'LinkedInMessage',
  },
  {
    id: 'compare-offers',
    title: 'Compare Offers',
    description: 'Side-by-side analysis of two or more job offers (comp, growth, fit).',
    credits: 5,
    route: 'CompareOffers',
  },
]

/**
 * Tools hub — list of bonus utilities. Each tile navigates to its own screen.
 * Adding a new tool = add an entry here + the corresponding screen + register
 * in AppNavigator.
 */
export function ToolsScreen({ navigation }: any) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Tools</Text>
      <Text style={styles.subtitle}>Quick AI-powered helpers for your job search.</Text>

      {TOOLS.map(t => (
        <TouchableOpacity
          key={t.id}
          style={styles.tile}
          onPress={() => navigation.navigate(t.route)}
          activeOpacity={0.6}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.tileTitle}>{t.title}</Text>
            <Text style={styles.tileDesc}>{t.description}</Text>
          </View>
          <View style={styles.creditBadge}>
            <Text style={styles.creditText}>{t.credits}</Text>
            <Text style={styles.creditLabel}>credits</Text>
          </View>
        </TouchableOpacity>
      ))}

      <Text style={styles.note}>
        More tools coming soon. Suggestions? Email support@applyagent.ca.
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4, marginBottom: 20 },
  tile: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 10 },
  tileTitle: { fontSize: 16, fontWeight: '700' },
  tileDesc: { fontSize: 12, color: '#666', marginTop: 4, lineHeight: 17 },
  creditBadge: { alignItems: 'center', backgroundColor: '#f9fafb', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 12 },
  creditText: { fontSize: 18, fontWeight: '700' },
  creditLabel: { fontSize: 9, color: '#999', textTransform: 'uppercase', letterSpacing: 0.3 },
  note: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 24, lineHeight: 17 },
})
