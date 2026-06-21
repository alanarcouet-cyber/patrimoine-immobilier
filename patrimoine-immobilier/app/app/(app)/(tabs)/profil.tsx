import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useAuth } from '../../../src/contexts/AuthContext'

export default function Profil() {
  const { profile, signOut } = useAuth()

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {profile?.prenom?.[0]}{profile?.nom?.[0]}
        </Text>
      </View>
      <Text style={styles.nom}>{profile?.prenom} {profile?.nom}</Text>
      <Text style={styles.email}>{profile?.email}</Text>
      <Text style={styles.role}>{profile?.role?.toUpperCase()}</Text>

      <TouchableOpacity style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingTop: 60, backgroundColor: '#f8fafc' },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  nom: { fontSize: 22, fontWeight: '700', color: '#1e293b' },
  email: { fontSize: 14, color: '#64748b', marginTop: 4 },
  role: { fontSize: 12, color: '#2563eb', fontWeight: '600', marginTop: 8, backgroundColor: '#dbeafe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  button: {
    marginTop: 48, backgroundColor: '#ef4444',
    paddingHorizontal: 32, paddingVertical: 14, borderRadius: 10,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
