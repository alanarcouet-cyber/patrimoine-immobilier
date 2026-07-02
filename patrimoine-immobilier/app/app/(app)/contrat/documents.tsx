import { useCallback, useRef, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Platform, TextInput, Modal, Image,
} from 'react-native'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'
import { useAuth } from '../../../src/contexts/AuthContext'
import {
  htmlQuittance, htmlContrat, htmlDevoirsLocataire,
  htmlCaution, htmlEtatLieux, htmlFinBail,
  imprimerDocument, telechargerDocx, htmlAvecSignatures,
  type ContratData, type SignatureInfo,
} from '../../../src/pdf/templates'

// ── Types ─────────────────────────────────────────────────────────────────────

type Doc = {
  id: string; type: string; nom: string
  storage_path: string | null; mois: string | null; created_at: string
}
type Caution = { id: string; nom: string; prenom: string; adresse?: string; telephone?: string; email?: string }
type SigReq = {
  id: string; session_id: string; role: string
  nom: string; prenom: string; ordre: number
  token: string; statut: string
  signature_data: string | null; signed_at: string | null
}
type SigSession = {
  id: string; document_type: string; nom_document: string; statut: string
  requests: SigReq[]
}

const TYPE_LABELS: Record<string, { icon: string; label: string }> = {
  quittance:        { icon: '🧾', label: 'Quittance' },
  contrat:          { icon: '📄', label: 'Contrat' },
  devoirs:          { icon: '📋', label: 'Devoirs locataire' },
  caution:          { icon: '🤝', label: 'Caution solidaire' },
  etat_lieux:       { icon: '🔍', label: 'État des lieux' },
  fin_bail:         { icon: '🔑', label: 'Fin de bail' },
  assurance:        { icon: '🛡️', label: 'Assurance' },
  identite:         { icon: '🪪', label: "Pièce d'identité" },
  contrat_signe:    { icon: '✅', label: 'Contrat signé' },
  devoirs_signe:    { icon: '✅', label: 'Devoirs signés' },
  etat_lieux_signe: { icon: '✅', label: 'État des lieux signé' },
  fin_bail_signe:   { icon: '✅', label: 'Fin de bail signée' },
  quittance_signe:  { icon: '✅', label: 'Quittance signée' },
}

