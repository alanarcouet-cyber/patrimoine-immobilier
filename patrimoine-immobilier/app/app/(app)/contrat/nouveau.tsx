import { useEffect, useRef, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'
import { TypeLocation, StatutContrat } from '../../../src/types'

const TYPES: { label: string; value: TypeLocation }[] = [
  { label: 'Location nue', value: 'nu' },
  { label: 'Meublée', value: 'meuble' },
  { label: 'Tourisme', value: 'tourisme' },
]

// ── Helpers date ─────────────────────────────────────────────────────────────

function dateVersISO(dd_mm_yyyy: string): string | null {
  const chiffres = dd_mm_yyyy.replace(/\D/g, '')
  if (chiffres.length !== 8) return null
  const j = chiffres.slice(0, 2), m = chiffres.slice(2, 4), a = chiffres.slice(4, 8)
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
  const chiffres = raw.replace(/\D/g, '')
  if (chiffres.length === 0) return ''
  let result = chiffres
  if (chiffres.length > 2) result = chiffres.slice(0, 2) + '/' + chiffres.slice(2)
  if (chiffres.length > 4) result = chiffres.slice(0, 2) + '/' + chiffres.slice(2, 4) + '/' + chiffres.slice(4, 8)
  if (prev.endsWith('/') && raw.length < prev.length) return result.slice(0, -1)
  return result
}

// ─────────────────────────────────────────────────────────────────────────────

export default function NouveauContrat() {
  const { id, bien_id: bienIdParam, locataire_id: locataireIdParam } = useLocalSearchParams<{
    id?: string; bien_id?: string; locataire_id?: string
  }>()
  const isEditing = !!id

  const [loadingData, setLoadingData] = useState(isEditing)
  const [loading, setLoading] = useState(false)
  const [biens, setBiens] = useState<{ id: string; nom: string; type_location: string }[]>([])
  const [locataires, setLocataires] = useState<{ id: string; nom: string; prenom: string }[]>([])

  const [bienId, setBienId] = useState(bienIdParam ?? '')
  const [locataireIds, setLocataireIds] = useState<string[]>(
    locataireIdParam ? [locataireIdParam] : []
  )
  const [typeLocation, setTypeLocation] = useState<TypeLocation>('nu')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [loyerHc, setLoyerHc] = useState('')
  const [charges, setCharges] = useState('')
  const [depotGarantie, setDepotGarantie] = useState('')
  const [statut, setStatut] = useState<StatutContrat>('actif')

  const prevDebut = useRef('')
  const prevFin = useRef('')

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
    const [{ data: c }, { data: cl }] = await Promise.all([
      supabase.from('contrats').select('*').eq('id', id).single(),
      supabase.from('contrat_locataires').select('locataire_id').eq('contrat_id', id),
    ])
    if (c) {
      setBienId(c.bien_id)
      setTypeLocation(c.type_location)
      setDateDebut(dateVersFR(c.date_debut ?? ''))
      setDateFin(dateVersFR(c.date_fin ?? ''))
      setLoyerHc(c.loyer_hc?.toString() ?? '')
      setCharges(c.charges?.toString() ?? '')
      setDepotGarantie(c.depot_garantie?.toString() ?? '')
      setStatut(c.statut)
    }
    if (cl && cl.length > 0) {
      setLocataireIds(cl.map(r => r.locataire_id))
    } else if (c?.locataire_id) {
      setLocataireIds([c.locataire_id])
    }
    setLoadingData(false)
  }

  function toggleLocataire(lid: string) {
    setLocataireIds(prev =>
      prev.includes(lid) ? prev.filter(x => x !== lid) : [...prev, lid]
    )
  }

  function handleDebutChange(raw: string) {
    const formatted = formatDateSaisie(raw, prevDebut.current)
    prevDebut.current = formatted
    setDateDebut(formatted)
  }

  function handleFinChange(raw: string) {
    const formatted = formatDateSaisie(raw, prevFin.current)
    prevFin.current = formatted
    setDateFin(formatted)
  }

  async function handleSave() {
    if (!bienId || locataireIds.length === 0 || !dateDebut || !loyerHc) {
      Alert.alert('Erreur', 'Bien, au moins un locataire, date de début et loyer HC sont obligatoires')
      return
    }

    const debutISO = dateVersISO(dateDebut)
    if (!debutISO) { Alert.alert('Erreur', 'Date de début invalide (JJ/MM/AAAA)'); return }
    const finISO = dateFin ? dateVersISO(dateFin) : null
    if (dateFin && !finISO) { Alert.alert('Erreur', 'Date de fin invalide (JJ/MM/AAAA)'); return }

    setLoading(true)
    const payload = {
      bien_id: bienId,
      locataire_id: locataireIds[0],  // locataire principal
      type_location: typeLocation,
      date_debut: debutISO,
      date_fin: finISO,
      loyer_hc: parseFloat(loyerHc),
      charges: parseFloat(charges || '0'),
      depot_garantie: depotGarantie ? parseFloat(depotGarantie) : null,
      statut,
    }

    if (isEditing) {
      const { error } = await supabase.from('contrats').update(payload).eq('id', id)
      if (error) { setLoading(false); Alert.alert('Erreur', error.message); return }
      // Remplace les locataires dans la junction table
      await supabase.from('contrat_locataires').delete().eq('contrat_id', id)
      await supabase.from('contrat_locataires').insert(
        locataireIds.map((lid, i) => ({ contrat_id: id, locataire_id: lid, is_principal: i === 0 }))
      )
      setLoading(false)
      router.back()
    } else {
      const { data: created, error } = await supabase
        .from('contrats').insert(payload).select('id').single()
      if (error || !created) { setLoading(false); Alert.alert('Erreur', error?.message ?? 'Erreur'); return }
      await supabase.from('contrat_locataires').insert(
        locataireIds.map((lid, i) => ({ contrat_id: created.id, locataire_id: lid, is_principal: i === 0 }))
      )
      setLoading(false)
      router.back()
    }
  }

  if (loadingData) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <Text style={styles.section}>Bien *</Text>
      <View style={styles.selectList}>
        {biens.map(b => (
          <TouchableOpacity
            key={b.id}
            style={[styles.selectItem, bienId === b.id && styles.selectItemActive]}
            onPress={() => { setBienId(b.id); setTypeLocation(b.type_location as TypeLocation) }}
          >
            <Text style={[styles.selectTxt, bienId === b.id && styles.selectTxtActive]} numberOfLines={1}>
              {b.nom}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.section}>Locataire(s) *</Text>
      {locataireIds.length > 0 && (
        <Text style={styles.locHint}>
          {locataireIds.length} sélectionné{locataireIds.length > 1 ? 's' : ''} · premier = titulaire principal
        </Text>
      )}
      <View style={styles.selectList}>
        {locataires.map(l => {
          const selected = locataireIds.includes(l.id)
          const index = locataireIds.indexOf(l.id)
          return (
            <TouchableOpacity
              key={l.id}
              style={[styles.selectItem, selected && styles.selectItemActive]}
              onPress={() => toggleLocataire(l.id)}
            >
              {selected && index === 0 && (
                <Text style={styles.principalBadge}>★ </Text>
              )}
              <Text style={[styles.selectTxt, selected && styles.selectTxtActive]}>
                {l.prenom} {l.nom}
              </Text>
            </TouchableOpacity>
          )
        })}
        {locataires.length === 0 && (
          <TouchableOpacity onPress={() => router.push('/(app)/locataire/nouveau')}>
            <Text style={styles.addLink}>+ Créer un locataire d'abord</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.section}>Type de location</Text>
      <View style={styles.chips}>
        {TYPES.map(t => (
          <TouchableOpacity
            key={t.value}
            style={[styles.chip, typeLocation === t.value && styles.chipActive]}
            onPress={() => setTypeLocation(t.value)}
          >
            <Text style={[styles.chipTxt, typeLocation === t.value && styles.chipTxtActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.section}>Durée</Text>
      <View style={styles.row}>
        <View style={styles.flex1}>
          <Text style={styles.label}>Début *</Text>
          <TextInput
            style={styles.input}
            value={dateDebut}
            onChangeText={handleDebutChange}
            placeholder="JJ/MM/AAAA"
            keyboardType="numeric"
            maxLength={10}
          />
        </View>
        <View style={[styles.flex1, { marginLeft: 8 }]}>
          <Text style={styles.label}>Fin (optionnel)</Text>
          <TextInput
            style={styles.input}
            value={dateFin}
            onChangeText={handleFinChange}
            placeholder="JJ/MM/AAAA"
            keyboardType="numeric"
            maxLength={10}
          />
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
        <Text style={styles.buttonTxt}>
          {loading ? 'Enregistrement...' : isEditing ? 'Enregistrer les modifications' : 'Créer le contrat'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  section: { fontSize: 13, fontWeight: '700', color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 20, marginBottom: 6 },
  locHint: { fontSize: 12, color: '#64748b', marginBottom: 8, fontStyle: 'italic' },
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
  selectItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  selectItemActive: { backgroundColor: '#dbeafe', borderColor: '#2563eb' },
  selectTxt: { fontSize: 13, color: '#64748b' },
  selectTxtActive: { color: '#1d4ed8', fontWeight: '600' },
  principalBadge: { fontSize: 11, color: '#2563eb', fontWeight: '700' },
  addLink: { color: '#2563eb', fontSize: 14, fontWeight: '600', padding: 8 },
  button: { backgroundColor: '#2563eb', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 24 },
  buttonTxt: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
