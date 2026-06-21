import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '../../src/lib/supabase'

export default function Invitation() {
  const { token } = useLocalSearchParams<{ token: string }>()

  const [invitation, setInvitation] = useState<any>(null)
  const [loadingInvit, setLoadingInvit] = useState(true)
  const [invalide, setInvalide] = useState(false)

  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')

  useEffect(() => { if (token) chargerInvitation() }, [token])

  async function chargerInvitation() {
    const { data } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .maybeSingle()

    if (!data || data.accepted_at || new Date(data.expires_at) < new Date()) {
      setInvalide(true)
    } else {
      setInvitation(data)
    }
    setLoadingInvit(false)
  }

  async function handleAccepter() {
    setErreur('')
    if (!prenom || !nom || !password) {
      setErreur('Veuillez remplir tous les champs.')
      return
    }
    if (password.length < 6) {
      setErreur('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email: invitation.email,
      password,
    })

    if (error) {
      // Si le compte existe déjà, on tente une connexion
      if (error.message.includes('already registered')) {
        const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
          email: invitation.email, password,
        })
        if (loginErr) { setErreur('Email ou mot de passe incorrect.'); setLoading(false); return }
        if (loginData.user) await finaliser(loginData.user.id)
        return
      }
      setErreur(error.message); setLoading(false); return
    }

    if (data.user) await finaliser(data.user.id)
  }

  async function finaliser(userId: string) {
    // Créer le membre co-gestionnaire
    await supabase.from('patrimoine_membres').upsert({
      id: userId,
      invited_by: invitation.invited_by,
      role: invitation.role,
      nom: nom.toUpperCase(),
      prenom,
      email: invitation.email,
    })

    // Marquer l'invitation comme acceptée
    await supabase.from('invitations').update({ accepted_at: new Date().toISOString() }).eq('token', token)

    setLoading(false)
    router.replace('/(app)/(tabs)/biens')
  }

  if (loadingInvit) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />

  if (invalide) return (
    <View style={styles.center}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Lien invalide ou expiré</Text>
      <Text style={styles.errorSub}>Ce lien d'invitation n'est plus valide. Demandez un nouveau lien à l'administrateur.</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.replace('/(auth)/login')}>
        <Text style={styles.buttonText}>Retour à la connexion</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Invitation</Text>
        <Text style={styles.subtitle}>Vous avez été invité(e) à rejoindre l'application</Text>

        <View style={styles.invitCard}>
          <Text style={styles.invitEmail}>{invitation.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeTxt}>{invitation.role === 'co-gestionnaire' ? 'Co-gestionnaire' : invitation.role}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <TextInput style={[styles.input, styles.flex1]} placeholder="Prénom" value={prenom} onChangeText={setPrenom} />
          <TextInput style={[styles.input, styles.flex1, { marginLeft: 8 }]} placeholder="NOM" value={nom} onChangeText={setNom} autoCapitalize="characters" />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Choisir un mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={handleAccepter} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Création du compte...' : 'Accepter l\'invitation'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  inner: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#f8fafc' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1e40af', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  invitCard: { backgroundColor: '#dbeafe', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 24, gap: 8 },
  invitEmail: { fontSize: 16, fontWeight: '600', color: '#1e40af' },
  roleBadge: { backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  roleBadgeTxt: { color: '#fff', fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 16 },
  erreur: { color: '#ef4444', fontSize: 14, marginBottom: 8, textAlign: 'center' },
  button: { backgroundColor: '#2563eb', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 8, textAlign: 'center' },
  errorSub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 32 },
})
