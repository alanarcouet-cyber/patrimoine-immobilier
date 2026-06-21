import { Redirect } from 'expo-router'
import { useAuth } from '../src/contexts/AuthContext'
import { ActivityIndicator, View } from 'react-native'

export default function Index() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  return <Redirect href={session ? '/(app)/(tabs)/biens' : '/(auth)/login'} />
}
