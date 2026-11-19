import { useState, useMemo } from "react";
import {
  Users, Building2, PlusCircle, RefreshCw, Phone, Mail,
  MapPin, Trash2, Pencil, Search, TrendingUp, CreditCard,
  Percent, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { resellerStorage, supplierStorage } from "@/lib/storage";
import { formatPrice, formatDate, cn } from "@/lib/utils";
import type { Reseller, Supplier } from "@/types";

type ViewTab = "revendeurs" | "fournisseurs";

const TYPE_LABELS: Record<Reseller["type"], { label: string; color: string }> = {
  revendeur: { label: "Revendeur", color: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" },
  grossiste: { label: "Grossiste", color: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300" },
  partenaire: { label: "Partenaire", color: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" },
};

const EMPTY_RESELLER = {
  nom: "", prenom: "", telephone: "", email: "", adresse: "",
  ville: "", type: "revendeur" as Reseller["type"], entreprise: "",
  remisePourcentage: 0, plafondCredit: 0, soldeEnCours: 0, notes: "",
};

const EMPTY_SUPPLIER = {
  nom: "", contact: "", telephone: "", email: "", adresse: "",
  ville: "", pays: "Tunisie", delaiLivraison: 3, conditions: "", notes: "",
};

export default function ResellerPage() {
  const [tab, setTab] = useState<ViewTab>("revendeurs");
  const [resellers, setResellers] = useState<Reseller[]>(() => resellerStorage.getAll());
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => supplierStorage.getAll());
  const [search, setSearch] = useState("");
  const [showResellerDialog, setShowResellerDialog] = useState(false);
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [editingReseller, setEditingReseller] = useState<Reseller | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [resellerForm, setResellerForm] = useState(EMPTY_RESELLER);
  const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER);

  const refresh = () => {
    setResellers(resellerStorage.getAll());
    setSuppliers(supplierStorage.getAll());
  };

  // ——— Filtered lists ———
  const filteredResellers = useMemo(() =>
    resellers.filter(r =>
      [r.nom, r.prenom, r.telephone, r.entreprise, r.email, r.ville].some(
        v => v?.toLowerCase().includes(search.toLowerCase())
      )
    ), [resellers, search]);

  const filteredSuppliers = useMemo(() =>
    suppliers.filter(s =>
      [s.nom, s.contact, s.telephone, s.email, s.ville].some(
        v => v?.toLowerCase().includes(search.toLowerCase())
      )
    ), [suppliers, search]);

  // ——— Revendeur CRUD ———
  const openAddReseller = () => {
    setEditingReseller(null);
    setResellerForm(EMPTY_RESELLER);
    setShowResellerDialog(true);
  };

  const openEditReseller = (r: Reseller) => {
    setEditingReseller(r);
    setResellerForm({
      nom: r.nom, prenom: r.prenom || "", telephone: r.telephone,
      email: r.email || "", adresse: r.adresse || "", ville: r.ville || "",
      type: r.type, entreprise: r.entreprise || "",
      remisePourcentage: r.remisePourcentage || 0,
      plafondCredit: r.plafondCredit || 0, soldeEnCours: r.soldeEnCours || 0,
      notes: r.notes || "",
    });
    setShowResellerDialog(true);
  };

  const handleResellerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resellerForm.nom.trim()) return toast.error("Nom requis");
    if (!resellerForm.telephone.trim()) return toast.error("Téléphone requis");

    const data = {
      nom: resellerForm.nom.trim(),
      prenom: resellerForm.prenom.trim() || undefined,
      telephone: resellerForm.telephone.trim(),
      email: resellerForm.email.trim() || undefined,
      adresse: resellerForm.adresse.trim() || undefined,
      ville: resellerForm.ville.trim() || undefined,
      type: resellerForm.type,
      entreprise: resellerForm.entreprise.trim() || undefined,
      remisePourcentage: Number(resellerForm.remisePourcentage) || 0,
      plafondCredit: Number(resellerForm.plafondCredit) || 0,
      soldeEnCours: Number(resellerForm.soldeEnCours) || 0,
      notes: resellerForm.notes.trim() || undefined,
    };

    if (editingReseller) {
      resellerStorage.update(editingReseller.id, data);
      toast.success("Revendeur mis à jour");
    } else {
      resellerStorage.add(data);
      toast.success("Revendeur ajouté");
    }
    setShowResellerDialog(false);
    refresh();
  };

  const handleDeleteReseller = (id: string) => {
    if (!window.confirm("Supprimer ce revendeur ?")) return;
    resellerStorage.delete(id);
    toast.success("Revendeur supprimé");
    refresh();
  };

  // ——— Supplier CRUD ———
  const openAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierForm(EMPTY_SUPPLIER);
    setShowSupplierDialog(true);
  };

  const openEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSupplierForm({
      nom: s.nom, contact: s.contact || "", telephone: s.telephone || "",
      email: s.email || "", adresse: s.adresse || "", ville: s.ville || "",
      pays: s.pays || "Algérie", delaiLivraison: s.delaiLivraison || 5,
      conditions: s.conditions || "", notes: s.notes || "",
    });
    setShowSupplierDialog(true);
  };

  const handleSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.nom.trim()) return toast.error("Nom requis");

    const data = {
      nom: supplierForm.nom.trim(),
      contact: supplierForm.contact.trim() || undefined,
      telephone: supplierForm.telephone.trim() || undefined,
      email: supplierForm.email.trim() || undefined,
      adresse: supplierForm.adresse.trim() || undefined,
      ville: supplierForm.ville.trim() || undefined,
      pays: supplierForm.pays.trim() || undefined,
      delaiLivraison: Number(supplierForm.delaiLivraison) || 5,
      conditions: supplierForm.conditions.trim() || undefined,
      notes: supplierForm.notes.trim() || undefined,
    };

    if (editingSupplier) {
      supplierStorage.update(editingSupplier.id, data);
      toast.success("Fournisseur mis à jour");
    } else {
      supplierStorage.add(data);
      toast.success("Fournisseur ajouté");
    }
    setShowSupplierDialog(false);
    refresh();
  };

  const handleDeleteSupplier = (id: string) => {
    if (!window.confirm("Supprimer ce fournisseur ?")) return;
    supplierStorage.delete(id);
    toast.success("Fournisseur supprimé");
    refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5 text-foreground">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
              <Users className="w-6 h-6" />
            </span>
            Revendeurs & Fournisseurs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez vos partenaires commerciaux : revendeurs, grossistes et fournisseurs
          </p>
        </div>
        <div className="flex gap-2">
          {tab === "revendeurs" ? (
            <Button onClick={openAddReseller} className="gap-2">
              <PlusCircle className="w-4 h-4" /> Nouveau Revendeur
            </Button>
          ) : (
            <Button onClick={openAddSupplier} className="gap-2">
              <PlusCircle className="w-4 h-4" /> Nouveau Fournisseur
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={refresh} className="h-10 w-10">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-extrabold text-foreground">{resellers.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Revendeurs</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-extrabold text-foreground">{suppliers.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Fournisseurs</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-extrabold text-emerald-600">
            {formatPrice(resellers.reduce((s, r) => s + r.totalAchats, 0))}
          </p>
          <p className="text-xs text-muted-foreground mt-1">CA Revendeurs</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-extrabold text-orange-600">
            {formatPrice(resellers.reduce((s, r) => s + (r.soldeEnCours || 0), 0))}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Crédit en cours</p>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-muted/60 p-1 rounded-lg text-sm">
          {(["revendeurs", "fournisseurs"] as ViewTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-1.5 rounded font-medium transition-colors capitalize",
                tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "revendeurs" ? `Revendeurs (${resellers.length})` : `Fournisseurs (${suppliers.length})`}
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={tab === "revendeurs" ? "Rechercher revendeur..." : "Rechercher fournisseur..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* ——— REVENDEURS TAB ——— */}
      {tab === "revendeurs" && (
        <div>
          {filteredResellers.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-border rounded-xl">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium text-muted-foreground">Aucun revendeur trouvé</p>
              <Button className="mt-3 gap-2" size="sm" onClick={openAddReseller}>
                <PlusCircle className="w-4 h-4" /> Ajouter un revendeur
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredResellers.map(r => (
                <div key={r.id} className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-foreground">
                          {r.entreprise || `${r.nom}${r.prenom ? ` ${r.prenom}` : ""}`}
                        </h3>
                        <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", TYPE_LABELS[r.type].color)}>
                          {TYPE_LABELS[r.type].label}
                        </span>
                      </div>
                      {r.entreprise && (
                        <p className="text-xs text-muted-foreground mt-0.5">{r.nom} {r.prenom}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditReseller(r)} className="p-1.5 rounded text-muted-foreground hover:text-primary">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteReseller(r.id)} className="p-1.5 rounded text-muted-foreground hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{r.telephone}</p>
                    {r.email && <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{r.email}</p>}
                    {r.ville && <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{r.ville}</p>}
                  </div>

                  <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <p className="font-bold text-foreground">{r.remisePourcentage || 0}%</p>
                      <p className="text-muted-foreground">Remise</p>
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{formatPrice(r.plafondCredit || 0)}</p>
                      <p className="text-muted-foreground">Plafond</p>
                    </div>
                    <div>
                      <p className={cn("font-bold", (r.soldeEnCours || 0) > 0 ? "text-orange-600" : "text-foreground")}>
                        {formatPrice(r.soldeEnCours || 0)}
                      </p>
                      <p className="text-muted-foreground">Solde dû</p>
                    </div>
                  </div>

                  {r.notes && (
                    <p className="mt-2 text-xs text-muted-foreground italic border-t border-border pt-2 line-clamp-2">
                      {r.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ——— FOURNISSEURS TAB ——— */}
      {tab === "fournisseurs" && (
        <div>
          {filteredSuppliers.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-border rounded-xl">
              <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium text-muted-foreground">Aucun fournisseur trouvé</p>
              <Button className="mt-3 gap-2" size="sm" onClick={openAddSupplier}>
                <PlusCircle className="w-4 h-4" /> Ajouter un fournisseur
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredSuppliers.map(s => (
                <div key={s.id} className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-foreground">{s.nom}</h3>
                      {s.contact && <p className="text-xs text-muted-foreground">Contact: {s.contact}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditSupplier(s)} className="p-1.5 rounded text-muted-foreground hover:text-primary">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteSupplier(s.id)} className="p-1.5 rounded text-muted-foreground hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    {s.telephone && <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{s.telephone}</p>}
                    {s.email && <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{s.email}</p>}
                    {s.ville && <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{s.ville}{s.pays ? `, ${s.pays}` : ""}</p>}
                  </div>

                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Délai livraison</span>
                    <span className="font-semibold text-foreground">{s.delaiLivraison || "?"} jours</span>
                  </div>
                  {s.conditions && (
                    <p className="mt-2 text-xs text-muted-foreground italic line-clamp-2">{s.conditions}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ——— DIALOG REVENDEUR ——— */}
      <Dialog open={showResellerDialog} onOpenChange={setShowResellerDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReseller ? "Modifier le revendeur" : "Nouveau revendeur / partenaire"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResellerSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom *</Label>
                <Input value={resellerForm.nom} onChange={e => setResellerForm(f => ({ ...f, nom: e.target.value }))} placeholder="Nom de famille" required />
              </div>
              <div>
                <Label>Prénom</Label>
                <Input value={resellerForm.prenom} onChange={e => setResellerForm(f => ({ ...f, prenom: e.target.value }))} placeholder="Prénom" />
              </div>
            </div>
            <div>
              <Label>Entreprise / Société</Label>
              <Input value={resellerForm.entreprise} onChange={e => setResellerForm(f => ({ ...f, entreprise: e.target.value }))} placeholder="SARL, EURL, Nom commercial..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Téléphone *</Label>
                <Input value={resellerForm.telephone} onChange={e => setResellerForm(f => ({ ...f, telephone: e.target.value }))} placeholder="2X XXX XXX" required />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={resellerForm.email} onChange={e => setResellerForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@exemple.tn" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ville</Label>
                <Input value={resellerForm.ville} onChange={e => setResellerForm(f => ({ ...f, ville: e.target.value }))} placeholder="Tunis, Sousse, Sfax..." />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={resellerForm.type} onValueChange={(v: Reseller["type"]) => setResellerForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revendeur">Revendeur</SelectItem>
                    <SelectItem value="grossiste">Grossiste</SelectItem>
                    <SelectItem value="partenaire">Partenaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Remise (%)</Label>
                <Input type="number" min="0" max="100" value={resellerForm.remisePourcentage} onChange={e => setResellerForm(f => ({ ...f, remisePourcentage: +e.target.value }))} />
              </div>
              <div>
                <Label>Plafond crédit (DT)</Label>
                <Input type="number" step="0.001" min="0" value={resellerForm.plafondCredit} onChange={e => setResellerForm(f => ({ ...f, plafondCredit: +e.target.value }))} />
              </div>
              <div>
                <Label>Solde en cours (DT)</Label>
                <Input type="number" step="0.001" min="0" value={resellerForm.soldeEnCours} onChange={e => setResellerForm(f => ({ ...f, soldeEnCours: +e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={resellerForm.notes} onChange={e => setResellerForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Conditions, remarques..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowResellerDialog(false)}>Annuler</Button>
              <Button type="submit">{editingReseller ? "Mettre à jour" : "Ajouter"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ——— DIALOG FOURNISSEUR ——— */}
      <Dialog open={showSupplierDialog} onOpenChange={setShowSupplierDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? "Modifier le fournisseur" : "Nouveau fournisseur"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSupplierSubmit} className="space-y-4">
            <div>
              <Label>Nom / Société *</Label>
              <Input value={supplierForm.nom} onChange={e => setSupplierForm(f => ({ ...f, nom: e.target.value }))} placeholder="Tech Distrib, PC Parts..." required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contact</Label>
                <Input value={supplierForm.contact} onChange={e => setSupplierForm(f => ({ ...f, contact: e.target.value }))} placeholder="Nom du responsable" />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input value={supplierForm.telephone} onChange={e => setSupplierForm(f => ({ ...f, telephone: e.target.value }))} placeholder="71 XXX XXX / 2X XXX XXX" />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={supplierForm.email} onChange={e => setSupplierForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@fournisseur.tn" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ville</Label>
                <Input value={supplierForm.ville} onChange={e => setSupplierForm(f => ({ ...f, ville: e.target.value }))} />
              </div>
              <div>
                <Label>Pays</Label>
                <Input value={supplierForm.pays} onChange={e => setSupplierForm(f => ({ ...f, pays: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Délai de livraison (jours)</Label>
              <Input type="number" min="1" value={supplierForm.delaiLivraison} onChange={e => setSupplierForm(f => ({ ...f, delaiLivraison: +e.target.value }))} />
            </div>
            <div>
              <Label>Conditions commerciales</Label>
              <Textarea value={supplierForm.conditions} onChange={e => setSupplierForm(f => ({ ...f, conditions: e.target.value }))} rows={2} placeholder="Délai paiement, minimum commande..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowSupplierDialog(false)}>Annuler</Button>
              <Button type="submit">{editingSupplier ? "Mettre à jour" : "Ajouter"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
