import * as XLSX from "xlsx";
import {
  stockStorage, repairStorage, saleStorage, clientStorage,
  supplierStorage, resellerStorage, transactionStorage, reminderStorage
} from "./storage";
import { formatPrice } from "./utils";

// ============================================================
// EXPORT COMPLET VERS CLASSEUR EXCEL MULTI-FEUILLES (.xlsx)
// ============================================================
export function generateFullWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // 1. FEUILLE STOCK & INVENTAIRE
  const stockData = stockStorage.getAll().map(item => ({
    "Référence": item.reference,
    "Désignation": item.nom,
    "Catégorie": item.categorie,
    "Marque": item.marque || "",
    "Modèle": item.modele || "",
    "Quantité en Stock": item.quantite,
    "Seuil d'Alerte": item.seuilAlerte,
    "Statut": item.status === "en_stock" ? "En stock" : item.status === "stock_faible" ? "Stock faible" : "Rupture",
    "Prix Achat (DT)": item.prixAchat,
    "Prix Vente (DT)": item.prixVente,
    "Marge Unitaire (DT)": item.prixVente - item.prixAchat,
    "Valeur Stock Achat (DT)": item.prixAchat * item.quantite,
    "Emplacement": item.emplacement || "",
    "Date Ajout": item.dateAjout ? new Date(item.dateAjout).toLocaleDateString("fr-FR") : "",
  }));
  const wsStock = XLSX.utils.json_to_sheet(stockData.length ? stockData : [{ "Information": "Aucun article en stock" }]);
  XLSX.utils.book_append_sheet(wb, wsStock, "Inventaire & Stock");

  // 2. FEUILLE SAV & RÉPARATIONS
  const repairData = repairStorage.getAll().map(r => ({
    "N° Ticket": r.numeroTicket,
    "Date Réception": r.dateReception ? new Date(r.dateReception).toLocaleDateString("fr-FR") : "",
    "Nom Client": r.clientNom,
    "Téléphone": r.clientTel,
    "Appareil": r.appareil,
    "Marque": r.marque || "",
    "Modèle": r.modele || "",
    "N° Série": r.serialNumber || "",
    "Code PIN": r.pinAppareil || "",
    "Schéma Déverrouillage": r.schemaUnlock || "",
    "Panne Signalée": r.problemeDecrit,
    "Diagnostic": r.diagnostic || "",
    "Solution": r.solution || "",
    "Technicien": r.technicien || "",
    "Priorité": r.priorite.toUpperCase(),
    "Statut": r.status,
    "Coût Estimé (DT)": r.coutEstime || 0,
    "Coût Final (DT)": r.coutFinal || 0,
    "Avance Versée (DT)": r.avancePayee || 0,
    "Reste à Payer (DT)": r.resteAPayer || 0,
    "Garantie": r.garantie ? "Oui" : "Non",
  }));
  const wsRepairs = XLSX.utils.json_to_sheet(repairData.length ? repairData : [{ "Information": "Aucune réparation enregistrée" }]);
  XLSX.utils.book_append_sheet(wb, wsRepairs, "SAV & Réparations");

  // 3. FEUILLE FINANCES & CAISSE
  const financeData = transactionStorage.getAll().map(t => ({
    "N° Transaction": t.numeroTransaction,
    "Date": t.date ? new Date(t.date).toLocaleDateString("fr-FR") : "",
    "Type": t.type === "revenu" ? "REVENU (ENTRÉE)" : "DÉPENSE (SORTIE)",
    "Catégorie": t.categorie,
    "Montant (DT)": t.montant,
    "Description": t.description,
    "Mode Paiement": t.methodePaiement || "espèces",
    "Référence Externe": t.referenceExterne || "",
    "Notes": t.notes || "",
  }));
  const wsFinance = XLSX.utils.json_to_sheet(financeData.length ? financeData : [{ "Information": "Aucune transaction enregistrée" }]);
  XLSX.utils.book_append_sheet(wb, wsFinance, "Finances & Caisse");

  // 4. FEUILLE VENTES COMPTOIR
  const salesData = saleStorage.getAll().map(s => ({
    "N° Vente": s.numeroVente,
    "Date": s.dateVente ? new Date(s.dateVente).toLocaleDateString("fr-FR") : "",
    "Client": s.clientNom || "Client Comptoir",
    "Nombre d'Articles": s.lignes.reduce((sum, l) => sum + l.quantite, 0),
    "Sous-Total (DT)": s.sousTotal,
    "Remise (DT)": s.remiseGlobale,
    "Montant Total (DT)": s.montantTotal,
    "Mode Règlement": s.methodePaiement,
    "Vendeur": s.vendeur || "",
  }));
  const wsSales = XLSX.utils.json_to_sheet(salesData.length ? salesData : [{ "Information": "Aucune vente enregistrée" }]);
  XLSX.utils.book_append_sheet(wb, wsSales, "Ventes Comptoir");

  // 5. FEUILLE REVENDEURS & PARTENAIRES
  const resellerData = resellerStorage.getAll().map(r => ({
    "Code": r.code,
    "Nom / Contact": `${r.nom} ${r.prenom || ""}`.trim(),
    "Société / Entreprise": r.entreprise || "",
    "Téléphone": r.telephone,
    "Email": r.email || "",
    "Ville": r.ville || "",
    "Type": r.type,
    "Remise (%)": r.remisePourcentage || 0,
    "Plafond Crédit (DT)": r.plafondCredit || 0,
    "Solde Dû Actuel (DT)": r.soldeEnCours || 0,
    "Total Achats (DT)": r.totalAchats || 0,
    "Notes": r.notes || "",
  }));
  const wsResellers = XLSX.utils.json_to_sheet(resellerData.length ? resellerData : [{ "Information": "Aucun revendeur enregistré" }]);
  XLSX.utils.book_append_sheet(wb, wsResellers, "Revendeurs & Grossistes");

  // 6. FEUILLE CLIENTS
  const clientsData = clientStorage.getAll().map(c => ({
    "Code": c.code,
    "Nom": c.nom,
    "Prénom": c.prenom || "",
    "Téléphone": c.telephone,
    "Email": c.email || "",
    "Ville": c.ville || "",
    "Type": c.type === "particulier" ? "Particulier" : "Entreprise",
    "Entreprise": c.entreprise || "",
    "Total Achats (DT)": c.totalAchats || 0,
  }));
  const wsClients = XLSX.utils.json_to_sheet(clientsData.length ? clientsData : [{ "Information": "Aucun client enregistré" }]);
  XLSX.utils.book_append_sheet(wb, wsClients, "Clients");

  // 7. FEUILLE FOURNISSEURS
  const suppliersData = supplierStorage.getAll().map(f => ({
    "Code": f.code,
    "Société": f.nom,
    "Contact": f.contact || "",
    "Téléphone": f.telephone || "",
    "Email": f.email || "",
    "Ville": f.ville || "",
    "Pays": f.pays || "Tunisie",
    "Délai Livraison (Jours)": f.delaiLivraison || 5,
    "Conditions": f.conditions || "",
  }));
  const wsSuppliers = XLSX.utils.json_to_sheet(suppliersData.length ? suppliersData : [{ "Information": "Aucun fournisseur enregistré" }]);
  XLSX.utils.book_append_sheet(wb, wsSuppliers, "Fournisseurs");

  // 8. FEUILLE RAPPELS
  const remindersData = reminderStorage.getAll().map(r => ({
    "Client": r.clientNom,
    "Téléphone": r.clientTel,
    "Action / Message": r.message,
    "Date & Heure Échéance": r.dueDate ? new Date(r.dueDate).toLocaleString("fr-FR") : "",
    "Répétition": r.repeat,
    "Statut": r.status === "actif" ? "En attente d'appel" : "Appel effectué",
    "Notes": r.notes || "",
  }));
  const wsReminders = XLSX.utils.json_to_sheet(remindersData.length ? remindersData : [{ "Information": "Aucun rappel enregistré" }]);
  XLSX.utils.book_append_sheet(wb, wsReminders, "Rappels Téléphoniques");

  return wb;
}

