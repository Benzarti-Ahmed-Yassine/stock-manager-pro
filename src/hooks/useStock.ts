import { useState, useEffect, useCallback } from "react";
import { StockItem } from "@/types";
import { stockStorage } from "@/lib/storage";

export function useStock() {
  const [items, setItems] = useState<StockItem[]>([]);

  const load = useCallback(() => {
    setItems(stockStorage.getAll());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = useCallback(
    (data: Omit<StockItem, "id" | "reference" | "dateAjout" | "dateMaj" | "status">) => {
      const item = stockStorage.add(data);
      setItems(stockStorage.getAll());
      return item;
    },
    []
  );

  const update = useCallback((id: string, data: Partial<StockItem>) => {
    const updated = stockStorage.update(id, data);
    setItems(stockStorage.getAll());
    return updated;
  }, []);

  const remove = useCallback((id: string) => {
    const ok = stockStorage.delete(id);
    if (ok) setItems(stockStorage.getAll());
    return ok;
  }, []);

  const totalValue = items.reduce((sum, i) => sum + i.prixAchat * i.quantite, 0);
  const lowStock = items.filter((i) => i.status === "stock_faible");
  const outOfStock = items.filter((i) => i.status === "rupture");

  return { items, add, update, remove, reload: load, totalValue, lowStock, outOfStock };
}
