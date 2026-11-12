import { useState, useEffect, useCallback } from "react";
import { RepairItem } from "@/types";
import { repairStorage } from "@/lib/storage";

export function useRepairs() {
  const [items, setItems] = useState<RepairItem[]>([]);

  const load = useCallback(() => {
    setItems(repairStorage.getAll());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = useCallback(
    (data: Omit<RepairItem, "id" | "numeroTicket" | "dateReception">) => {
      const item = repairStorage.add(data);
      setItems(repairStorage.getAll());
      return item;
    },
    []
  );

  const update = useCallback((id: string, data: Partial<RepairItem>) => {
    const updated = repairStorage.update(id, data);
    setItems(repairStorage.getAll());
    return updated;
  }, []);

  const remove = useCallback((id: string) => {
    const ok = repairStorage.delete(id);
    if (ok) setItems(repairStorage.getAll());
    return ok;
  }, []);

  const pending = items.filter((r) => ["reçu", "en_diagnostic", "en_attente_pièce", "en_cours"].includes(r.status));
  const done = items.filter((r) => ["terminé", "livré"].includes(r.status));

  return { items, add, update, remove, reload: load, pending, done };
}
