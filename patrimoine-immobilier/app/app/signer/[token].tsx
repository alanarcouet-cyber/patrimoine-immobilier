import { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, Platform, Alert,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { supabase } from '../../src/lib/supabase'

type Request = {
  id: string
  session_id: string
  role: string
  nom: string
  prenom: string
  ordre: number
  statut: string
  signed_at: string | null
  signature_sessions: {
    nom_document: string
    document_type: string
    contrat_id: string
  }
}

export default function SignerPage() {
  const { token } = useLocalSearchParams<{ token: string }>()
  const [request, setRequest] = useState<Request | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  // Canvas refs
  const canvasId = 'signature-canvas-pad'
  const hasDrawn = useRef(false)

  useEffect(() => {
    if (!token) return
    supabase
      .from('signature_requests')
      .select('*, signature_sessions(nom_document, document_type, contrat_id)')
      .eq('token', token)
      .single()
      .then(({ data, error: e }) => {
        if (e || !data) { setError('Lien de signature invalide ou expiré.'); setLoading(false); return }
        setRequest(data as Request)
        if (data.statut === 'signe') setDone(true)
        setLoading(false)
      })
  }, [token])

  // Initialiser le canvas après le rendu
  useEffect(() => {
    if (loading || done || error || Platform.OS !== 'web') return
    const setup = () => {
      const container = document.getElementById(canvasId)
      if (!container) return
      // Nettoyer les anciens canvas
      while (container.firstChild) container.removeChild(container.firstChild)

      const canvas = document.createElement('canvas')
      const w = container.getBoundingClientRect().width || window.innerWidth - 48
      canvas.width = w
      canvas.height = 230
      canvas.style.cssText = `
        display: block; touch-action: none; cursor: crosshair;
        background: #fff; border-radius: 8px;
      `
      container.appendChild(canvas)

      const ctx = canvas.getContext('2d')!
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      let drawing = false
      let lastX = 0, lastY = 0

      const pos = (e: TouchEvent | MouseEvent) => {
        const rect = canvas.getBoundingClientRect()
        if ('touches' in e) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
        return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top }
      }

      const start = (e: Event) => {
        drawing = true
        const p = pos(e as TouchEvent)
        lastX = p.x; lastY = p.y
        ctx.beginPath(); ctx.moveTo(p.x, p.y)
        e.preventDefault()
      }
      const move = (e: Event) => {
        if (!drawing) return
        const p = pos(e as TouchEvent)
        ctx.beginPath()
        ctx.moveTo(lastX, lastY)
        ctx.lineTo(p.x, p.y)
        ctx.stroke()
        lastX = p.x; lastY = p.y
        hasDrawn.current = true
        setIsEmpty(false)
        e.preventDefault()
      }
      const stop = () => { drawing = false }

      canvas.addEventListener('mousedown', start)
      canvas.addEventListener('mousemove', move)
      canvas.addEventListener('mouseup', stop)
      canvas.addEventListener('mouseleave', stop)
      canvas.addEventListener('touchstart', start, { passive: false })
      canvas.addEventListener('touchmove', move, { passive: false })
      canvas.addEventListener('touchend', stop)

      // Ligne guide
      ctx.save()
      ctx.strokeStyle = '#cbd5e1'
      ctx.setLineDash([6, 4])
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(20, 175)
      ctx.lineTo(canvas.width - 20, 175)
      ctx.stroke()
      ctx.restore()
    }

    const timer = setTimeout(setup, 150)
    return () => clearTimeout(timer)
  }, [loading, done, error])

  function effacerSignature() {
    if (Platform.OS !== 'web') return
    const container = document.getElementById(canvasId)
    const canvas = container?.querySelector('canvas') as HTMLCanvasElement | null
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    // Redessiner la ligne guide
    ctx.save()
    ctx.strokeStyle = '#cbd5e1'
    ctx.setLineDash([6, 4])
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(20, 175)
    ctx.lineTo(canvas.width - 20, 175)
    ctx.stroke()
    ctx.restore()
    hasDrawn.current = false
    setIsEmpty(true)
  }

  async function validerSignature() {
    if (Platform.OS !== 'web' || !request) return
    if (!hasDrawn.current) { Alert.alert('', 'Veuillez apposer votre signature'); return }

    const container = document.getElementById(canvasId)
    const canvas = container?.querySelector('canvas') as HTMLCanvasElement | null
    if (!canvas) return

    setSubmitting(true)
    const base64 = canvas.toDataURL('image/png')

    const { error: e } = await supabase
      .from('signature_requests')
      .update({
        statut: 'signe',
        signature_data: base64,
        signed_at: new Date().toISOString(),
      })
      .eq('token', token)

    if (e) { Alert.alert('Erreur', e.message); setSubmitting(false); return }

    // Mettre à jour le statut de la session
    await checkSessionComplete(request.session_id)
    setDone(true)
    setSubmitting(false)
  }

  async function checkSessionComplete(sessionId: string) {
    const { data: reqs } = await supabase
      .from('signature_requests')
      .select('statut')
      .eq('session_id', sessionId)

    if (!reqs) return
    const allSigned = reqs.every(r => r.statut === 'signe')
    const someSigned = reqs.some(r => r.statut === 'signe')
    const statut = allSigned ? 'complete' : someSigned ? 'partiel' : 'en_attente'
    await supabase.from('signature_sessions').update({ statut }).eq('id', sessionId)
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  )

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorText}>{error}</Text>
    </View>
  )

  if (done) return (
    <View style={styles.center}>
      <Text style={styles.doneIcon}>✅</Text>
      <Text style={styles.doneTitle}>Signature enregistrée</Text>
      {request && (
        <Text style={styles.doneSub}>
          {request.prenom} {request.nom.toUpperCase()} a signé{'\n'}
          « {request.signature_sessions?.nom_document} »{'\n'}
          le {request.signed_at ? new Date(request.signed_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
        </Text>
      )}
      <Text style={styles.doneNote}>Vous pouvez fermer cette page.</Text>
    </View>
  )

  if (!request) return null

  const roleLabel = request.role === 'bailleur' ? 'Bailleur' : 'Locataire'

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.headerTag}>DEMANDE DE SIGNATURE</Text>
        <Text style={styles.headerDoc}>{request.signature_sessions?.nom_document}</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{roleLabel}</Text>
        </View>
        <Text style={styles.headerName}>
          {request.prenom} {request.nom.toUpperCase()}
        </Text>
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instrTitle}>✍️  Signez dans le cadre ci-dessous</Text>
        <Text style={styles.instrSub}>Utilisez votre doigt ou un stylet</Text>
      </View>

      {/* Zone de signature */}
      <View style={styles.padWrapper}>
        <View
          nativeID={canvasId}
          style={styles.padContainer}
        />
        <TouchableOpacity style={styles.clearBtn} onPress={effacerSignature}>
          <Text style={styles.clearBtnTxt}>↩  Recommencer</Text>
        </TouchableOpacity>
      </View>

      {/* Mentions légales */}
      <View style={styles.mentions}>
        <Text style={styles.mentionsTxt}>
          En validant, vous certifiez être {request.prenom} {request.nom.toUpperCase()} et
          consentez à la signature électronique du document « {request.signature_sessions?.nom_document} ».
          Cette signature a valeur légale conformément au Règlement eIDAS n°910/2014.
        </Text>
      </View>

      {/* Bouton valider */}
      <TouchableOpacity
        style={[styles.submitBtn, (submitting || isEmpty) && styles.submitBtnDisabled]}
        onPress={validerSignature}
        disabled={submitting || isEmpty}
      >
        {submitting
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitBtnTxt}>✅  Valider ma signature</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  errorIcon: { fontSize: 48 },
  errorText: { fontSize: 16, color: '#ef4444', textAlign: 'center' },
  doneIcon: { fontSize: 64 },
  doneTitle: { fontSize: 24, fontWeight: '800', color: '#16a34a', textAlign: 'center' },
  doneSub: { fontSize: 15, color: '#475569', textAlign: 'center', lineHeight: 24, marginTop: 8 },
  doneNote: { fontSize: 13, color: '#94a3b8', marginTop: 16, textAlign: 'center' },

  header: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, marginBottom: 20, alignItems: 'center' },
  headerTag: { fontSize: 11, color: '#94a3b8', letterSpacing: 1.5, fontWeight: '700', marginBottom: 8 },
  headerDoc: { fontSize: 18, color: '#fff', fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  headerBadge: { backgroundColor: '#2563eb', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 8 },
  headerBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  headerName: { fontSize: 20, color: '#fff', fontWeight: '800' },

  instructions: { alignItems: 'center', marginBottom: 16 },
  instrTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  instrSub: { fontSize: 13, color: '#64748b', marginTop: 4 },

  padWrapper: { marginBottom: 16 },
  padContainer: {
    minHeight: 230,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    overflow: 'hidden',
  },
  clearBtn: { alignSelf: 'flex-end', marginTop: 8, paddingVertical: 6, paddingHorizontal: 12 },
  clearBtnTxt: { fontSize: 14, color: '#64748b', fontWeight: '600' },

  mentions: { backgroundColor: '#f1f5f9', borderRadius: 10, padding: 14, marginBottom: 20 },
  mentionsTxt: { fontSize: 11.5, color: '#64748b', lineHeight: 18, textAlign: 'center' },

  submitBtn: { backgroundColor: '#16a34a', borderRadius: 14, padding: 18, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: '#86efac' },
  submitBtnTxt: { color: '#fff', fontSize: 17, fontWeight: '800' },
})
