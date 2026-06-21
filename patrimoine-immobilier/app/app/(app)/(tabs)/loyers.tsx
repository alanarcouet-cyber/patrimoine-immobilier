import { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'

type LoyerAvecBien = {
  id: string
  mois: string
  montant_hc: number
  charges: number
  statut: string
  date_paiement?: string
  contrats: {
    biens: { nom: string; ville: string } | null
    locataires: { nom: string; prenom: string } | null
  } | null
}

const STATUT_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  paye:       { color: '#16a34a', bg: '#dcfce7', label: 'Payé' },
  en_attente: { color: '#d97706', bg: '#fef3c7', label: 'En attente' },
  partiel:    { color: '#7c3aed', bg: '#ede9fe', label: 'Partiel' },
  impaye:     { color: '#dc2626', bg: '#fee2e2', label: 'Impayé' },
}

const MOIS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

function formatMois(mois: string) {
  const [annee, m] = mois.split('-')
  return `${MOIS_FR[parseInt(m) - 1]} ${annee}`
}

export default function Loyers() {
  const [loyers, setLoyers] = useState<LoyerAvecBien[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filtre, setFiltre] = useState<'tous' | 'en_attente' | 'impaye' | 'paye'>('tous')

  useFocusEffect(useCallback(() => { fetchLoyers() }, []))

  async function fetchLoyers() {
    const { data } = await supabase
      .from('loyers')
      .select('*, contrats(biens(nom, ville), locataires(nom, prenom))')
      .order('mois', { ascending: false })
    setLoyers(data ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  const loyersFiltres = filtre === 'tous' ? loyers : loyers.filter(l => l.statut === filtre)

  const totalAttente = loyers.filter(l => l.statut === 'en_attente' || l.statut === 'impaye')
    .reduce((s, l) => s + l.montant_hc + l.charges, 0)

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />

  return (
    <View style={styles.container}>
      {/* Résumé */}
      {totalAttente > 0 && (
        <View style={styles.alert}>
          <Text style={styles.alertText}>⚠️  {totalAttente.toFixed(0)} € en attente de paiement</Text>
        </View>
      )}

      {/* Filtres */}
      <View style={styles.filtres}>
        {(['tous', 'en_attente', 'impaye', 'paye'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filtreBtn, filtre === f && styles.filtreBtnActive]}
            onPress={() => setFiltre(f)}
          >
            <Text style={[styles.filtreTxt, filtre === f && styles.filtreTxtActive]}>
              {f === 'tous' ? 'Tous' : STATUT_CONFIG[f]?.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={loyersFiltres}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLoyers() }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucun loyer trouvé</Text>
            <Text style={styles.emptySub}>Les loyers apparaissent automatiquement une fois les contrats créés</Text>
          </View>
        }
        renderItem={({ item }) => {
          const cfg = STATUT_CONFIG[item.statut] ?? STATUT_CONFIG.en_attente
          const bien = item.contrats?.biens
          const locataire = item.contrats?.locataires
          return (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/(app)/loyer/${item.id}`)}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bienNom}>{bien?.nom ?? 'Bien inconnu'}</Text>
                  {locataire && (
                    <Text style={styles.locataireName}>{locataire.prenom} {locataire.nom}</Text>
                  )}
                </View>
                <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.badgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>
              <View style={styles.cardBottom}>
                <Text style={styles.mois}>{formatMois(item.mois)}</Text>
                <Text style={styles.montant}>{(item.montant_hc + item.charges).toFixed(0)} €</Text>
              </View>
            </TouchableOpacity>
          )
        }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/(app)/loyer/nouveau')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  alert: { backgroundColor: '#fef3c7', padding: 12, margin: 12, borderRadius: 10, borderLeftWidth: 3, borderLeftColor: '#f59e0b' },
  alertText: { color: '#92400e', fontWeight: '600', fontSize: 14 },
  filtres: { flexDirection: 'row', padding: 12, gap: 8 },
  filtreBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  filtreBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filtreTxt: { fontSize: 13, color: '#64748b' },
  filtreTxtActive: { color: '#fff', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  bienNom: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  locataireName: { fontSize: 13, color: '#64748b', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeTxt: { fontSize: 12, fontWeight: '600' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  mois: { fontSize: 14, color: '#64748b' },
  montant: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#64748b' },
  emptySub: { fontSize: 14, color: '#94a3b8', marginTop: 6, textAlign: 'center' },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#2563eb', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300' },
})
