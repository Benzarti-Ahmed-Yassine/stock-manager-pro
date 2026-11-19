import type {
  StockItem, RepairItem, Order, Sale, Client, Supplier,
  Transaction, Reminder, Reseller, AppSettings, TransactionCategory, TransactionType
} from "@/types";
import {
  generateId, generateRef, generateTicket, generateOrderNumber,
  generateSaleNumber, now, calculateStockStatus
} from "./utils";

// ============================================================
// STORAGE KEYS
// ============================================================
const KEYS = {
  stock: "techshop_stock",
  repairs: "techshop_repairs",
  orders: "techshop_orders",
  sales: "techshop_sales",
  clients: "techshop_clients",
  suppliers: "techshop_suppliers",
  resellers: "techshop_resellers",
  transactions: "techshop_transactions",
  reminders: "techshop_reminders",
  settings: "techshop_settings",
  counters: "techshop_counters",
};

// ============================================================
// COUNTERS
// ============================================================
interface Counters {
  stock: number;
  repairs: number;
  orders: number;
  sales: number;
  clients: number;
  suppliers: number;
  resellers: number;
  transactions: number;
  reminders: number;
}

function getCounters(): Counters {
  const raw = localStorage.getItem(KEYS.counters);
  return raw
    ? JSON.parse(raw)
    : { stock: 0, repairs: 0, orders: 0, sales: 0, clients: 0, suppliers: 0, resellers: 0, transactions: 0, reminders: 0 };
}

function saveCounters(c: Counters) {
  localStorage.setItem(KEYS.counters, JSON.stringify(c));
}

function nextCounter(key: keyof Counters): number {
  const c = getCounters();
  c[key] = (c[key] || 0) + 1;
  saveCounters(c);
  return c[key];
}

// ============================================================
// GENERIC HELPERS & FILE SYNC
// ============================================================
let syncTimeout: any = null;

export function triggerFilePersistence() {
  if (typeof window !== "undefined" && window.electronAPI?.saveFileData) {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      try {
        const fullData = JSON.parse(exportAllData());
        window.electronAPI!.saveFileData!(fullData);
      } catch (err) {
        console.error("Erreur sync fichier:", err);
      }
    }, 500);
  }
}

function getAll<T>(key: string): T[] {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

function saveAll<T>(key: string, items: T[]) {
  localStorage.setItem(key, JSON.stringify(items));
  triggerFilePersistence();
}

// ============================================================
// STOCK
// ============================================================
export const stockStorage = {
  getAll: (): StockItem[] => getAll<StockItem>(KEYS.stock),

  add: (data: Omit<StockItem, "id" | "reference" | "dateAjout" | "dateMaj" | "status">): StockItem => {
    const items = stockStorage.getAll();
    const n = nextCounter("stock");
    const item: StockItem = {
      ...data,
      id: generateId(),
      reference: generateRef("STK", n),
      dateAjout: now(),
      dateMaj: now(),
      status: calculateStockStatus(data.quantite, data.seuilAlerte),
    };
    items.push(item);
    saveAll(KEYS.stock, items);
    return item;
  },

  update: (id: string, data: Partial<StockItem>): StockItem | null => {
    const items = stockStorage.getAll();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    const updated = {
      ...items[idx],
      ...data,
      dateMaj: now(),
    };
    if (data.quantite !== undefined || data.seuilAlerte !== undefined) {
      updated.status = calculateStockStatus(
        data.quantite ?? items[idx].quantite,
        data.seuilAlerte ?? items[idx].seuilAlerte
      );
    }
    items[idx] = updated;
    saveAll(KEYS.stock, items);
    return updated;
  },

  delete: (id: string): boolean => {
    const items = stockStorage.getAll();
    const filtered = items.filter((i) => i.id !== id);
    if (filtered.length === items.length) return false;
    saveAll(KEYS.stock, filtered);
    return true;
  },

  getById: (id: string): StockItem | undefined =>
    stockStorage.getAll().find((i) => i.id === id),

  decrementQuantite: (id: string, qty: number): StockItem | null => {
    const item = stockStorage.getById(id);
    if (!item) return null;
    return stockStorage.update(id, { quantite: Math.max(0, item.quantite - qty) });
  },
};

// ============================================================
// REPAIRS
// ============================================================
export const repairStorage = {
  getAll: (): RepairItem[] => getAll<RepairItem>(KEYS.repairs),

  add: (data: Omit<RepairItem, "id" | "numeroTicket" | "dateReception">): RepairItem => {
    const items = repairStorage.getAll();
    const n = nextCounter("repairs");
    const item: RepairItem = {
      ...data,
      id: generateId(),
      numeroTicket: generateTicket(n),
      dateReception: now(),
    };
    items.push(item);
    saveAll(KEYS.repairs, items);
    return item;
  },

  update: (id: string, data: Partial<RepairItem>): RepairItem | null => {
    const items = repairStorage.getAll();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...data };
    saveAll(KEYS.repairs, items);
    return items[idx];
  },

  delete: (id: string): boolean => {
    const items = repairStorage.getAll();
    const filtered = items.filter((i) => i.id !== id);
    if (filtered.length === items.length) return false;
    saveAll(KEYS.repairs, filtered);
    return true;
  },

  getById: (id: string): RepairItem | undefined =>
    repairStorage.getAll().find((i) => i.id === id),
};

