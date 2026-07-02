import { useEffect, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../src/lib/supabase'

type Etape = 'attente' | 'formulaire' | 'succes' | 'erreur'

export default function ResetPassword() {
  const [etape, setEtape] = useState<Etape>('attente')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [erreur, setErreur] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Supabase détecte automatiquement le hash #access_token=...&type=recovery
    // grâce à detectSessionInUrl: true dans supabase.ts
    // On écoute l'événement PASSWORD_RECOVERY pour savoir quand la session est prête
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setEtape('formulaire')
      } else if (event === 'SIGNED_IN' && etape === 'attente') {
        // Lien déjà utilisé mais session valide
        setEtape('formulaire')
      }
    })

    // Vérifier si une session est déjà active (retour sur la page)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && etape === 'attente') {
        // Vérifier si c'est bien un recovery via le hash URL
        if (Platform.OS === 'web') {
          const hash = window.location.hash
          if (hash.includes('type=recovery') || hash.includes('access_token')) {
            setEtape('formulaire')
          } else if (session) {
            setEtape('formulaire')
          }
        } else {
          setEtape('formulaire')
        }
      }
    })

    // Timeout si aucun événement reçu après 8 secondes
    const timer = setTimeout(() => {
      setEtape(prev => prev === 'attente' ? 'erreur' : prev)
    }, 8000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  async function handleSubmit() {
    setErreur('')
    if (!password) { setErreur('Veuillez saisir un mot de passe.'); return }
    if (password.length < 6) { setErreur('Le mot de passe doit contenir au moins 6 caractères.'); return }
    if (password !== confirm) { setErreur('Les mots de passe ne correspondent pas.'); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setErreur('Erreur : ' + error.message)
      setLoading(false)
    } else {
      setEtape('succes')
      setLoading(false)
      // Déconnexion propre puis redirection vers login
      setTimeout(async () => {
        await supabase.auth.signOut()
        router.replace('/(auth)/login')
      }, 2500)
    }
  }

  // ── Écran d'attente ──────────────────────────────────────────────────────
  if (etape === 'attente') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.waitTxt}>Vérification du lien…</Text>
      </View>
    )
  }

  // ── Lien invalide / expiré ───────────────────────────────────────────────
  if (etape === 'erreur') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Lien invalide ou expiré</Text>
        <Text style={styles.errorSub}>
          Ce lien de réinitialisation n'est plus valide.{'\n'}
          Veuillez faire une nouvelle demande.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.btnTxt}>Retour à la connexion</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // ── Succès ───────────────────────────────────────────────────────────────
  if (etape === 'succes') {
    return (
      <View style={styles.center}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Mot de passe modifié</Text>
        <Text style={styles.successSub}>Vous allez être redirigé vers la connexion…</Text>
      </View>
    )
  }

  // ── Formulaire ───────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Nouveau mot de passe</Text>
        <Text style={styles.subtitle}>Choisissez un mot de passe sécurisé.</Text>

        <TextInput
          style={[styles.input, erreur ? styles.inputError : null]}
          placeholder="Nouveau mot de passe"
          value={password}
          onChangeText={t => { setPassword(t); setErreur('') }}
          secureTextEntry
          autoFocus
        />
        <TextInput
          style={[styles.input, erreur ? styles.inputError : null]}
          placeholder="Confirmer le mot de passe"
          value={confirm}
          onChangeText={t => { setConfirm(t); setErreur('') }}
          secureTextEntry
        />

        {erreur ? <Text style={styles.erreurTxt}>{erreur}</Text> : null}

        <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnTxt}>Enregistrer le mot de passe</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  inner: { flex: 1, justifyContent: 'center', padding: 24, maxWidth: 400, alignSelf: 'center', width: '100%' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 14, backgroundColor: '#f8fafc' },

  title: { fontSize: 26, fontWeight: '800', color: '#1e293b', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 28 },

  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 16, color: '#1e293b' },
  inputError: { borderColor: '#ef4444' },
  erreurTxt: { color: '#ef4444', fontSize: 14, marginBottom: 10, textAlign: 'center' },

  btn: { backgroundColor: '#2563eb', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 4 },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },

  waitTxt: { fontSize: 15, color: '#64748b', marginTop: 16 },
  errorIcon: { fontSize: 52 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#ef4444' },
  errorSub: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },
  successIcon: { fontSize: 64 },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#16a34a' },
  successSub: { fontSize: 14, color: '#64748b', textAlign: 'center' },
})
