import { useCallback, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'
import { useAuth } from '../../../src/contexts/AuthContext'

const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

function moisCourant() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function moisLabel() {
  const d = new Date()
  return `${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`
}

type Stats = {
  biens: { libre: number; loue: number; en_travaux: number; total: number }
  loyers: { attendu: number; encaisse: number; impaye_count: number; impaye_montant: number }
  contrats_actifs: number
  interventions_ouvertes: number
}

export default function Accueil() {
  const { membre } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useFocusEffect(useCallback(() => { fetchStats() }, []))

  async function fetchStats() {
    const mois = moisCourant()

    const [{ data: biens }, { data: loyers }, { data: impayes }, { data: contrats }, { data: interventions }] =
      await Promise.all([
        supabase.from('biens').select('statut'),
        supabase.from('loyers').select('montant_hc, charges, statut').eq('mois', mois),
        supabase.from('loyers').select('montant_hc, charges').eq('statut', 'impaye'),
        supabase.from('contrats').select('id').eq('statut', 'actif'),
        supabase.from('interventions').select('id').in('statut', ['planifie', 'en_cours']),
      ])

    const biensStats = { libre: 0, loue: 0, en_travaux: 0, total: 0 }
    for (const b of biens ?? []) {
      biensStats.total++
      if (b.statut === 'libre') biensStats.libre++
      else if (b.statut === 'loue') biensStats.loue++
      else if (b.statut === 'en_travaux') biensStats.en_travaux++
    }

    const loyersPaye = (loyers ?? []).filter(l => l.statut === 'paye' || l.statut === 'partiel')
    const loyersAttente = (loyers ?? []).filter(l => l.statut === 'en_attente' || l.statut === 'impaye')
    const encaisse = loyersPaye.reduce((s, l) => s + l.montant_hc + l.charges, 0)
    const attendu = (loyers ?? []).reduce((s, l) => s + l.montant_hc + l.charges, 0)
    const impaye_montant = (impayes ?? []).reduce((s, l) => s + l.montant_hc + l.charges, 0)

    setStats({
      biens: biensStats,
      loyers: { attendu, encaisse, impaye_count: impayes?.length ?? 0, impaye_montant },
      contrats_actifs: contrats?.length ?? 0,
      interventions_ouvertes: interventions?.length ?? 0,
    })
    setLoading(false)
    setRefreshing(false)
  }

  const prenom = membre?.prenom ?? ''

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />

  const s = stats!

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats() }} />}
    >
      {/* En-tête */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour{prenom ? `, ${prenom}` : ''} 👋</Text>
          <Text style={styles.periode}>{moisLabel()}</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/(app)/(tabs)/profil')}>
          <Text style={styles.profileInitiales}>
            {(membre?.prenom?.[0] ?? '') + (membre?.nom?.[0] ?? '')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Alerte impayés */}
      {s.loyers.impaye_count > 0 && (
        <TouchableOpacity
          style={styles.alertCard}
          onPress={() => router.push('/(app)/(tabs)/loyers')}
        >
          <Text style={styles.alertIcon}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>
              {s.loyers.impaye_count} loyer{s.loyers.impaye_count > 1 ? 's' : ''} impayé{s.loyers.impaye_count > 1 ? 's' : ''}
            </Text>
            <Text style={styles.alertSub}>{s.loyers.impaye_montant.toFixed(0)} € à recouvrer</Text>
          </View>
          <Text style={styles.alertArrow}>›</Text>
        </TouchableOpacity>
      )}

      {/* KPIs loyers du mois */}
      <Text style={styles.sectionTitle}>Loyers — {moisLabel()}</Text>
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, styles.kpiGreen]}>
          <Text style={styles.kpiValue}>{s.loyers.encaisse.toFixed(0)} €</Text>
          <Text style={styles.kpiLabel}>Encaissé</Text>
        </View>
        <View style={[styles.kpiCard, styles.kpiBlue]}>
          <Text style={styles.kpiValue}>{s.loyers.attendu.toFixed(0)} €</Text>
          <Text style={styles.kpiLabel}>Attendu</Text>
        </View>
        <View style={[styles.kpiCard, s.loyers.attendu > 0 && s.loyers.encaisse < s.loyers.attendu ? styles.kpiOrange : styles.kpiGray]}>
          <Text style={styles.kpiValue}>
            {s.loyers.attendu > 0 ? Math.round((s.loyers.encaisse / s.loyers.attendu) * 100) : 100}%
          </Text>
          <Text style={styles.kpiLabel}>Taux</Text>
        </View>
      </View>

      {/* Biens */}
      <Text style={styles.sectionTitle}>Patrimoine</Text>
      <TouchableOpacity style={styles.biensCard} onPress={() => router.push('/(app)/(tabs)/biens')}>
        <View style={styles.biensRow}>
          <View style={styles.biensItem}>
            <Text style={styles.biensCount}>{s.biens.total}</Text>
            <Text style={styles.biensLabel}>Total</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.biensItem}>
            <Text style={[styles.biensCount, { color: '#2563eb' }]}>{s.biens.loue}</Text>
            <Text style={styles.biensLabel}>Loués</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.biensItem}>
            <Text style={[styles.biensCount, { color: '#22c55e' }]}>{s.biens.libre}</Text>
            <Text style={styles.biensLabel}>Libres</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.biensItem}>
            <Text style={[styles.biensCount, { color: '#f59e0b' }]}>{s.biens.en_travaux}</Text>
            <Text style={styles.biensLabel}>Travaux</Text>
          </View>
        </View>
        <Text style={styles.biensArrow}>Voir les biens ›</Text>
      </TouchableOpacity>

      {/* Contrats & interventions */}
      <View style={styles.infoRow}>
        <TouchableOpacity style={[styles.infoCard, { flex: 1 }]} onPress={() => router.push('/(app)/(tabs)/loyers')}>
          <Text style={styles.infoIcon}>📄</Text>
          <Text style={styles.infoCount}>{s.contrats_actifs}</Text>
          <Text style={styles.infoLabel}>Contrats actifs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.infoCard, { flex: 1 }]} onPress={() => router.push('/(app)/(tabs)/interventions')}>
          <Text style={styles.infoIcon}>🔧</Text>
          <Text style={styles.infoCount}>{s.interventions_ouvertes}</Text>
          <Text style={styles.infoLabel}>Interventions ouvertes</Text>
        </TouchableOpacity>
      </View>

      {/* Actions rapides */}
      <Text style={styles.sectionTitle}>Actions rapides</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(app)/locataires')}>
          <Text style={styles.actionIcon}>👥</Text>
          <Text style={styles.actionLabel}>Locataires</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(app)/contrat/associer')}>
          <Text style={styles.actionIcon}>🔗</Text>
          <Text style={styles.actionLabel}>Nouveau contrat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(app)/bien/nouveau')}>
          <Text style={styles.actionIcon}>🏠</Text>
          <Text style={styles.actionLabel}>Ajouter un bien</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(app)/locataire/nouveau')}>
          <Text style={styles.actionIcon}>➕</Text>
          <Text style={styles.actionLabel}>Nouveau locataire</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  periode: { fontSize: 14, color: '#64748b', marginTop: 2, textTransform: 'capitalize' },
  profileBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center' },
  profileInitiales: { color: '#fff', fontWeight: '700', fontSize: 16 },

  alertCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', borderRadius: 12, padding: 14, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#f59e0b', gap: 12 },
  alertIcon: { fontSize: 24 },
  alertTitle: { fontSize: 15, fontWeight: '700', color: '#92400e' },
  alertSub: { fontSize: 13, color: '#b45309', marginTop: 2 },
  alertArrow: { fontSize: 20, color: '#92400e', fontWeight: '700' },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 8 },

  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  kpiCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  kpiGreen: { backgroundColor: '#dcfce7' },
  kpiBlue: { backgroundColor: '#dbeafe' },
  kpiOrange: { backgroundColor: '#fef3c7' },
  kpiGray: { backgroundColor: '#f1f5f9' },
  kpiValue: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  kpiLabel: { fontSize: 11, color: '#64748b', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },

  biensCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  biensRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14 },
  biensItem: { alignItems: 'center' },
  biensCount: { fontSize: 28, fontWeight: '800', color: '#1e293b' },
  biensLabel: { fontSize: 12, color: '#64748b', marginTop: 2 },
  divider: { width: 1, backgroundColor: '#e2e8f0' },
  biensArrow: { textAlign: 'center', color: '#2563eb', fontSize: 13, fontWeight: '600' },

  infoRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  infoCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  infoIcon: { fontSize: 24, marginBottom: 6 },
  infoCount: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
  infoLabel: { fontSize: 12, color: '#64748b', marginTop: 2, textAlign: 'center' },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: { width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: '#1e293b', textAlign: 'center' },
})
