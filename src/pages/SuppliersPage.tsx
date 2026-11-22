import { useState, useMemo } from "react";
import {
  Truck, Plus, Search, Edit2, Trash2, Phone, Mail, MapPin,
  Clock, Package, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supplierStorage, orderStorage, stockStorage } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { Supplier } from "@/types";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

type SupplierFormData = {
  nom: string;
  contact: string;
  telephone: string;
  email: string;
  ville: string;
  pays: string;
  adresse: string;
  delaiLivraison: number;
  conditions: string;
  notes: string;
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => supplierStorage.getAll());
  const [search, setSearch] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);

  const orders = orderStorage.getAll();
  const stock = stockStorage.getAll();

  const { register, handleSubmit, reset, setValue } = useForm<SupplierFormData>({
    defaultValues: { delaiLivraison: 3, pays: "Tunisie" }
  });

  const refresh = () => setSuppliers(supplierStorage.getAll());

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return suppliers.filter(s =>
      s.nom.toLowerCase().includes(q) ||
      (s.contact && s.contact.toLowerCase().includes(q)) ||
      (s.telephone && s.telephone.includes(q)) ||
      s.code.toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  const openAdd = () => {
    setEditSupplier(null);
    reset({ delaiLivraison: 3, pays: "Tunisie" });
    setOpenDialog(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditSupplier(supplier);
    Object.entries(supplier).forEach(([k, v]) => setValue(k as any, v));
    setOpenDialog(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Voulez-vous supprimer ce fournisseur ?")) return;
    supplierStorage.delete(id);
    refresh();
    toast.success("Fournisseur supprimé");
  };

  const onSubmit = (data: SupplierFormData) => {
    if (editSupplier) {
      supplierStorage.update(editSupplier.id, {
        ...data,
        delaiLivraison: Number(data.delaiLivraison) || 0,
      });
      toast.success("Fournisseur mis à jour");
    } else {
      supplierStorage.add({
        ...data,
        delaiLivraison: Number(data.delaiLivraison) || 0,
      });
      toast.success("Fournisseur créé avec succès");
    }
    setOpenDialog(false);
    setEditSupplier(null);
    reset();
    refresh();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" /> Fournisseurs & Grossistes
          </h1>
          <p className="page-subtitle">Gestion des partenaires grossistes de matériel informatique</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="w-4 h-4" /> Nouveau fournisseur
        </Button>
      </div>

      {/* Filter */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom de grossiste, contact, téléphone..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-muted-foreground">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Aucun fournisseur trouvé</p>
          </div>
        ) : (
          filtered.map(supplier => {
            const supplierOrders = orders.filter(o => o.fournisseurId === supplier.id);
            const supplierStock = stock.filter(stk => stk.fournisseurId === supplier.id);

            return (
              <div key={supplier.id} className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      {supplier.code}
                    </span>
                    {supplier.delaiLivraison && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> ~{supplier.delaiLivraison} jours
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-base text-foreground">{supplier.nom}</h3>
                  {supplier.contact && (
                    <p className="text-xs text-muted-foreground">Contact: {supplier.contact}</p>
                  )}

                  <div className="mt-3 space-y-1.5 text-xs text-muted-foreground border-t border-border/50 pt-2.5">
                    {supplier.telephone && (
                      <p className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-primary" /> {supplier.telephone}
                      </p>
                    )}
                    {supplier.email && (
                      <p className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-primary" /> {supplier.email}
                      </p>
                    )}
                    {supplier.ville && (
                      <p className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-primary" /> {supplier.ville}, {supplier.pays || "Tunisie"}
                      </p>
                    )}
                  </div>

                  {supplier.conditions && (
                    <div className="mt-2.5 bg-muted/40 p-2 rounded text-[11px] text-muted-foreground">
                      <span className="font-semibold block text-foreground mb-0.5">Conditions:</span>
                      {supplier.conditions}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                  <div className="flex gap-3 text-muted-foreground">
                    <span><strong>{supplierOrders.length}</strong> cmd(s)</span>
                    <span><strong>{supplierStock.length}</strong> réf(s)</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(supplier)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(supplier.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={openDialog} onOpenChange={o => { setOpenDialog(o); if (!o) { setEditSupplier(null); reset(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editSupplier ? "Modifier le fournisseur" : "Nouveau fournisseur"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Nom de la société / Grossiste *</Label>
              <Input {...register("nom", { required: true })} placeholder="ex: Tech Distrib Tunisie" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nom du contact commercial</Label>
                <Input {...register("contact")} placeholder="Nom et prénom" />
              </div>
              <div>
                <Label>Délai de livraison estimé (jours)</Label>
                <Input type="number" min="0" {...register("delaiLivraison")} placeholder="ex: 3" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Téléphone</Label>
                <Input {...register("telephone")} placeholder="71 XXX XXX / 2X XXX XXX" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" {...register("email")} placeholder="contact@fournisseur.tn" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ville</Label>
                <Input {...register("ville")} placeholder="ex: Tunis, Sousse, Sfax..." />
              </div>
              <div>
                <Label>Pays</Label>
                <Input {...register("pays")} placeholder="Tunisie" />
              </div>
            </div>

            <div>
              <Label>Conditions de paiement / Remises</Label>
              <Input {...register("conditions")} placeholder="ex: Paiement à 30 jours, remise 5% sur volume" />
            </div>

            <div>
              <Label>Remarques</Label>
              <Textarea {...register("notes")} placeholder="Informations complémentaires..." rows={2} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setOpenDialog(false); setEditSupplier(null); reset(); }}>
                Annuler
              </Button>
              <Button type="submit">{editSupplier ? "Mettre à jour" : "Créer le fournisseur"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

