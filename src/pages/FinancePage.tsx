import { useState, useMemo } from "react";
import {
  TrendingUp, TrendingDown, Wallet, PlusCircle, Trash2,
  RefreshCw, DollarSign, ArrowUpCircle, ArrowDownCircle,
  BarChart3, Calendar, Filter, FileSpreadsheet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { transactionStorage } from "@/lib/storage";
import { exportFinancesToExcel } from "@/lib/excel";
import { formatPrice, formatDate, cn } from "@/lib/utils";
import type { Transaction, TransactionType, TransactionCategory } from "@/types";

const CATEGORIES: TransactionCategory[] = [
  "Achat stock", "Vente produit", "Réparation", "Loyer",
  "Salaire", "Fournitures", "Transport", "Publicité",
  "Services", "Remboursement", "Autre"
];

const PAYMENT_METHODS = ["espèces", "carte", "virement", "chèque"] as const;

type TabType = "tous" | "revenu" | "depense";

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => transactionStorage.getAll());
  const [tab, setTab] = useState<TabType>("tous");
  const [filterMonth, setFilterMonth] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    type: "revenu" as TransactionType,
    categorie: "Vente produit" as TransactionCategory,
    montant: "",
    description: "",
    methodePaiement: "espèces" as "espèces" | "carte" | "virement" | "chèque",
    referenceExterne: "",
    notes: "",
  });

  const refresh = () => setTransactions(transactionStorage.getAll());

  // ——— Totaux ———
  const totals = useMemo(() => {
    const all = transactions;
    const revenus = all.filter(t => t.type === "revenu").reduce((s, t) => s + t.montant, 0);
    const depenses = all.filter(t => t.type === "depense").reduce((s, t) => s + t.montant, 0);
    return { revenus, depenses, balance: revenus - depenses };
  }, [transactions]);

  // ——— Totaux mois courant ———
  const currentMonthTotals = useMemo(() => {
    const now = new Date();
    const monthly = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const revenus = monthly.filter(t => t.type === "revenu").reduce((s, t) => s + t.montant, 0);
    const depenses = monthly.filter(t => t.type === "depense").reduce((s, t) => s + t.montant, 0);
    return { revenus, depenses, count: monthly.length };
  }, [transactions]);

  // ——— Transactions par catégorie ———
  const byCategory = useMemo(() => {
    const map: Record<string, { revenus: number; depenses: number }> = {};
    transactions.forEach(t => {
      if (!map[t.categorie]) map[t.categorie] = { revenus: 0, depenses: 0 };
      if (t.type === "revenu") map[t.categorie].revenus += t.montant;
      else map[t.categorie].depenses += t.montant;
    });
    return Object.entries(map).sort((a, b) => (b[1].revenus + b[1].depenses) - (a[1].revenus + a[1].depenses));
  }, [transactions]);

  // ——— Transactions filtrées ———
  const filtered = useMemo(() => {
    let list = [...transactions];
    if (tab !== "tous") list = list.filter(t => t.type === tab);
    if (filterCategory) list = list.filter(t => t.categorie === filterCategory);
    if (filterMonth) {
      list = list.filter(t => {
        const d = new Date(t.date);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return ym === filterMonth;
      });
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, tab, filterCategory, filterMonth]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const montant = parseFloat(form.montant);
    if (!montant || montant <= 0) {
      toast.error("Montant invalide");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Description requise");
      return;
    }
    transactionStorage.add({
      type: form.type,
      categorie: form.categorie,
      montant,
      description: form.description.trim(),
      methodePaiement: form.methodePaiement,
      referenceExterne: form.referenceExterne.trim() || undefined,
      notes: form.notes.trim() || undefined,
    } as any);
    toast.success(`${form.type === "revenu" ? "Revenu" : "Dépense"} enregistré(e) : ${formatPrice(montant)}`);
    setShowDialog(false);
    setForm({ type: "revenu", categorie: "Vente produit", montant: "", description: "", methodePaiement: "espèces", referenceExterne: "", notes: "" });
    refresh();
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Supprimer cette transaction ?")) {
      transactionStorage.delete(id);
      toast.success("Transaction supprimée");
      refresh();
    }
  };

  // ——— Months list for filter ———
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach(t => {
      const d = new Date(t.date);
      months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    });
    return Array.from(months).sort().reverse();
  }, [transactions]);

  const formatMonthLabel = (ym: string) => {
    const [y, m] = ym.split("-");
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5 text-foreground">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Wallet className="w-6 h-6" />
            </span>
            Gestion Financière (Caisse)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Suivi des revenus, dépenses et solde de la boutique
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportFinancesToExcel} className="gap-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-700">
            <FileSpreadsheet className="w-4 h-4" /> Exporter Excel
          </Button>
          <Button onClick={() => setShowDialog(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <PlusCircle className="w-4 h-4" /> Nouvelle Transaction
          </Button>
          <Button variant="outline" size="icon" onClick={refresh} className="h-10 w-10">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border-2 border-emerald-200 dark:border-emerald-900/60 rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Revenus Totaux</p>
              <p className="text-2xl font-extrabold text-foreground mt-1">{formatPrice(totals.revenus)}</p>
              <p className="text-xs text-muted-foreground mt-1">Ce mois : {formatPrice(currentMonthTotals.revenus)}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-card border-2 border-red-200 dark:border-red-900/60 rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-600">Dépenses Totales</p>
              <p className="text-2xl font-extrabold text-foreground mt-1">{formatPrice(totals.depenses)}</p>
              <p className="text-xs text-muted-foreground mt-1">Ce mois : {formatPrice(currentMonthTotals.depenses)}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className={cn(
          "bg-card border-2 rounded-xl p-4 shadow-sm",
          totals.balance >= 0 ? "border-blue-200 dark:border-blue-900/60" : "border-orange-200 dark:border-orange-900/60"
        )}>
          <div className="flex items-start justify-between">
            <div>
              <p className={cn("text-xs font-semibold uppercase tracking-wider", totals.balance >= 0 ? "text-blue-600" : "text-orange-600")}>
                Solde Net
              </p>
              <p className={cn("text-2xl font-extrabold mt-1", totals.balance >= 0 ? "text-emerald-600" : "text-red-600")}>
                {totals.balance >= 0 ? "+" : ""}{formatPrice(totals.balance)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{currentMonthTotals.count} transactions ce mois</p>
            </div>
            <div className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center",
              totals.balance >= 0 ? "bg-blue-100 dark:bg-blue-950/60 text-blue-600" : "bg-orange-100 dark:bg-orange-950/60 text-orange-600"
            )}>
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Transactions List */}
        <div className="lg:col-span-8 space-y-4">
          {/* Tabs & Filters */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              {/* Tabs */}
              <div className="flex gap-1 bg-muted/60 p-1 rounded-lg text-sm">
                {(["tous", "revenu", "depense"] as TabType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn(
                      "px-3 py-1.5 rounded font-medium transition-colors capitalize",
                      tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t === "tous" ? "Toutes" : t === "revenu" ? "Revenus" : "Dépenses"}
                    <span className="ml-1 text-xs opacity-60">
                      ({t === "tous" ? transactions.length : transactions.filter(x => x.type === t).length})
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex gap-2 ml-auto flex-wrap">
                <select
                  value={filterMonth}
                  onChange={e => setFilterMonth(e.target.value)}
                  className="text-sm border border-border rounded-lg px-2 py-1.5 bg-background text-foreground"
                >
                  <option value="">Tous les mois</option>
                  {availableMonths.map(m => (
                    <option key={m} value={m}>{formatMonthLabel(m)}</option>
                  ))}
                </select>
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  className="text-sm border border-border rounded-lg px-2 py-1.5 bg-background text-foreground"
                >
                  <option value="">Toutes catégories</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Transactions */}
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-lg">
                <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">Aucune transaction trouvée</p>
                <p className="text-xs mt-1">Ajoutez une transaction pour commencer</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {filtered.map(t => (
                  <div
                    key={t.id}
                    className={cn(
                      "flex items-start justify-between p-3.5 rounded-xl border transition-all",
                      t.type === "revenu"
                        ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60"
                        : "bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-900/60"
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                        t.type === "revenu"
                          ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600"
                          : "bg-red-100 dark:bg-red-900/40 text-red-600"
                      )}>
                        {t.type === "revenu"
                          ? <ArrowUpCircle className="w-5 h-5" />
                          : <ArrowDownCircle className="w-5 h-5" />
                        }
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground truncate">{t.description}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                            {t.categorie}
                          </Badge>
                          {t.methodePaiement && (
                            <span className="text-[10px] text-muted-foreground capitalize">{t.methodePaiement}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(t.date)}
                          {t.referenceExterne && ` · Réf: ${t.referenceExterne}`}
                          {t.notes && ` · ${t.notes}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-2">
                      <span className={cn(
                        "font-bold text-base whitespace-nowrap",
                        t.type === "revenu" ? "text-emerald-600" : "text-red-600"
                      )}>
                        {t.type === "revenu" ? "+" : "-"}{formatPrice(t.montant)}
                      </span>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-muted-foreground hover:text-red-600 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Répartition par catégorie */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <h3 className="font-bold text-sm flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-primary" />
              Répartition par Catégorie
            </h3>
            {byCategory.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Aucune donnée</p>
            ) : (
              <div className="space-y-3">
                {byCategory.map(([cat, vals]) => {
                  const total = vals.revenus + vals.depenses;
                  const globalMax = Math.max(...byCategory.map(([, v]) => v.revenus + v.depenses));
                  const pct = globalMax > 0 ? (total / globalMax) * 100 : 0;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-medium text-foreground truncate">{cat}</span>
                        <span className="text-muted-foreground ml-2 whitespace-nowrap">{formatPrice(total)}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                        {vals.revenus > 0 && <span className="text-emerald-600">+{formatPrice(vals.revenus)}</span>}
                        {vals.depenses > 0 && <span className="text-red-600">-{formatPrice(vals.depenses)}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick entry shortcuts */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <h3 className="font-bold text-sm mb-3">Saisie Rapide</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { label: "Vente rapide", type: "revenu" as TransactionType, cat: "Vente produit" as TransactionCategory, color: "text-emerald-600 border-emerald-200 hover:bg-emerald-50" },
                { label: "Réparation", type: "revenu" as TransactionType, cat: "Réparation" as TransactionCategory, color: "text-emerald-600 border-emerald-200 hover:bg-emerald-50" },
                { label: "Achat stock", type: "depense" as TransactionType, cat: "Achat stock" as TransactionCategory, color: "text-red-600 border-red-200 hover:bg-red-50" },
                { label: "Dépense autre", type: "depense" as TransactionType, cat: "Autre" as TransactionCategory, color: "text-red-600 border-red-200 hover:bg-red-50" },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => {
                    setForm(f => ({ ...f, type: item.type, categorie: item.cat }));
                    setShowDialog(true);
                  }}
                  className={cn("border rounded-lg px-2 py-2 font-medium transition-colors text-left", item.color)}
                >
                  {item.type === "revenu" ? "▲" : "▼"} {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dialog: Nouvelle transaction */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-primary" />
              Nouvelle Transaction
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type: Revenu / Dépense */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, type: "revenu" }))}
                className={cn(
                  "flex items-center gap-2 justify-center border-2 rounded-lg py-3 font-semibold transition-colors text-sm",
                  form.type === "revenu"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700"
                    : "border-border text-muted-foreground hover:border-emerald-300"
                )}
              >
                <ArrowUpCircle className="w-4 h-4" /> Revenu
              </button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, type: "depense" }))}
                className={cn(
                  "flex items-center gap-2 justify-center border-2 rounded-lg py-3 font-semibold transition-colors text-sm",
                  form.type === "depense"
                    ? "border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700"
                    : "border-border text-muted-foreground hover:border-red-300"
                )}
              >
                <ArrowDownCircle className="w-4 h-4" /> Dépense
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="montant">Montant (DT) *</Label>
                <Input
                  id="montant"
                  type="number"
                  step="0.001"
                  min="0.1"
                  placeholder="ex: 120.500"
                  value={form.montant}
                  onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="categorie">Catégorie *</Label>
                <Select value={form.categorie} onValueChange={(v: TransactionCategory) => setForm(f => ({ ...f, categorie: v }))}>
                  <SelectTrigger id="categorie">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                placeholder="ex: Vente HP EliteBook, Réparation écran..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="paiement">Mode de paiement</Label>
                <Select value={form.methodePaiement} onValueChange={(v: any) => setForm(f => ({ ...f, methodePaiement: v }))}>
                  <SelectTrigger id="paiement">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="ref">Référence (optionnel)</Label>
                <Input
                  id="ref"
                  placeholder="N° ticket, facture..."
                  value={form.referenceExterne}
                  onChange={e => setForm(f => ({ ...f, referenceExterne: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                placeholder="Informations complémentaires..."
                rows={2}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Annuler</Button>
              <Button
                type="submit"
                className={form.type === "revenu" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
              >
                Enregistrer {form.type === "revenu" ? "le Revenu" : "la Dépense"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
