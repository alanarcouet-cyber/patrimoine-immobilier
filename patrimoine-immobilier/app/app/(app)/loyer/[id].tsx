import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'

const STATUT_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  paye:       { color: '#16a34a', bg: '#dcfce7', label: 'Payé' },
  en_attente: { color: '#d97706', bg: '#fef3c7', label: 'En attente' },
  partiel:    { color: '#7c3aed', bg: '#ede9fe', label: 'Partiel' },
  impaye:     { color: '#dc2626', bg: '#fee2e2', label: 'Impayé' },
}

const MOIS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function formatMois(mois: string) {
  const [annee, m] = mois.split('-')
  return `${MOIS_FR[parseInt(m) - 1]} ${annee}`
}

function formatDate(d?: string) {
  if (!d) return '—'
  const [a, m, j] = d.split('-')
  return `${j}/${m}/${a}`
}

export default function LoyerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [loyer, setLoyer] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (id) fetch() }, [id])

  async function fetch() {
    const { data } = await supabase
      .from('loyers')
      .select('*, contrats(loyer_hc, charges, biens(nom, ville), locataires(nom, prenom))')
      .eq('id', id)
      .single()
    setLoyer(data)
    setLoading(false)
  }

  async function changerStatut(newStatut: string) {
    const updates: any = { statut: newStatut }
    if (newStatut === 'paye') updates.date_paiement = new Date().toISOString().split('T')[0]
    await supabase.from('loyers').update(updates).eq('id', id)
    setLoyer((prev: any) => ({ ...prev, ...updates }))
  }

  async function handleDelete() {
    Alert.alert('Supprimer', 'Supprimer ce loyer ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        await supabase.from('loyers').delete().eq('id', id)
        router.back()
      }}
    ])
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />
  if (!loyer) return <View style={styles.container}><Text style={{ padding: 24 }}>Loyer introuvable</Text></View>

  const cfg = STATUT_CONFIG[loyer.statut] ?? STATUT_CONFIG.en_attente
  const total = loyer.montant_hc + loyer.charges
  const bien = loyer.contrats?.biens
  const locataire = loyer.contrats?.locataires

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.mois}>{formatMois(loyer.mois)}</Text>
          <Text style={styles.bien}>{bien?.nom} — {bien?.ville}</Text>
          {locataire && <Text style={styles.locataire}>{locataire.prenom} {locataire.nom}</Text>}
        </View>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.badgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total à payer</Text>
        <Text style={styles.totalAmount}>{total.toFixed(2)} €</Text>
        <View style={styles.breakdown}>
          <Text style={styles.breakdownTxt}>Loyer HC : {loyer.montant_hc} €</Text>
          <Text style={styles.breakdownTxt}>Charges : {loyer.charges} €</Text>
        </View>
        {loyer.date_paiement && (
          <Text style={styles.payDate}>Payé le {formatDate(loyer.date_paiement)}</Text>
        )}
      </View>

      {loyer.statut !== 'paye' && (
        <View style={styles.actionsStatut}>
          <Text style={styles.sectionTitle}>Marquer comme</Text>
          <View style={styles.chips}>
            {Object.entries(STATUT_CONFIG).filter(([k]) => k !== loyer.statut).map(([k, v]) => (
              <TouchableOpacity key={k} style={[styles.chip, { backgroundColor: v.bg }]} onPress={() => changerStatut(k)}>
                <Text style={[styles.chipTxt, { color: v.color }]}>{v.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnEdit} onPress={() => router.push(`/(app)/loyer/nouveau?id=${id}`)}>
          <Text style={styles.btnEditTxt}>✏️  Modifier</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnDelete} onPress={handleDelete}>
          <Text style={styles.btnDeleteTxt}>🗑  Supprimer</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  mois: { fontSize: 22, fontWeight: '700', color: '#1e293b' },
  bien: { fontSize: 14, color: '#64748b', marginTop: 4 },
  locataire: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 12 },
  badgeTxt: { fontSize: 13, fontWeight: '600' },
  totalCard: { backgroundColor: '#2563eb', margin: 12, borderRadius: 16, padding: 24, alignItems: 'center' },
  totalLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 4 },
  totalAmount: { color: '#fff', fontSize: 40, fontWeight: '800' },
  breakdown: { flexDirection: 'row', gap: 16, marginTop: 12 },
  breakdownTxt: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  payDate: { color: '#bfdbfe', fontSize: 13, marginTop: 8 },
  actionsStatut: { backgroundColor: '#fff', margin: 12, marginBottom: 0, borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  chipTxt: { fontSize: 14, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, margin: 12, marginTop: 16 },
  btnEdit: { flex: 1, backgroundColor: '#2563eb', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnEditTxt: { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnDelete: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#fca5a5' },
  btnDeleteTxt: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
})
