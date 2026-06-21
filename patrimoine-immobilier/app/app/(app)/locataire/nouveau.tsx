import { useEffect, useRef, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Modal
} from 'react-native'
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

// Convertit JJ/MM/AAAA → AAAA-MM-JJ pour la base de données
function dateVersISO(dd_mm_yyyy: string): string | null {
  const parts = dd_mm_yyyy.replace(/\D/g, '')
  if (parts.length !== 8) return null
  const j = parts.slice(0, 2), m = parts.slice(2, 4), a = parts.slice(4, 8)
  const date = new Date(`${a}-${m}-${j}`)
  if (isNaN(date.getTime())) return null
  return `${a}-${m}-${j}`
}

// Convertit AAAA-MM-JJ → JJ/MM/AAAA pour l'affichage
function dateVersFR(iso: string): string {
  if (!iso) return ''
  const [a, m, j] = iso.split('-')
  return `${j}/${m}/${a}`
}

// Formate la saisie au fil de la frappe : "01" → "01/" puis "01/02" → "01/02/"
function formatDateSaisie(raw: string, prev: string): string {
  const chiffres = raw.replace(/\D/g, '')
  if (chiffres.length === 0) return ''
  let result = chiffres
  if (chiffres.length > 2) result = chiffres.slice(0, 2) + '/' + chiffres.slice(2)
  if (chiffres.length > 4) result = chiffres.slice(0, 2) + '/' + chiffres.slice(2, 4) + '/' + chiffres.slice(4, 8)
  // Si on efface un slash, on recule d'un chiffre aussi
  if (prev.endsWith('/') && raw.length < prev.length) {
    return result.slice(0, -1)
  }
  return result
}

export default function NouveauLocataire() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const isEditing = !!id
  const [loadingData, setLoadingData] = useState(isEditing)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const [succes, setSucces] = useState(false)

  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [dateNaissance, setDateNaissance] = useState('') // format JJ/MM/AAAA
  const [adresse, setAdresse] = useState('')

  const prevDate = useRef('')

  useEffect(() => { if (isEditing) fetchLocataire() }, [])

  async function fetchLocataire() {
    const { data, error } = await supabase.from('locataires').select('*').eq('id', id).single()
    if (error) { setErreur('Impossible de charger ce locataire.'); setLoadingData(false); return }
    if (data) {
      setNom(data.nom)
      setPrenom(data.prenom)
      setEmail(data.email ?? '')
      setTelephone(data.telephone ?? '')
      setDateNaissance(dateVersFR(data.date_naissance ?? ''))
      setAdresse(data.adresse ?? '')
    }
    setLoadingData(false)
  }

  function handleDateChange(raw: string) {
    const formatted = formatDateSaisie(raw, prevDate.current)
    prevDate.current = formatted
    setDateNaissance(formatted)
    setErreur('')
  }

  async function handleSave() {
    setErreur('')
    if (!nom.trim()) { setErreur('Le nom est obligatoire.'); return }
    if (!prenom.trim()) { setErreur('Le prénom est obligatoire.'); return }
    if (email && !email.includes('@')) { setErreur('Adresse email invalide.'); return }

    let dateISO: string | null = null
    if (dateNaissance) {
      dateISO = dateVersISO(dateNaissance)
      if (!dateISO) {
        setErreur('Date de naissance invalide. Format attendu : JJ/MM/AAAA')
        return
      }
    }

    setLoading(true)
    const payload = {
      nom: nom.trim().toUpperCase(),
      prenom: prenom.trim(),
      email: email.trim() || null,
      telephone: telephone.trim() || null,
      date_naissance: dateISO,
      adresse: adresse.trim() || null,
    }

    const { error } = isEditing
      ? await supabase.from('locataires').update(payload).eq('id', id)
      : await supabase.from('locataires').insert(payload)

    setLoading(false)
    if (error) {
      setErreur(traduireErreur(error.message))
    } else if (!isEditing) {
      setSucces(true)
    } else {
      router.back()
    }
  }

  if (loadingData) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Bouton retour */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backTxt}>‹  Retour</Text>
        </TouchableOpacity>

        <Text style={styles.pageTitle}>
          {isEditing ? 'Modifier le locataire' : 'Nouveau locataire'}
        </Text>

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
        <View style={styles.dateWrap}>
          <TextInput
            style={[styles.input, styles.dateInput]}
            value={dateNaissance}
            onChangeText={handleDateChange}
            placeholder="JJ/MM/AAAA"
            keyboardType="numeric"
            maxLength={10}
          />
          <Text style={styles.dateHint}>📅</Text>
        </View>

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

        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelTxt}>Annuler</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Popup succès */}
      <Modal visible={succes} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successTitle}>Locataire créé !</Text>
            <Text style={styles.successSub}>
              {prenom} {nom.toUpperCase()} a été ajouté avec succès.
            </Text>
            <TouchableOpacity
              style={styles.successBtn}
              onPress={() => { setSucces(false); router.back() }}
            >
              <Text style={styles.successBtnTxt}>Retour à la liste</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.successBtnSecondary}
              onPress={() => {
                setSucces(false)
                setNom(''); setPrenom(''); setEmail('')
                setTelephone(''); setDateNaissance(''); setAdresse('')
                setErreur('')
              }}
            >
              <Text style={styles.successBtnSecondaryTxt}>Ajouter un autre locataire</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  backTxt: { fontSize: 16, color: '#2563eb', fontWeight: '500' },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#1e293b', marginBottom: 4, marginTop: 8 },
  section: { fontSize: 13, fontWeight: '700', color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 20, marginBottom: 10 },
  label: { fontSize: 13, color: '#64748b', marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 15, color: '#1e293b' },
  inputErr: { borderColor: '#ef4444' },
  dateWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateInput: { flex: 1 },
  dateHint: { fontSize: 22 },
  textarea: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
  erreurBox: { backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, marginTop: 12, borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  erreurTxt: { color: '#991b1b', fontSize: 14 },
  button: { backgroundColor: '#2563eb', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 20 },
  buttonTxt: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { padding: 14, alignItems: 'center', marginTop: 8 },
  cancelTxt: { color: '#94a3b8', fontSize: 15 },
  // Popup succès
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  successCard: { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', width: '100%', maxWidth: 380 },
  successIcon: { fontSize: 56, marginBottom: 12 },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#1e293b', marginBottom: 8 },
  successSub: { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 28 },
  successBtn: { backgroundColor: '#2563eb', borderRadius: 10, padding: 14, alignItems: 'center', width: '100%', marginBottom: 10 },
  successBtnTxt: { color: '#fff', fontWeight: '600', fontSize: 15 },
  successBtnSecondary: { padding: 12, alignItems: 'center', width: '100%' },
  successBtnSecondaryTxt: { color: '#2563eb', fontSize: 14, fontWeight: '500' },
})
