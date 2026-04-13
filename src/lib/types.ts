export type ClientCategory = 'comptoir' | 'client_nomme' | 'entreprise';

export interface Product {
  id: string;
  name: string;
  reference: string;
  category: string;
  price: number;
  costPrice: number;
  quantity: number;
  minStock: number;
  unit: string;
  createdAt: string;
}

export interface Client {
  id: string;
  category: ClientCategory;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  company?: string;
  parentId?: string; // For sub-clients of client_nomme
  matriculeFiscal?: string; // Tax ID for Delivery Note
  createdAt: string;
}

export interface DeliveryNoteItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  vat: number; // TVA (%)
  discount: number; // Remise (%)
  totalHT: number;
  totalTTC: number;
}

export interface DeliveryNote {
  id: string;
  noteNumber: string; // e.g., 2026002755
  clientId: string;
  clientSheetId?: string; // Optional link to a material sheet
  date: string;
  items: DeliveryNoteItem[];
  subTotalHT: number;
  totalDiscount: number;
  totalVat: number;
  stamp: number; // Timbre
  totalTTC: number; // Net à payer
  paid?: boolean;
  acompte?: number;
  resteAPayer?: number;
}

export interface Transaction {
  id: string;
  type: 'entry' | 'exit';
  productId: string;
  productName: string;
  quantity: number;
  clientId?: string;
  clientName?: string;
  clientCategory?: ClientCategory;
  note?: string;
  date: string;
}

export interface ClientSheetItem {
  id: string; // unique item id in sheet
  productId: string;
  productName: string;
  quantity: number; // total quantity planned
}

export interface ClientSheet {
  id: string;
  clientId: string;
  name: string; // e.g. "Chantier Résidence X"
  date: string;
  items: ClientSheetItem[];
}

export const CLIENT_CATEGORY_LABELS: Record<ClientCategory, string> = {
  comptoir: 'Client Comptoir',
  client_nomme: 'Client Nommé',
  entreprise: 'Entreprise',
};
