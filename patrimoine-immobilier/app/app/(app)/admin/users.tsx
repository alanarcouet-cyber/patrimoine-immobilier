import { useCallback, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert, ActivityIndicator, Platform } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'
import { useAuth } from '../../../src/contexts/AuthContext'

type Membre = { id: string; prenom: string; nom: string; email: string; role: string; created_at: string }
type Invitation = { id: string; token: string; email: string; role: string; accepted_at: string | null; expires_at: string; created_at: string }

export default function GestionUtilisateurs() {
  const { user } = useAuth()
  const [membres, setMembres] = useState<Membre[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [emailInvit, setEmailInvit] = useState('')
  const [roleInvit, setRoleInvit] = useState<'co-gestionnaire'>('co-gestionnaire')
  const [sending, setSending] = useState(false)

  useFocusEffect(useCallback(() => { fetchAll() }, []))

  async function fetchAll() {
    const [{ data: m }, { data: i }] = await Promise.all([
      supabase.from('patrimoine_membres').select('*').neq('id', user!.id).order('created_at'),
      supabase.from('invitations').select('*').eq('invited_by', user!.id).order('created_at', { ascending: false }),
    ])
    setMembres(m ?? [])
    setInvitations(i ?? [])
    setLoading(false)
  }

  async function creerInvitation() {
    if (!emailInvit || !emailInvit.includes('@')) {
      Alert.alert('Erreur', 'Veuillez saisir un email valide.')
      return
    }
    setSending(true)
    const { data, error } = await supabase
      .from('invitations')
      .insert({ email: emailInvit.trim().toLowerCase(), role: roleInvit, invited_by: user!.id })
      .select()
      .single()
    setSending(false)
    if (error) { Alert.alert('Erreur', error.message); return }

    setEmailInvit('')
    setInvitations(prev => [data, ...prev])
    partagerLien(data.token, data.email)
  }

  function getLienInvitation(token: string): string {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return `${window.location.origin}/#/(auth)/invitation?token=${token}`
    }
    return `patrimoine://invitation?token=${token}`
  }

  function partagerLien(token: string, email: string) {
    const lien = getLienInvitation(token)
    Alert.alert(
      'Invitation créée',
      `Partagez ce lien avec ${email} :\n\n${lien}`,
      [{ text: 'OK' }]
    )
  }

  async function revoquerMembre(membreId: string, nomMembre: string) {
    Alert.alert('Révoquer l\'accès', `Supprimer l'accès de ${nomMembre} ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Révoquer', style: 'destructive', onPress: async () => {
        await supabase.from('patrimoine_membres').delete().eq('id', membreId)
        setMembres(prev => prev.filter(m => m.id !== membreId))
      }}
    ])
  }

  async function supprimerInvitation(invitId: string) {
    await supabase.from('invitations').delete().eq('id', invitId)
    setInvitations(prev => prev.filter(i => i.id !== invitId))
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />

  const invitationsEnAttente = invitations.filter(i => !i.accepted_at && new Date(i.expires_at) > new Date())

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      ListHeaderComponent={
        <>
          {/* Formulaire d'invitation */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Inviter un co-gestionnaire</Text>
            <Text style={styles.hint}>La personne invitée accédera à tous vos biens en lecture/écriture.</Text>
            <TextInput
              style={styles.input}
              placeholder="Email de la personne à inviter"
              value={emailInvit}
              onChangeText={setEmailInvit}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity style={styles.button} onPress={creerInvitation} disabled={sending}>
              <Text style={styles.buttonTxt}>{sending ? 'Création...' : '📨  Créer un lien d\'invitation'}</Text>
            </TouchableOpacity>
          </View>

          {/* Membres actifs */}
          {membres.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Co-gestionnaires actifs ({membres.length})</Text>
              {membres.map(m => (
                <View key={m.id} style={styles.membreRow}>
                  <View style={styles.membreAvatar}>
                    <Text style={styles.membreAvatarTxt}>{m.prenom?.[0]}{m.nom?.[0]}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.membreNom}>{m.prenom} {m.nom}</Text>
                    <Text style={styles.membreEmail}>{m.email}</Text>
                  </View>
                  <TouchableOpacity onPress={() => revoquerMembre(m.id, `${m.prenom} ${m.nom}`)}>
                    <Text style={styles.revoquer}>Révoquer</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Invitations en attente */}
          {invitationsEnAttente.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Invitations en attente ({invitationsEnAttente.length})</Text>
              {invitationsEnAttente.map(inv => (
                <View key={inv.id} style={styles.invitRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.invitEmail}>{inv.email}</Text>
                    <Text style={styles.invitExpire}>
                      Expire le {new Date(inv.expires_at).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.copyBtn}
                    onPress={() => partagerLien(inv.token, inv.email)}
                  >
                    <Text style={styles.copyBtnTxt}>Copier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => supprimerInvitation(inv.id)}
                  >
                    <Text style={styles.deleteBtnTxt}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {membres.length === 0 && invitationsEnAttente.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyTxt}>Aucun co-gestionnaire pour l'instant</Text>
              <Text style={styles.emptySub}>Invitez quelqu'un via le formulaire ci-dessus</Text>
            </View>
          )}
        </>
      }
      data={[]}
      renderItem={() => null}
    />
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  hint: { fontSize: 13, color: '#64748b', marginBottom: 12 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 10 },
  button: { backgroundColor: '#2563eb', borderRadius: 10, padding: 14, alignItems: 'center' },
  buttonTxt: { color: '#fff', fontWeight: '600', fontSize: 15 },
  membreRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  membreAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center' },
  membreAvatarTxt: { color: '#2563eb', fontWeight: '700', fontSize: 14 },
  membreNom: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  membreEmail: { fontSize: 12, color: '#64748b' },
  revoquer: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  invitRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', gap: 8 },
  invitEmail: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  invitExpire: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  copyBtn: { backgroundColor: '#dbeafe', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  copyBtnTxt: { color: '#2563eb', fontSize: 13, fontWeight: '600' },
  deleteBtn: { backgroundColor: '#fee2e2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  deleteBtnTxt: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 32 },
  emptyTxt: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  emptySub: { fontSize: 13, color: '#94a3b8', marginTop: 4, textAlign: 'center' },
})
