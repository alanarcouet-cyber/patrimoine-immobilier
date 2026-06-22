import { useCallback, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, RefreshControl } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { supabase } from '../../src/lib/supabase'

type Locataire = {
  id: string
  nom: string
  prenom: string
  email: string | null
  telephone: string | null
  contrat_actif?: { bien_nom: string } | null
}

export default function Locataires() {
  const [locataires, setLocataires] = useState<Locataire[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [recherche, setRecherche] = useState('')

  useFocusEffect(useCallback(() => { fetchLocataires() }, []))

  async function fetchLocataires() {
    const { data } = await supabase
      .from('locataires')
      .select('id, nom, prenom, email, telephone, contrats(statut, biens(nom))')
      .order('nom')
    const mapped: Locataire[] = (data ?? []).map((l: any) => {
      const contratActif = l.contrats?.find((c: any) => c.statut === 'actif')
      return {
        id: l.id,
        nom: l.nom,
        prenom: l.prenom,
        email: l.email,
        telephone: l.telephone,
        contrat_actif: contratActif ? { bien_nom: contratActif.biens?.nom ?? '' } : null,
      }
    })
    setLocataires(mapped)
    setLoading(false)
    setRefreshing(false)
  }

  const filtres = locataires.filter(l => {
    if (!recherche.trim()) return true
    const q = recherche.toLowerCase()
    return (
      l.nom.toLowerCase().includes(q) ||
      l.prenom.toLowerCase().includes(q) ||
      (l.email ?? '').toLowerCase().includes(q)
    )
  })

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />

  return (
    <View style={styles.container}>
      {/* Barre de recherche */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={recherche}
          onChangeText={setRecherche}
          placeholder="Rechercher un locataire…"
          placeholderTextColor="#94a3b8"
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={filtres}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLocataires() }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>
              {recherche ? 'Aucun locataire trouvé' : 'Aucun locataire'}
            </Text>
            {!recherche && (
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(app)/locataire/nouveau')}>
                <Text style={styles.emptyBtnTxt}>+ Ajouter un locataire</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/(app)/locataire/${item.id}`)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTxt}>{item.prenom[0]}{item.nom[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.prenom} {item.nom}</Text>
              {item.email && <Text style={styles.meta}>✉️  {item.email}</Text>}
              {item.telephone && <Text style={styles.meta}>📞  {item.telephone}</Text>}
              {item.contrat_actif && (
                <View style={styles.contratBadge}>
                  <Text style={styles.contratBadgeTxt}>📍 {item.contrat_actif.bien_nom}</Text>
                </View>
              )}
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/(app)/locataire/nouveau')}>
        <Text style={styles.fabTxt}>+</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 12, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#1e293b', paddingVertical: 12 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { fontSize: 15, fontWeight: '700', color: '#2563eb' },
  name: { fontSize: 15, fontWeight: '600', color: '#1e293b', marginBottom: 2 },
  meta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  contratBadge: { marginTop: 6, backgroundColor: '#dbeafe', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  contratBadgeTxt: { fontSize: 12, color: '#1d4ed8', fontWeight: '600' },
  arrow: { fontSize: 22, color: '#cbd5e1', fontWeight: '300' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#64748b', marginBottom: 16 },
  emptyBtn: { backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 },
  emptyBtnTxt: { color: '#fff', fontWeight: '600', fontSize: 15 },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#2563eb', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  fabTxt: { color: '#fff', fontSize: 28, fontWeight: '300' },
})
