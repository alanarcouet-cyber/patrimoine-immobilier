import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'

const STATUT_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  actif:      { color: '#16a34a', bg: '#dcfce7', label: 'Actif' },
  resilie:    { color: '#64748b', bg: '#f1f5f9', label: 'Résilié' },
  en_attente: { color: '#d97706', bg: '#fef3c7', label: 'En attente' },
}

const LOYER_CONFIG: Record<string, { color: string; label: string }> = {
  paye:       { color: '#16a34a', label: 'Payé' },
  en_attente: { color: '#d97706', label: 'En attente' },
  partiel:    { color: '#7c3aed', label: 'Partiel' },
  impaye:     { color: '#dc2626', label: 'Impayé' },
}

const MOIS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

function formatDate(d?: string) {
  if (!d) return '—'
  const [a, m, j] = d.split('-')
  return `${j}/${m}/${a}`
}

function formatMois(mois: string) {
  const [annee, m] = mois.split('-')
  return `${MOIS_FR[parseInt(m) - 1]} ${annee}`
}

export default function ContratDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [contrat, setContrat] = useState<any>(null)
  const [loyers, setLoyers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (id) fetchAll() }, [id])

  async function fetchAll() {
    const [{ data: c }, { data: l }, { data: cl }] = await Promise.all([
      supabase.from('contrats').select('*, biens(nom, ville), locataires(nom, prenom, email, telephone)').eq('id', id).single(),
      supabase.from('loyers').select('*').eq('contrat_id', id).order('mois', { ascending: false }),
      supabase.from('contrat_locataires').select('locataire_id, is_principal, locataires(nom, prenom, email, telephone)').eq('contrat_id', id),
    ])
    setContrat(c ? { ...c, coLocataires: cl ?? [] } : null)
    setLoyers(l ?? [])
    setLoading(false)
  }

  async function genererLoyer() {
    if (!contrat) return
    const maintenant = new Date()
    const mois = `${maintenant.getFullYear()}-${String(maintenant.getMonth() + 1).padStart(2, '0')}`
    const existe = loyers.find(l => l.mois === mois)
    if (existe) { Alert.alert('Info', 'Le loyer de ce mois est déjà généré'); return }
    const { error } = await supabase.from('loyers').insert({
      contrat_id: id, mois,
      montant_hc: contrat.loyer_hc, charges: contrat.charges,
      statut: 'en_attente',
    })
    if (error) Alert.alert('Erreur', error.message)
    else fetchAll()
  }

  async function marquerPaye(loyerId: string) {
    await supabase.from('loyers').update({ statut: 'paye', date_paiement: new Date().toISOString().split('T')[0] }).eq('id', loyerId)
    fetchAll()
  }

  async function handleDelete() {
    Alert.alert('Résilier le contrat', 'Marquer ce contrat comme résilié ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Résilier', style: 'destructive', onPress: async () => {
        await supabase.from('contrats').update({ statut: 'resilie' }).eq('id', id)
        setContrat((prev: any) => ({ ...prev, statut: 'resilie' }))
      }}
    ])
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />
  if (!contrat) return <View style={styles.container}><Text style={{ padding: 24 }}>Contrat introuvable</Text></View>

  const cfg = STATUT_CONFIG[contrat.statut] ?? STATUT_CONFIG.en_attente
  const loyerTotal = contrat.loyer_hc + contrat.charges

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bienNom}>{contrat.biens?.nom}</Text>
          <Text style={styles.locataireName}>{contrat.locataires?.prenom} {contrat.locataires?.nom}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.badgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Détails du contrat</Text>
        <View style={styles.grid}>
          <View style={styles.gridItem}><Text style={styles.gridLabel}>Début</Text><Text style={styles.gridValue}>{formatDate(contrat.date_debut)}</Text></View>
          <View style={styles.gridItem}><Text style={styles.gridLabel}>Fin</Text><Text style={styles.gridValue}>{contrat.date_fin ? formatDate(contrat.date_fin) : 'En cours'}</Text></View>
          <View style={styles.gridItem}><Text style={styles.gridLabel}>Loyer HC</Text><Text style={styles.gridValue}>{contrat.loyer_hc} €</Text></View>
          <View style={styles.gridItem}><Text style={styles.gridLabel}>Charges</Text><Text style={styles.gridValue}>{contrat.charges} €</Text></View>
          <View style={styles.gridItem}><Text style={styles.gridLabel}>Total CC</Text><Text style={[styles.gridValue, { color: '#2563eb' }]}>{loyerTotal} €</Text></View>
          {contrat.depot_garantie && <View style={styles.gridItem}><Text style={styles.gridLabel}>DG</Text><Text style={styles.gridValue}>{contrat.depot_garantie} €</Text></View>}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Locataire{contrat.coLocataires?.length > 1 ? 's' : ''}
        </Text>
        {(contrat.coLocataires?.length > 0 ? contrat.coLocataires : contrat.locataires ? [{ locataire_id: contrat.locataire_id, is_principal: true, locataires: contrat.locataires }] : []).map((cl: any, idx: number) => (
          <View key={cl.locataire_id ?? idx} style={idx > 0 ? styles.coLocRow : undefined}>
            <TouchableOpacity onPress={() => router.push(`/(app)/locataire/${cl.locataire_id}`)}>
              <Text style={styles.link}>
                {cl.is_principal ? '★ ' : ''}{cl.locataires?.prenom} {cl.locataires?.nom} →
              </Text>
            </TouchableOpacity>
            {cl.locataires?.email && <Text style={styles.meta}>✉️  {cl.locataires.email}</Text>}
            {cl.locataires?.telephone && <Text style={styles.meta}>📞  {cl.locataires.telephone}</Text>}
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>Loyers ({loyers.length})</Text>
          {contrat.statut === 'actif' && (
            <TouchableOpacity onPress={genererLoyer}>
              <Text style={styles.addLink}>+ Générer ce mois</Text>
            </TouchableOpacity>
          )}
        </View>
        {loyers.length === 0 && <Text style={styles.empty}>Aucun loyer généré</Text>}
        {loyers.map(l => {
          const lCfg = LOYER_CONFIG[l.statut] ?? LOYER_CONFIG.en_attente
          return (
            <View key={l.id} style={styles.loyerRow}>
              <Text style={styles.loyerMois}>{formatMois(l.mois)}</Text>
              <Text style={styles.loyerMontant}>{(l.montant_hc + l.charges).toFixed(0)} €</Text>
              <Text style={[styles.loyerStatut, { color: lCfg.color }]}>{lCfg.label}</Text>
              {l.statut !== 'paye' && (
                <TouchableOpacity style={styles.payerBtn} onPress={() => marquerPaye(l.id)}>
                  <Text style={styles.payerBtnTxt}>Payé</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        })}
      </View>

      <TouchableOpacity style={styles.btnDocs} onPress={() => router.push(`/(app)/contrat/documents?id=${id}`)}>
        <Text style={styles.btnDocsTxt}>📁  Documents & Pièces jointes</Text>
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnEdit} onPress={() => router.push(`/(app)/contrat/nouveau?id=${id}`)}>
          <Text style={styles.btnEditTxt}>✏️  Modifier</Text>
        </TouchableOpacity>
        {contrat.statut === 'actif' && (
          <TouchableOpacity style={styles.btnDelete} onPress={handleDelete}>
            <Text style={styles.btnDeleteTxt}>⛔ Résilier</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  bienNom: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  locataireName: { fontSize: 14, color: '#64748b', marginTop: 4 },
  coLocRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 12 },
  badgeTxt: { fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: '#fff', margin: 12, marginBottom: 0, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.5 },
  addLink: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  gridItem: { minWidth: '30%' },
  gridLabel: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' },
  gridValue: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginTop: 2 },
  link: { fontSize: 15, color: '#2563eb', fontWeight: '600', marginBottom: 6 },
  meta: { fontSize: 14, color: '#64748b', marginTop: 4 },
  empty: { fontSize: 14, color: '#94a3b8', fontStyle: 'italic' },
  loyerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', gap: 10 },
  loyerMois: { flex: 1, fontSize: 14, color: '#1e293b' },
  loyerMontant: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  loyerStatut: { fontSize: 13, fontWeight: '600', minWidth: 70, textAlign: 'right' },
  payerBtn: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  payerBtnTxt: { color: '#16a34a', fontSize: 12, fontWeight: '600' },
  btnDocs: { backgroundColor: '#1e293b', borderRadius: 10, padding: 14, alignItems: 'center', margin: 12, marginBottom: 0 },
  btnDocsTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  actions: { flexDirection: 'row', gap: 10, margin: 12, marginTop: 10 },
  btnEdit: { flex: 1, backgroundColor: '#2563eb', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnEditTxt: { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnDelete: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#fca5a5' },
  btnDeleteTxt: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
})
