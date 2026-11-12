import { useState, useEffect, useCallback } from "react";
import { Sale } from "@/types";
import { saleStorage } from "@/lib/storage";

export function useSales() {
  const [items, setItems] = useState<Sale[]>([]);

  const load = useCallback(() => {
    setItems(saleStorage.getAll());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = useCallback(
    (data: Omit<Sale, "id" | "numeroVente" | "dateVente">) => {
      const item = saleStorage.add(data);
      setItems(saleStorage.getAll());
      return item;
    },
    []
  );

  const update = useCallback((id: string, data: Partial<Sale>) => {
    const updated = saleStorage.update(id, data);
    setItems(saleStorage.getAll());
    return updated;
  }, []);

  const remove = useCallback((id: string) => {
    const ok = saleStorage.delete(id);
    if (ok) setItems(saleStorage.getAll());
    return ok;
  }, []);

  const today = new Date().toDateString();
  const salesToday = items.filter((s) => new Date(s.dateVente).toDateString() === today);
  const revenueToday = salesToday.reduce((sum, s) => sum + s.montantTotal, 0);

  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const salesMonth = items.filter((s) => {
    const d = new Date(s.dateVente);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });
  const revenueMonth = salesMonth.reduce((sum, s) => sum + s.montantTotal, 0);

  return { items, add, update, remove, reload: load, salesToday, revenueToday, salesMonth, revenueMonth };
}
