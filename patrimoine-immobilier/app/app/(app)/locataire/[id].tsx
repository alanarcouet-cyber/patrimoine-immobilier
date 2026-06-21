import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'

function formatDate(d?: string) {
  if (!d) return '—'
  const [a, m, j] = d.split('-')
  return `${j}/${m}/${a}`
}

const STATUT_CONTRAT: Record<string, { color: string; bg: string; label: string }> = {
  actif:      { color: '#16a34a', bg: '#dcfce7', label: 'Actif' },
  resilie:    { color: '#64748b', bg: '#f1f5f9', label: 'Résilié' },
  en_attente: { color: '#d97706', bg: '#fef3c7', label: 'En attente' },
}

export default function LocataireDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [locataire, setLocataire] = useState<any>(null)
  const [contrats, setContrats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (id) fetchAll() }, [id])

  async function fetchAll() {
    const [{ data: loc }, { data: cont }] = await Promise.all([
      supabase.from('locataires').select('*').eq('id', id).single(),
      supabase.from('contrats').select('*, biens(nom, ville)').eq('locataire_id', id).order('date_debut', { ascending: false }),
    ])
    setLocataire(loc)
    setContrats(cont ?? [])
    setLoading(false)
  }

  async function handleDelete() {
    Alert.alert('Supprimer', `Supprimer "${locataire?.prenom} ${locataire?.nom}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        await supabase.from('locataires').delete().eq('id', id)
        router.back()
      }}
    ])
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />
  if (!locataire) return <View style={styles.container}><Text style={{ padding: 24 }}>Introuvable</Text></View>

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.avatar}>{locataire.prenom[0]}{locataire.nom[0]}</Text>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.nom}>{locataire.prenom} {locataire.nom}</Text>
          {locataire.date_naissance && (
            <Text style={styles.meta}>Né(e) le {formatDate(locataire.date_naissance)}</Text>
          )}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Contact</Text>
        {locataire.email && <Text style={styles.contactRow}>✉️  {locataire.email}</Text>}
        {locataire.telephone && <Text style={styles.contactRow}>📞  {locataire.telephone}</Text>}
        {locataire.adresse && <Text style={styles.contactRow}>📍  {locataire.adresse}</Text>}
        {!locataire.email && !locataire.telephone && <Text style={styles.empty}>Aucun contact renseigné</Text>}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>Contrats ({contrats.length})</Text>
          <TouchableOpacity onPress={() => router.push(`/(app)/contrat/nouveau?locataire_id=${id}`)}>
            <Text style={styles.addLink}>+ Nouveau contrat</Text>
          </TouchableOpacity>
        </View>
        {contrats.length === 0 && <Text style={styles.empty}>Aucun contrat</Text>}
        {contrats.map(c => {
          const cfg = STATUT_CONTRAT[c.statut] ?? STATUT_CONTRAT.en_attente
          return (
            <TouchableOpacity key={c.id} style={styles.contratRow} onPress={() => router.push(`/(app)/contrat/${c.id}`)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.contratBien}>{c.biens?.nom}</Text>
                <Text style={styles.contratDates}>{formatDate(c.date_debut)} → {c.date_fin ? formatDate(c.date_fin) : 'En cours'}</Text>
                <Text style={styles.contratLoyer}>{(c.loyer_hc + c.charges).toFixed(0)} € / mois</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
                <Text style={[styles.badgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
            </TouchableOpacity>
          )
        })}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnEdit} onPress={() => router.push(`/(app)/locataire/nouveau?id=${id}`)}>
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
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#dbeafe', textAlign: 'center', lineHeight: 56, fontSize: 20, fontWeight: '700', color: '#2563eb' },
  nom: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  meta: { fontSize: 13, color: '#64748b', marginTop: 2 },
  card: { backgroundColor: '#fff', margin: 12, marginBottom: 0, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.5 },
  addLink: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  contactRow: { fontSize: 15, color: '#1e293b', marginBottom: 6 },
  empty: { fontSize: 14, color: '#94a3b8', fontStyle: 'italic' },
  contratRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  contratBien: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  contratDates: { fontSize: 12, color: '#64748b', marginTop: 2 },
  contratLoyer: { fontSize: 13, color: '#2563eb', fontWeight: '600', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginLeft: 8 },
  badgeTxt: { fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, margin: 12, marginTop: 16 },
  btnEdit: { flex: 1, backgroundColor: '#2563eb', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnEditTxt: { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnDelete: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#fca5a5' },
  btnDeleteTxt: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
})
