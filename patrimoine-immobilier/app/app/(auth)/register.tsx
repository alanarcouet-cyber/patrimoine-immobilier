import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { Link, router } from 'expo-router'
import { supabase } from '../../src/lib/supabase'

const ERREURS: Record<string, string> = {
  'User already registered': 'Un compte existe déjà avec cet email.',
  'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères.',
  'Invalid email': 'Adresse email invalide.',
  'Signup requires a valid password': 'Mot de passe invalide.',
}

function traduireErreur(msg: string): string {
  for (const [k, v] of Object.entries(ERREURS)) {
    if (msg.includes(k)) return v
  }
  return 'Une erreur est survenue. Veuillez réessayer.'
}

export default function Register() {
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')

  async function handleRegister() {
    setErreur('')
    if (!nom || !prenom || !email || !password) {
      setErreur('Veuillez remplir tous les champs.')
      return
    }
    if (password.length < 6) {
      setErreur('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setErreur(traduireErreur(error.message)); setLoading(false); return }

    if (data.user) {
      // Inscription normale → rôle admin, invited_by = soi-même
      await supabase.from('patrimoine_membres').insert({
        id: data.user.id,
        invited_by: data.user.id,
        role: 'admin',
        nom: nom.toUpperCase(),
        prenom,
        email,
      })
      router.replace('/(app)/(tabs)/biens')
    }
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.subtitle}>Accès administrateur</Text>

        <View style={styles.row}>
          <TextInput style={[styles.input, styles.flex1]} placeholder="Prénom" value={prenom} onChangeText={setPrenom} />
          <TextInput style={[styles.input, styles.flex1, { marginLeft: 8 }]} placeholder="NOM" value={nom} onChangeText={setNom} autoCapitalize="characters" />
        </View>
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Mot de passe (min. 6 caractères)" value={password} onChangeText={setPassword} secureTextEntry />

        {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Création...' : 'Créer mon compte'}</Text>
        </TouchableOpacity>

        <Link href="/(auth)/login" style={styles.link}>Déjà un compte ? Se connecter</Link>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  inner: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1e40af', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 32 },
  row: { flexDirection: 'row', marginBottom: 0 },
  flex1: { flex: 1 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 16 },
  erreur: { color: '#ef4444', fontSize: 14, marginBottom: 8, textAlign: 'center' },
  button: { backgroundColor: '#2563eb', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { textAlign: 'center', color: '#2563eb', marginTop: 20, fontSize: 14 },
})
