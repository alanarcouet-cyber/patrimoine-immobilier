import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'
import { Bien } from '../../../src/types'

const STATUT_COLORS: Record<string, string> = {
  libre: '#22c55e',
  loue: '#2563eb',
  en_travaux: '#f59e0b',
  en_vente: '#ef4444',
}

const STATUT_LABELS: Record<string, string> = {
  libre: 'Libre',
  loue: 'Loué',
  en_travaux: 'Travaux',
  en_vente: 'En vente',
}

export default function Biens() {
  const [biens, setBiens] = useState<Bien[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchBiens() }, [])

  async function fetchBiens() {
    const { data } = await supabase.from('biens').select('*').order('created_at', { ascending: false })
    setBiens(data ?? [])
    setLoading(false)
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />

  return (
    <View style={styles.container}>
      <FlatList
        data={biens}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucun bien enregistré</Text>
            <Text style={styles.emptySubtext}>Ajoutez votre premier bien</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/(app)/bien/${item.id}`)}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardNom}>{item.nom}</Text>
              <View style={[styles.badge, { backgroundColor: STATUT_COLORS[item.statut] + '20' }]}>
                <Text style={[styles.badgeText, { color: STATUT_COLORS[item.statut] }]}>
                  {STATUT_LABELS[item.statut]}
                </Text>
              </View>
            </View>
            <Text style={styles.adresse}>{item.adresse}, {item.code_postal} {item.ville}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.info}>{item.surface_m2 ? `${item.surface_m2} m²` : '—'}</Text>
              <Text style={styles.info}>{item.nb_pieces ? `${item.nb_pieces} pièces` : '—'}</Text>
              <Text style={styles.info}>{item.type_location.toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/(app)/bien/nouveau')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardNom: { fontSize: 16, fontWeight: '600', color: '#1e293b', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  adresse: { fontSize: 13, color: '#64748b', marginBottom: 10 },
  cardFooter: { flexDirection: 'row', gap: 12 },
  info: { fontSize: 12, color: '#94a3b8', backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#64748b' },
  emptySubtext: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    backgroundColor: '#2563eb', width: 56, height: 56,
    borderRadius: 28, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300' },
})