// ============================================================
// ORDERS
// ============================================================
export const orderStorage = {
  getAll: (): Order[] => getAll<Order>(KEYS.orders),

  add: (data: Omit<Order, "id" | "numeroCommande" | "dateCommande">): Order => {
    const items = orderStorage.getAll();
    const n = nextCounter("orders");
    const item: Order = {
      ...data,
      id: generateId(),
      numeroCommande: generateOrderNumber(n),
      dateCommande: now(),
    };
    items.push(item);
    saveAll(KEYS.orders, items);
    return item;
  },

  update: (id: string, data: Partial<Order>): Order | null => {
    const items = orderStorage.getAll();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...data };
    saveAll(KEYS.orders, items);
    return items[idx];
  },

  delete: (id: string): boolean => {
    const items = orderStorage.getAll();
    const filtered = items.filter((i) => i.id !== id);
    if (filtered.length === items.length) return false;
    saveAll(KEYS.orders, filtered);
    return true;
  },
};

// ============================================================
// SALES
// ============================================================
export const saleStorage = {
  getAll: (): Sale[] => getAll<Sale>(KEYS.sales),

  add: (data: Omit<Sale, "id" | "numeroVente" | "dateVente">): Sale => {
    const items = saleStorage.getAll();
    const n = nextCounter("sales");
    const item: Sale = {
      ...data,
      id: generateId(),
      numeroVente: generateSaleNumber(n),
      dateVente: now(),
    };
    items.push(item);
    saveAll(KEYS.sales, items);
    return item;
  },

  update: (id: string, data: Partial<Sale>): Sale | null => {
    const items = saleStorage.getAll();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...data };
    saveAll(KEYS.sales, items);
    return items[idx];
  },

  delete: (id: string): boolean => {
    const items = saleStorage.getAll();
    const filtered = items.filter((i) => i.id !== id);
    if (filtered.length === items.length) return false;
    saveAll(KEYS.sales, filtered);
    return true;
  },
};

// ============================================================
// CLIENTS
// ============================================================
export const clientStorage = {
  getAll: (): Client[] => getAll<Client>(KEYS.clients),

  add: (data: Omit<Client, "id" | "code" | "dateCreation" | "totalAchats">): Client => {
    const items = clientStorage.getAll();
    const n = nextCounter("clients");
    const item: Client = {
      ...data,
      id: generateId(),
      code: generateRef("CLI", n),
      dateCreation: now(),
      totalAchats: 0,
    };
    items.push(item);
    saveAll(KEYS.clients, items);
    return item;
  },

  update: (id: string, data: Partial<Client>): Client | null => {
    const items = clientStorage.getAll();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...data };
    saveAll(KEYS.clients, items);
    return items[idx];
  },

  delete: (id: string): boolean => {
    const items = clientStorage.getAll();
    const filtered = items.filter((i) => i.id !== id);
    if (filtered.length === items.length) return false;
    saveAll(KEYS.clients, filtered);
    return true;
  },

  getById: (id: string): Client | undefined =>
    clientStorage.getAll().find((c) => c.id === id),
};

