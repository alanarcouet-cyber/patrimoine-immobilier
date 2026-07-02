// Génération de documents via HTML → impression navigateur (window.print → Save as PDF)
// Compatible web (Chrome desktop + Android), aucune dépendance native

import { formatDate, formatMoisLabel, dateAujourdhui, MOIS_FR } from './pdfUtils'

export type ContratData = {
  id: string
  bien: {
    nom: string
    adresse: string
    complement?: string
    ville: string
    cp: string
    surface?: number
    type_location: string
    dpe?: string
  }
  locataires: {
    nom: string
    prenom: string
    email?: string
    telephone?: string
    date_naissance?: string
    adresse?: string
  }[]
  bailleur: {
    nom: string
    prenom: string
    adresse: string
    email?: string
    telephone?: string
  }
  date_debut: string
  date_fin?: string
  loyer_hc: number
  charges: number
  depot_garantie?: number
  type_location: string
  loyer?: { mois: string; montant_hc: number; charges: number; date_paiement?: string }
  cautions?: { nom: string; prenom: string; adresse?: string }[]
}

// ─── CSS commun ──────────────────────────────────────────────────────────────

const CSS_BASE = `
  @page { size: A4; margin: 2cm; }
  * { box-sizing: border-box; font-family: 'Times New Roman', serif; }
  body { font-size: 11pt; color: #111; line-height: 1.5; }
  h1 { font-size: 15pt; text-align: center; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  h2 { font-size: 12pt; margin-top: 18px; margin-bottom: 4px; text-decoration: underline; }
  h3 { font-size: 11pt; margin-top: 12px; margin-bottom: 2px; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .italic { font-style: italic; }
  .small { font-size: 9pt; color: #555; }
  .separator { border: none; border-top: 1px solid #aaa; margin: 14px 0; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  td, th { border: 1px solid #999; padding: 5px 8px; font-size: 10.5pt; }
  th { background: #e8e8e8; font-weight: bold; text-align: left; }
  .montant { font-size: 16pt; font-weight: bold; color: #1a3a6e; }
  .logo-zone { border-bottom: 3px solid #1a3a6e; margin-bottom: 16px; padding-bottom: 8px; }
  .signature-zone { display: flex; justify-content: space-between; margin-top: 40px; }
  .signature-box { width: 45%; border-top: 1px solid #333; padding-top: 6px; font-size: 9.5pt; }
  .mention-legale { font-size: 8.5pt; color: #555; margin-top: 20px; border-top: 1px solid #ccc; padding-top: 8px; }
  ul { margin: 4px 0; padding-left: 18px; }
  li { margin-bottom: 3px; }
  .indent { margin-left: 20px; }
  @media print { body { margin: 0; } }
`

