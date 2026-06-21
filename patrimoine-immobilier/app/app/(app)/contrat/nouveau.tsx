import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'
import { TypeLocation, StatutContrat } from '../../../src/types'

const TYPES: { label: string; value: TypeLocation }[] = [
  { label: 'Location nue', value: 'nu' },
  { label: 'Meublée', value: 'meuble' },
  { label: 'Tourisme', value: 'tourisme' },
]

export default function NouveauContrat() {
  const { id, bien_id: bienIdParam, locataire_id: locataireIdParam } = useLocalSearchParams<{ id?: string; bien_id?: string; locataire_id?: string }>()
  const isEditing = !!id
  const [loadingData, setLoadingData] = useState(isEditing)
  const [loading, setLoading] = useState(false)
  const [biens, setBiens] = useState<{ id: string; nom: string; type_location: string }[]>([])
  const [locataires, setLocataires] = useState<{ id: string; nom: string; prenom: string }[]>([])

  const [bienId, setBienId] = useState(bienIdParam ?? '')
  const [locataireId, setLocataireId] = useState(locataireIdParam ?? '')
  const [typeLocation, setTypeLocation] = useState<TypeLocation>('nu')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [loyerHc, setLoyerHc] = useState('')
  const [charges, setCharges] = useState('')
  const [depotGarantie, setDepotGarantie] = useState('')
  const [statut, setStatut] = useState<StatutContrat>('actif')

  useEffect(() => {
    fetchRefs()
    if (isEditing) fetchContrat()
  }, [])

  async function fetchRefs() {
    const [{ data: b }, { data: l }] = await Promise.all([
      supabase.from('biens').select('id, nom, type_location').order('nom'),
      supabase.from('locataires').select('id, nom, prenom').order('nom'),
    ])
    setBiens(b ?? [])
    setLocataires(l ?? [])
  }

  async function fetchContrat() {
    const { data } = await supabase.from('contrats').select('*').eq('id', id).single()
    if (data) {
      setBienId(data.bien_id)
      setLocataireId(data.locataire_id)
      setTypeLocation(data.type_location)
      setDateDebut(data.date_debut)
      setDateFin(data.date_fin ?? '')
      setLoyerHc(data.loyer_hc?.toString())
      setCharges(data.charges?.toString())
      setDepotGarantie(data.depot_garantie?.toString() ?? '')
      setStatut(data.statut)
    }
    setLoadingData(false)
  }

  async function handleSave() {
    if (!bienId || !locataireId || !dateDebut || !loyerHc) {
      Alert.alert('Erreur', 'Bien, locataire, date de début et loyer HC sont obligatoires')
      return
    }
    setLoading(true)
    const payload = {
      bien_id: bienId, locataire_id: locataireId, type_location: typeLocation,
      date_debut: dateDebut, date_fin: dateFin || null,
      loyer_hc: parseFloat(loyerHc), charges: parseFloat(charges || '0'),
      depot_garantie: depotGarantie ? parseFloat(depotGarantie) : null,
      statut,
    }
    const { error } = isEditing
      ? await supabase.from('contrats').update(payload).eq('id', id)
      : await supabase.from('contrats').insert(payload)
    setLoading(false)
    if (error) Alert.alert('Erreur', error.message)
    else router.back()
  }

  if (loadingData) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <Text style={styles.section}>Bien *</Text>
      <View style={styles.selectList}>
        {biens.map(b => (
          <TouchableOpacity key={b.id} style={[styles.selectItem, bienId === b.id && styles.selectItemActive]} onPress={() => { setBienId(b.id); setTypeLocation(b.type_location as TypeLocation) }}>
            <Text style={[styles.selectTxt, bienId === b.id && styles.selectTxtActive]} numberOfLines={1}>{b.nom}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.section}>Locataire *</Text>
      <View style={styles.selectList}>
        {locataires.map(l => (
          <TouchableOpacity key={l.id} style={[styles.selectItem, locataireId === l.id && styles.selectItemActive]} onPress={() => setLocataireId(l.id)}>
            <Text style={[styles.selectTxt, locataireId === l.id && styles.selectTxtActive]}>{l.prenom} {l.nom}</Text>
          </TouchableOpacity>
        ))}
        {locataires.length === 0 && (
          <TouchableOpacity onPress={() => router.push('/(app)/locataire/nouveau')}>
            <Text style={styles.addLink}>+ Créer un locataire d'abord</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.section}>Type de location</Text>
      <View style={styles.chips}>
        {TYPES.map(t => (
          <TouchableOpacity key={t.value} style={[styles.chip, typeLocation === t.value && styles.chipActive]} onPress={() => setTypeLocation(t.value)}>
            <Text style={[styles.chipTxt, typeLocation === t.value && styles.chipTxtActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.section}>Durée</Text>
      <View style={styles.row}>
        <View style={styles.flex1}>
          <Text style={styles.label}>Début *</Text>
          <TextInput style={styles.input} value={dateDebut} onChangeText={setDateDebut} placeholder="AAAA-MM-JJ" />
        </View>
        <View style={[styles.flex1, { marginLeft: 8 }]}>
          <Text style={styles.label}>Fin (optionnel)</Text>
          <TextInput style={styles.input} value={dateFin} onChangeText={setDateFin} placeholder="AAAA-MM-JJ" />
        </View>
      </View>

      <Text style={styles.section}>Montants</Text>
      <View style={styles.row}>
        <View style={styles.flex1}>
          <Text style={styles.label}>Loyer HC (€) *</Text>
          <TextInput style={styles.input} value={loyerHc} onChangeText={setLoyerHc} keyboardType="decimal-pad" placeholder="800" />
        </View>
        <View style={[styles.flex1, { marginLeft: 8 }]}>
          <Text style={styles.label}>Charges (€)</Text>
          <TextInput style={styles.input} value={charges} onChangeText={setCharges} keyboardType="decimal-pad" placeholder="50" />
        </View>
      </View>

      <Text style={styles.label}>Dépôt de garantie (€)</Text>
      <TextInput style={styles.input} value={depotGarantie} onChangeText={setDepotGarantie} keyboardType="decimal-pad" placeholder="1600" />

      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
        <Text style={styles.buttonTxt}>{loading ? 'Enregistrement...' : isEditing ? 'Enregistrer les modifications' : 'Créer le contrat'}</Text>
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
  selectList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectItem: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  selectItemActive: { backgroundColor: '#dbeafe', borderColor: '#2563eb' },
  selectTxt: { fontSize: 13, color: '#64748b' },
  selectTxtActive: { color: '#1d4ed8', fontWeight: '600' },
  addLink: { color: '#2563eb', fontSize: 14, fontWeight: '600', padding: 8 },
  button: { backgroundColor: '#2563eb', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 24 },
  buttonTxt: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
