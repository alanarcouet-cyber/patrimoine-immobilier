import { useCallback, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'

type InterventionAvecBien = {
  id: string
  type: string
  titre: string
  prestataire?: string
  date_planifiee?: string
  date_realisee?: string
  cout?: number
  statut: string
  biens: { nom: string; ville: string } | null
}

const STATUT_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  planifie:  { color: '#2563eb', bg: '#dbeafe', label: 'Planifié' },
  en_cours:  { color: '#d97706', bg: '#fef3c7', label: 'En cours' },
  termine:   { color: '#16a34a', bg: '#dcfce7', label: 'Terminé' },
  annule:    { color: '#64748b', bg: '#f1f5f9', label: 'Annulé' },
}

const TYPE_ICONS: Record<string, string> = {
  entretien: '🔧', reparation: '🔨', renovation: '🏗️', sinistre: '⚠️',
}

function formatDate(d?: string) {
  if (!d) return '—'
  const [annee, mois, jour] = d.split('-')
  return `${jour}/${mois}/${annee}`
}

export default function Interventions() {
  const [items, setItems] = useState<InterventionAvecBien[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filtre, setFiltre] = useState<'tous' | 'planifie' | 'en_cours' | 'termine'>('tous')

  useFocusEffect(useCallback(() => { fetchInterventions() }, []))

  async function fetchInterventions() {
    const { data } = await supabase
      .from('interventions')
      .select('*, biens(nom, ville)')
      .order('date_planifiee', { ascending: false })
    setItems(data ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  const filtrees = filtre === 'tous' ? items : items.filter(i => i.statut === filtre)

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />

  return (
    <View style={styles.container}>
      <View style={styles.filtres}>
        {(['tous', 'planifie', 'en_cours', 'termine'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filtreBtn, filtre === f && styles.filtreBtnActive]}
            onPress={() => setFiltre(f)}
          >
            <Text style={[styles.filtreTxt, filtre === f && styles.filtreTxtActive]}>
              {f === 'tous' ? 'Toutes' : STATUT_CONFIG[f]?.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtrees}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchInterventions() }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucune intervention</Text>
            <Text style={styles.emptySub}>Ajoutez votre première intervention d'entretien</Text>
          </View>
        }
        renderItem={({ item }) => {
          const cfg = STATUT_CONFIG[item.statut] ?? STATUT_CONFIG.planifie
          return (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/(app)/intervention/${item.id}`)}>
              <View style={styles.cardTop}>
                <Text style={styles.icon}>{TYPE_ICONS[item.type] ?? '🔧'}</Text>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.titre}>{item.titre}</Text>
                  <Text style={styles.bienNom}>{item.biens?.nom ?? '—'}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.badgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>
              <View style={styles.cardBottom}>
                <Text style={styles.meta}>📅 {formatDate(item.date_planifiee)}</Text>
                {item.prestataire ? <Text style={styles.meta}>👷 {item.prestataire}</Text> : null}
                {item.cout != null ? <Text style={styles.meta}>💶 {item.cout} €</Text> : null}
              </View>
            </TouchableOpacity>
          )
        }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/(app)/intervention/nouveau')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  filtres: { flexDirection: 'row', padding: 12, gap: 8, flexWrap: 'wrap' },
  filtreBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  filtreBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filtreTxt: { fontSize: 13, color: '#64748b' },
  filtreTxtActive: { color: '#fff', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  icon: { fontSize: 24 },
  titre: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  bienNom: { fontSize: 13, color: '#64748b', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeTxt: { fontSize: 12, fontWeight: '600' },
  cardBottom: { flexDirection: 'row', gap: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  meta: { fontSize: 13, color: '#64748b' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#64748b' },
  emptySub: { fontSize: 14, color: '#94a3b8', marginTop: 6, textAlign: 'center' },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#2563eb', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300' },
})
