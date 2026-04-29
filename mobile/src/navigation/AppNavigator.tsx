import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useAuth } from '../lib/auth'
import { ActivityIndicator, View } from 'react-native'

import { LoginScreen } from '../screens/LoginScreen'
import { SignupScreen } from '../screens/SignupScreen'
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

// Exported nav ref so notification handlers (outside React tree) can route
// the user to a specific screen when they tap a push.
export const navigationRef = createNavigationContainerRef<any>()

const AuthStack = createNativeStackNavigator()
const MainStack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { borderTopColor: '#e5e7eb' },
        headerStyle: { backgroundColor: '#fff' },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '600' },
      }}
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
    </AuthStack.Navigator>
  )
}

function MainNavigator() {
  return (
    <MainStack.Navigator>
      <MainStack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
      <MainStack.Screen
        name="ReportDetail"
        component={ReportDetailScreen}
        options={{ title: 'Report', headerBackTitle: 'Back' }}
      />
      <MainStack.Screen
        name="Applications"
        component={ApplicationsScreen}
        options={{ title: 'Applications', headerBackTitle: 'Back' }}
      />
      <MainStack.Screen
        name="CvUpload"
        component={CvUploadScreen}
        options={{ title: 'Resume / CV', headerBackTitle: 'Back' }}
      />
      <MainStack.Screen
        name="ProfileEdit"
        component={ProfileEditScreen}
        options={{ title: 'Edit Profile', headerBackTitle: 'Back' }}
      />
      <MainStack.Screen
        name="Account"
        component={AccountScreen}
        options={{ title: 'Account', headerBackTitle: 'Back' }}
      />
      <MainStack.Screen
        name="Billing"
        component={BillingScreen}
        options={{ title: 'Billing & Credits', headerBackTitle: 'Back' }}
      />
      <MainStack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{ title: 'Upgrade', presentation: 'modal' }}
      />
      <MainStack.Screen
        name="StoryBank"
        component={StoryBankScreen}
        options={{ title: 'Story Bank', headerBackTitle: 'Back' }}
      />
      <MainStack.Screen
        name="Tools"
        component={ToolsScreen}
        options={{ title: 'Tools', headerBackTitle: 'Back' }}
      />
      <MainStack.Screen
        name="LinkedInMessage"
        component={LinkedInMessageScreen}
        options={{ title: 'LinkedIn Outreach', headerBackTitle: 'Back' }}
      />
      <MainStack.Screen
        name="CompareOffers"
        component={CompareOffersScreen}
        options={{ title: 'Compare Offers', headerBackTitle: 'Back' }}
      />
    </MainStack.Navigator>
  )
}

export function AppNavigator() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {user ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  )
}
