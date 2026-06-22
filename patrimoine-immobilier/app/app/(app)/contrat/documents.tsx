import { useCallback, useEffect, useRef, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Platform, TextInput, Modal
} from 'react-native'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'
import { useAuth } from '../../../src/contexts/AuthContext'
import {
  htmlQuittance, htmlContrat, htmlDevoirsLocataire,
  htmlCaution, htmlEtatLieux, htmlFinBail, imprimerDocument,
  type ContratData,
} from '../../../src/pdf/templates'

// ── Types ────────────────────────────────────────────────────────────────────

type Document = { id: string; type: string; nom: string; storage_path: string | null; mois: string | null; created_at: string }
type Caution  = { id: string; nom: string; prenom: string; adresse?: string; telephone?: string; email?: string }

const TYPE_LABELS: Record<string, { icon: string; label: string }> = {
  quittance:   { icon: '🧾', label: 'Quittance' },
  contrat:     { icon: '📄', label: 'Contrat' },
  devoirs:     { icon: '📋', label: 'Devoirs locataire' },
  caution:     { icon: '🤝', label: 'Caution solidaire' },
  etat_lieux:  { icon: '🔍', label: 'État des lieux' },
  fin_bail:    { icon: '🔑', label: 'Fin de bail' },
  assurance:   { icon: '🛡️', label: 'Assurance' },
  identite:    { icon: '🪪', label: 'Pièce d\'identité' },
}

// ── Composant ────────────────────────────────────────────────────────────────

