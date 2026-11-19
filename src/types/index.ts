// ============================================================
// TYPES CENTRAUX - Boutique Informatique & SAV
// Boutique de vente de matériel informatique & Atelier SAV
// ============================================================

export type Category =
  | "CPU"
  | "RAM"
  | "GPU"
  | "SSD"
  | "HDD"
  | "Carte mère"
  | "Alimentation"
  | "Boîtier"
  | "Refroidissement"
  | "Écran"
  | "Clavier"
  | "Souris"
  | "Câble"
  | "Réseau"
  | "Imprimante"
  | "Scanner"
  | "Laptop"
  | "Desktop"
  | "Accessoire"
  | "Autre";

export type StockStatus = "en_stock" | "stock_faible" | "rupture";

export interface StockItem {
  id: string;
  reference: string;
  nom: string;
  categorie: Category;
  marque: string;
  modele: string;
  quantite: number;
  seuilAlerte: number;
  prixAchat: number;
  prixVente: number;
  fournisseurId?: string;
  emplacement?: string;
  description?: string;
  dateAjout: string;
  dateMaj: string;
  status: StockStatus;
}

// ============================================================
// RÉPARATIONS / SAV
// ============================================================

export type RepairStatus =
  | "reçu"
  | "en_diagnostic"
  | "en_attente_pièce"
  | "en_cours"
  | "terminé"
  | "livré"
  | "annulé";

export type RepairPriority = "basse" | "normale" | "haute" | "urgente";

export interface RepairItem {
  id: string;
  numeroTicket: string;
  clientId: string;
  clientNom: string;
  clientTel: string;
  appareil: string;        // ex: "Laptop HP EliteBook"
  marque: string;
  modele: string;
  serialNumber?: string;
  problemeDecrit: string;
  diagnostic?: string;
  solution?: string;
  status: RepairStatus;
  priorite: RepairPriority;
  piecesNecessaires?: string[];  // IDs des pièces du stock
  technicien?: string;
  dateReception: string;
  dateEcheance?: string;
  dateFin?: string;
  coutEstime?: number;
  coutFinal?: number;
  avancePayee?: number;    // Avance versée à la réception
  resteAPayer?: number;    // Reste à payer (calculé)
  pinAppareil?: string;    // Code PIN ou mot de passe de l'appareil
  schemaUnlock?: string;   // Schéma de déverrouillage (description)
  notes?: string;
  garantie?: boolean;
}

// ============================================================
// COMMANDES FOURNISSEURS
// ============================================================

export type OrderStatus =
  | "brouillon"
  | "envoyée"
  | "confirmée"
  | "en_transit"
  | "reçue_partielle"
  | "reçue"
  | "annulée";

export interface OrderLine {
  id: string;
  stockItemId?: string;
  reference: string;
  designation: string;
  quantiteCommandee: number;
  quantiteRecue: number;
  prixUnitaire: number;
  total: number;
}

export interface Order {
  id: string;
  numeroCommande: string;
  fournisseurId: string;
  fournisseurNom: string;
  status: OrderStatus;
  lignes: OrderLine[];
  dateCommande: string;
  dateLivraisonPrevue?: string;
  dateLivraisonReelle?: string;
  montantTotal: number;
  notes?: string;
  creePar?: string;
}

// ============================================================
// VENTES
// ============================================================

export type PaymentMethod = "espèces" | "carte" | "virement" | "chèque" | "crédit";

export interface SaleLine {
  id: string;
  stockItemId: string;
  reference: string;
  designation: string;
  quantite: number;
  prixUnitaire: number;
  remise: number;
  total: number;
}

export interface Sale {
  id: string;
  numeroVente: string;
  clientId?: string;
  clientNom?: string;
  lignes: SaleLine[];
  sousTotal: number;
  remiseGlobale: number;
  montantTotal: number;
  montantPaye?: number;        // Montant payé à l'achat (avance ou totalité)
  resteAPayer?: number;        // Reste à payer si paiement partiel/crédit
  methodePaiement: PaymentMethod;
  dateVente: string;
  vendeur?: string;
  notes?: string;
  facture?: boolean;
}

// ============================================================
// CLIENTS
// ============================================================

