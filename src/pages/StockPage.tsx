import { useState, useMemo } from "react";
import { Plus, Search, Filter, Package, Edit2, Trash2, ChevronUp, ChevronDown, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { stockStorage } from "@/lib/storage";
import { exportStockToExcel } from "@/lib/excel";
import { formatPrice, formatDate, cn } from "@/lib/utils";
import type { StockItem, Category } from "@/types";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

const CATEGORIES: Category[] = [
  "CPU", "RAM", "GPU", "SSD", "HDD", "Carte mère", "Alimentation",
  "Boîtier", "Refroidissement", "Écran", "Clavier", "Souris", "Câble",
  "Réseau", "Imprimante", "Scanner", "Laptop", "Desktop", "Accessoire", "Autre"
];

interface StockFormData {
  nom: string;
  categorie: Category;
  marque: string;
  modele: string;
  quantite: number;
  seuilAlerte: number;
  prixAchat: number;
  prixVente: number;
  emplacement: string;
  description: string;
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    en_stock: "En stock", stock_faible: "Stock faible", rupture: "Rupture"
  };
  return (
    <span className={cn("badge-status", `status-${status}`)}>
      {labels[status] || status}
    </span>
  );
}

export default function StockPage() {
  const [items, setItems] = useState<StockItem[]>(() => stockStorage.getAll());
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [openAdd, setOpenAdd] = useState(false);
  const [editItem, setEditItem] = useState<StockItem | null>(null);
  const [sortField, setSortField] = useState<keyof StockItem>("nom");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<StockFormData>();

  const refresh = () => setItems(stockStorage.getAll());

  const filtered = useMemo(() => {
    return items
      .filter(item => {
        const q = search.toLowerCase();
        return (
          item.nom.toLowerCase().includes(q) ||
          item.reference.toLowerCase().includes(q) ||
          item.marque.toLowerCase().includes(q) ||
          item.modele.toLowerCase().includes(q)
        );
      })
      .filter(item => catFilter === "all" || item.categorie === catFilter)
      .filter(item => statusFilter === "all" || item.status === statusFilter)
      .sort((a, b) => {
        const av = a[sortField] as string | number;
        const bv = b[sortField] as string | number;
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
  }, [items, search, catFilter, statusFilter, sortField, sortDir]);

  const handleSort = (field: keyof StockItem) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: keyof StockItem }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />;
  };

  const openEdit = (item: StockItem) => {
    setEditItem(item);
    Object.entries(item).forEach(([k, v]) => setValue(k as any, v));
    setOpenAdd(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Supprimer cet article ?")) return;
    stockStorage.delete(id);
    refresh();
    toast.success("Article supprimé");
  };

  const onSubmit = (data: StockFormData) => {
    if (editItem) {
      stockStorage.update(editItem.id, {
        ...data,
        quantite: Number(data.quantite),
        seuilAlerte: Number(data.seuilAlerte),
        prixAchat: Number(data.prixAchat),
        prixVente: Number(data.prixVente),
      });
      toast.success("Article mis à jour");
    } else {
      stockStorage.add({
        ...data,
        quantite: Number(data.quantite),
        seuilAlerte: Number(data.seuilAlerte),
        prixAchat: Number(data.prixAchat),
        prixVente: Number(data.prixVente),
      });
      toast.success("Article ajouté au stock");
    }
    setOpenAdd(false);
    setEditItem(null);
    reset();
    refresh();
  };

  const stats = useMemo(() => ({
    total: items.length,
    valeur: items.reduce((a, s) => a + s.prixAchat * s.quantite, 0),
    faible: items.filter(s => s.status === "stock_faible").length,
    rupture: items.filter(s => s.status === "rupture").length,
  }), [items]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" /> Inventaire / Stock
          </h1>
          <p className="page-subtitle">
            {stats.total} articles · Valeur: {formatPrice(stats.valeur)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportStockToExcel} className="gap-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-700">
            <FileSpreadsheet className="w-4 h-4" /> Exporter Excel
          </Button>
          <Button onClick={() => { setEditItem(null); reset(); setOpenAdd(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Ajouter un article
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total articles", value: stats.total, color: "text-foreground" },
          { label: "Valeur stock", value: formatPrice(stats.valeur), color: "text-blue-600" },
          { label: "Stock faible", value: stats.faible, color: "text-yellow-600" },
          { label: "Rupture", value: stats.rupture, color: "text-red-600" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-3 text-center">
            <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher nom, référence, marque..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="en_stock">En stock</SelectItem>
            <SelectItem value="stock_faible">Stock faible</SelectItem>
            <SelectItem value="rupture">Rupture</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Filter className="w-3.5 h-3.5" /> {filtered.length} résultat(s)
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {[
                  { label: "Référence", field: "reference" as keyof StockItem },
                  { label: "Désignation", field: "nom" as keyof StockItem },
                  { label: "Catégorie", field: "categorie" as keyof StockItem },
                  { label: "Marque", field: "marque" as keyof StockItem },
                  { label: "Qté", field: "quantite" as keyof StockItem },
                  { label: "Seuil", field: "seuilAlerte" as keyof StockItem },
                  { label: "P. Achat", field: "prixAchat" as keyof StockItem },
                  { label: "P. Vente", field: "prixVente" as keyof StockItem },
                  { label: "Statut", field: "status" as keyof StockItem },
                ].map(col => (
                  <th
                    key={col.field}
                    className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground select-none"
                    onClick={() => handleSort(col.field)}
                  >
                    {col.label} <SortIcon field={col.field} />
                  </th>
                ))}
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-muted-foreground">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    Aucun article trouvé
                  </td>
                </tr>
              ) : (
                filtered.map(item => (
                  <tr key={item.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-primary font-medium">{item.reference}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{item.nom}</p>
                        {item.emplacement && <p className="text-xs text-muted-foreground">{item.emplacement}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.categorie}</td>
                    <td className="px-4 py-3">{item.marque}</td>
                    <td className="px-4 py-3">
                      <span className={cn("font-bold text-base", item.quantite === 0 ? "text-red-600" : item.quantite <= item.seuilAlerte ? "text-yellow-600" : "text-green-600")}>
                        {item.quantite}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.seuilAlerte}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatPrice(item.prixAchat)}</td>
                    <td className="px-4 py-3 font-medium">{formatPrice(item.prixVente)}</td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={openAdd} onOpenChange={(o) => { setOpenAdd(o); if (!o) { setEditItem(null); reset(); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "Modifier l'article" : "Ajouter un article"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Désignation *</Label>
                <Input {...register("nom", { required: true })} placeholder="ex: Intel Core i7-12700K" />
              </div>
              <div>
                <Label>Catégorie *</Label>
                <select
                  {...register("categorie", { required: true })}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                >
                  <option value="">Choisir...</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label>Marque *</Label>
                <Input {...register("marque", { required: true })} placeholder="ex: Intel" />
              </div>
              <div>
                <Label>Modèle *</Label>
                <Input {...register("modele", { required: true })} placeholder="ex: i7-12700K" />
              </div>
              <div>
                <Label>Emplacement</Label>
                <Input {...register("emplacement")} placeholder="ex: Rayon A1" />
              </div>
              <div>
                <Label>Quantité *</Label>
                <Input type="number" min="0" {...register("quantite", { required: true, min: 0 })} />
              </div>
              <div>
                <Label>Seuil d'alerte *</Label>
                <Input type="number" min="0" {...register("seuilAlerte", { required: true, min: 0 })} />
              </div>
              <div>
                <Label>Prix d'achat (DZD) *</Label>
                <Input type="number" min="0" step="1" {...register("prixAchat", { required: true, min: 0 })} />
              </div>
              <div>
                <Label>Prix de vente (DZD) *</Label>
                <Input type="number" min="0" step="1" {...register("prixVente", { required: true, min: 0 })} />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Input {...register("description")} placeholder="Description optionnelle..." />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setOpenAdd(false); setEditItem(null); reset(); }}>
                Annuler
              </Button>
              <Button type="submit">
                {editItem ? "Enregistrer" : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

