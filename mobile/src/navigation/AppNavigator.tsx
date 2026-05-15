import { NavigationContainer, createNavigationContainerRef, DarkTheme, DefaultTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'
import { Feather } from '@expo/vector-icons'
import { CenteredSpinner } from '../components/ui'

import { LoginScreen } from '../screens/LoginScreen'
import { SignupScreen } from '../screens/SignupScreen'
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen'
import { DashboardScreen } from '../screens/DashboardScreen'
import { ApplicationsScreen } from '../screens/ApplicationsScreen'
import { EvaluateScreen } from '../screens/EvaluateScreen'
import { ReportDetailScreen } from '../screens/ReportDetailScreen'
import { SettingsScreen } from '../screens/SettingsScreen'
import { CvUploadScreen } from '../screens/CvUploadScreen'
import { AccountScreen } from '../screens/AccountScreen'
import { BillingScreen } from '../screens/BillingScreen'
import { PaywallScreen } from '../screens/PaywallScreen'
import { ScanScreen } from '../screens/ScanScreen'
import { PipelineScreen } from '../screens/PipelineScreen'
import { StoryBankScreen } from '../screens/StoryBankScreen'
import { ToolsScreen } from '../screens/ToolsScreen'
import { LinkedInMessageScreen } from '../screens/LinkedInMessageScreen'
import { CompareOffersScreen } from '../screens/CompareOffersScreen'
import { ProfileEditScreen } from '../screens/ProfileEditScreen'

export const navigationRef = createNavigationContainerRef<any>()

const AuthStack = createNativeStackNavigator()
const MainStack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

// Map tab names to Feather icon names — Feather is the closest visual match
// to the Lucide icons used on the web.
type FeatherIconName = keyof typeof Feather.glyphMap
const TAB_ICONS: Record<string, FeatherIconName> = {
  Dashboard: 'home',
  ScanTab: 'search',
  PipelineTab: 'inbox',
  Evaluate: 'zap',
  Settings: 'menu',
}

function TabNavigator() {
  const { theme } = useTheme()
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: theme.foreground,
        tabBarInactiveTintColor: theme.mutedForeground,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: {
          backgroundColor: theme.background,
          borderBottomColor: theme.border,
        },
        headerShadowVisible: false,
        headerTitleStyle: { color: theme.foreground, fontWeight: '700' },
        tabBarIcon: ({ color, size }) => {
          const name = TAB_ICONS[route.name] || 'circle'
          return <Feather name={name} size={size - 2} color={color} />
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Home', title: 'ApplyAgent' }}
      />
      <Tab.Screen
        name="ScanTab"
        component={ScanScreen}
        options={{ tabBarLabel: 'Scan', title: 'Job Scanner' }}
      />
      <Tab.Screen
        name="PipelineTab"
        component={PipelineScreen}
        options={{ tabBarLabel: 'Pipeline', title: 'Pipeline' }}
      />
      <Tab.Screen
        name="Evaluate"
        component={EvaluateScreen}
        options={{ tabBarLabel: 'Evaluate', title: 'Evaluate' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: 'More', title: 'More' }}
      />
    </Tab.Navigator>
  )
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  )
}

function MainNavigator() {
  const { theme } = useTheme()
  const screenOptions = {
    headerStyle: { backgroundColor: theme.background },
    headerShadowVisible: false,
    headerTitleStyle: { color: theme.foreground, fontWeight: '700' as const },
    headerTintColor: theme.foreground,
    contentStyle: { backgroundColor: theme.background },
  }
  return (
    <MainStack.Navigator screenOptions={screenOptions}>
      <MainStack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
      <MainStack.Screen name="ReportDetail" component={ReportDetailScreen} options={{ title: 'Report' }} />
      <MainStack.Screen name="Applications" component={ApplicationsScreen} options={{ title: 'Applications' }} />
      <MainStack.Screen name="CvUpload" component={CvUploadScreen} options={{ title: 'Resume / CV' }} />
      <MainStack.Screen name="ProfileEdit" component={ProfileEditScreen} options={{ title: 'Edit Profile' }} />
      <MainStack.Screen name="Account" component={AccountScreen} options={{ title: 'Account' }} />
      <MainStack.Screen name="Billing" component={BillingScreen} options={{ title: 'Billing & Credits' }} />
      <MainStack.Screen name="Paywall" component={PaywallScreen} options={{ title: 'Upgrade', presentation: 'modal' }} />
      <MainStack.Screen name="StoryBank" component={StoryBankScreen} options={{ title: 'Story Bank' }} />
      <MainStack.Screen name="Tools" component={ToolsScreen} options={{ title: 'Tools' }} />
      <MainStack.Screen name="LinkedInMessage" component={LinkedInMessageScreen} options={{ title: 'LinkedIn Outreach' }} />
      <MainStack.Screen name="CompareOffers" component={CompareOffersScreen} options={{ title: 'Compare Offers' }} />
    </MainStack.Navigator>
  )
}

export function AppNavigator() {
  const { user, loading } = useAuth()
  const { resolvedMode, theme } = useTheme()

  if (loading) return <CenteredSpinner />

  // React Navigation theme — keeps headers, modals, and back button colors
  // in sync with our app theme.
  const navTheme = resolvedMode === 'dark'
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: theme.background, card: theme.card, text: theme.foreground, border: theme.border, primary: theme.primary } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: theme.background, card: theme.card, text: theme.foreground, border: theme.border, primary: theme.primary } }

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      {user ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  )
}
