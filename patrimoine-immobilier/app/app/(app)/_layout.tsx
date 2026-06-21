import { Slot, Redirect } from 'expo-router'
import { useAuth } from '../../src/contexts/AuthContext'
import { ActivityIndicator, View } from 'react-native'

export default function AppLayout() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  if (!session) return <Redirect href="/(auth)/login" />

  return <Slot />
}
