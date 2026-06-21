import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'

const ERREURS: Record<string, string> = {
  'duplicate key': 'Un locataire avec cet email existe déjà.',
  'violates row-level security': 'Accès refusé. Vérifiez votre connexion.',
  'new row violates': 'Données invalides. Vérifiez les champs obligatoires.',
  'null value in column': 'Certains champs obligatoires sont manquants.',
}

function traduireErreur(msg: string): string {
  for (const [cle, val] of Object.entries(ERREURS)) {
    if (msg.toLowerCase().includes(cle.toLowerCase())) return val
  }
  return 'Une erreur est survenue. Veuillez réessayer.'
}

export default function NouveauLocataire() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const isEditing = !!id
  const [loadingData, setLoadingData] = useState(isEditing)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')

  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [adresse, setAdresse] = useState('')

  useEffect(() => { if (isEditing) fetchLocataire() }, [])

  async function fetchLocataire() {
    const { data, error } = await supabase.from('locataires').select('*').eq('id', id).single()
    if (error) { setErreur('Impossible de charger ce locataire.'); setLoadingData(false); return }
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
    setErreur('')
    if (!nom.trim()) { setErreur('Le nom est obligatoire.'); return }
    if (!prenom.trim()) { setErreur('Le prénom est obligatoire.'); return }
    if (email && !email.includes('@')) { setErreur('Adresse email invalide.'); return }
    if (dateNaissance && !/^\d{4}-\d{2}-\d{2}$/.test(dateNaissance)) {
      setErreur('Format de date invalide. Utilisez AAAA-MM-JJ.')
      return
    }

    setLoading(true)
    const payload = {
      nom: nom.trim().toUpperCase(),
      prenom: prenom.trim(),
      email: email.trim() || null,
      telephone: telephone.trim() || null,
      date_naissance: dateNaissance || null,
      adresse: adresse.trim() || null,
    }

    const { error } = isEditing
      ? await supabase.from('locataires').update(payload).eq('id', id)
      : await supabase.from('locataires').insert(payload)

    setLoading(false)
    if (error) {
      setErreur(traduireErreur(error.message))
    } else {
      router.back()
    }
  }

  if (loadingData) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <Text style={styles.section}>Identité</Text>

      <View style={styles.row}>
        <View style={styles.flex1}>
          <Text style={styles.label}>Prénom *</Text>
          <TextInput
            style={[styles.input, !prenom && erreur ? styles.inputErr : null]}
            value={prenom}
            onChangeText={t => { setPrenom(t); setErreur('') }}
            placeholder="Jean"
          />
        </View>
        <View style={[styles.flex1, { marginLeft: 8 }]}>
          <Text style={styles.label}>Nom *</Text>
          <TextInput
            style={[styles.input, !nom && erreur ? styles.inputErr : null]}
            value={nom}
            onChangeText={t => { setNom(t); setErreur('') }}
            placeholder="DUPONT"
            autoCapitalize="characters"
          />
        </View>
      </View>

      <Text style={styles.label}>Date de naissance</Text>
      <TextInput
        style={styles.input}
        value={dateNaissance}
        onChangeText={t => { setDateNaissance(t); setErreur('') }}
        placeholder="AAAA-MM-JJ"
        keyboardType="numbers-and-punctuation"
      />

      <Text style={styles.section}>Contact</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={t => { setEmail(t); setErreur('') }}
        placeholder="jean.dupont@email.fr"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Téléphone</Text>
      <TextInput
        style={styles.input}
        value={telephone}
        onChangeText={setTelephone}
        placeholder="06 12 34 56 78"
        keyboardType="phone-pad"
      />

      <Text style={styles.section}>Adresse personnelle</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={adresse}
        onChangeText={setAdresse}
        placeholder="Adresse du locataire (si différente du bien loué)"
        multiline
        numberOfLines={3}
      />

      {erreur ? (
        <View style={styles.erreurBox}>
          <Text style={styles.erreurTxt}>⚠️  {erreur}</Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
        <Text style={styles.buttonTxt}>
          {loading ? 'Enregistrement...' : isEditing ? 'Enregistrer les modifications' : 'Ajouter le locataire'}
        </Text>
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
  inputErr: { borderColor: '#ef4444' },
  textarea: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
  erreurBox: { backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, marginTop: 12, borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  erreurTxt: { color: '#991b1b', fontSize: 14 },
  button: { backgroundColor: '#2563eb', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 20 },
  buttonTxt: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
