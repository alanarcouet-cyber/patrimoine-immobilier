import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'

const STATUT_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  planifie:  { color: '#2563eb', bg: '#dbeafe', label: 'Planifié' },
  en_cours:  { color: '#d97706', bg: '#fef3c7', label: 'En cours' },
  termine:   { color: '#16a34a', bg: '#dcfce7', label: 'Terminé' },
  annule:    { color: '#64748b', bg: '#f1f5f9', label: 'Annulé' },
}

const TYPE_LABELS: Record<string, string> = {
  entretien: '🔧 Entretien', reparation: '🔨 Réparation',
  renovation: '🏗️ Rénovation', sinistre: '⚠️ Sinistre',
}

const STATUT_NEXT: Record<string, { label: string; value: string }> = {
  planifie:  { label: 'Démarrer', value: 'en_cours' },
  en_cours:  { label: 'Marquer terminé', value: 'termine' },
}

function formatDate(d?: string) {
  if (!d) return '—'
  const [a, m, j] = d.split('-')
  return `${j}/${m}/${a}`
}

export default function InterventionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (id) fetch() }, [id])

  async function fetch() {
    const { data: d } = await supabase
      .from('interventions')
      .select('*, biens(nom, ville)')
      .eq('id', id)
      .single()
    setData(d)
    setLoading(false)
  }

  async function handleStatutChange(newStatut: string) {
    await supabase.from('interventions').update({ statut: newStatut }).eq('id', id)
    setData((prev: any) => ({ ...prev, statut: newStatut }))
  }

  async function handleDelete() {
    Alert.alert('Supprimer', `Supprimer "${data?.titre}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        await supabase.from('interventions').delete().eq('id', id)
        router.back()
      }}
    ])
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />
  if (!data) return <View style={styles.container}><Text style={{ padding: 24 }}>Introuvable</Text></View>

  const cfg = STATUT_CONFIG[data.statut] ?? STATUT_CONFIG.planifie
  const next = STATUT_NEXT[data.statut]

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.titre}>{data.titre}</Text>
          <Text style={styles.type}>{TYPE_LABELS[data.type]}</Text>
          <Text style={styles.bien}>{data.biens?.nom} — {data.biens?.ville}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.badgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      {next && (
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleStatutChange(next.value)}>
          <Text style={styles.actionBtnTxt}>{next.label}</Text>
        </TouchableOpacity>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Dates</Text>
        <View style={styles.row}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Planifiée</Text>
            <Text style={styles.infoValue}>{formatDate(data.date_planifiee)}</Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Réalisée</Text>
            <Text style={styles.infoValue}>{formatDate(data.date_realisee)}</Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Coût</Text>
            <Text style={styles.infoValue}>{data.cout != null ? `${data.cout} €` : '—'}</Text>
          </View>
        </View>
      </View>

      {data.prestataire ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Prestataire</Text>
          <Text style={styles.value}>{data.prestataire}</Text>
        </View>
      ) : null}

      {data.description ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.value}>{data.description}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnEdit} onPress={() => router.push(`/(app)/intervention/nouveau?id=${id}`)}>
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
  titre: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  type: { fontSize: 14, color: '#64748b', marginTop: 2 },
  bien: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 12 },
  badgeTxt: { fontSize: 13, fontWeight: '600' },
  actionBtn: { margin: 12, backgroundColor: '#2563eb', borderRadius: 10, padding: 14, alignItems: 'center' },
  actionBtnTxt: { color: '#fff', fontWeight: '600', fontSize: 15 },
  card: { backgroundColor: '#fff', margin: 12, marginBottom: 0, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  infoBlock: { alignItems: 'center' },
  infoLabel: { fontSize: 12, color: '#94a3b8' },
  infoValue: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginTop: 4 },
  value: { fontSize: 15, color: '#1e293b' },
  actions: { flexDirection: 'row', gap: 10, margin: 12, marginTop: 16 },
  btnEdit: { flex: 1, backgroundColor: '#2563eb', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnEditTxt: { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnDelete: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#fca5a5' },
  btnDeleteTxt: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
})
