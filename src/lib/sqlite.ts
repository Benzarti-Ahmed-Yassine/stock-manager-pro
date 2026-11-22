import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import {
  stockStorage, repairStorage, saleStorage, clientStorage,
  supplierStorage, resellerStorage, transactionStorage, reminderStorage,
  compteOperationStorage, orderStorage, settingsStorage
} from "./storage";

let SQLInstance: SqlJsStatic | null = null;
let sqliteDb: Database | null = null;

// Initialisation du moteur SQLite 3
export async function getSQLiteDB(): Promise<Database> {
  if (sqliteDb) return sqliteDb;

  if (!SQLInstance) {
    SQLInstance = await initSqlJs({
      locateFile: (file) => `/${file}`,
    });
  }

  sqliteDb = new SQLInstance.Database();
  initSQLiteSchema(sqliteDb);
  return sqliteDb;
}

// Création du schéma relationnel SQLite 3
export function initSQLiteSchema(db: Database) {
  db.run(`
    -- 1. Table Stock & Inventaire
    CREATE TABLE IF NOT EXISTS stock (
      id TEXT PRIMARY KEY,
      reference TEXT UNIQUE,
      nom TEXT NOT NULL,
      categorie TEXT,
      marque TEXT,
      modele TEXT,
      quantite INTEGER,
      seuilAlerte INTEGER,
      prixAchat REAL,
      prixVente REAL,
      fournisseurId TEXT,
      emplacement TEXT,
      description TEXT,
      dateAjout TEXT,
      dateMaj TEXT,
      status TEXT
    );

    -- 2. Table SAV & Réparations
    CREATE TABLE IF NOT EXISTS repairs (
      id TEXT PRIMARY KEY,
      numeroTicket TEXT UNIQUE,
      clientId TEXT,
      clientNom TEXT NOT NULL,
      clientTel TEXT NOT NULL,
      appareil TEXT NOT NULL,
      marque TEXT,
      modele TEXT,
      serialNumber TEXT,
      problemeDecrit TEXT,
      diagnostic TEXT,
      solution TEXT,
      status TEXT,
      priorite TEXT,
      technicien TEXT,
      dateReception TEXT,
      dateEcheance TEXT,
      dateFin TEXT,
      coutEstime REAL,
      coutFinal REAL,
      avancePayee REAL,
      resteAPayer REAL,
      pinAppareil TEXT,
      schemaUnlock TEXT,
      notes TEXT,
      garantie INTEGER
    );

    -- 3. Table Clients
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE,
      nom TEXT NOT NULL,
      prenom TEXT,
      email TEXT,
      telephone TEXT NOT NULL,
      adresse TEXT,
      ville TEXT,
      type TEXT,
      entreprise TEXT,
      dateCreation TEXT,
      totalAchats REAL,
      notes TEXT
    );

    -- 4. Table Fournisseurs
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE,
      nom TEXT NOT NULL,
      contact TEXT,
      email TEXT,
      telephone TEXT,
      adresse TEXT,
      ville TEXT,
      pays TEXT,
      delaiLivraison INTEGER,
      conditions TEXT,
      dateCreation TEXT,
      notes TEXT
    );

    -- 5. Table Revendeurs & Partenaires
    CREATE TABLE IF NOT EXISTS resellers (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE,
      nom TEXT NOT NULL,
      prenom TEXT,
      email TEXT,
      telephone TEXT NOT NULL,
      adresse TEXT,
      ville TEXT,
      type TEXT,
      entreprise TEXT,
      remisePourcentage REAL,
      plafondCredit REAL,
      soldeEnCours REAL,
      dateCreation TEXT,
      totalAchats REAL,
      notes TEXT
    );

    -- 6. Table Opérations Compte Courant Partenaire
    CREATE TABLE IF NOT EXISTS compte_operations (
      id TEXT PRIMARY KEY,
      resellerId TEXT NOT NULL,
      type TEXT NOT NULL,
      montant REAL NOT NULL,
      description TEXT NOT NULL,
      reference TEXT,
      date TEXT,
      creePar TEXT,
      notes TEXT,
      FOREIGN KEY(resellerId) REFERENCES resellers(id)
    );

    -- 7. Table Finances & Caisse
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      numeroTransaction TEXT UNIQUE,
      type TEXT NOT NULL,
      categorie TEXT NOT NULL,
      montant REAL NOT NULL,
      description TEXT,
      date TEXT,
      methodePaiement TEXT,
      referenceExterne TEXT,
      clientId TEXT,
      fournisseurId TEXT,
      notes TEXT,
      creePar TEXT
    );

    -- 8. Table Ventes Comptoir
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      numeroVente TEXT UNIQUE,
      clientId TEXT,
      clientNom TEXT,
      lignes TEXT,
      sousTotal REAL,
      remiseGlobale REAL,
      montantTotal REAL,
      montantPaye REAL,
      resteAPayer REAL,
      methodePaiement TEXT,
      dateVente TEXT,
      vendeur TEXT,
      notes TEXT,
      facture INTEGER
    );

    -- 9. Table Commandes Fournisseurs
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      numeroCommande TEXT UNIQUE,
      fournisseurId TEXT,
      fournisseurNom TEXT,
      status TEXT,
      lignes TEXT,
      dateCommande TEXT,
      dateLivraisonPrevue TEXT,
      dateLivraisonReelle TEXT,
      montantTotal REAL,
      notes TEXT,
      creePar TEXT
    );

    -- 10. Table Rappels Téléphoniques
    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      clientId TEXT,
      clientNom TEXT NOT NULL,
      clientTel TEXT NOT NULL,
      repairId TEXT,
      message TEXT,
      dueDate TEXT,
      repeat TEXT,
      status TEXT,
      dateCreation TEXT,
      dateEffectue TEXT,
      notes TEXT
    );

    -- 11. Table Paramètres de l'Application
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

// Synchronisation de toutes les données dans les tables SQLite 3
export async function populateSQLiteData(): Promise<Database> {
  const db = await getSQLiteDB();

  db.run("BEGIN TRANSACTION;");

  try {
    // 1. Stock
    db.run("DELETE FROM stock;");
    const stockStmt = db.prepare(`
      INSERT OR REPLACE INTO stock VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stockStorage.getAll().forEach((s) => {
      stockStmt.run([
        s.id, s.reference, s.nom, s.categorie, s.marque || "", s.modele || "",
        s.quantite, s.seuilAlerte, s.prixAchat, s.prixVente, s.fournisseurId || "",
        s.emplacement || "", s.description || "", s.dateAjout, s.dateMaj, s.status
      ]);
    });
    stockStmt.free();

    // 2. Repairs (SAV)
    db.run("DELETE FROM repairs;");
    const repairStmt = db.prepare(`
      INSERT OR REPLACE INTO repairs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    repairStorage.getAll().forEach((r) => {
      repairStmt.run([
        r.id, r.numeroTicket, r.clientId || "", r.clientNom, r.clientTel, r.appareil,
        r.marque || "", r.modele || "", r.serialNumber || "", r.problemeDecrit,
        r.diagnostic || "", r.solution || "", r.status, r.priorite, r.technicien || "",
        r.dateReception, r.dateEcheance || "", r.dateFin || "", r.coutEstime || 0,
        r.coutFinal || 0, r.avancePayee || 0, r.resteAPayer || 0, r.pinAppareil || "",
        r.schemaUnlock || "", r.notes || "", r.garantie ? 1 : 0
      ]);
    });
    repairStmt.free();

    // 3. Clients
    db.run("DELETE FROM clients;");
    const clientStmt = db.prepare(`
      INSERT OR REPLACE INTO clients VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    clientStorage.getAll().forEach((c) => {
      clientStmt.run([
        c.id, c.code, c.nom, c.prenom || "", c.email || "", c.telephone,
        c.adresse || "", c.ville || "", c.type, c.entreprise || "",
        c.dateCreation, c.totalAchats || 0, c.notes || ""
      ]);
    });
    clientStmt.free();

    // 4. Fournisseurs
    db.run("DELETE FROM suppliers;");
    const supplierStmt = db.prepare(`
      INSERT OR REPLACE INTO suppliers VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    supplierStorage.getAll().forEach((f) => {
      supplierStmt.run([
        f.id, f.code, f.nom, f.contact || "", f.email || "", f.telephone || "",
        f.adresse || "", f.ville || "", f.pays || "Tunisie", f.delaiLivraison || 3,
        f.conditions || "", f.dateCreation, f.notes || ""
      ]);
    });
    supplierStmt.free();

    // 5. Revendeurs & Partenaires
    db.run("DELETE FROM resellers;");
    const resellerStmt = db.prepare(`
      INSERT OR REPLACE INTO resellers VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    resellerStorage.getAll().forEach((r) => {
      resellerStmt.run([
        r.id, r.code, r.nom, r.prenom || "", r.email || "", r.telephone,
        r.adresse || "", r.ville || "", r.type, r.entreprise || "",
        r.remisePourcentage || 0, r.plafondCredit || 0, r.soldeEnCours || 0,
        r.dateCreation, r.totalAchats || 0, r.notes || ""
      ]);
    });
    resellerStmt.free();

    // 6. Opérations Compte Courant Partenaire
    db.run("DELETE FROM compte_operations;");
    const opStmt = db.prepare(`
      INSERT OR REPLACE INTO compte_operations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    compteOperationStorage.getAll().forEach((op) => {
      opStmt.run([
        op.id, op.resellerId, op.type, op.montant, op.description,
        op.reference || "", op.date, op.creePar || "", op.notes || ""
      ]);
    });
    opStmt.free();

    // 7. Finances & Transactions
    db.run("DELETE FROM transactions;");
    const txStmt = db.prepare(`
      INSERT OR REPLACE INTO transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    transactionStorage.getAll().forEach((t) => {
      txStmt.run([
        t.id, t.numeroTransaction, t.type, t.categorie, t.montant,
        t.description, t.date, t.methodePaiement || "espèces",
        t.referenceExterne || "", t.clientId || "", t.fournisseurId || "",
        t.notes || "", t.creePar || ""
      ]);
    });
    txStmt.free();

    // 8. Ventes Comptoir
    db.run("DELETE FROM sales;");
    const saleStmt = db.prepare(`
      INSERT OR REPLACE INTO sales VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    saleStorage.getAll().forEach((v) => {
      saleStmt.run([
        v.id, v.numeroVente, v.clientId || "", v.clientNom || "Client Comptoir",
        JSON.stringify(v.lignes || []), v.sousTotal, v.remiseGlobale,
        v.montantTotal, v.montantPaye || v.montantTotal, v.resteAPayer || 0,
        v.methodePaiement, v.dateVente, v.vendeur || "", v.notes || "", v.facture ? 1 : 0
      ]);
    });
    saleStmt.free();

    // 9. Commandes
    db.run("DELETE FROM orders;");
    const orderStmt = db.prepare(`
      INSERT OR REPLACE INTO orders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    orderStorage.getAll().forEach((o) => {
      orderStmt.run([
        o.id, o.numeroCommande, o.fournisseurId, o.fournisseurNom, o.status,
        JSON.stringify(o.lignes || []), o.dateCommande, o.dateLivraisonPrevue || "",
        o.dateLivraisonReelle || "", o.montantTotal, o.notes || "", o.creePar || ""
      ]);
    });
    orderStmt.free();

    // 10. Rappels
    db.run("DELETE FROM reminders;");
    const reminderStmt = db.prepare(`
      INSERT OR REPLACE INTO reminders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    reminderStorage.getAll().forEach((rem) => {
      reminderStmt.run([
        rem.id, rem.clientId || "", rem.clientNom, rem.clientTel, rem.repairId || "",
        rem.message, rem.dueDate, rem.repeat, rem.status, rem.dateCreation,
        rem.dateEffectue || "", rem.notes || ""
      ]);
    });
    reminderStmt.free();

    // 11. Settings
    db.run("DELETE FROM app_settings;");
    const settingsStmt = db.prepare(`
      INSERT OR REPLACE INTO app_settings VALUES (?, ?)
    `);
    const appCfg = settingsStorage.get();
    Object.entries(appCfg).forEach(([k, v]) => {
      settingsStmt.run([k, String(v)]);
    });
    settingsStmt.free();

    db.run("COMMIT;");
  } catch (err) {
    db.run("ROLLBACK;");
    console.error("Erreur transaction SQLite:", err);
  }

  return db;
}

// Exporte les données SQLite sous forme binaire Uint8Array
export async function getSQLiteBinary(): Promise<Uint8Array> {
  const db = await populateSQLiteData();
  return db.export();
}

// Convertit le fichier binaire SQLite en Base64 pour l'envoi via Electron IPC
export async function getSQLiteBase64(): Promise<string> {
  const binary = await getSQLiteBinary();
  let binaryString = "";
  const len = binary.byteLength;
  for (let i = 0; i < len; i++) {
    binaryString += String.fromCharCode(binary[i]);
  }
  return btoa(binaryString);
}

// Téléchargement direct du fichier .sqlite / .db dans le navigateur ou Electron
export async function downloadSQLiteFile(): Promise<void> {
  const binary = await getSQLiteBinary();
  const blob = new Blob([binary], { type: "application/x-sqlite3" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  a.download = `boutique_database_${dateStr}.sqlite`;
  a.click();
  URL.revokeObjectURL(url);
}

// Statistiques sur les tables SQL
export async function getSQLiteStats(): Promise<Record<string, number>> {
  const db = await populateSQLiteData();
  const tables = [
    "stock", "repairs", "clients", "suppliers", "resellers",
    "compte_operations", "transactions", "sales", "orders", "reminders"
  ];
  const stats: Record<string, number> = {};

  tables.forEach((tbl) => {
    try {
      const res = db.exec(`SELECT COUNT(*) as count FROM ${tbl}`);
      if (res.length && res[0].values.length) {
        stats[tbl] = res[0].values[0][0] as number;
      } else {
        stats[tbl] = 0;
      }
    } catch {
      stats[tbl] = 0;
    }
  });

  return stats;
}
