import { useEffect, useRef, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'
import { TypeIntervention, StatutIntervention } from '../../../src/types'

const TYPES: { label: string; value: TypeIntervention; icon: string }[] = [
  { label: 'Entretien', value: 'entretien', icon: '🔧' },
  { label: 'Réparation', value: 'reparation', icon: '🔨' },
  { label: 'Rénovation', value: 'renovation', icon: '🏗️' },
  { label: 'Sinistre', value: 'sinistre', icon: '⚠️' },
]

const STATUTS: { label: string; value: StatutIntervention }[] = [
  { label: 'Planifié', value: 'planifie' },
  { label: 'En cours', value: 'en_cours' },
  { label: 'Terminé', value: 'termine' },
  { label: 'Annulé', value: 'annule' },
]

function dateVersISO(dd_mm_yyyy: string): string | null {
  const c = dd_mm_yyyy.replace(/\D/g, '')
  if (c.length !== 8) return null
  const j = c.slice(0, 2), m = c.slice(2, 4), a = c.slice(4, 8)
  const d = new Date(`${a}-${m}-${j}`)
  if (isNaN(d.getTime())) return null
  return `${a}-${m}-${j}`
}

function dateVersFR(iso: string): string {
  if (!iso) return ''
  const [a, m, j] = iso.split('-')
  return `${j}/${m}/${a}`
}

function formatDateSaisie(raw: string, prev: string): string {
  const c = raw.replace(/\D/g, '')
  if (!c.length) return ''
  let r = c
  if (c.length > 2) r = c.slice(0, 2) + '/' + c.slice(2)
  if (c.length > 4) r = c.slice(0, 2) + '/' + c.slice(2, 4) + '/' + c.slice(4, 8)
  if (prev.endsWith('/') && raw.length < prev.length) return r.slice(0, -1)
  return r
}

export default function NouvelleIntervention() {
  const { id, bien_id: bienIdParam } = useLocalSearchParams<{ id?: string; bien_id?: string }>()
  const isEditing = !!id

  const [loadingData, setLoadingData] = useState(isEditing)
  const [loading, setLoading] = useState(false)
  const [biens, setBiens] = useState<{ id: string; nom: string }[]>([])

  const [bienId, setBienId] = useState(bienIdParam ?? '')
  const [type, setType] = useState<TypeIntervention>('entretien')
  const [statut, setStatut] = useState<StatutIntervention>('planifie')
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [prestataire, setPrestataire] = useState('')
  const [datePlanifiee, setDatePlanifiee] = useState('')
  const [dateRealisee, setDateRealisee] = useState('')
  const [cout, setCout] = useState('')
  const prevPlanifiee = useRef('')
  const prevRealisee = useRef('')

  useEffect(() => {
    fetchBiens()
    if (isEditing) fetchIntervention()
  }, [])

  async function fetchBiens() {
    const { data } = await supabase.from('biens').select('id, nom').order('nom')
    setBiens(data ?? [])
  }

  async function fetchIntervention() {
    const { data } = await supabase.from('interventions').select('*').eq('id', id).single()
    if (data) {
      setBienId(data.bien_id)
      setType(data.type)
      setStatut(data.statut)
      setTitre(data.titre)
      setDescription(data.description ?? '')
      setPrestataire(data.prestataire ?? '')
      setDatePlanifiee(dateVersFR(data.date_planifiee ?? ''))
      setDateRealisee(dateVersFR(data.date_realisee ?? ''))
      setCout(data.cout?.toString() ?? '')
    }
    setLoadingData(false)
  }

  function handlePlanifieeChange(raw: string) {
    const f = formatDateSaisie(raw, prevPlanifiee.current)
    prevPlanifiee.current = f
    setDatePlanifiee(f)
  }

  function handleRealiseeChange(raw: string) {
    const f = formatDateSaisie(raw, prevRealisee.current)
    prevRealisee.current = f
    setDateRealisee(f)
  }

  async function handleSave() {
    if (!titre || !bienId) {
      Alert.alert('Erreur', 'Le titre et le bien sont obligatoires')
      return
    }
    const planISO = datePlanifiee ? dateVersISO(datePlanifiee) : null
    if (datePlanifiee && !planISO) { Alert.alert('Erreur', 'Date planifiée invalide (JJ/MM/AAAA)'); return }
    const realISO = dateRealisee ? dateVersISO(dateRealisee) : null
    if (dateRealisee && !realISO) { Alert.alert('Erreur', 'Date réalisée invalide (JJ/MM/AAAA)'); return }

    setLoading(true)
    const payload = {
      bien_id: bienId, type, statut, titre,
      description: description || null,
      prestataire: prestataire || null,
      date_planifiee: planISO,
      date_realisee: realISO,
      cout: cout ? parseFloat(cout) : null,
    }
    const { error } = isEditing
      ? await supabase.from('interventions').update(payload).eq('id', id)
      : await supabase.from('interventions').insert(payload)
    setLoading(false)
    if (error) Alert.alert('Erreur', error.message)
    else router.back()
  }

  if (loadingData) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backTxt}>‹  Retour</Text>
      </TouchableOpacity>

      <Text style={styles.section}>Bien concerné *</Text>
      <View style={styles.select}>
        {biens.map(b => (
          <TouchableOpacity
            key={b.id}
            style={[styles.selectItem, bienId === b.id && styles.selectItemActive]}
            onPress={() => setBienId(b.id)}
          >
            <Text style={[styles.selectTxt, bienId === b.id && styles.selectTxtActive]} numberOfLines={1}>{b.nom}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.section}>Type d'intervention</Text>
      <View style={styles.chips}>
        {TYPES.map(t => (
          <TouchableOpacity key={t.value} style={[styles.chip, type === t.value && styles.chipActive]} onPress={() => setType(t.value)}>
            <Text style={[styles.chipTxt, type === t.value && styles.chipTxtActive]}>{t.icon} {t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.section}>Statut</Text>
      <View style={styles.chips}>
        {STATUTS.map(s => (
          <TouchableOpacity key={s.value} style={[styles.chip, statut === s.value && styles.chipActive]} onPress={() => setStatut(s.value)}>
            <Text style={[styles.chipTxt, statut === s.value && styles.chipTxtActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.section}>Détails</Text>

      <Text style={styles.label}>Titre *</Text>
      <TextInput style={styles.input} value={titre} onChangeText={setTitre} placeholder="Ex: Révision chaudière" />

      <Text style={styles.label}>Description</Text>
      <TextInput style={[styles.input, styles.textarea]} value={description} onChangeText={setDescription} placeholder="Détails de l'intervention..." multiline numberOfLines={3} />

      <Text style={styles.label}>Prestataire</Text>
      <TextInput style={styles.input} value={prestataire} onChangeText={setPrestataire} placeholder="Nom du prestataire" />

      <View style={styles.row}>
        <View style={styles.flex1}>
          <Text style={styles.label}>Date planifiée</Text>
          <TextInput style={styles.input} value={datePlanifiee} onChangeText={handlePlanifieeChange} placeholder="JJ/MM/AAAA" keyboardType="numeric" maxLength={10} />
        </View>
        <View style={[styles.flex1, { marginLeft: 8 }]}>
          <Text style={styles.label}>Date réalisée</Text>
          <TextInput style={styles.input} value={dateRealisee} onChangeText={handleRealiseeChange} placeholder="JJ/MM/AAAA" keyboardType="numeric" maxLength={10} />
        </View>
      </View>

      <Text style={styles.label}>Coût (€)</Text>
      <TextInput style={styles.input} value={cout} onChangeText={setCout} keyboardType="decimal-pad" placeholder="0" />

      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
        <Text style={styles.buttonTxt}>{loading ? 'Enregistrement...' : isEditing ? 'Enregistrer les modifications' : 'Créer l\'intervention'}</Text>
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
  textarea: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipTxt: { fontSize: 14, color: '#64748b' },
  chipTxtActive: { color: '#fff', fontWeight: '600' },
  select: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectItem: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', maxWidth: '48%' },
  selectItemActive: { backgroundColor: '#dbeafe', borderColor: '#2563eb' },
  selectTxt: { fontSize: 13, color: '#64748b' },
  selectTxtActive: { color: '#1d4ed8', fontWeight: '600' },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  backTxt: { fontSize: 16, color: '#2563eb', fontWeight: '500' },
  button: { backgroundColor: '#2563eb', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 24 },
  buttonTxt: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
