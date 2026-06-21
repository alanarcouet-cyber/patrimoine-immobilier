import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'

const STATUTS = [
  { label: 'En attente', value: 'en_attente' },
  { label: 'Payé', value: 'paye' },
  { label: 'Partiel', value: 'partiel' },
  { label: 'Impayé', value: 'impaye' },
]

export default function NouveauLoyer() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const isEditing = !!id
  const [loadingData, setLoadingData] = useState(isEditing)
  const [loading, setLoading] = useState(false)
  const [contrats, setContrats] = useState<{ id: string; label: string }[]>([])

  const [contratId, setContratId] = useState('')
  const [mois, setMois] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [montantHc, setMontantHc] = useState('')
  const [charges, setCharges] = useState('')
  const [statut, setStatut] = useState('en_attente')
  const [datePaiement, setDatePaiement] = useState('')

  useEffect(() => {
    fetchContrats()
    if (isEditing) fetchLoyer()
  }, [])

  async function fetchContrats() {
    const { data } = await supabase
      .from('contrats')
      .select('id, loyer_hc, charges, biens(nom), locataires(nom, prenom)')
      .eq('statut', 'actif')
    setContrats((data ?? []).map((c: any) => ({
      id: c.id,
      label: `${c.biens?.nom} — ${c.locataires?.prenom} ${c.locataires?.nom} (${c.loyer_hc + c.charges} €)`,
    })))
  }

  async function fetchLoyer() {
    const { data } = await supabase.from('loyers').select('*').eq('id', id).single()
    if (data) {
      setContratId(data.contrat_id)
      setMois(data.mois)
      setMontantHc(data.montant_hc?.toString())
      setCharges(data.charges?.toString())
      setStatut(data.statut)
      setDatePaiement(data.date_paiement ?? '')
    }
    setLoadingData(false)
  }

  async function handleSave() {
    if (!contratId || !mois || !montantHc) {
      Alert.alert('Erreur', 'Contrat, mois et montant HC sont obligatoires')
      return
    }
    setLoading(true)
    const payload = {
      contrat_id: contratId, mois,
      montant_hc: parseFloat(montantHc), charges: parseFloat(charges || '0'),
      statut, date_paiement: datePaiement || null,
    }
    const { error } = isEditing
      ? await supabase.from('loyers').update(payload).eq('id', id)
      : await supabase.from('loyers').insert(payload)
    setLoading(false)
    if (error) Alert.alert('Erreur', error.message)
    else router.back()
  }

  if (loadingData) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.section}>Contrat *</Text>
      <View style={styles.selectList}>
        {contrats.map(c => (
          <TouchableOpacity key={c.id} style={[styles.selectItem, contratId === c.id && styles.selectItemActive]} onPress={() => setContratId(c.id)}>
            <Text style={[styles.selectTxt, contratId === c.id && styles.selectTxtActive]} numberOfLines={2}>{c.label}</Text>
          </TouchableOpacity>
        ))}
        {contrats.length === 0 && <Text style={styles.empty}>Aucun contrat actif trouvé</Text>}
      </View>

      <Text style={styles.section}>Période</Text>
      <TextInput style={styles.input} value={mois} onChangeText={setMois} placeholder="AAAA-MM" />

      <Text style={styles.section}>Montants</Text>
      <View style={styles.row}>
        <View style={styles.flex1}>
          <Text style={styles.label}>Loyer HC (€) *</Text>
          <TextInput style={styles.input} value={montantHc} onChangeText={setMontantHc} keyboardType="decimal-pad" placeholder="800" />
        </View>
        <View style={[styles.flex1, { marginLeft: 8 }]}>
          <Text style={styles.label}>Charges (€)</Text>
          <TextInput style={styles.input} value={charges} onChangeText={setCharges} keyboardType="decimal-pad" placeholder="50" />
        </View>
      </View>

      <Text style={styles.section}>Statut</Text>
      <View style={styles.chips}>
        {STATUTS.map(s => (
          <TouchableOpacity key={s.value} style={[styles.chip, statut === s.value && styles.chipActive]} onPress={() => setStatut(s.value)}>
            <Text style={[styles.chipTxt, statut === s.value && styles.chipTxtActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {(statut === 'paye' || statut === 'partiel') && (
        <>
          <Text style={styles.label}>Date de paiement</Text>
          <TextInput style={styles.input} value={datePaiement} onChangeText={setDatePaiement} placeholder="AAAA-MM-JJ" />
        </>
      )}

      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
        <Text style={styles.buttonTxt}>{loading ? 'Enregistrement...' : isEditing ? 'Enregistrer les modifications' : 'Créer le loyer'}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  section: { fontSize: 13, fontWeight: '700', color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 20, marginBottom: 10 },
  label: { fontSize: 13, color: '#64748b', marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 15, color: '#1e293b' },
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipTxt: { fontSize: 14, color: '#64748b' },
  chipTxtActive: { color: '#fff', fontWeight: '600' },
  selectList: { gap: 8 },
  selectItem: { padding: 12, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  selectItemActive: { backgroundColor: '#dbeafe', borderColor: '#2563eb' },
  selectTxt: { fontSize: 13, color: '#64748b' },
  selectTxtActive: { color: '#1d4ed8', fontWeight: '600' },
  empty: { fontSize: 14, color: '#94a3b8', fontStyle: 'italic', padding: 8 },
  button: { backgroundColor: '#2563eb', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 24 },
  buttonTxt: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
