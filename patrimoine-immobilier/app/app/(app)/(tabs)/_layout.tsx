import { Tabs } from 'expo-router'
import { Text } from 'react-native'

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#2563eb',
      tabBarInactiveTintColor: '#94a3b8',
      headerStyle: { backgroundColor: '#2563eb' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' },
    }}>
      <Tabs.Screen
        name="accueil"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="biens"
        options={{
          title: 'Biens',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏢</Text>,
        }}
      />
      <Tabs.Screen
        name="loyers"
        options={{
          title: 'Loyers',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>💶</Text>,
        }}
      />
      <Tabs.Screen
        name="interventions"
        options={{
          title: 'Entretien',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🔧</Text>,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>,
        }}
      />
    </Tabs>
  )
}