// ============================================================
// SUPPLIERS
// ============================================================
export const supplierStorage = {
  getAll: (): Supplier[] => getAll<Supplier>(KEYS.suppliers),

  add: (data: Omit<Supplier, "id" | "code" | "dateCreation">): Supplier => {
    const items = supplierStorage.getAll();
    const n = nextCounter("suppliers");
    const item: Supplier = {
      ...data,
      id: generateId(),
      code: generateRef("FRN", n),
      dateCreation: now(),
    };
    items.push(item);
    saveAll(KEYS.suppliers, items);
    return item;
  },

  update: (id: string, data: Partial<Supplier>): Supplier | null => {
    const items = supplierStorage.getAll();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...data };
    saveAll(KEYS.suppliers, items);
    return items[idx];
  },

  delete: (id: string): boolean => {
    const items = supplierStorage.getAll();
    const filtered = items.filter((i) => i.id !== id);
    if (filtered.length === items.length) return false;
    saveAll(KEYS.suppliers, filtered);
    return true;
  },
};

// ============================================================
// REVENDEURS
// ============================================================
export const resellerStorage = {
  getAll: (): Reseller[] => getAll<Reseller>(KEYS.resellers),

  add: (data: Omit<Reseller, "id" | "code" | "dateCreation" | "totalAchats">): Reseller => {
    const items = resellerStorage.getAll();
    const n = nextCounter("resellers");
    const item: Reseller = {
      ...data,
      id: generateId(),
      code: generateRef("REV", n),
      dateCreation: now(),
      totalAchats: 0,
    };
    items.push(item);
    saveAll(KEYS.resellers, items);
    return item;
  },

  update: (id: string, data: Partial<Reseller>): Reseller | null => {
    const items = resellerStorage.getAll();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...data };
    saveAll(KEYS.resellers, items);
    return items[idx];
  },

  delete: (id: string): boolean => {
    const items = resellerStorage.getAll();
    const filtered = items.filter((i) => i.id !== id);
    if (filtered.length === items.length) return false;
    saveAll(KEYS.resellers, filtered);
    return true;
  },

  getById: (id: string): Reseller | undefined =>
    resellerStorage.getAll().find((r) => r.id === id),
};

// ============================================================
// TRANSACTIONS FINANCIÈRES
// ============================================================
export const transactionStorage = {
  getAll: (): Transaction[] => getAll<Transaction>(KEYS.transactions),

  add: (data: Omit<Transaction, "id" | "numeroTransaction" | "date">): Transaction => {
    const items = transactionStorage.getAll();
    const n = nextCounter("transactions");
    const item: Transaction = {
      ...data,
      id: generateId(),
      numeroTransaction: generateRef("TXN", n),
      date: now(),
    };
    items.push(item);
    saveAll(KEYS.transactions, items);
    return item;
  },

  update: (id: string, data: Partial<Transaction>): Transaction | null => {
    const items = transactionStorage.getAll();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...data };
    saveAll(KEYS.transactions, items);
    return items[idx];
  },

  delete: (id: string): boolean => {
    const items = transactionStorage.getAll();
    const filtered = items.filter((i) => i.id !== id);
    if (filtered.length === items.length) return false;
    saveAll(KEYS.transactions, filtered);
    return true;
  },

  getTotalByType: (type: TransactionType): number =>
    transactionStorage.getAll()
      .filter((t) => t.type === type)
      .reduce((sum, t) => sum + t.montant, 0),

  getBalance: (): number => {
    const all = transactionStorage.getAll();
    const revenus = all.filter(t => t.type === "revenu").reduce((s, t) => s + t.montant, 0);
    const depenses = all.filter(t => t.type === "depense").reduce((s, t) => s + t.montant, 0);
    return revenus - depenses;
  },

  getByMonth: (year: number, month: number): Transaction[] =>
    transactionStorage.getAll().filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === month;
    }),
};