export interface Client {
  id: string;
  code: string;
  nom: string;
  prenom?: string;
  email?: string;
  telephone: string;
  adresse?: string;
  ville?: string;
  type: "particulier" | "entreprise";
  entreprise?: string;
  dateCreation: string;
  totalAchats: number;
  notes?: string;
}

// ============================================================
// FOURNISSEURS
// ============================================================

export interface Supplier {
  id: string;
  code: string;
  nom: string;
  contact?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  ville?: string;
  pays?: string;
  delaiLivraison?: number; // jours
  conditions?: string;
  dateCreation: string;
  notes?: string;
}

// ============================================================
// REVENDEURS
// ============================================================

export interface Reseller {
  id: string;
  code: string;
  nom: string;
  prenom?: string;
  email?: string;
  telephone: string;
  adresse?: string;
  ville?: string;
  type: "revendeur" | "grossiste" | "partenaire" | "personnel";
  entreprise?: string;
  remisePourcentage?: number;   // % de remise accordée
  plafondCredit?: number;       // Plafond crédit en DT
  soldeEnCours?: number;        // Solde actuel dû (positif = il doit de l'argent)
  dateCreation: string;
  totalAchats: number;
  notes?: string;
}

// ============================================================
// COMPTE COURANT (Opérations revendeur personnel)
// ============================================================

export type CompteOperationType =
  | "achat"       // il achète des produits chez vous
  | "service"     // il dépose un appareil en réparation
  | "paiement"    // il paie (réduit le solde dû)
  | "avance"      // avance versée
  | "remboursement"; // vous lui remboursez

export interface CompteOperation {
  id: string;
  resellerId: string;
  type: CompteOperationType;
  montant: number;         // Positif = débit (il doit), Négatif = crédit (vous devez)
  description: string;
  reference?: string;      // N° ticket, N° vente, etc.
  date: string;
  creePar?: string;
  notes?: string;
}

// ============================================================
// FINANCES / TRANSACTIONS
// ============================================================

export type TransactionType = "revenu" | "depense";

export type TransactionCategory =
  | "Achat stock"
  | "Vente produit"
  | "Réparation"
  | "Loyer"
  | "Salaire"
  | "Fournitures"
  | "Transport"
  | "Publicité"
  | "Services"
  | "Remboursement"
  | "Autre";

export interface Transaction {
  id: string;
  numeroTransaction: string;
  type: TransactionType;
  categorie: TransactionCategory;
  montant: number;
  description: string;
  date: string;
  methodePaiement?: "espèces" | "carte" | "virement" | "chèque";
  referenceExterne?: string;    // N° facture, N° ticket réparation, etc.
  clientId?: string;
  fournisseurId?: string;
  notes?: string;
  creePar?: string;
}

// ============================================================
// RAPPELS / CALL REMINDERS
// ============================================================

export type ReminderStatus = "actif" | "effectué" | "annulé";
export type ReminderRepeat = "aucune" | "quotidien" | "hebdomadaire";

export interface Reminder {
  id: string;
  clientId?: string;
  clientNom: string;
  clientTel: string;
  repairId?: string;            // Ticket SAV lié (optionnel)
  message: string;
  dueDate: string;              // ISO date/time
  repeat: ReminderRepeat;
  status: ReminderStatus;
  dateCreation: string;
  dateEffectue?: string;
  notes?: string;
}

// ============================================================
// SETTINGS / CONFIGURATION
// ============================================================

export interface AppSettings {
  boutiqueName: string;
  boutiquePhone?: string;
  boutiqueAddress?: string;
  dataFilePath?: string;        // chemin custom pour le fichier de données
  backupFolderPath?: string;    // chemin dossier backup
  backupCount: number;          // nombre de backups à conserver
  currency: string;             // "TND" (DT)
  locale: string;               // "fr-TN"
  technicienName?: string;      // nom du technicien par défaut
  remindersEnabled: boolean;
  darkMode?: boolean;
}

// ============================================================
// DASHBOARD STATS
// ============================================================

export interface DashboardStats {
  stockTotal: number;
  stockValeur: number;
  stockFaible: number;
  enRupture: number;
  reparationsEnCours: number;
  reparationsEnAttente: number;
  commandesEnCours: number;
  ventesJour: number;
  ventesJourMontant: number;
  ventesMois: number;
  ventesMoisMontant: number;
  clientsTotal: number;
}

