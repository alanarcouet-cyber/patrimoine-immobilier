import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'
import { TypeLocation, StatutBien, ClasseDPE } from '../../../src/types'

const TYPES: { label: string; value: TypeLocation }[] = [
  { label: 'Nu', value: 'nu' },
  { label: 'Meublé', value: 'meuble' },
  { label: 'Tourisme', value: 'tourisme' },
]

const STATUTS: { label: string; value: StatutBien }[] = [
  { label: 'Libre', value: 'libre' },
  { label: 'Loué', value: 'loue' },
  { label: 'Travaux', value: 'en_travaux' },
  { label: 'En vente', value: 'en_vente' },
]

const DPE: ClasseDPE[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

export default function NouveauBien() {
  const [nom, setNom] = useState('')
  const [adresse, setAdresse] = useState('')
  const [codePostal, setCodePostal] = useState('')
  const [ville, setVille] = useState('')
  const [typeLocation, setTypeLocation] = useState<TypeLocation>('nu')
  const [statut, setStatut] = useState<StatutBien>('libre')
  const [surface, setSurface] = useState('')
  const [nbPieces, setNbPieces] = useState('')
  const [dpe, setDpe] = useState<ClasseDPE | ''>('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!nom || !adresse || !codePostal || !ville) {
      Alert.alert('Erreur', 'Nom, adresse, code postal et ville sont obligatoires')
      return
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('biens').insert({
      nom,
      adresse,
      code_postal: codePostal,
      ville,
      type_location: typeLocation,
      statut,
      surface_m2: surface ? parseFloat(surface) : null,
      nb_pieces: nbPieces ? parseInt(nbPieces) : null,
      classe_dpe: dpe || null,
      description: description || null,
      bailleur_id: user!.id,
    })
    setLoading(false)
    if (error) {
      Alert.alert('Erreur', error.message)
    } else {
      router.back()
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.section}>Informations générales</Text>

      <Text style={styles.label}>Nom du bien *</Text>
      <TextInput style={styles.input} value={nom} onChangeText={setNom} placeholder="Ex: Appartement Centre-ville" />

      <Text style={styles.label}>Adresse *</Text>
      <TextInput style={styles.input} value={adresse} onChangeText={setAdresse} placeholder="12 rue des Fleurs" />

      <View style={styles.row}>
        <View style={styles.flex1}>
          <Text style={styles.label}>Code postal *</Text>
          <TextInput style={styles.input} value={codePostal} onChangeText={setCodePostal} keyboardType="numeric" placeholder="75001" />
        </View>
        <View style={[styles.flex2, { marginLeft: 8 }]}>
          <Text style={styles.label}>Ville *</Text>
          <TextInput style={styles.input} value={ville} onChangeText={setVille} placeholder="Paris" />
        </View>
      </View>

      <Text style={styles.section}>Type de location</Text>
      <View style={styles.chips}>
        {TYPES.map(t => (
          <TouchableOpacity
            key={t.value}
            style={[styles.chip, typeLocation === t.value && styles.chipActive]}
            onPress={() => setTypeLocation(t.value)}
          >
            <Text style={[styles.chipText, typeLocation === t.value && styles.chipTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.section}>Statut</Text>
      <View style={styles.chips}>
        {STATUTS.map(s => (
          <TouchableOpacity
            key={s.value}
            style={[styles.chip, statut === s.value && styles.chipActive]}
            onPress={() => setStatut(s.value)}
          >
            <Text style={[styles.chipText, statut === s.value && styles.chipTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.section}>Caractéristiques</Text>
      <View style={styles.row}>
        <View style={styles.flex1}>
          <Text style={styles.label}>Surface (m²)</Text>
          <TextInput style={styles.input} value={surface} onChangeText={setSurface} keyboardType="decimal-pad" placeholder="65" />
        </View>
        <View style={[styles.flex1, { marginLeft: 8 }]}>
          <Text style={styles.label}>Nb pièces</Text>
          <TextInput style={styles.input} value={nbPieces} onChangeText={setNbPieces} keyboardType="numeric" placeholder="3" />
        </View>
      </View>

      <Text style={styles.label}>Classe DPE</Text>
      <View style={styles.chips}>
        {DPE.map(d => (
          <TouchableOpacity
            key={d}
            style={[styles.chip, dpe === d && styles.chipActive]}
            onPress={() => setDpe(dpe === d ? '' : d)}
          >
            <Text style={[styles.chipText, dpe === d && styles.chipTextActive]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={description}
        onChangeText={setDescription}
        placeholder="Notes sur le bien..."
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Enregistrement...' : 'Enregistrer le bien'}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  section: { fontSize: 14, fontWeight: '700', color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 20, marginBottom: 10 },
  label: { fontSize: 13, color: '#64748b', marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 8, padding: 12, fontSize: 15, color: '#1e293b',
  },
  textarea: { height: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
  },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 14, color: '#64748b' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  button: {
    backgroundColor: '#2563eb', borderRadius: 10, padding: 16,
    alignItems: 'center', marginTop: 24,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
