import { useState, useEffect, useCallback } from "react";
import { Order } from "@/types";
import { orderStorage } from "@/lib/storage";

export function useOrders() {
  const [items, setItems] = useState<Order[]>([]);

  const load = useCallback(() => {
    setItems(orderStorage.getAll());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = useCallback(
    (data: Omit<Order, "id" | "numeroCommande" | "dateCommande">) => {
      const item = orderStorage.add(data);
      setItems(orderStorage.getAll());
      return item;
    },
    []
  );

  const update = useCallback((id: string, data: Partial<Order>) => {
    const updated = orderStorage.update(id, data);
    setItems(orderStorage.getAll());
    return updated;
  }, []);

  const remove = useCallback((id: string) => {
    const ok = orderStorage.delete(id);
    if (ok) setItems(orderStorage.getAll());
    return ok;
  }, []);

  const active = items.filter((o) => !["reçue", "annulée"].includes(o.status));

  return { items, add, update, remove, reload: load, active };
}
