import { useState, useMemo } from "react";
import {
  Plus, Search, ShoppingCart, Trash2, Edit2, Filter,
  Package, ChevronDown, Truck, CheckCircle2, FileSpreadsheet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { orderStorage, supplierStorage, stockStorage } from "@/lib/storage";
import { exportOrdersToExcel } from "@/lib/excel";
import { formatPrice, formatDate, generateId, cn } from "@/lib/utils";
import type { Order, OrderStatus, OrderLine } from "@/types";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "brouillon", label: "Brouillon" },
  { value: "envoyée", label: "Envoyée" },
  { value: "confirmée", label: "Confirmée" },
  { value: "en_transit", label: "En transit" },
  { value: "reçue_partielle", label: "Reçue partiellement" },
  { value: "reçue", label: "Reçue complètement" },
  { value: "annulée", label: "Annulée" },
];

function StatusIcon({ status }: { status: OrderStatus }) {
  if (status === "reçue") return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  if (status === "en_transit") return <Truck className="w-4 h-4 text-blue-500" />;
  if (status === "annulée") return <div className="w-4 h-4 rounded-full bg-red-500" />;
  return <Package className="w-4 h-4 text-muted-foreground" />;
}

type FormData = {
  fournisseurId: string;
  status: OrderStatus;
  dateLivraisonPrevue: string;
  notes: string;
};