// ============================================================
// RAPPELS / REMINDERS
// ============================================================
export const reminderStorage = {
  getAll: (): Reminder[] => getAll<Reminder>(KEYS.reminders),

  add: (data: Omit<Reminder, "id" | "dateCreation">): Reminder => {
    const items = reminderStorage.getAll();
    const item: Reminder = {
      ...data,
      id: generateId(),
      dateCreation: now(),
    };
    items.push(item);
    saveAll(KEYS.reminders, items);
    return item;
  },

  update: (id: string, data: Partial<Reminder>): Reminder | null => {
    const items = reminderStorage.getAll();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...data };
    saveAll(KEYS.reminders, items);
    return items[idx];
  },

  delete: (id: string): boolean => {
    const items = reminderStorage.getAll();
    const filtered = items.filter((i) => i.id !== id);
    if (filtered.length === items.length) return false;
    saveAll(KEYS.reminders, filtered);
    return true;
  },

  getActifs: (): Reminder[] =>
    reminderStorage.getAll().filter(r => r.status === "actif"),

  getDue: (): Reminder[] => {
    const now = new Date();
    return reminderStorage.getAll().filter(r =>
      r.status === "actif" && new Date(r.dueDate) <= now
    );
  },
};

// ============================================================
// SETTINGS / PARAMÈTRES
// ============================================================
const DEFAULT_SETTINGS: AppSettings = {
  boutiqueName: "Boutique Informatique & SAV",
  currency: "DZD",
  locale: "fr-DZ",
  backupCount: 7,
  remindersEnabled: true,
};

