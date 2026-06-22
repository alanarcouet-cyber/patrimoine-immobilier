import { useState, useRef, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  PanResponder, Animated, ActivityIndicator,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'

type Locataire = { id: string; nom: string; prenom: string }
type Bien = { id: string; nom: string; adresse: string; ville: string; type_location: string; surface_m2: number | null }

const TYPE_ICONS: Record<string, string> = { nu: '🏠', meuble: '🛋️', tourisme: '🏖️' }

export default function AssocierContrat() {
  const [locataires, setLocataires] = useState<Locataire[]>([])
  const [biens, setBiens] = useState<Bien[]>([])
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState<Locataire | null>(null)
  const [hoveredBienId, setHoveredBienId] = useState<string | null>(null)

  // Position du ghost qui suit le doigt
  const ghostPos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current

  // Positions absolues (pageY) des cartes bien, mesurées dans la fenêtre
  const bienPageLayouts = useRef<Record<string, { pageY: number; height: number }>>({})
  const bienViewRefs = useRef<Record<string, View | null>>({})

  // Scroll offset du ScrollView des biens
  const scrollY = useRef(0)

  useFocusEffect(useCallback(() => { fetchData() }, []))

  async function fetchData() {
    setLoading(true)
    const [{ data: l }, { data: b }] = await Promise.all([
      supabase.from('locataires').select('id, nom, prenom').order('nom'),
      supabase.from('biens').select('id, nom, adresse, ville, type_location, surface_m2')
        .eq('statut', 'libre').order('nom'),
    ])
    setLocataires(l ?? [])
    setBiens(b ?? [])
    setLoading(false)
  }

  // Mesure les positions absolues de toutes les cartes bien (appelé avant chaque drag)
  function measureBiens() {
    for (const [bienId, ref] of Object.entries(bienViewRefs.current)) {
      ref?.measureInWindow((_x, pageY, _w, height) => {
        bienPageLayouts.current[bienId] = { pageY, height }
      })
    }
  }

  function getBienAtY(pageY: number): Bien | null {
    for (const [bienId, layout] of Object.entries(bienPageLayouts.current)) {
      if (pageY >= layout.pageY && pageY <= layout.pageY + layout.height) {
        return biens.find(b => b.id === bienId) ?? null
      }
    }
    return null
  }

  function createPanResponder(locataire: Locataire) {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        measureBiens()
        ghostPos.setValue({ x: e.nativeEvent.pageX - 60, y: e.nativeEvent.pageY - 28 })
        setDragging(locataire)
      },
      onPanResponderMove: (e) => {
        const { pageX, pageY } = e.nativeEvent
        ghostPos.setValue({ x: pageX - 60, y: pageY - 28 })
        const hovered = getBienAtY(pageY)
        setHoveredBienId(hovered?.id ?? null)
      },
      onPanResponderRelease: (e) => {
        const droppedBien = getBienAtY(e.nativeEvent.pageY)
        setDragging(null)
        setHoveredBienId(null)
        if (droppedBien) {
          router.push(
            `/(app)/contrat/nouveau?bien_id=${droppedBien.id}&locataire_id=${locataire.id}`
          )
        }
      },
      onPanResponderTerminate: () => {
        setDragging(null)
        setHoveredBienId(null)
      },
    })
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />

  return (
    <View style={styles.container}>
      {/* En-tête fixe */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backTxt}>‹  Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Créer un contrat</Text>
        <Text style={styles.subtitle}>
          Glissez un locataire et déposez-le sur un bien disponible
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={!dragging}
        onScroll={e => { scrollY.current = e.nativeEvent.contentOffset.y }}
        scrollEventThrottle={16}
      >
        {/* ── Locataires ───────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>
          LOCATAIRES  <Text style={styles.sectionCount}>({locataires.length})</Text>
        </Text>

        {locataires.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTxt}>Aucun locataire créé</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/locataire/nouveau')}>
              <Text style={styles.emptyLink}>+ Créer un locataire</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            scrollEnabled={!dragging}
          >
            {locataires.map(loc => {
              const pr = createPanResponder(loc)
              const isActive = dragging?.id === loc.id
              return (
                <Animated.View
                  key={loc.id}
                  {...pr.panHandlers}
                  style={[styles.chip, isActive && styles.chipActive]}
                >
                  <View style={[styles.chipAvatar, isActive && styles.chipAvatarActive]}>
                    <Text style={styles.chipAvatarTxt}>
                      {loc.prenom[0]}{loc.nom[0]}
                    </Text>
                  </View>
                  <View>
                    <Text style={[styles.chipPrenom, isActive && styles.chipTextActive]}>
                      {loc.prenom}
                    </Text>
                    <Text style={[styles.chipNom, isActive && styles.chipTextActive]}>
                      {loc.nom}
                    </Text>
                  </View>
                </Animated.View>
              )
            })}
          </ScrollView>
        )}

        {/* Bannière active pendant le drag */}
        {dragging ? (
          <View style={styles.dragBanner}>
            <Text style={styles.dragBannerTxt}>
              ✋  {dragging.prenom} {dragging.nom} — déposez sur un bien ci-dessous
            </Text>
          </View>
        ) : (
          <View style={styles.instructionRow}>
            <Text style={styles.instructionTxt}>
              ☝️  Maintenez et glissez un locataire vers un bien
            </Text>
          </View>
        )}

        {/* ── Biens disponibles ─────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { marginTop: 8 }]}>
          BIENS DISPONIBLES  <Text style={styles.sectionCount}>({biens.length})</Text>
        </Text>

        {biens.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTxt}>Aucun bien avec le statut "libre"</Text>
          </View>
        ) : (
          biens.map(bien => {
            const hovered = hoveredBienId === bien.id
            return (
              <View
                key={bien.id}
                ref={ref => { bienViewRefs.current[bien.id] = ref }}
                style={[styles.bienCard, hovered && styles.bienCardHover]}
              >
                <Text style={styles.bienIcon}>{TYPE_ICONS[bien.type_location] ?? '🏠'}</Text>
                <View style={styles.bienInfo}>
                  <Text style={styles.bienNom}>{bien.nom}</Text>
                  <Text style={styles.bienAdresse}>
                    {bien.adresse}, {bien.ville}
                  </Text>
                  {bien.surface_m2 ? (
                    <Text style={styles.bienSurface}>{bien.surface_m2} m²</Text>
                  ) : null}
                </View>
                {hovered ? (
                  <View style={styles.dropBadge}>
                    <Text style={styles.dropBadgeTxt}>Déposer ici</Text>
                  </View>
                ) : (
                  <Text style={styles.bienArrow}>{dragging ? '⬇' : '→'}</Text>
                )}
              </View>
            )
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Ghost qui suit le doigt */}
      {dragging && (
        <Animated.View
          pointerEvents="none"
          style={[styles.ghost, { transform: ghostPos.getTranslateTransform() }]}
        >
          <View style={styles.ghostAvatar}>
            <Text style={styles.ghostAvatarTxt}>
              {dragging.prenom[0]}{dragging.nom[0]}
            </Text>
          </View>
          <Text style={styles.ghostNom}>{dragging.prenom} {dragging.nom}</Text>
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { marginBottom: 6 },
  backTxt: { fontSize: 15, color: '#2563eb', fontWeight: '500' },
  title: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  sectionCount: { color: '#cbd5e1' },

  // Chips locataires
  chipsRow: { gap: 10, paddingBottom: 4, paddingRight: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    minWidth: 110,
    cursor: 'grab' as any,
  },
  chipActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
    opacity: 0.5,
    shadowOpacity: 0,
  },
  chipAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipAvatarActive: { backgroundColor: '#bfdbfe' },
  chipAvatarTxt: { fontSize: 13, fontWeight: '700', color: '#2563eb' },
  chipPrenom: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  chipNom: { fontSize: 11, color: '#64748b' },
  chipTextActive: { color: '#1d4ed8' },

  // Bannières
  dragBanner: {
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginVertical: 12,
  },
  dragBannerTxt: { color: '#fff', fontSize: 14, fontWeight: '600' },
  instructionRow: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    marginVertical: 12,
  },
  instructionTxt: { color: '#94a3b8', fontSize: 13 },

  // Cartes bien
  bienCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  bienCardHover: {
    borderColor: '#22c55e',
    borderStyle: 'solid',
    backgroundColor: '#f0fdf4',
    shadowOpacity: 0.12,
    elevation: 4,
  },
  bienIcon: { fontSize: 28, marginRight: 12 },
  bienInfo: { flex: 1 },
  bienNom: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  bienAdresse: { fontSize: 12, color: '#64748b', marginTop: 2 },
  bienSurface: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  bienArrow: { fontSize: 18, color: '#cbd5e1' },
  dropBadge: {
    backgroundColor: '#22c55e',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dropBadgeTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Ghost
  ghost: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 999,
    opacity: 0.95,
  },
  ghostAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ghostAvatarTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },
  ghostNom: { fontSize: 14, fontWeight: '600', color: '#fff' },

  // Vides
  emptyBox: { alignItems: 'center', padding: 24, marginBottom: 8 },
  emptyTxt: { fontSize: 14, color: '#94a3b8' },
  emptyLink: { fontSize: 14, color: '#2563eb', fontWeight: '600', marginTop: 8 },
})