export default function OrdersPage() {
  const [items, setItems] = useState<Order[]>(() => orderStorage.getAll());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [openDialog, setOpenDialog] = useState(false);
  const [editItem, setEditItem] = useState<Order | null>(null);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const suppliers = supplierStorage.getAll();
  const stockItems = stockStorage.getAll();

  const { register, handleSubmit, reset, setValue } = useForm<FormData>({
    defaultValues: { status: "brouillon" }
  });

  const refresh = () => setItems(orderStorage.getAll());

  const filtered = useMemo(() => items
    .filter(o => {
      const q = search.toLowerCase();
      return (
        o.numeroCommande.toLowerCase().includes(q) ||
        o.fournisseurNom.toLowerCase().includes(q)
      );
    })
    .filter(o => statusFilter === "all" || o.status === statusFilter)
    .sort((a, b) => new Date(b.dateCommande).getTime() - new Date(a.dateCommande).getTime()),
    [items, search, statusFilter]
  );

  const stats = useMemo(() => ({
    total: items.length,
    enCours: items.filter(o => ["envoyée", "confirmée", "en_transit", "reçue_partielle"].includes(o.status)).length,
    montantEnCours: items
      .filter(o => ["envoyée", "confirmée", "en_transit", "reçue_partielle"].includes(o.status))
      .reduce((a, o) => a + o.montantTotal, 0),
    reçues: items.filter(o => o.status === "reçue").length,
  }), [items]);

  const addLine = () => {
    setLines(prev => [...prev, {
      id: generateId(),
      reference: "",
      designation: "",
      quantiteCommandee: 1,
      quantiteRecue: 0,
      prixUnitaire: 0,
      total: 0,
    }]);
  };

  const updateLine = (id: string, field: keyof OrderLine, value: string | number) => {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      updated.total = updated.quantiteCommandee * updated.prixUnitaire;
      return updated;
    }));
  };

  const removeLine = (id: string) => setLines(prev => prev.filter(l => l.id !== id));

  const fillFromStock = (lineId: string, stockId: string) => {
    const stock = stockItems.find(s => s.id === stockId);
    if (!stock) return;
    setLines(prev => prev.map(l => {
      if (l.id !== lineId) return l;
      return {
        ...l, stockItemId: stock.id,
        reference: stock.reference, designation: stock.nom,
        prixUnitaire: stock.prixAchat,
        total: l.quantiteCommandee * stock.prixAchat,
      };
    }));
  };

  const openEdit = (item: Order) => {
    setEditItem(item);
    setValue("fournisseurId", item.fournisseurId);
    setValue("status", item.status);
    setValue("dateLivraisonPrevue", item.dateLivraisonPrevue?.split("T")[0] || "");
    setValue("notes", item.notes || "");
    setLines(item.lignes);
    setOpenDialog(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Supprimer cette commande ?")) return;
    orderStorage.delete(id);
    refresh();
    toast.success("Commande supprimée");
  };

  const onSubmit = (data: FormData) => {
    const supplier = suppliers.find(s => s.id === data.fournisseurId);
    const montantTotal = lines.reduce((a, l) => a + l.total, 0);

    if (!supplier) { toast.error("Sélectionnez un fournisseur"); return; }
    if (lines.length === 0) { toast.error("Ajoutez au moins un article"); return; }

    const orderData = {
      fournisseurId: data.fournisseurId,
      fournisseurNom: supplier.nom,
      status: data.status,
      lignes: lines,
      montantTotal,
      dateLivraisonPrevue: data.dateLivraisonPrevue ? new Date(data.dateLivraisonPrevue).toISOString() : undefined,
      notes: data.notes,
    };

    if (editItem) {
      orderStorage.update(editItem.id, orderData);
      toast.success("Commande mise à jour");
    } else {
      orderStorage.add(orderData);
      toast.success("Commande créée");
    }

    setOpenDialog(false);
    setEditItem(null);
    setLines([]);
    reset({ status: "brouillon" });
    refresh();
  };

  const quickStatus = (id: string, status: OrderStatus) => {
    orderStorage.update(id, { status });
    refresh();
    toast.success(`Statut mis à jour: ${STATUS_OPTIONS.find(s => s.value === status)?.label}`);
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary" /> Commandes Fournisseurs
          </h1>
          <p className="page-subtitle">Gestion des commandes et réapprovisionnement</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportOrdersToExcel} className="gap-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-700">
            <FileSpreadsheet className="w-4 h-4" /> Exporter Excel
          </Button>
          <Button onClick={() => { setEditItem(null); reset({ status: "brouillon" }); setLines([]); setOpenDialog(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Nouvelle commande
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total commandes", value: stats.total, color: "text-foreground" },
          { label: "En cours", value: stats.enCours, color: "text-blue-600" },
          { label: "Montant en cours", value: formatPrice(stats.montantEnCours), color: "text-orange-600" },
          { label: "Reçues", value: stats.reçues, color: "text-green-600" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-3 text-center">
            <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Alerte réapprovisionnement */}
      {stockStorage.getAll().filter(s => s.status !== "en_stock").length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-400 mb-2">
            ⚠️ Articles nécessitant un réapprovisionnement
          </p>
          <div className="flex flex-wrap gap-2">
            {stockStorage.getAll()
              .filter(s => s.status !== "en_stock")
              .slice(0, 8)
              .map(s => (
                <span key={s.id} className={cn("badge-status text-xs", `status-${s.status}`)}>
                  {s.nom} ({s.quantite} restant{s.quantite > 1 ? "s" : ""})
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="N° commande, fournisseur..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Filter className="w-3.5 h-3.5" /> {filtered.length} résultat(s)
        </div>
      </div>

      {/* Orders Table */}
      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">N° Commande</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Fournisseur</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Articles</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Montant Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Livraison prévue</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Statut</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    Aucune commande trouvée
                  </td>
                </tr>
              ) : (
                filtered.map(order => (
                  <>
                    <tr
                      key={order.id}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-primary font-semibold">{order.numeroCommande}</td>
                      <td className="px-4 py-3 font-medium">{order.fournisseurNom}</td>
                      <td className="px-4 py-3 text-muted-foreground">{order.lignes.length} article(s)</td>
                      <td className="px-4 py-3 font-bold">{formatPrice(order.montantTotal)}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(order.dateCommande)}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {order.dateLivraisonPrevue ? formatDate(order.dateLivraisonPrevue) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("badge-status", `status-${order.status}`)}>
                          {STATUS_OPTIONS.find(s => s.value === order.status)?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", expandedId === order.id && "rotate-180")} />
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openEdit(order); }}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); handleDelete(order.id); }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === order.id && (
                      <tr key={`${order.id}-expand`} className="bg-muted/20">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="space-y-3">
                            <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Détail des lignes</div>
                            <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
                              <thead className="bg-muted">
                                <tr>
                                  <th className="px-3 py-2 text-left">Référence</th>
                                  <th className="px-3 py-2 text-left">Désignation</th>
                                  <th className="px-3 py-2 text-right">Qté commandée</th>
                                  <th className="px-3 py-2 text-right">Qté reçue</th>
                                  <th className="px-3 py-2 text-right">Prix unitaire</th>
                                  <th className="px-3 py-2 text-right">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {order.lignes.map(l => (
                                  <tr key={l.id} className="border-t border-border">
                                    <td className="px-3 py-2 font-mono">{l.reference}</td>
                                    <td className="px-3 py-2">{l.designation}</td>
                                    <td className="px-3 py-2 text-right">{l.quantiteCommandee}</td>
                                    <td className="px-3 py-2 text-right">
                                      <span className={cn(l.quantiteRecue >= l.quantiteCommandee ? "text-green-600" : "text-orange-600")}>
                                        {l.quantiteRecue}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-right">{formatPrice(l.prixUnitaire)}</td>
                                    <td className="px-3 py-2 text-right font-semibold">{formatPrice(l.total)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {/* Quick status */}
                            <div className="flex flex-wrap gap-2 pt-1">
                              <span className="text-xs text-muted-foreground">Changer statut:</span>
                              {STATUS_OPTIONS.filter(s => s.value !== order.status).slice(0, 4).map(s => (
                                <button
                                  key={s.value}
                                  className="text-xs text-primary hover:underline"
                                  onClick={() => quickStatus(order.id, s.value)}
                                >
                                  → {s.label}
                                </button>
                              ))}
                            </div>
                            {order.notes && <p className="text-xs text-muted-foreground">📝 {order.notes}</p>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onOpenChange={o => { setOpenDialog(o); if (!o) { setEditItem(null); setLines([]); reset({ status: "brouillon" }); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              {editItem ? "Modifier la commande" : "Nouvelle commande fournisseur"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fournisseur *</Label>
                <select {...register("fournisseurId", { required: true })} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background">
                  <option value="">Sélectionner un fournisseur...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
              </div>
              <div>
                <Label>Statut</Label>
                <select {...register("status")} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background">
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Date de livraison prévue</Label>
                <Input type="date" {...register("dateLivraisonPrevue")} />
              </div>
              <div>
                <Label>Notes</Label>
                <Input {...register("notes")} placeholder="Notes optionnelles..." />
              </div>
            </div>

            {/* Lignes de commande */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Articles commandés</Label>
                <Button type="button" size="sm" variant="outline" className="gap-1" onClick={addLine}>
                  <Plus className="w-3.5 h-3.5" /> Ajouter une ligne
                </Button>
              </div>

              {lines.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center text-muted-foreground text-sm">
                  Aucune ligne — cliquez "Ajouter une ligne"
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs">Article stock</th>
                        <th className="px-3 py-2 text-left text-xs">Désignation</th>
                        <th className="px-3 py-2 text-right text-xs">Qté</th>
                        <th className="px-3 py-2 text-right text-xs">Prix unit.</th>
                        <th className="px-3 py-2 text-right text-xs">Total</th>
                        <th className="px-3 py-2 text-xs"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map(line => (
                        <tr key={line.id} className="border-t border-border">
                          <td className="px-2 py-1.5">
                            <select
                              className="w-36 border border-input rounded px-2 py-1 text-xs bg-background"
                              onChange={e => fillFromStock(line.id, e.target.value)}
                              value={line.stockItemId || ""}
                            >
                              <option value="">-- Stock --</option>
                              {stockItems.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              className="h-7 text-xs"
                              value={line.designation}
                              onChange={e => updateLine(line.id, "designation", e.target.value)}
                              placeholder="Désignation"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              type="number" min="1" className="h-7 text-xs w-16 text-right"
                              value={line.quantiteCommandee}
                              onChange={e => updateLine(line.id, "quantiteCommandee", Number(e.target.value))}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              type="number" min="0" step="0.001" className="h-7 text-xs w-24 text-right"
                              value={line.prixUnitaire}
                              onChange={e => updateLine(line.id, "prixUnitaire", Number(e.target.value))}
                            />
                          </td>
                          <td className="px-2 py-1.5 text-right font-semibold text-xs">
                            {formatPrice(line.total)}
                          </td>
                          <td className="px-2 py-1.5">
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeLine(line.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-muted/50 border-t border-border">
                        <td colSpan={4} className="px-3 py-2 text-right text-sm font-semibold">Total commande:</td>
                        <td className="px-3 py-2 text-right font-bold text-primary">
                          {formatPrice(lines.reduce((a, l) => a + l.total, 0))}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setOpenDialog(false); setEditItem(null); setLines([]); reset({ status: "brouillon" }); }}>
                Annuler
              </Button>
              <Button type="submit">{editItem ? "Enregistrer" : "Créer la commande"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

