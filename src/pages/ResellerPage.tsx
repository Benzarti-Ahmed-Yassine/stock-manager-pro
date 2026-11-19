import { useState, useMemo } from "react";
import {
  Users, Building2, PlusCircle, RefreshCw, Phone, Mail,
  MapPin, Trash2, Pencil, Search, TrendingUp, CreditCard,
  Percent, AlertCircle, Wallet, ArrowDownLeft, ArrowUpRight,
  HandCoins, Receipt, CheckCircle2, History, Printer, Check
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
import { resellerStorage, supplierStorage, compteOperationStorage } from "@/lib/storage";
import { formatPrice, formatDate, formatDateTime, cn } from "@/lib/utils";
import type { Reseller, Supplier, CompteOperation, CompteOperationType } from "@/types";

type ViewTab = "revendeurs" | "fournisseurs";

const TYPE_LABELS: Record<Reseller["type"], { label: string; color: string }> = {
  revendeur: { label: "Revendeur", color: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" },
  grossiste: { label: "Grossiste", color: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300" },
  partenaire: { label: "Partenaire", color: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" },
  personnel: { label: "Partenaire Personnel (SAV & Achats)", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" },
};

const EMPTY_RESELLER = {
  nom: "", prenom: "", telephone: "", email: "", adresse: "",
  ville: "", type: "personnel" as Reseller["type"], entreprise: "",
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

  // ——— Compte Courant Modal State ———
  const [compteReseller, setCompteReseller] = useState<Reseller | null>(null);
  const [compteOps, setCompteOps] = useState<CompteOperation[]>([]);
  const [showAddOpDialog, setShowAddOpDialog] = useState(false);
  const [opForm, setOpForm] = useState({
    type: "service" as CompteOperationType,
    montant: "",
    description: "",
    reference: "",
    notes: "",
  });

  const refresh = () => {
    const updatedResellers = resellerStorage.getAll();
    setResellers(updatedResellers);
    setSuppliers(supplierStorage.getAll());

    if (compteReseller) {
      const refreshed = updatedResellers.find(r => r.id === compteReseller.id);
      if (refreshed) {
        setCompteReseller(refreshed);
        setCompteOps(compteOperationStorage.getByReseller(refreshed.id));
      }
    }
  };

  const openCompteCourant = (r: Reseller) => {
    setCompteReseller(r);
    setCompteOps(compteOperationStorage.getByReseller(r.id));
  };

  // ——— Filtered lists ———
  const filteredResellers = useMemo(() =>
    resellers.filter(r =>
      [r.nom, r.prenom, r.telephone, r.entreprise, r.email, r.ville, r.type].some(
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
      toast.success("Partenaire mis à jour");
    } else {
      resellerStorage.add(data);
      toast.success("Partenaire enregistré");
    }
    setShowResellerDialog(false);
    refresh();
  };

  const handleDeleteReseller = (id: string) => {
    if (!window.confirm("Supprimer ce partenaire ?")) return;
    resellerStorage.delete(id);
    toast.success("Partenaire supprimé");
    refresh();
  };

  // ——— Opérations Compte Courant ———
  const handleAddOp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compteReseller) return;
    const montantNum = Number(opForm.montant);
    if (!montantNum || montantNum <= 0) return toast.error("Montant valide requis (> 0)");
    if (!opForm.description.trim()) return toast.error("Description requise");

    // Calcul du signe selon le type :
    // Achat (il achète chez nous) -> débit pour lui : + montant
    // Service (il a travaillé / réparé pour nous) -> crédit pour lui (on lui doit) : - montant
    // Avance / Règlement reçu (il nous paye) -> réduit sa dette : - montant
    // Paiement versé (on le paye pour son travail) -> compense notre dette : + montant
    let signedMontant = montantNum;
    if (opForm.type === "service" || opForm.type === "avance") {
      signedMontant = -montantNum;
    } else {
      signedMontant = montantNum;
    }

    compteOperationStorage.add({
      resellerId: compteReseller.id,
      type: opForm.type,
      montant: signedMontant,
      description: opForm.description.trim(),
      reference: opForm.reference.trim() || undefined,
      notes: opForm.notes.trim() || undefined,
    });

    toast.success("Opération enregistrée au compte");
    setShowAddOpDialog(false);
    setOpForm({ type: "service", montant: "", description: "", reference: "", notes: "" });
    refresh();
  };

  const handleDeleteOp = (opId: string) => {
    if (!window.confirm("Supprimer cette opération ?")) return;
    compteOperationStorage.delete(opId);
    toast.success("Opération supprimée");
    refresh();
  };

  const handleSettleFullBalance = () => {
    if (!compteReseller) return;
    const solde = compteReseller.soldeEnCours || 0;
    if (solde === 0) return toast.info("Le compte est déjà soldé (0.000 DT)");

    if (solde > 0) {
      // Il nous doit de l'argent -> on encaisse la totalité (avance de solde)
      compteOperationStorage.add({
        resellerId: compteReseller.id,
        type: "avance",
        montant: -solde,
        description: "Règlement intégral de son solde dû (Encaissé)",
      });
      toast.success(`Solde de ${formatPrice(solde)} réglé avec succès !`);
    } else {
      // Nous lui devons de l'argent (solde < 0) -> nous le payons
      const montantAPayer = Math.abs(solde);
      compteOperationStorage.add({
        resellerId: compteReseller.id,
        type: "paiement",
        montant: montantAPayer,
        description: "Paiement intégral versé au partenaire (Prestations soldées)",
      });
      toast.success(`Paiement de ${formatPrice(montantAPayer)} versé au partenaire !`);
    }
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
      pays: s.pays || "Tunisie", delaiLivraison: s.delaiLivraison || 3,
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
      delaiLivraison: Number(supplierForm.delaiLivraison) || 3,
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

  // Calcul totaux créances et dettes
  const totalCreances = resellers.reduce((sum, r) => sum + ((r.soldeEnCours || 0) > 0 ? (r.soldeEnCours || 0) : 0), 0);
  const totalDettes = resellers.reduce((sum, r) => sum + ((r.soldeEnCours || 0) < 0 ? Math.abs(r.soldeEnCours || 0) : 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5 text-foreground">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
              <Users className="w-6 h-6" />
            </span>
            Revendeurs, Partenaires Personnels & Fournisseurs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez vos partenaires commerciaux avec suivi de compte courant (opérations SAV, achats, avances et règlements)
          </p>
        </div>
        <div className="flex gap-2">
          {tab === "revendeurs" ? (
            <Button onClick={openAddReseller} className="gap-2">
              <PlusCircle className="w-4 h-4" /> Nouveau Partenaire / Revendeur
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
          <p className="text-xs text-muted-foreground mt-1">Partenaires & Revendeurs</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-extrabold text-foreground">{suppliers.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Fournisseurs</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-extrabold text-orange-600">
            {formatPrice(totalCreances)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Ils vous doivent (Créances)</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-extrabold text-blue-600">
            {formatPrice(totalDettes)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Vous leur devez (Prestations)</p>
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
              {t === "revendeurs" ? `Partenaires & Revendeurs (${resellers.length})` : `Fournisseurs (${suppliers.length})`}
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={tab === "revendeurs" ? "Nom, téléphone, type..." : "Rechercher fournisseur..."}
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
              <p className="text-sm font-medium text-muted-foreground">Aucun partenaire trouvé</p>
              <Button className="mt-3 gap-2" size="sm" onClick={openAddReseller}>
                <PlusCircle className="w-4 h-4" /> Ajouter un partenaire
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredResellers.map(r => {
                const solde = r.soldeEnCours || 0;
                return (
                  <div key={r.id} className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div>
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
                          <button onClick={() => openEditReseller(r)} className="p-1.5 rounded text-muted-foreground hover:text-primary" title="Modifier">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteReseller(r.id)} className="p-1.5 rounded text-muted-foreground hover:text-red-600" title="Supprimer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-primary" />{r.telephone}</p>
                        {r.email && <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{r.email}</p>}
                        {r.ville && <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{r.ville}</p>}
                      </div>

                      {/* Cadre Solde en cours avec distinction claire */}
                      <div className="mt-3 pt-3 border-t border-border bg-muted/30 p-2.5 rounded-lg text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Situation du compte :</span>
                          <span className={cn(
                            "font-bold font-mono text-sm",
                            solde > 0 ? "text-orange-600" : solde < 0 ? "text-blue-600" : "text-emerald-600"
                          )}>
                            {solde > 0
                              ? `+${formatPrice(solde)} (Il vous doit)`
                              : solde < 0
                              ? `-${formatPrice(Math.abs(solde))} (Vous lui devez)`
                              : "0.000 DT (Soldé)"}
                          </span>
                        </div>
                        {r.remisePourcentage ? (
                          <div className="flex justify-between text-[11px] text-muted-foreground">
                            <span>Remise accordée :</span>
                            <span className="font-semibold text-foreground">{r.remisePourcentage}%</span>
                          </div>
                        ) : null}
                      </div>

                      {r.notes && (
                        <p className="mt-2 text-xs text-muted-foreground italic line-clamp-2">
                          {r.notes}
                        </p>
                      )}
                    </div>

                    {/* Bouton Compte Courant */}
                    <div className="mt-3 pt-3 border-t border-border">
                      <Button
                        size="sm"
                        className="w-full gap-2 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
                        variant="outline"
                        onClick={() => openCompteCourant(r)}
                      >
                        <Wallet className="w-4 h-4" />
                        Gérer Compte Courant & Opérations
                      </Button>
                    </div>
                  </div>
                );
              })}
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

      {/* ——— MODAL COMPTE COURANT (REVENDEUR PERSONNEL / ARTISAN) ——— */}
      {compteReseller && (
        <Dialog open={!!compteReseller} onOpenChange={o => { if (!o) setCompteReseller(null); }}>
          <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary" />
                  Compte Courant & Opérations : {compteReseller.entreprise || `${compteReseller.nom} ${compteReseller.prenom || ""}`}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted">
                  📞 {compteReseller.telephone}
                </span>
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Suivi transparent des réparations/services effectués par ce partenaire, de ses achats et des règlements/avances
              </p>
            </DialogHeader>

            {/* Bilan du Solde */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-2">
              <div className="bg-card border rounded-xl p-3 text-center">
                <span className="text-[11px] text-muted-foreground uppercase font-semibold block">Statut du Partenaire</span>
                <span className={cn("inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full", TYPE_LABELS[compteReseller.type].color)}>
                  {TYPE_LABELS[compteReseller.type].label}
                </span>
              </div>

              <div className="bg-card border-2 rounded-xl p-3 text-center sm:col-span-2 flex items-center justify-between px-5">
                <div className="text-left">
                  <span className="text-xs text-muted-foreground uppercase font-semibold block">Solde Actuel en Direct</span>
                  <p className={cn(
                    "text-2xl font-black font-mono mt-0.5",
                    (compteReseller.soldeEnCours || 0) > 0
                      ? "text-orange-600"
                      : (compteReseller.soldeEnCours || 0) < 0
                      ? "text-blue-600"
                      : "text-emerald-600"
                  )}>
                    {(compteReseller.soldeEnCours || 0) > 0
                      ? `+${formatPrice(compteReseller.soldeEnCours || 0)}`
                      : (compteReseller.soldeEnCours || 0) < 0
                      ? `-${formatPrice(Math.abs(compteReseller.soldeEnCours || 0))}`
                      : "0.000 DT (Soldé)"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {(compteReseller.soldeEnCours || 0) > 0
                      ? "⚠️ Ce partenaire vous doit cet argent (achats/avances dues)"
                      : (compteReseller.soldeEnCours || 0) < 0
                      ? "🤝 Vous devez payer ce montant au partenaire (ses prestations SAV)"
                      : "✅ Les comptes sont équilibrés à zéro"}
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  {(compteReseller.soldeEnCours || 0) !== 0 && (
                    <Button
                      size="sm"
                      onClick={handleSettleFullBalance}
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {(compteReseller.soldeEnCours || 0) > 0 ? "Encaisser Tout" : "Payer Tout"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddOpDialog(true)}
                    className="gap-1.5 text-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Nouvelle Opération
                  </Button>
                </div>
              </div>
            </div>

            {/* Historique des Opérations */}
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <History className="w-4 h-4" /> Historique des Opérations ({compteOps.length})
                </h4>
              </div>

              {compteOps.length === 0 ? (
                <div className="text-center py-10 border border-dashed rounded-xl text-muted-foreground text-xs">
                  <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Aucune opération enregistrée pour le moment.</p>
                  <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={() => setShowAddOpDialog(true)}>
                    Ajouter la première opération
                  </Button>
                </div>
              ) : (
                <div className="border rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-muted/70 text-muted-foreground border-b">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Type d'Opération</th>
                        <th className="p-2.5">Description & Réf</th>
                        <th className="p-2.5 text-right">Impact Solde</th>
                        <th className="p-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {compteOps.map(op => {
                        const isDebit = op.montant > 0;
                        return (
                          <tr key={op.id} className="hover:bg-muted/30">
                            <td className="p-2.5 text-muted-foreground font-mono">{formatDateTime(op.date)}</td>
                            <td className="p-2.5">
                              {op.type === "achat" && (
                                <Badge variant="outline" className="text-orange-700 border-orange-300 bg-orange-50 dark:bg-orange-950/40">
                                  Achat marchandise
                                </Badge>
                              )}
                              {op.type === "service" && (
                                <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50 dark:bg-blue-950/40">
                                  Prestation SAV fournie
                                </Badge>
                              )}
                              {op.type === "avance" && (
                                <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40">
                                  Avance / Paiement reçu
                                </Badge>
                              )}
                              {op.type === "paiement" && (
                                <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50 dark:bg-purple-950/40">
                                  Paiement versé à lui
                                </Badge>
                              )}
                              {op.type === "remboursement" && (
                                <Badge variant="outline" className="text-gray-700 border-gray-300">
                                  Remboursement
                                </Badge>
                              )}
                            </td>
                            <td className="p-2.5">
                              <p className="font-semibold text-foreground">{op.description}</p>
                              {op.reference && <p className="text-[11px] text-muted-foreground font-mono">Réf: {op.reference}</p>}
                            </td>
                            <td className={cn("p-2.5 text-right font-mono font-bold", isDebit ? "text-orange-600" : "text-blue-600")}>
                              {isDebit ? `+${formatPrice(op.montant)}` : `-${formatPrice(Math.abs(op.montant))}`}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                onClick={() => handleDeleteOp(op.id)}
                                className="p-1 rounded text-muted-foreground hover:text-red-600"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <DialogFooter className="mt-4 pt-3 border-t">
              <Button variant="outline" onClick={() => setCompteReseller(null)}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ——— MODAL AJOUTER OPÉRATION COMPTE COURANT ——— */}
      <Dialog open={showAddOpDialog} onOpenChange={setShowAddOpDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-primary" />
              Nouvelle Opération Compte Courant
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Enregistrez une prestation SAV, un achat de produit, une avance ou un paiement.
            </p>
          </DialogHeader>

          <form onSubmit={handleAddOp} className="space-y-4">
            <div>
              <Label>Type d'opération *</Label>
              <Select
                value={opForm.type}
                onValueChange={(v: CompteOperationType) => setOpForm(f => ({ ...f, type: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">
                    🔧 Prestation SAV effectuée par lui (Nous lui devons de l'argent)
                  </SelectItem>
                  <SelectItem value="achat">
                    📦 Achat de produit / pièce par lui (Il nous doit de l'argent)
                  </SelectItem>
                  <SelectItem value="paiement">
                    💵 Paiement versé au partenaire (Nous le payons pour son travail)
                  </SelectItem>
                  <SelectItem value="avance">
                    💰 Avance / Règlement reçu de lui (Il nous paye)
                  </SelectItem>
                  <SelectItem value="remboursement">
                    ↩️ Remboursement
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Montant (DT) *</Label>
              <Input
                type="number"
                step="0.001"
                min="0.001"
                value={opForm.montant}
                onChange={e => setOpForm(f => ({ ...f, montant: e.target.value }))}
                placeholder="ex: 50.000"
                required
              />
            </div>

            <div>
              <Label>Description / Motif *</Label>
              <Input
                value={opForm.description}
                onChange={e => setOpForm(f => ({ ...f, description: e.target.value }))}
                placeholder="ex: Réparation carte mère Samsung, Achat 2 chargeurs..."
                required
              />
            </div>

            <div>
              <Label>Référence (optionnel)</Label>
              <Input
                value={opForm.reference}
                onChange={e => setOpForm(f => ({ ...f, reference: e.target.value }))}
                placeholder="N° Ticket SAV, Facture..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddOpDialog(false)}>
                Annuler
              </Button>
              <Button type="submit">
                Enregistrer l'Opération
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ——— DIALOG REVENDEUR / PARTENAIRE ——— */}
      <Dialog open={showResellerDialog} onOpenChange={setShowResellerDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReseller ? "Modifier le partenaire" : "Nouveau partenaire / revendeur"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResellerSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom *</Label>
                <Input value={resellerForm.nom} onChange={e => setResellerForm(f => ({ ...f, nom: e.target.value }))} placeholder="Nom" required />
              </div>
              <div>
                <Label>Prénom</Label>
                <Input value={resellerForm.prenom} onChange={e => setResellerForm(f => ({ ...f, prenom: e.target.value }))} placeholder="Prénom" />
              </div>
            </div>
            <div>
              <Label>Entreprise / Atelier / Société</Label>
              <Input value={resellerForm.entreprise} onChange={e => setResellerForm(f => ({ ...f, entreprise: e.target.value }))} placeholder="Atelier Tech, Nom commercial..." />
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
                <Label>Type de partenaire</Label>
                <Select value={resellerForm.type} onValueChange={(v: Reseller["type"]) => setResellerForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personnel">🤝 Partenaire Personnel (Tech / SAV & Achats)</SelectItem>
                    <SelectItem value="revendeur">Revendeur classique</SelectItem>
                    <SelectItem value="grossiste">Grossiste</SelectItem>
                    <SelectItem value="partenaire">Partenaire externe</SelectItem>
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
                <Label>Solde initial (DT)</Label>
                <Input type="number" step="0.001" value={resellerForm.soldeEnCours} onChange={e => setResellerForm(f => ({ ...f, soldeEnCours: +e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Notes & Accords commerciaux</Label>
              <Textarea value={resellerForm.notes} onChange={e => setResellerForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Conditions, accords de paiement, spécialités..." />
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
