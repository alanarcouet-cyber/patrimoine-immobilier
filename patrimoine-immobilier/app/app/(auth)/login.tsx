import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Modal } from 'react-native'
import { Link, router } from 'expo-router'
import { supabase } from '../../src/lib/supabase'

const ERREURS: Record<string, string> = {
  'Invalid login credentials': 'Email ou mot de passe incorrect.',
  'Email not confirmed': 'Votre email n\'est pas encore confirmé. Vérifiez votre boîte mail.',
  'Too many requests': 'Trop de tentatives. Veuillez patienter quelques minutes.',
  'User not found': 'Aucun compte trouvé avec cet email.',
  'Invalid email': 'Adresse email invalide.',
  'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères.',
}

function traduireErreur(message: string): string {
  for (const [cle, valeur] of Object.entries(ERREURS)) {
    if (message.includes(cle)) return valeur
  }
  return 'Une erreur est survenue. Veuillez réessayer.'
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const [modalVisible, setModalVisible] = useState(false)
  const [emailReset, setEmailReset] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState('')

  async function handleLogin() {
    setErreur('')
    if (!email || !password) {
      setErreur('Veuillez remplir tous les champs.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setErreur(traduireErreur(error.message))
    } else {
      router.replace('/(app)/(tabs)/biens')
    }
    setLoading(false)
  }

  async function handleResetPassword() {
    if (!emailReset) {
      setResetMessage('Veuillez saisir votre adresse email.')
      return
    }
    setResetLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(emailReset)
    if (error) {
      setResetMessage(traduireErreur(error.message))
    } else {
      setResetMessage('Un email de réinitialisation a été envoyé. Vérifiez votre boîte mail.')
    }
    setResetLoading(false)
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <Text style={styles.title}>Patrimoine</Text>
        <Text style={styles.subtitle}>Gestion immobilière</Text>

        <TextInput
          style={[styles.input, erreur ? styles.inputError : null]}
          placeholder="Email"
          value={email}
          onChangeText={t => { setEmail(t); setErreur('') }}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={[styles.input, erreur ? styles.inputError : null]}
          placeholder="Mot de passe"
          value={password}
          onChangeText={t => { setPassword(t); setErreur('') }}
          secureTextEntry
        />

        {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Connexion...' : 'Se connecter'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { setModalVisible(true); setEmailReset(email); setResetMessage('') }}>
          <Text style={styles.forgotLink}>Mot de passe oublié ?</Text>
        </TouchableOpacity>

        <Link href="/(auth)/register" style={styles.link}>
          Pas encore de compte ? S'inscrire
        </Link>
      </View>

      {/* Modal mot de passe oublié */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Mot de passe oublié</Text>
            <Text style={styles.modalSubtitle}>Saisissez votre email pour recevoir un lien de réinitialisation.</Text>

            <TextInput
              style={styles.input}
              placeholder="Email"
              value={emailReset}
              onChangeText={setEmailReset}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            {resetMessage ? (
              <Text style={[styles.resetMessage, resetMessage.includes('envoyé') ? styles.resetSuccess : styles.resetError]}>
                {resetMessage}
              </Text>
            ) : null}

            <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={resetLoading}>
              <Text style={styles.buttonText}>{resetLoading ? 'Envoi...' : 'Envoyer le lien'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={[styles.link, { marginTop: 12 }]}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1e40af', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 40 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 16,
  },
  inputError: { borderColor: '#ef4444' },
  erreur: { color: '#ef4444', fontSize: 14, marginBottom: 8, textAlign: 'center' },
  button: {
    backgroundColor: '#2563eb', borderRadius: 10, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  forgotLink: { textAlign: 'center', color: '#64748b', marginTop: 16, fontSize: 14, textDecorationLine: 'underline' },
  link: { textAlign: 'center', color: '#2563eb', marginTop: 20, fontSize: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modal: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 20 },
  resetMessage: { fontSize: 14, marginBottom: 12, textAlign: 'center' },
  resetSuccess: { color: '#22c55e' },
  resetError: { color: '#ef4444' },
})