function sigUrl(token: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/signer/${token}`
  }
  return `/signer/${token}`
}

const PEUT_SIGNER = (type: string) =>
  !['assurance', 'identite', 'caution'].includes(type) && !type.endsWith('_signe')

// ── Composant principal ────────────────────────────────────────────────────────

export default function DocumentsContrat() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { membre } = useAuth()
  const [loading, setLoading] = useState(true)
  const [contrat, setContrat] = useState<any>(null)
  const [loyers, setLoyers] = useState<any[]>([])
  const [documents, setDocuments] = useState<Doc[]>([])
  const [cautions, setCautions] = useState<Caution[]>([])
  const [sessions, setSessions] = useState<SigSession[]>([])
  const [generating, setGenerating] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const uploadType = useRef<string>('assurance')

  // Modals
  const [showFinBailModal, setShowFinBailModal] = useState(false)
  const [dateSortie, setDateSortie] = useState('')
  const [showCautionModal, setShowCautionModal] = useState(false)
  const [cautionForm, setCautionForm] = useState({ nom: '', prenom: '', adresse: '', telephone: '', email: '' })
  const [sigModal, setSigModal] = useState<{ doc: Doc; session: SigSession | null } | null>(null)

  useFocusEffect(useCallback(() => { fetchAll() }, [id]))

  async function fetchAll() {
    const [{ data: c }, { data: l }, { data: d }, { data: ca }, { data: ss }] = await Promise.all([
      supabase.from('contrats').select('*, biens(*), locataires(*)').eq('id', id).single(),
      supabase.from('loyers').select('*').eq('contrat_id', id).order('mois', { ascending: false }),
      supabase.from('contrat_documents').select('*').eq('contrat_id', id).order('created_at', { ascending: false }),
      supabase.from('cautions').select('*').eq('contrat_id', id),
      supabase.from('signature_sessions').select('*, signature_requests(*)').eq('contrat_id', id).order('created_at', { ascending: false }),
    ])
    setContrat(c)
    setLoyers(l ?? [])
    setDocuments(d ?? [])
    setCautions(ca ?? [])
    setSessions((ss ?? []).map((s: any) => ({
      ...s,
      requests: (s.signature_requests ?? []).sort((a: SigReq, b: SigReq) => a.ordre - b.ordre),
    })))
    setLoading(false)
  }

  // ── Données PDF ────────────────────────────────────────────────────────────

  function buildData(loyerData?: any): ContratData | null {
    if (!contrat) return null
    return {
      id: contrat.id,
      bien: {
        nom: contrat.biens?.nom ?? '',
        adresse: contrat.biens?.adresse ?? '',
        ville: contrat.biens?.ville ?? '',
        cp: contrat.biens?.cp ?? '',
        surface: contrat.biens?.surface,
        type_location: contrat.type_location,
        dpe: contrat.biens?.dpe,
      },
      locataires: contrat.locataires ? [{
        nom: contrat.locataires.nom,
        prenom: contrat.locataires.prenom,
        email: contrat.locataires.email,
        telephone: contrat.locataires.telephone,
        date_naissance: contrat.locataires.date_naissance,
        adresse: contrat.locataires.adresse,
      }] : [],
      bailleur: {
        nom: membre?.nom ?? 'BAILLEUR',
        prenom: membre?.prenom ?? '',
        adresse: membre?.email ?? '',
        email: membre?.email,
      },
      date_debut: contrat.date_debut,
      date_fin: contrat.date_fin,
      loyer_hc: contrat.loyer_hc,
      charges: contrat.charges,
      depot_garantie: contrat.depot_garantie,
      type_location: contrat.type_location,
      loyer: loyerData,
    }
  }

  function htmlForDoc(doc: Doc): string | null {
    const d = buildData()
    if (!d) return null
    switch (doc.type) {
      case 'contrat':    return htmlContrat(d)
      case 'devoirs':    return htmlDevoirsLocataire(d)
      case 'etat_lieux': return htmlEtatLieux(d)
      case 'fin_bail': {
        const m = doc.nom.match(/(\d{2}\/\d{2}\/\d{4})/)
        return htmlFinBail(d, m ? m[1] : '')
      }
      case 'quittance': {
        const loyer = loyers.find(l => l.mois === doc.mois)
        if (!loyer) return null
        return htmlQuittance(buildData({ mois: loyer.mois, montant_hc: loyer.montant_hc, charges: loyer.charges, date_paiement: loyer.date_paiement })!)
      }
      default: return null
    }
  }

  // ── Génération PDF ─────────────────────────────────────────────────────────

  async function sauverDoc(type: string, nom: string, html: string, mois?: string) {
    imprimerDocument(html)
    await supabase.from('contrat_documents').insert({ contrat_id: id, type, nom, mois: mois ?? null })
    await fetchAll()
  }

  async function genererContrat() {
    const d = buildData(); if (!d) return
    setGenerating('contrat')
    await sauverDoc('contrat', `Contrat de location — ${d.bien.nom}`, htmlContrat(d))
    setGenerating(null)
  }
  async function genererDevoirs() {
    const d = buildData(); if (!d) return
    setGenerating('devoirs')
    await sauverDoc('devoirs', `Devoirs du locataire — ${d.locataires[0]?.nom ?? ''}`, htmlDevoirsLocataire(d))
    setGenerating(null)
  }
  async function genererEtatLieux() {
    const d = buildData(); if (!d) return
    setGenerating('etat_lieux')
    await sauverDoc('etat_lieux', `État des lieux d'entrée — ${d.bien.nom}`, htmlEtatLieux(d))
    setGenerating(null)
  }
  async function genererFinBail() {
    const d = buildData(); if (!d || !dateSortie) return
    setGenerating('fin_bail')
    await sauverDoc('fin_bail', `Attestation fin de bail — ${dateSortie}`, htmlFinBail(d, dateSortie))
    setShowFinBailModal(false); setGenerating(null)
  }
  async function choisirEtGenererQuittance() {
    if (loyers.length === 0) { Alert.alert('Aucun loyer', "Générez d'abord des loyers pour ce contrat."); return }
    const MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
    if (Platform.OS === 'web') {
      const choices = loyers.map((l, i) =>
        `${i + 1}. ${MOIS[parseInt(l.mois.split('-')[1]) - 1]} ${l.mois.split('-')[0]} — ${(l.montant_hc + l.charges).toFixed(0)} €`
      ).join('\n')
      const raw = window.prompt(`Sélectionnez le numéro du mois :\n\n${choices}`)
      if (!raw) return
      const idx = parseInt(raw) - 1
      if (isNaN(idx) || idx < 0 || idx >= loyers.length) return
      await genererQuittance(loyers[idx])
    } else {
      Alert.alert('Choisir la période', 'Sélectionnez le loyer :',
        loyers.map(l => ({
          text: `${MOIS[parseInt(l.mois.split('-')[1]) - 1]} ${l.mois.split('-')[0]} — ${(l.montant_hc + l.charges).toFixed(0)} €`,
          onPress: () => genererQuittance(l),
        }))
      )
    }
  }
  async function genererQuittance(loyer: any) {
    const d = buildData({ mois: loyer.mois, montant_hc: loyer.montant_hc, charges: loyer.charges, date_paiement: loyer.date_paiement })
    if (!d) return
    setGenerating('quittance')
    await sauverDoc('quittance', `Quittance ${loyer.mois}`, htmlQuittance(d), loyer.mois)
    setGenerating(null)
  }
  async function ajouterCaution() {
    if (!cautionForm.nom || !cautionForm.prenom) { Alert.alert('Erreur', 'Nom et prénom obligatoires'); return }
    await supabase.from('cautions').insert({ contrat_id: id, ...cautionForm })
    const d = buildData()
    if (d) await sauverDoc('caution', `Caution solidaire — ${cautionForm.prenom} ${cautionForm.nom}`, htmlCaution(d, cautionForm))
    setCautionForm({ nom: '', prenom: '', adresse: '', telephone: '', email: '' })
    setShowCautionModal(false)
  }

  // ── DOCX ──────────────────────────────────────────────────────────────────

  function downloadDocx(doc: Doc) {
    if (Platform.OS !== 'web') return
    const html = htmlForDoc(doc)
    if (!html) { Alert.alert('', 'Impossible de régénérer ce document pour DOCX.'); return }
    telechargerDocx(html, doc.nom)
  }

  // ── Upload ─────────────────────────────────────────────────────────────────

  function declencherUpload(type: string) {
    uploadType.current = type
    if (Platform.OS !== 'web') return
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/*,application/pdf'
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0]; if (!file) return
      setGenerating(type)
      const path = `${id}/${type}_${Date.now()}.${file.name.split('.').pop()}`
      const { error: ue } = await supabase.storage.from('contrat-docs').upload(path, file)
      if (ue) { Alert.alert('Erreur upload', ue.message); setGenerating(null); return }
      await supabase.from('contrat_documents').insert({ contrat_id: id, type, nom: file.name, storage_path: path })
      await fetchAll(); setGenerating(null)
    }
    input.click()
  }

  async function ouvrirDocument(doc: Doc) {
    if (!doc.storage_path) return
    const { data } = await supabase.storage.from('contrat-docs').createSignedUrl(doc.storage_path, 3600)
    if (data?.signedUrl && Platform.OS === 'web') window.open(data.signedUrl, '_blank')
  }

  async function supprimerDocument(doc: Doc) {
    const ok = Platform.OS === 'web'
      ? window.confirm(`Supprimer "${doc.nom}" ?`)
      : await new Promise<boolean>(r =>
          Alert.alert('Supprimer', `Supprimer "${doc.nom}" ?`, [
            { text: 'Annuler', style: 'cancel', onPress: () => r(false) },
            { text: 'Supprimer', style: 'destructive', onPress: () => r(true) },
          ]))
    if (!ok) return
    if (doc.storage_path) await supabase.storage.from('contrat-docs').remove([doc.storage_path])
    await supabase.from('contrat_documents').delete().eq('id', doc.id)
    await fetchAll()
  }

  // ── Parcours de signature ──────────────────────────────────────────────────

  function ouvrirSigModal(doc: Doc) {
    const session = sessions.find(s => s.document_type === doc.type) ?? null
    setSigModal({ doc, session })
  }

  async function lancerSignature() {
    if (!sigModal || !contrat) return
    const { doc } = sigModal
    const { data: sess, error } = await supabase
      .from('signature_sessions')
      .insert({ contrat_id: id, document_type: doc.type, nom_document: doc.nom })
      .select().single()
    if (error || !sess) { Alert.alert('Erreur', error?.message); return }

    const demandes = [
      { session_id: sess.id, role: 'bailleur', nom: membre?.nom ?? '', prenom: membre?.prenom ?? '', ordre: 1 },
      ...(contrat.locataires ? [{ session_id: sess.id, role: 'locataire', nom: contrat.locataires.nom, prenom: contrat.locataires.prenom, ordre: 2 }] : []),
    ]
    await supabase.from('signature_requests').insert(demandes)

    // Recharger la session fraîche avec ses requests
    const { data: fresh } = await supabase
      .from('signature_sessions').select('*, signature_requests(*)')
      .eq('id', sess.id).single()
    if (fresh) {
      const s: SigSession = { ...fresh, requests: (fresh.signature_requests ?? []).sort((a: SigReq, b: SigReq) => a.ordre - b.ordre) }
      setSessions(prev => [s, ...prev])
      setSigModal({ doc, session: s })
    }
  }

  async function rafraichirSig() {
    if (!sigModal?.session) return
    const { data } = await supabase
      .from('signature_sessions').select('*, signature_requests(*)')
      .eq('id', sigModal.session.id).single()
    if (!data) return
    const s: SigSession = { ...data, requests: (data.signature_requests ?? []).sort((a: SigReq, b: SigReq) => a.ordre - b.ordre) }
    setSessions(prev => prev.map(x => x.id === s.id ? s : x))
    setSigModal(prev => prev ? { ...prev, session: s } : null)
  }

  async function genererPdfSigne() {
    if (!sigModal?.session) return
    const { doc, session } = sigModal
    const html = htmlForDoc(doc)
    if (!html) { Alert.alert('', 'Impossible de régénérer ce document.'); return }
    const signatures: SignatureInfo[] = session.requests
      .filter(r => r.statut === 'signe' && r.signature_data)
      .map(r => ({ role: r.role as 'bailleur' | 'locataire', nom: r.nom, prenom: r.prenom, signature_data: r.signature_data!, signed_at: r.signed_at! }))
    imprimerDocument(htmlAvecSignatures(html, signatures))
    await supabase.from('contrat_documents').insert({ contrat_id: id, type: doc.type + '_signe', nom: doc.nom + ' (signé)' })
    await fetchAll()
    setSigModal(null)
  }

  function copier(token: string) {
    const url = sigUrl(token)
    if (Platform.OS === 'web') {
      navigator.clipboard?.writeText(url).catch(() => {
        const ta = document.createElement('textarea')
        ta.value = url; document.body.appendChild(ta); ta.select()
        document.execCommand('copy'); document.body.removeChild(ta)
      })
    }
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2500)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />

  const ACTIONS = [
    { type: 'contrat',    label: 'Contrat de location',          icon: '📄', onPress: genererContrat },
    { type: 'devoirs',    label: 'Devoirs du locataire',         icon: '📋', onPress: genererDevoirs },
    { type: 'etat_lieux', label: "État des lieux d'entrée",      icon: '🔍', onPress: genererEtatLieux },
    { type: 'caution',    label: 'Caution solidaire',            icon: '🤝', onPress: () => setShowCautionModal(true) },
    { type: 'quittance',  label: 'Quittance de loyer',           icon: '🧾', onPress: choisirEtGenererQuittance },
    { type: 'fin_bail',   label: 'Attestation fin de bail',      icon: '🔑', onPress: () => setShowFinBailModal(true) },
    { type: 'assurance',  label: 'Joindre attestation assurance', icon: '🛡️', onPress: () => declencherUpload('assurance'), upload: true },
    { type: 'identite',   label: "Joindre pièce d'identité",     icon: '🪪', onPress: () => declencherUpload('identite'), upload: true },
  ]

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backTxt}>‹  Retour</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Documents</Text>
        {contrat && (
          <Text style={styles.subtitle}>{contrat.biens?.nom} — {contrat.locataires?.prenom} {contrat.locataires?.nom}</Text>
        )}

        {cautions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🤝 Cautions solidaires</Text>
            {cautions.map(c => (
              <View key={c.id} style={styles.cautionRow}>
                <Text style={styles.cautionName}>{c.prenom} {c.nom.toUpperCase()}</Text>
                {c.adresse   && <Text style={styles.meta}>{c.adresse}</Text>}
                {c.telephone && <Text style={styles.meta}>📞 {c.telephone}</Text>}
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Générer / Joindre un document</Text>
          <View style={styles.actionsGrid}>
            {ACTIONS.map(a => (
              <TouchableOpacity key={a.type}
                style={[styles.actionBtn, generating === a.type && styles.actionBtnLoading]}
                onPress={a.onPress} disabled={generating !== null}>
                <Text style={styles.actionIcon}>{a.icon}</Text>
                <Text style={styles.actionLabel}>{a.label}</Text>
                {(a as any).upload && <Text style={styles.uploadBadge}>Upload</Text>}
                {generating === a.type && <ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 4 }} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documents ({documents.length})</Text>
          {documents.length === 0 && <Text style={styles.empty}>Aucun document généré pour l'instant</Text>}
          {documents.map(doc => {
            const cfg = TYPE_LABELS[doc.type] ?? { icon: '📁', label: doc.type }
            const session = sessions.find(s => s.document_type === doc.type)
            const allSigned = session?.statut === 'complete'
            const someSigned = session?.statut === 'partiel'

            return (
              <View key={doc.id} style={styles.docCard}>
                <TouchableOpacity style={styles.docRow}
                  onPress={() => doc.storage_path ? ouvrirDocument(doc) : null}>
                  <Text style={styles.docIcon}>{cfg.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docNom}>{doc.nom}</Text>
                    <Text style={styles.docDate}>{cfg.label} · {new Date(doc.created_at).toLocaleDateString('fr-FR')}</Text>
                  </View>
                  {session && (
                    <View style={[styles.sigBadge, allSigned ? styles.sigBadgeOk : styles.sigBadgePending]}>
                      <Text style={styles.sigBadgeTxt}>{allSigned ? '✅' : someSigned ? '⏳' : '✍️'}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.docActions}>
                  {PEUT_SIGNER(doc.type) && !doc.storage_path && (
                    <TouchableOpacity style={styles.docAction} onPress={() => downloadDocx(doc)}>
                      <Text style={styles.docActionTxt}>📝 DOCX</Text>
                    </TouchableOpacity>
                  )}
                  {PEUT_SIGNER(doc.type) && (
                    <TouchableOpacity style={[styles.docAction, styles.docActionSig]} onPress={() => ouvrirSigModal(doc)}>
                      <Text style={styles.docActionTxt}>{allSigned ? '✅ PDF signé' : '✍️ Signatures'}</Text>
                    </TouchableOpacity>
                  )}
                  {doc.storage_path && (
                    <TouchableOpacity style={styles.docAction} onPress={() => ouvrirDocument(doc)}>
                      <Text style={styles.docActionTxt}>Ouvrir ›</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.docDel} onPress={() => supprimerDocument(doc)}>
                    <Text style={styles.docDelTxt}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          })}
        </View>

      </ScrollView>

      {/* ── Modal fin de bail ── */}
      <Modal visible={showFinBailModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Attestation de fin de bail</Text>
            <Text style={styles.modalLabel}>Date de sortie du locataire</Text>
            <TextInput style={styles.modalInput} value={dateSortie} onChangeText={setDateSortie}
              placeholder="JJ/MM/AAAA" keyboardType="numeric" maxLength={10} />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setShowFinBailModal(false)}>
                <Text style={styles.modalBtnSecondaryTxt}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnPrimary} onPress={genererFinBail} disabled={!dateSortie}>
                <Text style={styles.modalBtnPrimaryTxt}>Générer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal caution ── */}
      <Modal visible={showCautionModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={{ padding: 24 }}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Caution solidaire</Text>
              {(['prenom', 'nom', 'adresse', 'telephone', 'email'] as const).map(f => (
                <View key={f}>
                  <Text style={styles.modalLabel}>
                    {f === 'prenom' ? 'Prénom *' : f === 'nom' ? 'Nom *' : f === 'adresse' ? 'Adresse' : f === 'telephone' ? 'Téléphone' : 'Email'}
                  </Text>
                  <TextInput style={styles.modalInput} value={cautionForm[f]}
                    onChangeText={v => setCautionForm(p => ({ ...p, [f]: v }))}
                    autoCapitalize={f === 'nom' ? 'characters' : 'sentences'}
                    keyboardType={f === 'email' ? 'email-address' : f === 'telephone' ? 'phone-pad' : 'default'} />
                </View>
              ))}
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setShowCautionModal(false)}>
                  <Text style={styles.modalBtnSecondaryTxt}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalBtnPrimary} onPress={ajouterCaution}>
                  <Text style={styles.modalBtnPrimaryTxt}>Générer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Modal parcours de signature ── */}
      {sigModal && (
        <Modal visible transparent animationType="slide">
          <View style={styles.overlay}>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <View style={styles.modal}>

                <Text style={styles.modalTitle}>✍️  Parcours de signature</Text>
                <Text style={styles.sigDocNom}>{sigModal.doc.nom}</Text>

                {!sigModal.session ? (
                  /* Pas encore de session */
                  <>
                    <View style={styles.sigParties}>
                      <Text style={styles.sigPartiesTitle}>Signataires :</Text>
                      <View style={styles.sigPartyRow}>
                        <Text>🏠</Text>
                        <Text style={styles.sigPartyName}>{membre?.prenom} {membre?.nom} — Bailleur</Text>
                      </View>
                      {contrat?.locataires && (
                        <View style={styles.sigPartyRow}>
                          <Text>👤</Text>
                          <Text style={styles.sigPartyName}>{contrat.locataires.prenom} {contrat.locataires.nom} — Locataire</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.sigInfo}>
                      Chaque signataire reçoit un lien unique à ouvrir sur son smartphone pour apposer sa signature manuscrite.
                    </Text>
                    <TouchableOpacity style={styles.modalBtnPrimary} onPress={lancerSignature}>
                      <Text style={styles.modalBtnPrimaryTxt}>🚀  Lancer le parcours</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  /* Session active */
                  <>
                    <View style={[styles.statusBanner,
                      sigModal.session.statut === 'complete' ? styles.statusOk :
                      sigModal.session.statut === 'partiel' ? styles.statusPartiel :
                      styles.statusPending]}>
                      <Text style={styles.statusTxt}>
                        {sigModal.session.statut === 'complete' ? '✅ Toutes les signatures collectées' :
                         sigModal.session.statut === 'partiel'  ? '⏳ Signatures partielles' :
                                                                  '🕐 En attente des signatures'}
                      </Text>
                    </View>

                    {sigModal.session.requests.map(req => (
                      <View key={req.id} style={styles.sigCard}>
                        <View style={styles.sigCardHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.sigRole}>{req.role === 'bailleur' ? '🏠 Bailleur' : '👤 Locataire'}</Text>
                            <Text style={styles.sigName}>{req.prenom} {req.nom.toUpperCase()}</Text>
                          </View>
                          <View style={[styles.sigStatut, req.statut === 'signe' ? styles.sigStatutOk : styles.sigStatutPending]}>
                            <Text style={styles.sigStatutTxt}>{req.statut === 'signe' ? '✅ Signé' : '⏳ En attente'}</Text>
                          </View>
                        </View>

                        {req.statut === 'signe' ? (
                          <View style={styles.sigPreview}>
                            {req.signature_data && (
                              <Image source={{ uri: req.signature_data }}
                                style={{ width: 200, height: 60, resizeMode: 'contain' }} />
                            )}
                            <Text style={styles.sigDate}>
                              {req.signed_at ? new Date(req.signed_at).toLocaleString('fr-FR') : ''}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.sigLink}>
                            <Text style={styles.sigLinkLabel}>Lien de signature :</Text>
                            <Text style={styles.sigLinkUrl} numberOfLines={2}>{sigUrl(req.token)}</Text>
                            <View style={styles.sigLinkBtns}>
                              <TouchableOpacity style={styles.copyBtn} onPress={() => copier(req.token)}>
                                <Text style={styles.copyBtnTxt}>{copiedToken === req.token ? '✅ Copié !' : '📋 Copier'}</Text>
                              </TouchableOpacity>
                              {Platform.OS === 'web' && (
                                <TouchableOpacity style={styles.openBtn} onPress={() => window.open(sigUrl(req.token), '_blank')}>
                                  <Text style={styles.openBtnTxt}>Tester ›</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        )}
                      </View>
                    ))}

                    <TouchableOpacity style={styles.refreshBtn} onPress={rafraichirSig}>
                      <Text style={styles.refreshBtnTxt}>↻  Rafraîchir les statuts</Text>
                    </TouchableOpacity>

                    {sigModal.session.statut !== 'en_attente' && (
                      <TouchableOpacity style={[styles.modalBtnPrimary, { backgroundColor: '#16a34a', marginTop: 10 }]}
                        onPress={genererPdfSigne}>
                        <Text style={styles.modalBtnPrimaryTxt}>
                          {sigModal.session.statut === 'complete' ? '📄  Générer le PDF signé' : '📄  Générer PDF (partiel)'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                <TouchableOpacity style={[styles.modalBtnSecondary, { marginTop: 12 }]} onPress={() => setSigModal(null)}>
                  <Text style={styles.modalBtnSecondaryTxt}>Fermer</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}
    </>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 60 },
  backBtn: { marginBottom: 8 },
  backTxt: { fontSize: 16, color: '#2563eb', fontWeight: '500' },
  title: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginBottom: 2 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  empty: { fontSize: 14, color: '#94a3b8', fontStyle: 'italic' },
  meta: { fontSize: 12, color: '#64748b', marginTop: 2 },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: { width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  actionBtnLoading: { opacity: 0.6 },
  actionIcon: { fontSize: 28, marginBottom: 6 },
  actionLabel: { fontSize: 12, fontWeight: '600', color: '#1e293b', textAlign: 'center' },
  uploadBadge: { fontSize: 10, color: '#2563eb', fontWeight: '700', marginTop: 4 },

  docCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  docRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  docIcon: { fontSize: 22 },
  docNom: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  docDate: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  sigBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  sigBadgeOk: { backgroundColor: '#dcfce7' },
  sigBadgePending: { backgroundColor: '#fef9c3' },
  sigBadgeTxt: { fontSize: 14 },
  docActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9', alignItems: 'center' },
  docAction: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#f1f5f9' },
  docActionSig: { backgroundColor: '#f0f9ff' },
  docActionTxt: { fontSize: 12, color: '#2563eb', fontWeight: '600' },
  docDel: { paddingHorizontal: 14, paddingVertical: 9 },
  docDelTxt: { fontSize: 15, color: '#ef4444', fontWeight: '700' },

  cautionRow: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  cautionName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center' },
  modal: { backgroundColor: '#fff', borderRadius: 18, padding: 22, marginHorizontal: 4 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
  modalLabel: { fontSize: 13, color: '#64748b', marginBottom: 4, marginTop: 10 },
  modalInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 15, color: '#1e293b' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalBtnPrimary: { flex: 1, backgroundColor: '#2563eb', borderRadius: 10, padding: 14, alignItems: 'center' },
  modalBtnPrimaryTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalBtnSecondary: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 10, padding: 14, alignItems: 'center' },
  modalBtnSecondaryTxt: { color: '#1e293b', fontWeight: '600', fontSize: 15 },

  sigDocNom: { fontSize: 13, color: '#64748b', marginBottom: 16 },
  sigParties: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 14 },
  sigPartiesTitle: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 8, textTransform: 'uppercase' },
  sigPartyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  sigPartyName: { fontSize: 14, color: '#1e293b', fontWeight: '500' },
  sigInfo: { fontSize: 12.5, color: '#64748b', lineHeight: 19, marginBottom: 16 },

  statusBanner: { borderRadius: 8, padding: 10, marginBottom: 14, alignItems: 'center' },
  statusOk: { backgroundColor: '#dcfce7' },
  statusPartiel: { backgroundColor: '#fef9c3' },
  statusPending: { backgroundColor: '#f1f5f9' },
  statusTxt: { fontSize: 14, fontWeight: '700', color: '#1e293b' },

  sigCard: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 10 },
  sigCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sigRole: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  sigName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  sigStatut: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  sigStatutOk: { backgroundColor: '#dcfce7' },
  sigStatutPending: { backgroundColor: '#fef9c3' },
  sigStatutTxt: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
  sigPreview: { gap: 6 },
  sigDate: { fontSize: 11, color: '#64748b' },
  sigLink: { gap: 8 },
  sigLinkLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  sigLinkUrl: { fontSize: 11, color: '#1e293b', backgroundColor: '#fff', borderRadius: 6, padding: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  sigLinkBtns: { flexDirection: 'row', gap: 8 },
  copyBtn: { backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  copyBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  openBtn: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  openBtnTxt: { color: '#1e293b', fontSize: 13, fontWeight: '600' },
  refreshBtn: { backgroundColor: '#f1f5f9', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 4 },
  refreshBtnTxt: { fontSize: 14, color: '#64748b', fontWeight: '600' },
})