// Téléchargement direct d'un fichier Excel .xlsx dans le navigateur / application
export function downloadExcelFile(filename?: string) {
  const wb = generateFullWorkbook();
  const dateStr = new Date().toISOString().slice(0, 10);
  const name = filename || `boutique_donnees_${dateStr}.xlsx`;
  XLSX.writeFile(wb, name);
}

// Génère une représentation Base64 pour écriture disque par Electron IPC
export function getExcelBase64(): string {
  const wb = generateFullWorkbook();
  return XLSX.write(wb, { type: "base64", bookType: "xlsx" });
}

// ============================================================
// EXPORT INDIVIDUEL PAR MODULE
// ============================================================

export function exportStockToExcel() {
  const wb = XLSX.utils.book_new();
  const items = stockStorage.getAll().map(item => ({
    "Référence": item.reference,
    "Désignation": item.nom,
    "Catégorie": item.categorie,
    "Marque": item.marque || "",
    "Modèle": item.modele || "",
    "Quantité": item.quantite,
    "Alerte": item.seuilAlerte,
    "Prix Achat (DT)": item.prixAchat,
    "Prix Vente (DT)": item.prixVente,
    "Emplacement": item.emplacement || "",
    "Statut": item.status,
  }));
  const ws = XLSX.utils.json_to_sheet(items);
  XLSX.utils.book_append_sheet(wb, ws, "Stock");
  XLSX.writeFile(wb, `inventaire_stock_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportRepairsToExcel() {
  const wb = XLSX.utils.book_new();
  const repairs = repairStorage.getAll().map(r => ({
    "N° Ticket": r.numeroTicket,
    "Date": r.dateReception ? new Date(r.dateReception).toLocaleDateString("fr-FR") : "",
    "Client": r.clientNom,
    "Téléphone": r.clientTel,
    "Appareil": r.appareil,
    "Problème": r.problemeDecrit,
    "Diagnostic": r.diagnostic || "",
    "Technicien": r.technicien || "",
    "Statut": r.status,
    "Coût Final (DT)": r.coutFinal || r.coutEstime || 0,
  }));
  const ws = XLSX.utils.json_to_sheet(repairs);
  XLSX.utils.book_append_sheet(wb, ws, "SAV");
  XLSX.writeFile(wb, `reparations_sav_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportFinancesToExcel() {
  const wb = XLSX.utils.book_new();
  const txns = transactionStorage.getAll().map(t => ({
    "N° Transaction": t.numeroTransaction,
    "Date": t.date ? new Date(t.date).toLocaleDateString("fr-FR") : "",
    "Type": t.type.toUpperCase(),
    "Catégorie": t.categorie,
    "Montant (DT)": t.montant,
    "Description": t.description,
    "Paiement": t.methodePaiement || "espèces",
  }));
  const ws = XLSX.utils.json_to_sheet(txns);
  XLSX.utils.book_append_sheet(wb, ws, "Caisse");
  XLSX.writeFile(wb, `caisse_finances_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportClientsToExcel() {
  const wb = XLSX.utils.book_new();
  const clients = clientStorage.getAll().map(c => ({
    "Code": c.code,
    "Nom": c.nom,
    "Prénom": c.prenom || "",
    "Téléphone": c.telephone,
    "Email": c.email || "",
    "Ville": c.ville || "",
    "Type": c.type === "particulier" ? "Particulier" : "Entreprise",
    "Entreprise": c.entreprise || "",
    "Total Achats (DT)": c.totalAchats || 0,
    "Date Création": c.dateCreation ? new Date(c.dateCreation).toLocaleDateString("fr-FR") : "",
  }));
  const ws = XLSX.utils.json_to_sheet(clients);
  XLSX.utils.book_append_sheet(wb, ws, "Clients");
  XLSX.writeFile(wb, `clients_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportOrdersToExcel() {
  const wb = XLSX.utils.book_new();
  const orders = orderStorage.getAll().map(o => ({
    "N° Commande": o.numeroCommande,
    "Fournisseur": o.fournisseurNom,
    "Statut": o.status,
    "Date Commande": o.dateCommande ? new Date(o.dateCommande).toLocaleDateString("fr-FR") : "",
    "Date Livraison": o.dateLivraisonPrevue || "",
    "Montant Total (DT)": o.montantTotal,
    "Nombre d'Articles": o.lignes.reduce((sum, l) => sum + l.quantiteCommandee, 0),
  }));
  const ws = XLSX.utils.json_to_sheet(orders);
  XLSX.utils.book_append_sheet(wb, ws, "Commandes");
  XLSX.writeFile(wb, `commandes_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