export default function DocumentsContrat() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { membre } = useAuth()
  const [loading, setLoading] = useState(true)
  const [contrat, setContrat] = useState<any>(null)
  const [loyers, setLoyers] = useState<any[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [cautions, setCautions] = useState<Caution[]>([])
  const [generating, setGenerating] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const uploadType = useRef<string>('assurance')

  // Modals
  const [showFinBailModal, setShowFinBailModal] = useState(false)
  const [dateSortie, setDateSortie] = useState('')
  const [showCautionModal, setShowCautionModal] = useState(false)
  const [cautionForm, setCautionForm] = useState({ nom: '', prenom: '', adresse: '', telephone: '', email: '' })

  useFocusEffect(useCallback(() => { fetchAll() }, [id]))

  async function fetchAll() {
    const [{ data: c }, { data: l }, { data: d }, { data: ca }] = await Promise.all([
      supabase.from('contrats').select('*, biens(*), locataires(*)').eq('id', id).single(),
      supabase.from('loyers').select('*').eq('contrat_id', id).order('mois', { ascending: false }),
      supabase.from('contrat_documents').select('*').eq('contrat_id', id).order('created_at', { ascending: false }),
      supabase.from('cautions').select('*').eq('contrat_id', id),
    ])
    setContrat(c)
    setLoyers(l ?? [])
    setDocuments(d ?? [])
    setCautions(ca ?? [])
    setLoading(false)
  }

  function buildContratData(loyerData?: any): ContratData | null {
    if (!contrat) return null
    const bailleur = {
      nom: membre?.nom ?? 'BAILLEUR',
      prenom: membre?.prenom ?? '',
      adresse: membre?.email ?? '',
      email: membre?.email,
    }
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
      bailleur,
      date_debut: contrat.date_debut,
      date_fin: contrat.date_fin,
      loyer_hc: contrat.loyer_hc,
      charges: contrat.charges,
      depot_garantie: contrat.depot_garantie,
      type_location: contrat.type_location,
      loyer: loyerData,
    }
  }

  // ── Génération PDF ──────────────────────────────────────────────────────────

  async function genererContrat() {
    const d = buildContratData()
    if (!d) return
    setGenerating('contrat')
    imprimerDocument(htmlContrat(d))
    await supabase.from('contrat_documents').insert({ contrat_id: id, type: 'contrat', nom: `Contrat de location — ${d.bien.nom}` })
    await fetchAll()
    setGenerating(null)
  }

  async function genererDevoirs() {
    const d = buildContratData()
    if (!d) return
    setGenerating('devoirs')
    imprimerDocument(htmlDevoirsLocataire(d))
    await supabase.from('contrat_documents').insert({ contrat_id: id, type: 'devoirs', nom: `Devoirs du locataire — ${d.locataires[0]?.nom ?? ''}` })
    await fetchAll()
    setGenerating(null)
  }

  async function genererEtatLieux() {
    const d = buildContratData()
    if (!d) return
    setGenerating('etat_lieux')
    imprimerDocument(htmlEtatLieux(d))
    await supabase.from('contrat_documents').insert({ contrat_id: id, type: 'etat_lieux', nom: `État des lieux d'entrée — ${d.bien.nom}` })
    await fetchAll()
    setGenerating(null)
  }

  async function genererFinBail() {
    const d = buildContratData()
    if (!d || !dateSortie) return
    setGenerating('fin_bail')
    imprimerDocument(htmlFinBail(d, dateSortie))
    await supabase.from('contrat_documents').insert({ contrat_id: id, type: 'fin_bail', nom: `Attestation fin de bail — ${dateSortie}` })
    await fetchAll()
    setShowFinBailModal(false)
    setGenerating(null)
  }

  async function choisirEtGenererQuittance() {
    if (loyers.length === 0) {
      Alert.alert('Aucun loyer', 'Générez d\'abord des loyers pour ce contrat.')
      return
    }
    Alert.alert(
      'Choisir la période',
      'Sélectionnez le loyer dont vous souhaitez générer la quittance :',
      loyers.map(l => ({
        text: `${['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][parseInt(l.mois.split('-')[1]) - 1]} ${l.mois.split('-')[0]} — ${(l.montant_hc + l.charges).toFixed(0)} €`,
        onPress: () => genererQuittance(l),
      }))
    )
  }

  async function genererQuittance(loyer: any) {
    const d = buildContratData({
      mois: loyer.mois,
      montant_hc: loyer.montant_hc,
      charges: loyer.charges,
      date_paiement: loyer.date_paiement,
    })
    if (!d) return
    setGenerating('quittance')
    imprimerDocument(htmlQuittance(d))
    await supabase.from('contrat_documents').insert({
      contrat_id: id, type: 'quittance',
      nom: `Quittance ${loyer.mois}`, mois: loyer.mois,
    })
    await fetchAll()
    setGenerating(null)
  }

  async function ajouterCaution() {
    if (!cautionForm.nom || !cautionForm.prenom) {
      Alert.alert('Erreur', 'Nom et prénom obligatoires')
      return
    }
    await supabase.from('cautions').insert({ contrat_id: id, ...cautionForm })
    const d = buildContratData()
    if (d) {
      imprimerDocument(htmlCaution(d, cautionForm))
      await supabase.from('contrat_documents').insert({
        contrat_id: id, type: 'caution',
        nom: `Caution solidaire — ${cautionForm.prenom} ${cautionForm.nom}`,
      })
    }
    setCautionForm({ nom: '', prenom: '', adresse: '', telephone: '', email: '' })
    setShowCautionModal(false)
    await fetchAll()
  }

  // ── Upload fichiers ─────────────────────────────────────────────────────────

  function declencherUpload(type: string) {
    uploadType.current = type
    if (Platform.OS === 'web') {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*,application/pdf'
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0]
        if (!file) return
        await uploaderFichier(file, type)
      }
      input.click()
    }
  }

  async function uploaderFichier(file: File, type: string) {
    setGenerating(type)
    const ext = file.name.split('.').pop()
    const path = `${id}/${type}_${Date.now()}.${ext}`
    const { error: uploadErr } = await supabase.storage.from('contrat-docs').upload(path, file)
    if (uploadErr) { Alert.alert('Erreur upload', uploadErr.message); setGenerating(null); return }
    await supabase.from('contrat_documents').insert({
      contrat_id: id, type, nom: file.name, storage_path: path,
    })
    await fetchAll()
    setGenerating(null)
  }

  async function ouvrirDocument(doc: Document) {
    if (doc.storage_path) {
      const { data } = await supabase.storage.from('contrat-docs').createSignedUrl(doc.storage_path, 3600)
      if (data?.signedUrl && Platform.OS === 'web') window.open(data.signedUrl, '_blank')
    }
  }

  async function supprimerDocument(doc: Document) {
    Alert.alert('Supprimer', `Supprimer "${doc.nom}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        if (doc.storage_path) await supabase.storage.from('contrat-docs').remove([doc.storage_path])
        await supabase.from('contrat_documents').delete().eq('id', doc.id)
        await fetchAll()
      }},
    ])
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />

  const docsByType = documents.reduce<Record<string, Document[]>>((acc, d) => {
    acc[d.type] = [...(acc[d.type] ?? []), d]
    return acc
  }, {})

  // ── Actions disponibles ────────────────────────────────────────────────────
  const ACTIONS = [
    { type: 'contrat',    label: 'Contrat de location',         icon: '📄', onPress: genererContrat },
    { type: 'devoirs',   label: 'Devoirs du locataire',         icon: '📋', onPress: genererDevoirs },
    { type: 'etat_lieux',label: "État des lieux d'entrée",      icon: '🔍', onPress: genererEtatLieux },
    { type: 'caution',   label: 'Caution solidaire',            icon: '🤝', onPress: () => setShowCautionModal(true) },
    { type: 'quittance', label: 'Quittance de loyer',           icon: '🧾', onPress: choisirEtGenererQuittance },
    { type: 'fin_bail',  label: 'Attestation fin de bail',      icon: '🔑', onPress: () => setShowFinBailModal(true) },
    { type: 'assurance', label: 'Joindre attestation assurance', icon: '🛡️', onPress: () => declencherUpload('assurance'), upload: true },
    { type: 'identite',  label: "Joindre pièce d'identité",     icon: '🪪', onPress: () => declencherUpload('identite'), upload: true },
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

        {/* Cautions existantes */}
        {cautions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🤝 Cautions solidaires</Text>
            {cautions.map(c => (
              <View key={c.id} style={styles.cautionRow}>
                <Text style={styles.cautionName}>{c.prenom} {c.nom.toUpperCase()}</Text>
                {c.adresse && <Text style={styles.cautionMeta}>{c.adresse}</Text>}
                {c.telephone && <Text style={styles.cautionMeta}>📞 {c.telephone}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Actions de génération */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Générer / Joindre un document</Text>
          <View style={styles.actionsGrid}>
            {ACTIONS.map(a => (
              <TouchableOpacity
                key={a.type}
                style={[styles.actionBtn, generating === a.type && styles.actionBtnLoading]}
                onPress={a.onPress}
                disabled={generating !== null}
              >
                <Text style={styles.actionIcon}>{a.icon}</Text>
                <Text style={styles.actionLabel}>{a.label}</Text>
                {a.upload && <Text style={styles.uploadBadge}>Upload</Text>}
                {generating === a.type && <ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 4 }} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Documents générés / uploadés */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documents ({documents.length})</Text>
          {documents.length === 0 && (
            <Text style={styles.empty}>Aucun document généré pour l'instant</Text>
          )}
          {documents.map(doc => {
            const cfg = TYPE_LABELS[doc.type] ?? { icon: '📁', label: doc.type }
            return (
              <TouchableOpacity
                key={doc.id}
                style={styles.docRow}
                onPress={() => doc.storage_path ? ouvrirDocument(doc) : null}
              >
                <Text style={styles.docIcon}>{cfg.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docNom}>{doc.nom}</Text>
                  <Text style={styles.docDate}>
                    {cfg.label} · {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                {doc.storage_path && <Text style={styles.docOpen}>Ouvrir ›</Text>}
                <TouchableOpacity onPress={() => supprimerDocument(doc)} style={styles.docDel}>
                  <Text style={styles.docDelTxt}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>

      {/* Modal fin de bail */}
      <Modal visible={showFinBailModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Attestation de fin de bail</Text>
            <Text style={styles.modalLabel}>Date de sortie du locataire</Text>
            <TextInput
              style={styles.modalInput}
              value={dateSortie}
              onChangeText={setDateSortie}
              placeholder="JJ/MM/AAAA"
              keyboardType="numeric"
              maxLength={10}
            />
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

      {/* Modal caution */}
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
                  <TextInput
                    style={styles.modalInput}
                    value={cautionForm[f]}
                    onChangeText={v => setCautionForm(prev => ({ ...prev, [f]: v }))}
                    placeholder={f === 'prenom' ? 'Jean' : f === 'nom' ? 'DUPONT' : ''}
                    autoCapitalize={f === 'nom' ? 'characters' : 'sentences'}
                    keyboardType={f === 'email' ? 'email-address' : f === 'telephone' ? 'phone-pad' : 'default'}
                  />
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
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 60 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backTxt: { fontSize: 16, color: '#2563eb', fontWeight: '500' },
  title: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginBottom: 2 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: { width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  actionBtnLoading: { opacity: 0.6 },
  actionIcon: { fontSize: 28, marginBottom: 6 },
  actionLabel: { fontSize: 12, fontWeight: '600', color: '#1e293b', textAlign: 'center' },
  uploadBadge: { fontSize: 10, color: '#2563eb', fontWeight: '700', marginTop: 4 },

  docRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0', gap: 10 },
  docIcon: { fontSize: 22 },
  docNom: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  docDate: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  docOpen: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  docDel: { padding: 6 },
  docDelTxt: { fontSize: 14, color: '#ef4444', fontWeight: '700' },
  empty: { fontSize: 14, color: '#94a3b8', fontStyle: 'italic' },

  cautionRow: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  cautionName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  cautionMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: '#fff', borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 16 },
  modalLabel: { fontSize: 13, color: '#64748b', marginBottom: 4, marginTop: 12 },
  modalInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 15, color: '#1e293b' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalBtnPrimary: { flex: 1, backgroundColor: '#2563eb', borderRadius: 10, padding: 14, alignItems: 'center' },
  modalBtnPrimaryTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalBtnSecondary: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 10, padding: 14, alignItems: 'center' },
  modalBtnSecondaryTxt: { color: '#1e293b', fontWeight: '600', fontSize: 15 },
})