export const settingsStorage = {
  get: (): AppSettings => {
    const raw = localStorage.getItem(KEYS.settings);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  },
  save: (data: Partial<AppSettings>): AppSettings => {
    const current = settingsStorage.get();
    const updated = { ...current, ...data };
    localStorage.setItem(KEYS.settings, JSON.stringify(updated));
    return updated;
  },
  reset: (): AppSettings => {
    localStorage.setItem(KEYS.settings, JSON.stringify(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  },
};

// ============================================================
// EXPORT / IMPORT JSON (Sauvegarde & Restauration)
// ============================================================
export function exportAllData(): string {
  const data = {
    exportDate: new Date().toISOString(),
    version: "2.0",
    stock: stockStorage.getAll(),
    repairs: repairStorage.getAll(),
    orders: orderStorage.getAll(),
    sales: saleStorage.getAll(),
    clients: clientStorage.getAll(),
    suppliers: supplierStorage.getAll(),
    resellers: resellerStorage.getAll(),
    transactions: transactionStorage.getAll(),
    reminders: reminderStorage.getAll(),
    settings: settingsStorage.get(),
    counters: JSON.parse(localStorage.getItem(KEYS.counters) || "{}"),
  };
  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data.stock) saveAll(KEYS.stock, data.stock);
    if (data.repairs) saveAll(KEYS.repairs, data.repairs);
    if (data.orders) saveAll(KEYS.orders, data.orders);
    if (data.sales) saveAll(KEYS.sales, data.sales);
    if (data.clients) saveAll(KEYS.clients, data.clients);
    if (data.suppliers) saveAll(KEYS.suppliers, data.suppliers);
    if (data.resellers) saveAll(KEYS.resellers, data.resellers);
    if (data.transactions) saveAll(KEYS.transactions, data.transactions);
    if (data.reminders) saveAll(KEYS.reminders, data.reminders);
    if (data.settings) localStorage.setItem(KEYS.settings, JSON.stringify(data.settings));
    if (data.counters) localStorage.setItem(KEYS.counters, JSON.stringify(data.counters));
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// SEED DATA (données de démonstration)
// ============================================================
export function seedDemoData() {
  // Ne seeder que si la base est vide
  const existing = stockStorage.getAll();
  if (existing.length > 0) return;

  // Fournisseurs
  const f1 = supplierStorage.add({ nom: "Tech Distrib", contact: "Ahmed Benali", telephone: "0555123456", email: "contact@techdistrib.dz", ville: "Alger", pays: "Algérie", delaiLivraison: 3 });
  const f2 = supplierStorage.add({ nom: "PC Parts Algeria", contact: "Karim Meziane", telephone: "0661789012", email: "info@pcparts.dz", ville: "Oran", pays: "Algérie", delaiLivraison: 5 });

  // Clients
  const c1 = clientStorage.add({ nom: "Mansouri", prenom: "Yacine", telephone: "0770112233", email: "y.mansouri@email.com", type: "particulier", ville: "Alger" });
  clientStorage.add({ nom: "SARL DataNet", telephone: "0213556677", email: "admin@datanet.dz", type: "entreprise", entreprise: "SARL DataNet", ville: "Alger" });
  clientStorage.add({ nom: "Boubekeur", prenom: "Lina", telephone: "0541998877", type: "particulier", ville: "Blida" });

  // Stock
  stockStorage.add({ nom: "Intel Core i7-12700K", categorie: "CPU", marque: "Intel", modele: "i7-12700K", quantite: 8, seuilAlerte: 3, prixAchat: 32000, prixVente: 42000, fournisseurId: f1.id, emplacement: "Rayon A1" });
  stockStorage.add({ nom: "AMD Ryzen 5 5600X", categorie: "CPU", marque: "AMD", modele: "Ryzen 5 5600X", quantite: 2, seuilAlerte: 3, prixAchat: 18000, prixVente: 24000, fournisseurId: f1.id, emplacement: "Rayon A1" });
  stockStorage.add({ nom: "Kingston DDR4 16GB 3200MHz", categorie: "RAM", marque: "Kingston", modele: "KVR32N22D8/16", quantite: 15, seuilAlerte: 5, prixAchat: 7500, prixVente: 10000, fournisseurId: f2.id, emplacement: "Rayon B2" });
  stockStorage.add({ nom: "Samsung 980 PRO 1TB NVMe", categorie: "SSD", marque: "Samsung", modele: "980 PRO", quantite: 0, seuilAlerte: 2, prixAchat: 14000, prixVente: 18500, fournisseurId: f1.id, emplacement: "Rayon C1" });
  stockStorage.add({ nom: "RTX 3060 12GB GDDR6", categorie: "GPU", marque: "NVIDIA", modele: "RTX 3060", quantite: 3, seuilAlerte: 2, prixAchat: 65000, prixVente: 82000, fournisseurId: f1.id, emplacement: "Rayon D1" });
  stockStorage.add({ nom: "ASUS ROG B550-F WiFi", categorie: "Carte mère", marque: "ASUS", modele: "ROG B550-F", quantite: 4, seuilAlerte: 2, prixAchat: 25000, prixVente: 33000, fournisseurId: f2.id, emplacement: "Rayon E1" });
  stockStorage.add({ nom: "Corsair RM750x 750W 80+ Gold", categorie: "Alimentation", marque: "Corsair", modele: "RM750x", quantite: 6, seuilAlerte: 2, prixAchat: 12000, prixVente: 16000, fournisseurId: f1.id });
  stockStorage.add({ nom: "Seagate Barracuda 2TB HDD", categorie: "HDD", marque: "Seagate", modele: "Barracuda 2TB", quantite: 1, seuilAlerte: 3, prixAchat: 5500, prixVente: 7500, fournisseurId: f2.id });
  stockStorage.add({ nom: "Logitech MX Master 3 Souris", categorie: "Souris", marque: "Logitech", modele: "MX Master 3", quantite: 10, seuilAlerte: 3, prixAchat: 5800, prixVente: 7800, fournisseurId: f2.id });
  stockStorage.add({ nom: "Samsung 24\" FHD IPS Écran", categorie: "Écran", marque: "Samsung", modele: "F24T350FH", quantite: 5, seuilAlerte: 2, prixAchat: 22000, prixVente: 29000, fournisseurId: f1.id });

  // Réparations
  repairStorage.add({ clientId: c1.id, clientNom: "Mansouri Yacine", clientTel: "0770112233", appareil: "Laptop HP EliteBook 840", marque: "HP", modele: "EliteBook 840 G7", problemeDecrit: "Écran cassé - pas d'affichage", status: "en_diagnostic", priorite: "haute", technicien: "Sofiane" });
  repairStorage.add({ clientId: "", clientNom: "Bencheikh Omar", clientTel: "0661445566", appareil: "Desktop Gaming Custom", marque: "Custom", modele: "Gaming PC", problemeDecrit: "Ne démarre pas, possible panne alimentation ou carte mère", diagnostic: "Alimentation défectueuse à remplacer", status: "en_attente_pièce", priorite: "normale", technicien: "Sofiane", piecesNecessaires: ["Corsair RM750x"] });
  repairStorage.add({ clientId: "", clientNom: "SARL DataNet", clientTel: "0213556677", appareil: "Imprimante HP LaserJet", marque: "HP", modele: "LaserJet Pro M404n", problemeDecrit: "Bourrage papier fréquent et impression floue", status: "en_cours", priorite: "basse", technicien: "Riad" });
  repairStorage.add({ clientId: "", clientNom: "Khelifi Samia", clientTel: "0550334455", appareil: "MacBook Pro 2019", marque: "Apple", modele: "MacBook Pro 15\" 2019", problemeDecrit: "Batterie ne charge plus, autonomie 0%", status: "reçu", priorite: "normale" });

  // Commandes fournisseurs
  const stockItems = stockStorage.getAll();
  const ssd = stockItems.find(s => s.nom.includes("Samsung 980"));
  const ryzen = stockItems.find(s => s.nom.includes("Ryzen"));
  const seagate = stockItems.find(s => s.nom.includes("Seagate"));
  if (ssd && ryzen && seagate) {
    orderStorage.add({
      fournisseurId: f1.id,
      fournisseurNom: f1.nom,
      status: "envoyée",
      lignes: [
        { id: generateId(), stockItemId: ssd.id, reference: ssd.reference, designation: ssd.nom, quantiteCommandee: 5, quantiteRecue: 0, prixUnitaire: ssd.prixAchat, total: ssd.prixAchat * 5 },
        { id: generateId(), stockItemId: ryzen.id, reference: ryzen.reference, designation: ryzen.nom, quantiteCommandee: 3, quantiteRecue: 0, prixUnitaire: ryzen.prixAchat, total: ryzen.prixAchat * 3 },
        { id: generateId(), stockItemId: seagate.id, reference: seagate.reference, designation: seagate.nom, quantiteCommandee: 4, quantiteRecue: 0, prixUnitaire: seagate.prixAchat, total: seagate.prixAchat * 4 },
      ],
      montantTotal: (ssd.prixAchat * 5) + (ryzen.prixAchat * 3) + (seagate.prixAchat * 4),
      dateLivraisonPrevue: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // Revendeurs de démonstration
  resellerStorage.add({ nom: "Informatique Sahel", telephone: "0555001122", email: "sahel@info.dz", type: "revendeur", entreprise: "SARL Sahel Info", ville: "Annaba", remisePourcentage: 10, plafondCredit: 500000, soldeEnCours: 85000 });
  resellerStorage.add({ nom: "PC Store Oran", telephone: "0661334455", email: "store@oran.dz", type: "grossiste", entreprise: "PC Store", ville: "Oran", remisePourcentage: 15, plafondCredit: 1000000, soldeEnCours: 0 });

  // Transactions de démonstration
  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 15).toISOString();
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 5).toISOString();

  transactionStorage.add({ type: "revenu", categorie: "Vente produit", montant: 42000, description: "Vente Intel Core i7-12700K", methodePaiement: "espèces", referenceExterne: "VNT-001", date: thisMonth } as any);
  transactionStorage.add({ type: "revenu", categorie: "Réparation", montant: 8500, description: "Réparation écran Laptop HP EliteBook", methodePaiement: "espèces", referenceExterne: "SAV-001", date: thisMonth } as any);
  transactionStorage.add({ type: "depense", categorie: "Achat stock", montant: 95000, description: "Achat lot composants - Tech Distrib", methodePaiement: "virement", date: lastMonth } as any);
  transactionStorage.add({ type: "depense", categorie: "Loyer", montant: 25000, description: "Loyer boutique - Novembre", methodePaiement: "virement", date: thisMonth } as any);
  transactionStorage.add({ type: "depense", categorie: "Salaire", montant: 40000, description: "Salaire technicien Sofiane", methodePaiement: "espèces", date: thisMonth } as any);
  transactionStorage.add({ type: "revenu", categorie: "Vente produit", montant: 29000, description: "Vente Écran Samsung 24 FHD", methodePaiement: "carte", date: lastMonth } as any);

  // Rappels de démonstration
  const demain = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  reminderStorage.add({ clientNom: "Mansouri Yacine", clientTel: "0770112233", message: "Rappeler le client - Laptop HP prêt pour retrait", dueDate: demain, repeat: "aucune", status: "actif" });
  reminderStorage.add({ clientNom: "Bencheikh Omar", clientTel: "0661445566", message: "Vérifier disponibilité pièce alimentation Corsair RM750x", dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), repeat: "aucune", status: "actif" });
}

