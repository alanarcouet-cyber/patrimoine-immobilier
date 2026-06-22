// Utilitaires partagés pour la génération PDF

export const MOIS_FR = [
  'janvier','février','mars','avril','mai','juin',
  'juillet','août','septembre','octobre','novembre','décembre',
]

export function formatDate(iso: string): string {
  if (!iso) return ''
  const [a, m, j] = iso.split('-')
  return `${j}/${m}/${a}`
}

export function formatMoisLabel(mois: string): string {
  const [annee, m] = mois.split('-')
  return `${MOIS_FR[parseInt(m) - 1]} ${annee}`
}

export function dateAujourdhui(): string {
  const d = new Date()
  const j = String(d.getDate()).padStart(2, '0')
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const a = d.getFullYear()
  return `${j}/${m}/${a}`
}

export function moisCourant(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Couleurs
export const BLEU = '#1e3a5f'
export const BLEU_CLAIR = '#2563eb'
export const GRIS = '#64748b'
export const GRIS_CLAIR = '#f8fafc'
export const BORDURE = '#e2e8f0'
