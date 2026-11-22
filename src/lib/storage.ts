import type {
  StockItem, RepairItem, Order, Sale, Client, Supplier,
  Transaction, Reminder, Reseller, AppSettings, TransactionCategory, TransactionType,
  CompteOperation, CompteOperationType
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
  compteOperations: "techshop_compte_operations",
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
// GENERIC HELPERS & FILE SYNC (JSON, EXCEL & SQLITE 3 DATABASE)
// ============================================================
let syncTimeout: any = null;

export function triggerFilePersistence() {
  if (typeof window !== "undefined" && window.electronAPI?.saveFileData) {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(async () => {
      try {
        const fullData = JSON.parse(exportAllData());
        let excelBase64: string | undefined = undefined;
        let sqliteBase64: string | undefined = undefined;

        try {
          const { getExcelBase64 } = await import("./excel");
          excelBase64 = getExcelBase64();
        } catch (_) {}

        try {
          const { getSQLiteBase64 } = await import("./sqlite");
          sqliteBase64 = await getSQLiteBase64();
        } catch (err) {
          console.error("Erreur génération SQLite:", err);
        }

        window.electronAPI!.saveFileData!({ data: fullData, excelBase64, sqliteBase64 });
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
// COMPTE COURANT (Opérations revendeur personnel)
// ============================================================
export const compteOperationStorage = {
  getAll: (): CompteOperation[] => getAll<CompteOperation>(KEYS.compteOperations),

  getByReseller: (resellerId: string): CompteOperation[] =>
    compteOperationStorage.getAll().filter(op => op.resellerId === resellerId),

  add: (data: Omit<CompteOperation, "id" | "date">): CompteOperation => {
    const items = compteOperationStorage.getAll();
    const op: CompteOperation = {
      ...data,
      id: generateId(),
      date: now(),
    };
    items.push(op);
    saveAll(KEYS.compteOperations, items);
    // Mettre à jour le solde du revendeur
    const resellers = resellerStorage.getAll();
    const idx = resellers.findIndex(r => r.id === data.resellerId);
    if (idx !== -1) {
      const allOps = [...items].filter(o => o.resellerId === data.resellerId);
      const solde = allOps.reduce((acc, o) => acc + o.montant, 0);
      resellerStorage.update(data.resellerId, { soldeEnCours: solde });
    }
    return op;
  },

  delete: (id: string): boolean => {
    const items = compteOperationStorage.getAll();
    const op = items.find(o => o.id === id);
    const filtered = items.filter(o => o.id !== id);
    if (filtered.length === items.length) return false;
    saveAll(KEYS.compteOperations, filtered);
    // Recalc solde
    if (op) {
      const remaining = filtered.filter(o => o.resellerId === op.resellerId);
      const solde = remaining.reduce((acc, o) => acc + o.montant, 0);
      resellerStorage.update(op.resellerId, { soldeEnCours: solde });
    }
    return true;
  },

  getSolde: (resellerId: string): number => {
    const ops = compteOperationStorage.getByReseller(resellerId);
    return ops.reduce((acc, o) => acc + o.montant, 0);
  },
};

// ============================================================
// SETTINGS / PARAMÈTRES
// ============================================================
const DEFAULT_SETTINGS: AppSettings = {
  boutiqueName: "Boutique Informatique & SAV",
  currency: "TND",
  locale: "fr-TN",
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
    compteOperations: compteOperationStorage.getAll(),
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
    if (data.compteOperations) saveAll(KEYS.compteOperations, data.compteOperations);
    if (data.settings) localStorage.setItem(KEYS.settings, JSON.stringify(data.settings));
    if (data.counters) localStorage.setItem(KEYS.counters, JSON.stringify(data.counters));
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// PURGE & GESTION DES DONNÉES (PROPRES SANS DÉMO)
// ============================================================
export function clearAllData() {
  const prefix = "techshop_";
  Object.keys(localStorage).filter(k => k.startsWith(prefix)).forEach(k => localStorage.removeItem(k));
  triggerFilePersistence();
}

export function purgeDemoDataIfExists() {
  try {
    const stock = stockStorage.getAll();
    const repairs = repairStorage.getAll();
    const suppliers = supplierStorage.getAll();
    
    // Détecte les données de démonstration initiales
    const isDemoStock = stock.some(s => s.nom.includes("Intel Core i7-12700K") || s.nom.includes("Kingston DDR4") || s.nom.includes("Samsung 980 PRO"));
    const isDemoRepair = repairs.some(r => r.clientNom === "Mansouri Yacine" || r.clientNom === "Bencheikh Omar");
    const isDemoSupplier = suppliers.some(f => f.nom === "Tech Distrib" || f.nom === "PC Parts Algeria");

    if (isDemoStock || isDemoRepair || isDemoSupplier) {
      clearAllData();
    }
  } catch (err) {
    console.error("Erreur purge données démo:", err);
  }
}

export function seedDemoData() {
  // Purge systématique des anciennes données de démonstration pour démarrer sur une base 100% propre
  purgeDemoDataIfExists();
}

