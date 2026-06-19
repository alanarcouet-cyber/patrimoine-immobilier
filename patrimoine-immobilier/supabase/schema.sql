-- ============================================================
-- SCHÉMA BASE DE DONNÉES - Gestion Patrimoine Immobilier
-- ============================================================

-- Extension UUID
create extension if not exists "uuid-ossp";

-- ============================================================
-- UTILISATEURS & RÔLES
-- ============================================================

create type user_role as enum ('admin', 'bailleur', 'locataire');

create table profiles (
  id uuid references auth.users on delete cascade primary key,
  role user_role not null default 'bailleur',
  nom text not null,
  prenom text not null,
  email text not null,
  telephone text,
  created_at timestamptz default now()
);

-- ============================================================
-- BIENS IMMOBILIERS
-- ============================================================

create type type_location as enum ('nu', 'meuble', 'tourisme');
create type statut_bien as enum ('libre', 'loue', 'en_travaux', 'en_vente');
create type classe_dpe as enum ('A', 'B', 'C', 'D', 'E', 'F', 'G');

create table biens (
  id uuid default uuid_generate_v4() primary key,
  bailleur_id uuid references profiles(id) on delete cascade not null,
  nom text not null,
  adresse text not null,
  code_postal text not null,
  ville text not null,
  type_location type_location not null,
  statut statut_bien not null default 'libre',
  surface_m2 numeric(6,2),
  nb_pieces integer,
  classe_dpe classe_dpe,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table bien_photos (
  id uuid default uuid_generate_v4() primary key,
  bien_id uuid references biens(id) on delete cascade not null,
  url text not null,
  ordre integer default 0,
  created_at timestamptz default now()
);

-- ============================================================
-- LOCATAIRES & CONTRATS
-- ============================================================

create table locataires (
  id uuid default uuid_generate_v4() primary key,
  profile_id uuid references profiles(id),
  nom text not null,
  prenom text not null,
  email text,
  telephone text,
  date_naissance date,
  created_at timestamptz default now()
);

create type statut_contrat as enum ('actif', 'resilie', 'en_attente');

create table contrats (
  id uuid default uuid_generate_v4() primary key,
  bien_id uuid references biens(id) on delete cascade not null,
  locataire_id uuid references locataires(id) not null,
  type_location type_location not null,
  date_debut date not null,
  date_fin date,
  loyer_hc numeric(10,2) not null,
  charges numeric(10,2) default 0,
  depot_garantie numeric(10,2),
  statut statut_contrat not null default 'actif',
  created_at timestamptz default now()
);

create table avenants (
  id uuid default uuid_generate_v4() primary key,
  contrat_id uuid references contrats(id) on delete cascade not null,
  date_effet date not null,
  nouveau_loyer_hc numeric(10,2),
  nouvelles_charges numeric(10,2),
  motif text,
  created_at timestamptz default now()
);

-- ============================================================
-- LOYERS & PAIEMENTS
-- ============================================================

create type statut_loyer as enum ('en_attente', 'paye', 'partiel', 'impaye');

create table loyers (
  id uuid default uuid_generate_v4() primary key,
  contrat_id uuid references contrats(id) on delete cascade not null,
  mois date not null, -- premier jour du mois concerné
  montant_hc numeric(10,2) not null,
  charges numeric(10,2) default 0,
  statut statut_loyer not null default 'en_attente',
  date_paiement date,
  created_at timestamptz default now()
);

-- ============================================================
-- ENTRETIEN & RÉNOVATION
-- ============================================================

create type statut_intervention as enum ('planifie', 'en_cours', 'termine', 'annule');
create type type_intervention as enum ('entretien', 'reparation', 'renovation', 'sinistre');

create table interventions (
  id uuid default uuid_generate_v4() primary key,
  bien_id uuid references biens(id) on delete cascade not null,
  type type_intervention not null,
  titre text not null,
  description text,
  prestataire text,
  date_planifiee date,
  date_realisee date,
  cout numeric(10,2),
  statut statut_intervention not null default 'planifie',
  created_at timestamptz default now()
);

create table intervention_documents (
  id uuid default uuid_generate_v4() primary key,
  intervention_id uuid references interventions(id) on delete cascade not null,
  nom text not null,
  url text not null,
  type text, -- 'devis', 'facture', 'photo'
  created_at timestamptz default now()
);

-- ============================================================
-- DOCUMENTS GÉNÉRÉS
-- ============================================================

create type type_document as enum ('quittance', 'contrat', 'avenant', 'etat_des_lieux');

create table documents (
  id uuid default uuid_generate_v4() primary key,
  contrat_id uuid references contrats(id) on delete cascade,
  bien_id uuid references biens(id),
  type type_document not null,
  nom text not null,
  url text,
  mois date, -- pour les quittances
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table profiles enable row level security;
alter table biens enable row level security;
alter table locataires enable row level security;
alter table contrats enable row level security;
alter table loyers enable row level security;
alter table interventions enable row level security;
alter table documents enable row level security;

-- Bailleur voit uniquement ses biens
create policy "bailleur_ses_biens" on biens
  for all using (bailleur_id = auth.uid());

-- Locataire voit uniquement son contrat actif
create policy "locataire_son_contrat" on contrats
  for select using (
    locataire_id in (
      select id from locataires where profile_id = auth.uid()
    )
  );
