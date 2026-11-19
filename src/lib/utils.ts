import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number): string {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat("fr-TN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(num) + " DT";
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function generateRef(prefix: string, counter: number): string {
  return `${prefix}-${String(counter).padStart(5, "0")}`;
}

export function generateTicket(counter: number): string {
  const year = new Date().getFullYear();
  return `SAV-${year}-${String(counter).padStart(4, "0")}`;
}

export function generateOrderNumber(counter: number): string {
  const year = new Date().getFullYear();
  return `CMD-${year}-${String(counter).padStart(4, "0")}`;
}

export function generateSaleNumber(counter: number): string {
  const year = new Date().getFullYear();
  return `VTE-${year}-${String(counter).padStart(5, "0")}`;
}

export function now(): string {
  return new Date().toISOString();
}

export function calculateStockStatus(quantite: number, seuil: number): "en_stock" | "stock_faible" | "rupture" {
  if (quantite === 0) return "rupture";
  if (quantite <= seuil) return "stock_faible";
  return "en_stock";
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

