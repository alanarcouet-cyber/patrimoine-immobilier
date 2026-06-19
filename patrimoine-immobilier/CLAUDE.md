# Projet : Gestion de Patrimoine Immobilier

## Objectif
Application de gestion de biens immobiliers couvrant trois régimes locatifs :
- Location nue (non meublée)
- Location meublée (LMNP / LMP)
- Location de tourisme (type Airbnb)

## Stack technique
- **Frontend** : Expo (React Native Web + Android)
- **Backend / BDD** : Supabase (PostgreSQL + Auth + API REST)
- **Déploiement web** : Vercel
- **Déploiement Android** : Google Play via EAS Build

## Dépôt GitHub
https://github.com/alanarcouet-cyber/patrimoine-immobilier

---

## Cahier des charges

### Utilisateurs & rôles
| Rôle | Accès |
|------|-------|
| **Admin** | Accès total, gestion des utilisateurs, configuration |
| **Bailleur** | Gestion de ses biens, locataires, loyers, documents |
| **Locataire** | Consultation de son contrat, quittances, signalement |

### Volume
- Environ **50 biens** à gérer

### Modules (par priorité)

#### 1. Biens immobiliers
- Fiche bien : adresse, type (nu / meublé / tourisme), surface, DPE
- Photos
- Statut : libre / loué / en travaux

#### 2. Suivi entretien & rénovation
- Interventions planifiées et réalisées
- Devis et factures associés
- Prestataires (plombier, électricien...)
- Historique par bien

#### 3. Locataires & contrats
- Fiche locataire : identité, contacts, documents d'identité
- Contrat de location (nu / meublé / tourisme)
- Avenants au contrat
- Historique des occupants par bien

#### 4. Suivi des loyers & paiements
- Appel de loyer mensuel automatique
- Enregistrement des paiements
- Détection des impayés
- Historique des paiements

#### 5. Documents (génération PDF)
- Quittance de loyer
- Contrat de location
- Avenant au contrat
- État des lieux (entrée / sortie)

#### 6. Fiscalité
- Revenus par bien et par régime
- Micro-foncier / Réel (location nue)
- LMNP / LMP (location meublée)
- Export récapitulatif annuel

### Notifications
- Rappel loyer impayé (J+5, J+15, J+30)
- Échéance de contrat approchante (3 mois avant)
- Révision annuelle de loyer (IRL)
- Intervention d'entretien planifiée

---

## État d'avancement
- [x] Choix de la stack
- [x] Dépôt GitHub créé et poussé
- [x] Hook SessionStart git pull configuré
- [x] Cahier des charges formalisé
- [ ] Initialisation du projet Expo
- [ ] Modélisation base de données Supabase
- [ ] Système d'authentification & rôles
- [ ] Module Biens
- [ ] Module Entretien
- [ ] Module Locataires & Contrats
- [ ] Module Loyers
- [ ] Génération PDF
- [ ] Fiscalité
- [ ] Notifications

## Conventions
- Langue : français
- Commits en français
- Un module = une branche git
