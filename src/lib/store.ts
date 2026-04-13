import { Product, Client, Transaction, DeliveryNote, ClientSheet } from './types';

const KEYS = {
  products: 'stockapp_products',
  clients: 'stockapp_clients',
  transactions: 'stockapp_transactions',
  deliveryNotes: 'stockapp_deliveryNotes',
  clientSheets: 'stockapp_clientSheets',
};

function load<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch { return []; }
}

function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

export const store = {
  getProducts: () => load<Product>(KEYS.products),
  saveProducts: (p: Product[]) => save(KEYS.products, p),
  
  getClients: () => load<Client>(KEYS.clients),
  saveClients: (c: Client[]) => save(KEYS.clients, c),
  
  getTransactions: () => load<Transaction>(KEYS.transactions),
  saveTransactions: (t: Transaction[]) => save(KEYS.transactions, t),

  getDeliveryNotes: () => load<DeliveryNote>(KEYS.deliveryNotes),
  saveDeliveryNotes: (d: DeliveryNote[]) => save(KEYS.deliveryNotes, d),

  getClientSheets: () => load<ClientSheet>(KEYS.clientSheets),
  saveClientSheets: (s: ClientSheet[]) => save(KEYS.clientSheets, s),

  addClientSheet: (s: ClientSheet) => {
    const all = load<ClientSheet>(KEYS.clientSheets);
    all.push(s);
    save(KEYS.clientSheets, all);
  },
  updateClientSheet: (s: ClientSheet) => {
    const all = load<ClientSheet>(KEYS.clientSheets).map(x => x.id === s.id ? s : x);
    save(KEYS.clientSheets, all);
  },
  deleteClientSheet: (id: string) => {
    save(KEYS.clientSheets, load<ClientSheet>(KEYS.clientSheets).filter(x => x.id !== id));
  },

  addProduct: (p: Product) => {
    const all = load<Product>(KEYS.products);
    all.push(p);
    save(KEYS.products, all);
  },
  updateProduct: (p: Product) => {
    const all = load<Product>(KEYS.products).map(x => x.id === p.id ? p : x);
    save(KEYS.products, all);
  },
  deleteProduct: (id: string) => {
    save(KEYS.products, load<Product>(KEYS.products).filter(x => x.id !== id));
  },

  addClient: (c: Client) => {
    const all = load<Client>(KEYS.clients);
    all.push(c);
    save(KEYS.clients, all);
  },
  updateClient: (c: Client) => {
    const all = load<Client>(KEYS.clients).map(x => x.id === c.id ? c : x);
    save(KEYS.clients, all);
  },
  deleteClient: (id: string) => {
    save(KEYS.clients, load<Client>(KEYS.clients).filter(x => x.id !== id));
  },

  addTransaction: (t: Transaction) => {
    const all = load<Transaction>(KEYS.transactions);
    all.push(t);
    save(KEYS.transactions, all);
    // Update stock
    const products = load<Product>(KEYS.products);
    const product = products.find(p => p.id === t.productId);
    if (product) {
      product.quantity += t.type === 'entry' ? t.quantity : -t.quantity;
      save(KEYS.products, products);
    }
  },

  addDeliveryNote: (d: DeliveryNote) => {
    const all = load<DeliveryNote>(KEYS.deliveryNotes);
    all.push(d);
    save(KEYS.deliveryNotes, all);

    // Also deduct stock for items
    const products = load<Product>(KEYS.products);
    d.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        product.quantity -= item.quantity;
      }
      
      // Auto-create a transaction for traceability
      const transaction: Transaction = {
        id: crypto.randomUUID(),
        type: 'exit',
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        clientId: d.clientId,
        date: new Date().toISOString(),
        note: `BL N° ${d.noteNumber}`
      };
      
      const transactions = load<Transaction>(KEYS.transactions);
      transactions.push(transaction);
      save(KEYS.transactions, transactions);
    });
    
    save(KEYS.products, products);
  },
  updateDeliveryNote: (d: DeliveryNote) => {
    store.deleteDeliveryNote(d.id); // Reverts stock and deletes old transactions
    store.addDeliveryNote(d);       // Applies new stock deduction and creates new transactions
  },

  deleteDeliveryNote: (id: string) => {
    const all = load<DeliveryNote>(KEYS.deliveryNotes);
    const blInfo = all.find(x => x.id === id);
    
    if (blInfo) {
      const products = load<Product>(KEYS.products);
      const transactions = load<Transaction>(KEYS.transactions);
      
      // We identify the transactions created by this BL using the note field
      const noteRef = `BL N° ${blInfo.noteNumber}`;
      const toRevert = transactions.filter(t => t.note === noteRef);
      
      // Restore the quantities
      toRevert.forEach(tx => {
        const p = products.find(prod => prod.id === tx.productId);
        if (p) {
          p.quantity += tx.quantity;
        }
      });
      
      // Save removed transactions and restored products
      save(KEYS.transactions, transactions.filter(t => t.note !== noteRef));
      save(KEYS.products, products);
    }

    save(KEYS.deliveryNotes, all.filter(x => x.id !== id));
  },

  clearTransactions: () => {
    save(KEYS.transactions, []);
  },

  exportAllData: () => {
    const data: Record<string, any> = {};
    Object.entries(KEYS).forEach(([_, key]) => {
      data[key] = load(key);
    });
    return JSON.stringify(data, null, 2);
  },

  importAllData: (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      Object.entries(KEYS).forEach(([_, key]) => {
        if (data[key]) {
          localStorage.setItem(key, JSON.stringify(data[key]));
        }
      });
      return true;
    } catch (e) {
      console.error("Import failed", e);
      return false;
    }
  },

  resetAllData: () => {
    Object.values(KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
};
