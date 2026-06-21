import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '../../../src/contexts/AuthContext'

const ROLE_LABELS: Record<string, string> = {
  'admin': 'Administrateur',
  'co-gestionnaire': 'Co-gestionnaire',
}

export default function Profil() {
  const { membre, role, signOut } = useAuth()

  const initiales = membre
    ? `${membre.prenom?.[0] ?? ''}${membre.nom?.[0] ?? ''}`
    : '?'

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initiales}</Text>
        </View>
        <Text style={styles.nom}>{membre?.prenom} {membre?.nom}</Text>
        <Text style={styles.email}>{membre?.email}</Text>
        {role && (
          <View style={[styles.roleBadge, role === 'admin' ? styles.roleAdmin : styles.roleCogest]}>
            <Text style={[styles.roleText, role === 'admin' ? styles.roleAdminText : styles.roleCogestText]}>
              {ROLE_LABELS[role] ?? role}
            </Text>
          </View>
        )}
      </View>

      {/* Section Admin */}
      {role === 'admin' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Administration</Text>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(app)/admin/users')}>
            <Text style={styles.menuIcon}>👥</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>Gérer les utilisateurs</Text>
              <Text style={styles.menuSub}>Inviter des co-gestionnaires</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Section compte */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compte</Text>

        {membre && (
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Membre depuis</Text>
              <Text style={styles.infoValue}>
                {new Date(membre.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 40 },
  avatarWrap: { alignItems: 'center', paddingTop: 48, paddingBottom: 32, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  nom: { fontSize: 22, fontWeight: '700', color: '#1e293b' },
  email: { fontSize: 14, color: '#64748b', marginTop: 4 },
  roleBadge: { marginTop: 10, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  roleAdmin: { backgroundColor: '#dbeafe' },
  roleCogest: { backgroundColor: '#f0fdf4' },
  roleText: { fontSize: 13, fontWeight: '600' },
  roleAdminText: { color: '#1d4ed8' },
  roleCogestText: { color: '#16a34a' },
  section: { margin: 16, marginBottom: 0 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  menuItem: { backgroundColor: '#fff', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  menuIcon: { fontSize: 24, marginRight: 12 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  menuSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  menuArrow: { fontSize: 22, color: '#cbd5e1', fontWeight: '300' },
  infoCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 14, color: '#64748b' },
  infoValue: { fontSize: 14, color: '#1e293b', fontWeight: '500' },
  logoutBtn: { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#fca5a5' },
  logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
})