function htmlPage(titre: string, body: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <title>${titre}</title>
  <style>${CSS_BASE}</style></head>
  <body onload="window.print()">
  ${body}
  </body></html>`
}

function nomLocataire(l: ContratData['locataires'][0]) {
  return `${l.prenom} ${l.nom.toUpperCase()}`
}

function adresseBien(b: ContratData['bien']) {
  return `${b.adresse}${b.complement ? ', ' + b.complement : ''}, ${b.cp} ${b.ville}`
}

const TYPE_LABELS: Record<string, string> = {
  nu: 'location nue (non meublée)',
  meuble: 'location meublée',
  tourisme: 'location saisonnière (tourisme)',
}

// ─── 1. QUITTANCE DE LOYER ───────────────────────────────────────────────────

export function htmlQuittance(d: ContratData): string {
  const loyer = d.loyer!
  const total = loyer.montant_hc + loyer.charges
  const moisLabel = formatMoisLabel(loyer.mois)
  const locataire = d.locataires[0]

  return htmlPage(`Quittance de loyer — ${moisLabel}`, `
    <div class="logo-zone">
      <div class="bold" style="font-size:13pt;">${d.bailleur.prenom} ${d.bailleur.nom.toUpperCase()}</div>
      <div class="small">${d.bailleur.adresse}${d.bailleur.email ? ' · ' + d.bailleur.email : ''}</div>
    </div>

    <h1>Quittance de Loyer</h1>
    <p class="center italic">pour le mois de <strong>${moisLabel}</strong></p>
    <hr class="separator">

    <table>
      <tr><th>Bien loué</th><td>${d.bien.nom} — ${adresseBien(d.bien)}</td></tr>
      <tr><th>Locataire(s)</th><td>${d.locataires.map(nomLocataire).join(', ')}</td></tr>
      <tr><th>Période</th><td>${moisLabel}</td></tr>
    </table>

    <table style="margin-top:12px;">
      <tr><th>Loyer hors charges</th><td style="text-align:right;">${loyer.montant_hc.toFixed(2)} €</td></tr>
      <tr><th>Charges</th><td style="text-align:right;">${loyer.charges.toFixed(2)} €</td></tr>
      <tr><th class="bold">TOTAL</th><td style="text-align:right;"><span class="montant">${total.toFixed(2)} €</span></td></tr>
    </table>

    <p style="margin-top:16px;">
      Je soussigné(e) <strong>${d.bailleur.prenom} ${d.bailleur.nom.toUpperCase()}</strong>, bailleur du logement
      situé au <strong>${adresseBien(d.bien)}</strong>, déclare avoir reçu de
      <strong>${d.locataires.map(nomLocataire).join(' et ')}</strong> la somme de
      <strong>${total.toFixed(2)} euros</strong> (${total.toFixed(2)} €) correspondant au règlement du loyer et des charges
      du mois de <strong>${moisLabel}</strong>.
    </p>

    ${loyer.date_paiement ? `<p>Date de paiement : <strong>${formatDate(loyer.date_paiement)}</strong></p>` : ''}

    <div class="signature-zone">
      <div class="signature-box">
        Fait à __________, le ${dateAujourdhui()}<br><br>
        Signature du bailleur<br><br><br>
      </div>
    </div>

    <p class="mention-legale">
      Cette quittance annule tous les reçus qui auraient pu être établis précédemment en paiement du même terme.
      Le bailleur est tenu de remettre gratuitement une quittance au locataire qui en fait la demande (Loi n°89-462 du 6 juillet 1989, art. 21).
    </p>
  `)
}

// ─── 2. CONTRAT DE LOCATION ──────────────────────────────────────────────────

export function htmlContrat(d: ContratData): string {
  const typeLabel = TYPE_LABELS[d.type_location] ?? d.type_location
  const total = d.loyer_hc + d.charges
  const duree = d.type_location === 'meuble' ? '1 an' : d.type_location === 'nu' ? '3 ans' : 'voir conditions'

  return htmlPage('Contrat de Location', `
    <div class="logo-zone">
      <div class="bold" style="font-size:13pt;">${d.bailleur.prenom} ${d.bailleur.nom.toUpperCase()}</div>
      <div class="small">${d.bailleur.adresse}</div>
    </div>

    <h1>Contrat de Location</h1>
    <p class="center italic">${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}</p>
    <hr class="separator">

    <h2>Article 1 — Parties</h2>
    <p><strong>Le Bailleur :</strong><br>
    ${d.bailleur.prenom} ${d.bailleur.nom.toUpperCase()}<br>
    ${d.bailleur.adresse}<br>
    ${d.bailleur.email ? 'Email : ' + d.bailleur.email + '<br>' : ''}
    ${d.bailleur.telephone ? 'Tél. : ' + d.bailleur.telephone : ''}
    </p>

    <p><strong>Le(s) Locataire(s) :</strong><br>
    ${d.locataires.map(l => `
      ${nomLocataire(l)}
      ${l.date_naissance ? ', né(e) le ' + formatDate(l.date_naissance) : ''}
      ${l.adresse ? '<br>' + l.adresse : ''}
      ${l.email ? '<br>Email : ' + l.email : ''}
      ${l.telephone ? '<br>Tél. : ' + l.telephone : ''}
    `).join('<hr style="border-style:dashed;margin:6px 0;">')}
    </p>

    <h2>Article 2 — Objet</h2>
    <p>Le bailleur loue au(x) locataire(s) les locaux à usage d'habitation principale ci-après désignés,
    dans le cadre d'une <strong>${typeLabel}</strong>.</p>

    <h2>Article 3 — Description du logement</h2>
    <table>
      <tr><th>Bien</th><td>${d.bien.nom}</td></tr>
      <tr><th>Adresse</th><td>${adresseBien(d.bien)}</td></tr>
      ${d.bien.surface ? `<tr><th>Surface habitable</th><td>${d.bien.surface} m²</td></tr>` : ''}
      ${d.bien.dpe ? `<tr><th>Classe énergétique (DPE)</th><td>${d.bien.dpe}</td></tr>` : ''}
    </table>

    <h2>Article 4 — Durée du bail</h2>
    <p>Le présent bail est consenti pour une durée de <strong>${duree}</strong>,
    à compter du <strong>${formatDate(d.date_debut)}</strong>
    ${d.date_fin ? `jusqu'au <strong>${formatDate(d.date_fin)}</strong>` : "(reconduction tacite à l'échéance)"}.
    </p>

    <h2>Article 5 — Loyer et charges</h2>
    <table>
      <tr><th>Loyer mensuel hors charges</th><td><strong>${d.loyer_hc.toFixed(2)} €</strong></td></tr>
      <tr><th>Charges mensuelles (provision)</th><td>${d.charges.toFixed(2)} €</td></tr>
      <tr><th>Total mensuel</th><td><strong>${total.toFixed(2)} €</strong></td></tr>
      ${d.depot_garantie ? `<tr><th>Dépôt de garantie</th><td>${d.depot_garantie.toFixed(2)} €</td></tr>` : ''}
    </table>
    <p>Le loyer est payable le <strong>1er de chaque mois</strong>, d'avance.</p>

    <h2>Article 6 — Obligations du bailleur</h2>
    <p>Le bailleur s'oblige à :</p>
    <ul>
      <li>Délivrer un logement décent et en bon état d'usage ;</li>
      <li>Assurer la jouissance paisible du logement ;</li>
      <li>Entretenir les locaux en état de servir à l'usage prévu ;</li>
      <li>Effectuer les réparations autres que locatives.</li>
    </ul>

    <h2>Article 7 — Obligations du locataire</h2>
    <p>Le(s) locataire(s) s'oblige(nt) à :</p>
    <ul>
      <li>Payer le loyer et les charges aux termes convenus ;</li>
      <li>User paisiblement des locaux ;</li>
      <li>Répondre des dégradations survenant en cours de bail ;</li>
      <li>Souscrire une assurance habitation et en justifier chaque année ;</li>
      <li>Ne pas transformer les locaux sans accord écrit du bailleur ;</li>
      <li>Permettre l'accès aux lieux pour les réparations urgentes.</li>
    </ul>

    <h2>Article 8 — Révision du loyer</h2>
    <p>Le loyer pourra être révisé chaque année à la date anniversaire du bail, selon l'évolution
    de l'Indice de Référence des Loyers (IRL) publié par l'INSEE.</p>

    <h2>Article 9 — Clause résolutoire</h2>
    <p>Le présent contrat sera résilié de plein droit, après commandement d'huissier demeuré infructueux
    un mois, pour défaut de paiement du loyer ou des charges, ou pour défaut d'assurance.</p>

    <div class="signature-zone" style="margin-top:50px;">
      <div class="signature-box">
        Le Bailleur<br>
        ${d.bailleur.prenom} ${d.bailleur.nom.toUpperCase()}<br>
        Fait à __________, le ${dateAujourdhui()}<br><br><br>
        <em>(Signature précédée de la mention "Lu et approuvé")</em>
      </div>
      <div class="signature-box">
        Le(s) Locataire(s)<br>
        ${d.locataires.map(nomLocataire).join(', ')}<br>
        Fait à __________, le ${dateAujourdhui()}<br><br><br>
        <em>(Signature précédée de la mention "Lu et approuvé")</em>
      </div>
    </div>

    <p class="mention-legale">
      Contrat soumis à la loi n°89-462 du 6 juillet 1989 tendant à améliorer les rapports locatifs.
    </p>
  `)
}

// ─── 3. DEVOIRS DU LOCATAIRE ─────────────────────────────────────────────────

export function htmlDevoirsLocataire(d: ContratData): string {
  return htmlPage('Les Devoirs du Locataire', `
    <div class="logo-zone">
      <div class="bold" style="font-size:13pt;">${d.bailleur.prenom} ${d.bailleur.nom.toUpperCase()}</div>
      <div class="small">${d.bailleur.adresse}</div>
    </div>

    <h1>Les Devoirs du Locataire</h1>
    <p class="center small">Annexe au contrat de location — Bien : ${d.bien.nom} — Locataire(s) : ${d.locataires.map(nomLocataire).join(', ')}</p>
    <hr class="separator">

    <h2>Entretien courant et menues réparations</h2>
    <p>Le locataire est responsable des dégradations ou pertes qui pourraient survenir en cours de bail dans le logement, à moins qu'il ne prouve qu'elles ont eu lieu par effraction, cas de force majeure, ou par la faute du bailleur. Il doit veiller à maintenir en l'état le logement qu'il occupe. À ce titre, il doit assurer l'entretien courant du logement et de ses éléments d'équipement. Il doit ainsi prendre à sa charge les menues réparations et les réparations locatives, sauf si elles sont occasionnées par la vétusté, malfaçon, vice de construction, cas fortuit ou de force majeure.</p>

    <h2>Parties extérieures</h2>
    <h3>Jardin privatif</h3>
    <p>L'entretien courant du jardin est à la charge du locataire, notamment :</p>
    <ul>
      <li>Les allées (désherbage, nettoyage…)</li>
      <li>La pelouse (tonte…)</li>
      <li>Les massifs (arrosage, taille…)</li>
      <li>Les bassins et piscine (nettoyage…)</li>
      <li>Les arbres, arbustes et haies (taille, élagage, échenillage, remplacement et réparation des installations d'arrosage…)</li>
    </ul>

    <h3>Auvent, Marquise, Terrasse et Courette</h3>
    <p>L'entretien des auvents, terrasses et marquises suppose un nettoyage régulier, notamment l'enlèvement de la mousse et de tous autres végétaux qui s'y sont éventuellement développés.</p>

    <h3>Gouttières</h3>
    <p>Les conduits de descentes d'eaux pluviales, chéneaux et gouttières doivent être dégorgés par le locataire.</p>

    <h2>Portes et fenêtres</h2>
    <h3>Mécanisme d'ouverture/fermeture</h3>
    <p>Le bon fonctionnement des portes et fenêtres doit être assuré par le locataire. À ce titre, il doit notamment réaliser : le graissage des gonds et charnières, les menues réparations des boutons et poignées de portes, le remplacement des petites pièces des serrures, le remplacement des clefs égarées ou abîmées.</p>

    <h3>Vitrages</h3>
    <ul><li>La réfection des mastics</li><li>Le remplacement des vitres détériorées</li></ul>

    <h3>Stores et volets</h3>
    <p>Les stores doivent être entretenus par le locataire : graissage du mécanisme, remplacement de cordes, poulies ou de quelques lames de stores.</p>

    <h2>Parties intérieures</h2>
    <h3>Plafonds, murs, cloisons</h3>
    <ul>
      <li>Les menus raccords de peintures et tapisseries</li>
      <li>La remise en place ou le remplacement des matériaux de revêtement</li>
      <li>Le rebouchage des trous éventuellement faits</li>
    </ul>

    <h3>Revêtements de sol</h3>
    <ul>
      <li>Le cirage du parquet, l'entretien courant de la vitrification</li>
      <li>Le remplacement de quelques lames de parquet</li>
      <li>La pose de raccords de moquette ou autre revêtement</li>
    </ul>

    <h2>Plomberie</h2>
    <ul>
      <li>Canalisations d'eau : dégorgement, remplacement de joints et colliers</li>
      <li>Fosses septiques : vidange à la charge du locataire</li>
      <li>Chaudière individuelle : entretien annuel à la charge du locataire</li>
      <li>Éviers et appareils sanitaires : nettoyage des dépôts de calcaire, remplacement des tuyaux flexibles de douche</li>
    </ul>

    <h2>Électricité</h2>
    <p>Relèvent des réparations locatives : le remplacement des interrupteurs, prises de courant, coupe-circuits et fusibles, ampoules, tubes lumineux, luminaires LED intégrés, baguettes ou gaines de protection.</p>

    <div class="signature-zone" style="margin-top:40px;">
      <div class="signature-box">
        Le Bailleur<br>${d.bailleur.prenom} ${d.bailleur.nom.toUpperCase()}<br><br>
        Signature :<br><br><br>
      </div>
      <div class="signature-box">
        Le(s) Locataire(s)<br>${d.locataires.map(nomLocataire).join(', ')}<br><br>
        Signature :<br><br><br>
      </div>
    </div>
    <p class="mention-legale">
      Document établi conformément au Décret n°87-712 du 26 août 1987 fixant la liste des réparations locatives.
    </p>
  `)
}

// ─── 4. ENGAGEMENT DE CAUTION SOLIDAIRE ──────────────────────────────────────

export function htmlCaution(d: ContratData, caution: { nom: string; prenom: string; adresse?: string; telephone?: string; email?: string }): string {
  const total = d.loyer_hc + d.charges
  return htmlPage('Acte de Cautionnement Solidaire', `
    <div class="logo-zone">
      <div class="bold" style="font-size:13pt;">${d.bailleur.prenom} ${d.bailleur.nom.toUpperCase()}</div>
      <div class="small">${d.bailleur.adresse}</div>
    </div>

    <h1>Acte de Cautionnement Solidaire</h1>
    <p class="center small italic">(Loi n°89-462 du 6 juillet 1989 — article 22-1)</p>
    <hr class="separator">

    <p>Je soussigné(e), <strong>${caution.prenom} ${caution.nom.toUpperCase()}</strong>${caution.adresse ? ', demeurant ' + caution.adresse : ''},</p>

    <p>déclare me porter caution solidaire de :</p>
    <p class="indent"><strong>${d.locataires.map(nomLocataire).join(' et ')}</strong>,</p>
    <p>locataire(s) du logement situé : <strong>${adresseBien(d.bien)}</strong>,</p>
    <p>dans le cadre du contrat de location à effet du <strong>${formatDate(d.date_debut)}</strong>.</p>

    <h2>Étendue de l'engagement</h2>
    <p>Je m'engage à payer solidairement avec le(s) locataire(s) les sommes dues au titre :</p>
    <ul>
      <li>Du loyer mensuel hors charges : <strong>${d.loyer_hc.toFixed(2)} €</strong></li>
      <li>Des charges mensuelles : <strong>${d.charges.toFixed(2)} €</strong></li>
      <li>Soit un total mensuel de : <strong>${total.toFixed(2)} €</strong></li>
      ${d.depot_garantie ? `<li>Du dépôt de garantie : <strong>${d.depot_garantie.toFixed(2)} €</strong></li>` : ''}
    </ul>
    <p>Ainsi que de tous accessoires (indemnités d'occupation, frais de remise en état, etc.) dus au bailleur.</p>

    <h2>Durée de l'engagement</h2>
    <p>Le présent cautionnement est consenti pour la durée du bail et de ses renouvellements ou reconductions, jusqu'à la libération des lieux par le locataire, avec mainlevée de toutes obligations.</p>

    <h2>Mentions manuscrites obligatoires</h2>
    <p class="small italic">Le(la) caution doit recopier de sa main les mentions suivantes :</p>
    <div style="border:1px solid #aaa; padding:10px; margin:10px 0; background:#fafafa; font-style:italic;">
      <p>« En me portant caution de ${d.locataires.map(nomLocataire).join(' et ')}, dans la limite de la somme couvrant ${d.type_location === 'meuble' ? '12' : '36'} mois de loyer et de charges soit ${(total * (d.type_location === 'meuble' ? 12 : 36)).toFixed(2)} euros au titre de ${formatDate(d.date_debut)}, je m'engage à rembourser le bailleur sans pouvoir exiger qu'il poursuive préalablement le locataire. »</p>
    </div>

    <p>Mention manuscrite de la caution :</p>
    <div style="border:1px solid #aaa; min-height:80px; margin:8px 0; padding:6px;"></div>

    <div class="signature-zone" style="margin-top:30px;">
      <div class="signature-box">
        La Caution<br>${caution.prenom} ${caution.nom.toUpperCase()}<br>
        Fait à __________, le ${dateAujourdhui()}<br><br>
        Signature :<br><br><br>
        <em>(Précédée de la mention "Lu et approuvé — Bon pour cautionnement solidaire")</em>
      </div>
      <div class="signature-box">
        Le Bailleur<br>${d.bailleur.prenom} ${d.bailleur.nom.toUpperCase()}<br>
        Fait à __________, le ${dateAujourdhui()}<br><br>
        Signature :<br><br><br>
      </div>
    </div>
    <p class="mention-legale">Acte établi conformément à la loi n°89-462 du 6 juillet 1989 (art. 22-1) et la loi ALUR du 24 mars 2014.</p>
  `)
}

// ─── 5. ÉTAT DES LIEUX D'ENTRÉE ──────────────────────────────────────────────

export function htmlEtatLieux(d: ContratData): string {
  const pieces = [
    'Entrée / couloir', 'Salon / séjour', 'Cuisine', 'Chambre 1', 'Chambre 2',
    'Salle de bain', 'WC', 'Cellier / buanderie', 'Garage / cave', 'Jardin / extérieur',
  ]
  const etats = ['Très bon', 'Bon', 'Moyen', 'Mauvais']

  return htmlPage("État des Lieux d'Entrée", `
    <div class="logo-zone">
      <div class="bold" style="font-size:13pt;">${d.bailleur.prenom} ${d.bailleur.nom.toUpperCase()}</div>
      <div class="small">${d.bailleur.adresse}</div>
    </div>

    <h1>État des Lieux d'Entrée</h1>
    <hr class="separator">

    <table>
      <tr><th>Logement</th><td>${adresseBien(d.bien)}</td></tr>
      <tr><th>Locataire(s)</th><td>${d.locataires.map(nomLocataire).join(', ')}</td></tr>
      <tr><th>Date d'entrée</th><td>${formatDate(d.date_debut)}</td></tr>
      <tr><th>Date de l'état des lieux</th><td>${dateAujourdhui()}</td></tr>
    </table>

    <h2>Relevés de compteurs</h2>
    <table>
      <tr><th>Eau froide</th><td>Index : _____________</td><th>Eau chaude</th><td>Index : _____________</td></tr>
      <tr><th>Électricité</th><td>Index HP : _____ HC : _____</td><th>Gaz</th><td>Index : _____________</td></tr>
    </table>

    <h2>Clés remises</h2>
    <p>Nombre de clés remises : _____ · Télécommandes : _____ · Badges : _____</p>

    <h2>État des pièces</h2>
    <table>
      <tr>
        <th style="width:20%">Pièce</th>
        <th style="width:12%">État général</th>
        <th>Murs / plafond</th>
        <th>Sol</th>
        <th>Portes / fenêtres</th>
        <th>Observations</th>
      </tr>
      ${pieces.map(p => `
        <tr>
          <td class="bold">${p}</td>
          <td>___________</td>
          <td>___________</td>
          <td>___________</td>
          <td>___________</td>
          <td></td>
        </tr>
      `).join('')}
    </table>

    <h2>Équipements</h2>
    <table>
      <tr><th>Équipement</th><th>Présent</th><th>État</th><th>Observations</th></tr>
      ${['Réfrigérateur','Congélateur','Lave-linge','Lave-vaisselle','Four','Plaque de cuisson','Hotte','Chaudière','Radiateurs','Volets roulants','Interphone / visiophone','Alarme'].map(e => `
        <tr><td>${e}</td><td>☐ Oui  ☐ Non</td><td>___________</td><td></td></tr>
      `).join('')}
    </table>

    <h2>Observations générales</h2>
    <div style="border:1px solid #aaa; min-height:60px; padding:6px; margin:8px 0;"></div>

    <div class="signature-zone" style="margin-top:30px;">
      <div class="signature-box">
        Le Bailleur<br>${d.bailleur.prenom} ${d.bailleur.nom.toUpperCase()}<br>
        Le ${dateAujourdhui()}<br><br>Signature :<br><br><br>
      </div>
      <div class="signature-box">
        Le(s) Locataire(s)<br>${d.locataires.map(nomLocataire).join(', ')}<br>
        Le ${dateAujourdhui()}<br><br>Signature :<br><br><br>
      </div>
    </div>
    <p class="mention-legale">L'état des lieux est établi contradictoirement entre les parties (Loi n°89-462 du 6 juillet 1989, art. 3-2).</p>
  `)
}

// ─── 6. ATTESTATION FIN DE BAIL ──────────────────────────────────────────────

export function htmlFinBail(d: ContratData, dateSortie: string): string {
  return htmlPage('Attestation de Fin de Bail', `
    <div class="logo-zone">
      <div class="bold" style="font-size:13pt;">${d.bailleur.prenom} ${d.bailleur.nom.toUpperCase()}</div>
      <div class="small">${d.bailleur.adresse}</div>
    </div>

    <h1>Attestation de Fin de Bail</h1>
    <hr class="separator">

    <p>Je soussigné(e), <strong>${d.bailleur.prenom} ${d.bailleur.nom.toUpperCase()}</strong>,
    bailleur du logement situé au <strong>${adresseBien(d.bien)}</strong>,</p>

    <p>atteste que <strong>${d.locataires.map(nomLocataire).join(' et ')}</strong>
    a (ont) quitté le logement le <strong>${dateSortie}</strong>,
    après avoir occupé les lieux depuis le <strong>${formatDate(d.date_debut)}</strong>
    dans le cadre d'un contrat de location.</p>

    <h2>Situation au départ</h2>
    <table>
      <tr><th>Loyers et charges</th><td>☐ À jour  ☐ Solde restant dû : _______ €</td></tr>
      <tr><th>Dépôt de garantie (${d.depot_garantie ? d.depot_garantie.toFixed(2) + ' €' : 'N/A'})</th><td>☐ Restitué intégralement  ☐ Restitué partiellement (retenues : _______ €)  ☐ Non restitué</td></tr>
      <tr><th>Clés</th><td>☐ Remises  ☐ Non remises</td></tr>
      <tr><th>État du logement</th><td>☐ Bon état  ☐ Dégradations constatées (voir état des lieux de sortie)</td></tr>
    </table>

    <p>La présente attestation est établie à la demande du locataire et lui est remise pour valoir ce que de droit.</p>

    <div class="signature-zone" style="margin-top:50px;">
      <div class="signature-box">
        Le Bailleur<br>${d.bailleur.prenom} ${d.bailleur.nom.toUpperCase()}<br>
        Fait à __________, le ${dateAujourdhui()}<br><br>
        Signature :<br><br><br>
      </div>
    </div>
    <p class="mention-legale">Le bailleur dispose d'un délai de 1 mois (2 mois si dégradations) pour restituer le dépôt de garantie (Loi n°89-462 du 6 juillet 1989, art. 22).</p>
  `)
}

// ─── Fonction générique d'impression ─────────────────────────────────────────

export function imprimerDocument(html: string) {
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) {
    alert('Veuillez autoriser les popups pour générer les documents PDF.')
    return
  }
  win.document.write(html)
  win.document.close()
}

// ─── Export DOCX (HTML → Word) ───────────────────────────────────────────────
// Le navigateur ouvre en Word/LibreOffice — format entièrement éditable.

export function telechargerDocx(html: string, nomFichier: string) {
  // Extraire le body de la page HTML générée (sans le script onload=print)
  const bodyMatch = html.match(/<body[^>]*onload="[^"]*">([\s\S]*)<\/body>/)
  const body = bodyMatch ? bodyMatch[1] : html

  const wordHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office'
          xmlns:w='urn:schemas-microsoft-com:office:word'
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <style>
        ${CSS_BASE_DOCX}
      </style>
      <!--[if gte mso 9]>
      <xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml>
      <![endif]-->
    </head>
    <body>${body}</body>
    </html>`

  const blob = new Blob(['﻿', wordHtml], {
    type: 'application/vnd.ms-word;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomFichier.replace(/[^a-zA-Z0-9_\-\s]/g, '') + '.doc'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const CSS_BASE_DOCX = `
  body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #111; line-height: 1.5; margin: 2cm; }
  h1 { font-size: 15pt; text-align: center; text-transform: uppercase; }
  h2 { font-size: 12pt; text-decoration: underline; margin-top: 14pt; }
  h3 { font-size: 11pt; margin-top: 10pt; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #999; padding: 4pt 6pt; font-size: 10pt; }
  th { background: #e8e8e8; font-weight: bold; }
  ul { margin: 4pt 0; padding-left: 14pt; }
  li { margin-bottom: 2pt; }
  .signature-zone { display: flex; justify-content: space-between; margin-top: 40pt; }
  .signature-box { width: 45%; border-top: 1pt solid #333; padding-top: 6pt; font-size: 9pt; }
`

// ─── PDF signé : injecte les signatures dans le HTML ─────────────────────────

export type SignatureInfo = {
  role: 'bailleur' | 'locataire'
  nom: string
  prenom: string
  signature_data: string
  signed_at: string
}

export function htmlAvecSignatures(htmlOriginal: string, signatures: SignatureInfo[]): string {
  if (!signatures.length) return htmlOriginal

  const blocSignatures = `
    <div style="page-break-inside:avoid; margin-top:30px; border-top:2px solid #1a3a6e; padding-top:16px;">
      <h2 style="font-size:13pt; margin-bottom:16px;">Signatures électroniques</h2>
      <div style="display:flex; flex-wrap:wrap; gap:24px;">
        ${signatures.map(s => `
          <div style="border:1px solid #e2e8f0; border-radius:8px; padding:14px; min-width:220px;">
            <div style="font-size:10pt; color:#64748b; text-transform:uppercase; font-weight:bold; margin-bottom:4px;">
              ${s.role === 'bailleur' ? 'Bailleur' : 'Locataire'}
            </div>
            <div style="font-size:12pt; font-weight:bold; margin-bottom:8px;">
              ${s.prenom} ${s.nom.toUpperCase()}
            </div>
            <img src="${s.signature_data}" style="max-width:200px; max-height:80px; border:1px solid #e2e8f0; display:block; margin-bottom:6px;">
            <div style="font-size:9pt; color:#64748b;">
              Signé le ${new Date(s.signed_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}
            </div>
          </div>
        `).join('')}
      </div>
      <p style="font-size:8.5pt; color:#64748b; margin-top:14px;">
        Signatures électroniques conformes au Règlement UE n°910/2014 (eIDAS).
      </p>
    </div>
  `

  // Insérer avant </body>
  return htmlOriginal.replace('</body>', blocSignatures + '</body>')
}
