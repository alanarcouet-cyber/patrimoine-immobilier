import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'

export default function NouveauLocataire() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const isEditing = !!id
  const [loadingData, setLoadingData] = useState(isEditing)
  const [loading, setLoading] = useState(false)

  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [adresse, setAdresse] = useState('')

  useEffect(() => { if (isEditing) fetchLocataire() }, [])

  async function fetchLocataire() {
    const { data } = await supabase.from('locataires').select('*').eq('id', id).single()
    if (data) {
      setNom(data.nom)
      setPrenom(data.prenom)
      setEmail(data.email ?? '')
      setTelephone(data.telephone ?? '')
      setDateNaissance(data.date_naissance ?? '')
      setAdresse(data.adresse ?? '')
    }
    setLoadingData(false)
  }

  async function handleSave() {
    if (!nom || !prenom) {
      Alert.alert('Erreur', 'Le nom et le prénom sont obligatoires')
      return
    }
    setLoading(true)
    const payload = {
      nom, prenom,
      email: email || null,
      telephone: telephone || null,
      date_naissance: dateNaissance || null,
      adresse: adresse || null,
    }
    const { error } = isEditing
      ? await supabase.from('locataires').update(payload).eq('id', id)
      : await supabase.from('locataires').insert(payload)
    setLoading(false)
    if (error) Alert.alert('Erreur', error.message)
    else router.back()
  }

  if (loadingData) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.section}>Identité</Text>

      <View style={styles.row}>
        <View style={styles.flex1}>
          <Text style={styles.label}>Prénom *</Text>
          <TextInput style={styles.input} value={prenom} onChangeText={setPrenom} placeholder="Jean" />
        </View>
        <View style={[styles.flex1, { marginLeft: 8 }]}>
          <Text style={styles.label}>Nom *</Text>
          <TextInput style={styles.input} value={nom} onChangeText={setNom} placeholder="Dupont" autoCapitalize="characters" />
        </View>
      </View>

      <Text style={styles.label}>Date de naissance</Text>
      <TextInput style={styles.input} value={dateNaissance} onChangeText={setDateNaissance} placeholder="AAAA-MM-JJ" />

      <Text style={styles.section}>Contact</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="jean.dupont@email.fr" keyboardType="email-address" autoCapitalize="none" />

      <Text style={styles.label}>Téléphone</Text>
      <TextInput style={styles.input} value={telephone} onChangeText={setTelephone} placeholder="06 12 34 56 78" keyboardType="phone-pad" />

      <Text style={styles.section}>Adresse personnelle</Text>
      <TextInput style={[styles.input, styles.textarea]} value={adresse} onChangeText={setAdresse} placeholder="Adresse du locataire (si différente du bien)" multiline numberOfLines={3} />

      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
        <Text style={styles.buttonTxt}>{loading ? 'Enregistrement...' : isEditing ? 'Enregistrer les modifications' : 'Ajouter le locataire'}</Text>
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
  button: { backgroundColor: '#2563eb', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 24 },
  buttonTxt: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
