export type UserRole = 'admin' | 'bailleur' | 'locataire'
export type TypeLocation = 'nu' | 'meuble' | 'tourisme'
export type StatutBien = 'libre' | 'loue' | 'en_travaux' | 'en_vente'
export type ClasseDPE = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
export type StatutContrat = 'actif' | 'resilie' | 'en_attente'
export type StatutLoyer = 'en_attente' | 'paye' | 'partiel' | 'impaye'
export type StatutIntervention = 'planifie' | 'en_cours' | 'termine' | 'annule'
export type TypeIntervention = 'entretien' | 'reparation' | 'renovation' | 'sinistre'
export type TypeDocument = 'quittance' | 'contrat' | 'avenant' | 'etat_des_lieux'

export interface Profile {
  id: string
  role: UserRole
  nom: string
  prenom: string
  email: string
  telephone?: string
  created_at: string
}

export interface Bien {
  id: string
  bailleur_id: string
  nom: string
  adresse: string
  code_postal: string
  ville: string
  type_location: TypeLocation
  statut: StatutBien
  surface_m2?: number
  nb_pieces?: number
  classe_dpe?: ClasseDPE
  description?: string
  created_at: string
  updated_at: string
}

export interface Locataire {
  id: string
  profile_id?: string
  nom: string
  prenom: string
  email?: string
  telephone?: string
  date_naissance?: string
}

export interface Contrat {
  id: string
  bien_id: string
  locataire_id: string
  type_location: TypeLocation
  date_debut: string
  date_fin?: string
  loyer_hc: number
  charges: number
  depot_garantie?: number
  statut: StatutContrat
  created_at: string
}

export interface Loyer {
  id: string
  contrat_id: string
  mois: string
  montant_hc: number
  charges: number
  statut: StatutLoyer
  date_paiement?: string
}

export interface Intervention {
  id: string
  bien_id: string
  type: TypeIntervention
  titre: string
  description?: string
  prestataire?: string
  date_planifiee?: string
  date_realisee?: string
  cout?: number
  statut: StatutIntervention
}
