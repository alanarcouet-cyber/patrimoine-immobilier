import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'
import { Bien } from '../../../src/types'

const STATUT_COLORS: Record<string, string> = {
  libre: '#22c55e', loue: '#2563eb', en_travaux: '#f59e0b', en_vente: '#ef4444',
}
const STATUT_LABELS: Record<string, string> = {
  libre: 'Libre', loue: 'Loué', en_travaux: 'En travaux', en_vente: 'En vente',
}
const TYPE_LABELS: Record<string, string> = {
  nu: 'Location nue', meuble: 'Location meublée', tourisme: 'Location tourisme',
}

export default function BienDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [bien, setBien] = useState<Bien | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (id) fetchBien() }, [id])

  async function fetchBien() {
    const { data } = await supabase.from('biens').select('*').eq('id', id).single()
    setBien(data)
    setLoading(false)
  }

  async function handleDelete() {
    Alert.alert('Supprimer', `Supprimer "${bien?.nom}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          await supabase.from('biens').delete().eq('id', id)
          router.back()
        }
      }
    ])
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />
  if (!bien) return <View style={styles.container}><Text>Bien introuvable</Text></View>

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.nom}>{bien.nom}</Text>
          <Text style={styles.type}>{TYPE_LABELS[bien.type_location]}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: STATUT_COLORS[bien.statut] + '20' }]}>
          <Text style={[styles.badgeText, { color: STATUT_COLORS[bien.statut] }]}>
            {STATUT_LABELS[bien.statut]}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Adresse</Text>
        <Text style={styles.value}>{bien.adresse}</Text>
        <Text style={styles.value}>{bien.code_postal} {bien.ville}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Caractéristiques</Text>
        <View style={styles.row}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{bien.surface_m2 ?? '—'}</Text>
            <Text style={styles.statLabel}>m²</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{bien.nb_pieces ?? '—'}</Text>
            <Text style={styles.statLabel}>pièces</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{bien.classe_dpe ?? '—'}</Text>
            <Text style={styles.statLabel}>DPE</Text>
          </View>
        </View>
      </View>

      {bien.description && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.value}>{bien.description}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.editButton} onPress={() => router.push(`/(app)/bien/nouveau?id=${id}`)}>
          <Text style={styles.editButtonText}>Modifier</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Supprimer</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  nom: { fontSize: 22, fontWeight: '700', color: '#1e293b', flex: 1 },
  type: { fontSize: 13, color: '#64748b', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 12 },
  badgeText: { fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: '#fff', margin: 12, marginBottom: 0, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  value: { fontSize: 15, color: '#1e293b', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', color: '#1e293b' },
  statLabel: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 12, padding: 16, marginTop: 8 },
  editButton: { flex: 1, backgroundColor: '#2563eb', borderRadius: 10, padding: 14, alignItems: 'center' },
  editButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  deleteButton: { flex: 1, backgroundColor: '#fee2e2', borderRadius: 10, padding: 14, alignItems: 'center' },
  deleteButtonText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
})
