import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Wrench, CheckCircle2, Clock, AlertTriangle, AlertCircle,
  Package, ShoppingCart, ArrowRight, User, Phone, Laptop,
  Cpu, Check, RefreshCw, PlusCircle, Sparkles, Filter, Hourglass,
  ClipboardPlus, X, ChevronDown, ChevronUp, Bell, Printer, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { repairStorage, stockStorage, orderStorage, clientStorage, reminderStorage } from "@/lib/storage";
import { formatDateTime, formatPrice, cn } from "@/lib/utils";
import type { RepairItem, RepairStatus, RepairPriority, Reminder } from "@/types";
import { toast } from "sonner";
import RepairTicketsModal from "@/components/print/RepairTicketsModal";

const STATUS_LABELS: Record<RepairStatus, { label: string; color: string; badgeClass: string }> = {
  reçu: { label: "Reçu", color: "#3b82f6", badgeClass: "status-reçu" },
  en_diagnostic: { label: "En diagnostic", color: "#a855f7", badgeClass: "status-en_diagnostic" },
  en_attente_pièce: { label: "Attente pièce", color: "#f97316", badgeClass: "status-en_attente_pièce" },
  en_cours: { label: "En réparation", color: "#06b6d4", badgeClass: "status-en_cours" },
  terminé: { label: "Réparé (Prêt)", color: "#22c55e", badgeClass: "status-terminé" },
  livré: { label: "Livré au client", color: "#64748b", badgeClass: "status-livré" },
  annulé: { label: "Annulé", color: "#ef4444", badgeClass: "status-annulé" },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [repairs, setRepairs] = useState<RepairItem[]>(() => repairStorage.getAll());
  const [stock, setStock] = useState(() => stockStorage.getAll());
  const [orders, setOrders] = useState(() => orderStorage.getAll());
  const [reminders, setReminders] = useState<Reminder[]>(() => reminderStorage.getActifs());

  // Filter for the "A réparer" section
  const [filterActiveTab, setFilterActiveTab] = useState<"all_pending" | "attente_piece" | "diagnostic" | "urgents">("all_pending");

  // ——— Quick Intake Form ———
  const [showIntakeForm, setShowIntakeForm] = useState(true);
  const [printTicket, setPrintTicket] = useState<RepairItem | null>(null);
  const [intake, setIntake] = useState({
    clientNom: "",
    clientTel: "",
    appareil: "",
    marque: "",
    problemeDecrit: "",
    priorite: "normale" as RepairPriority,
    technicien: "",
    coutEstime: "",
    avancePayee: "",
    pinAppareil: "",
    schemaUnlock: "",
    operationType: "SAV" as "SAV" | "Achat" | "Dépôt" | "Vente",
  });

  const handleIntakeSubmit = (e?: React.FormEvent, shouldPrint = false) => {
    if (e) e.preventDefault();
    if (!intake.clientNom.trim()) return toast.error("Nom du client requis");
    if (!intake.clientTel.trim()) return toast.error("Téléphone requis");
    if (!intake.appareil.trim()) return toast.error("Appareil requis");
    if (!intake.problemeDecrit.trim()) return toast.error("Description du problème requise");

    const coutEstimeNum = intake.coutEstime ? Number(intake.coutEstime) : undefined;
    const avanceNum = intake.avancePayee ? Number(intake.avancePayee) : 0;
    const resteAPayer = Math.max(0, (coutEstimeNum || 0) - avanceNum);

    const ticket = repairStorage.add({
      clientId: "",
      clientNom: intake.clientNom.trim(),
      clientTel: intake.clientTel.trim(),
      appareil: intake.appareil.trim(),
      marque: intake.marque.trim() || "Non spécifié",
      modele: "",
      problemeDecrit: intake.problemeDecrit.trim(),
      status: "reçu",
      priorite: intake.priorite,
      technicien: intake.technicien.trim() || undefined,
      coutEstime: coutEstimeNum,
      avancePayee: avanceNum,
      resteAPayer,
      pinAppareil: intake.pinAppareil.trim() || undefined,
      schemaUnlock: intake.schemaUnlock.trim() || undefined,
    });

    toast.success(
      `✅ Ticket créé : ${ticket.numeroTicket}`,
      { description: `${intake.clientNom} · ${intake.appareil} (Avance: ${formatPrice(avanceNum)})`, duration: 5000 }
    );

    setIntake({
      clientNom: "",
      clientTel: "",
      appareil: "",
      marque: "",
      problemeDecrit: "",
      priorite: "normale",
      technicien: "",
      coutEstime: "",
      avancePayee: "",
      pinAppareil: "",
      schemaUnlock: "",
      operationType: "SAV",
    });
    refreshData();

    if (shouldPrint) {
      setPrintTicket(ticket);
    }
  };

  const handlePayFullIntake = () => {
    if (!intake.coutEstime) return toast.info("Veuillez d'abord saisir un coût estimé");
    setIntake(f => ({ ...f, avancePayee: f.coutEstime }));
    toast.success("Avance ajustée au montant total !");
  };

  const refreshData = () => {
    setRepairs(repairStorage.getAll());
    setStock(stockStorage.getAll());
    setOrders(orderStorage.getAll());
    setReminders(reminderStorage.getActifs());
  };

  // Quick action from dashboard to update repair status
  const handleQuickStatusChange = (repairId: string, newStatus: RepairStatus) => {
    repairStorage.update(repairId, {
      status: newStatus,
      dateFin: newStatus === "terminé" || newStatus === "livré" ? new Date().toISOString() : undefined,
    });
    refreshData();
    toast.success(`Statut mis à jour : ${STATUS_LABELS[newStatus].label}`);
  };

  // Operational metrics - STRICTLY NON-MONETARY
  const stats = useMemo(() => {
    // 1. Choses à réparer (en atelier actif)
    const enAttenteDiagnostic = repairs.filter(r => r.status === "reçu" || r.status === "en_diagnostic").length;
    const enAttentePiece = repairs.filter(r => r.status === "en_attente_pièce").length;
    const enCoursReparation = repairs.filter(r => r.status === "en_cours").length;
    const totalAReparer = enAttenteDiagnostic + enAttentePiece + enCoursReparation;

    // 2. Choses réparées
    const reparesPrets = repairs.filter(r => r.status === "terminé").length;
    const livresClotures = repairs.filter(r => r.status === "livré").length;
    const totalRepares = reparesPrets + livresClotures;

    // 3. Urgences & alertes
    const urgents = repairs.filter(r =>
      r.priorite === "urgente" && ["reçu", "en_diagnostic", "en_attente_pièce", "en_cours"].includes(r.status)
    ).length;

    // 4. Stock atelier & commandes
    const piecesRupture = stock.filter(s => s.status === "rupture").length;
    const piecesFaibles = stock.filter(s => s.status === "stock_faible").length;
    const commandesEnTransit = orders.filter(o => ["envoyée", "confirmée", "en_transit"].includes(o.status)).length;

    return {
      totalAReparer,
      enAttenteDiagnostic,
      enAttentePiece,
      enCoursReparation,
      reparesPrets,
      livresClotures,
      totalRepares,
      urgents,
      piecesRupture,
      piecesFaibles,
      commandesEnTransit,
    };
  }, [repairs, stock, orders]);

  // List: "Choses à réparer"
  const pendingRepairs = useMemo(() => {
    let list = repairs.filter(r =>
      ["reçu", "en_diagnostic", "en_attente_pièce", "en_cours"].includes(r.status)
    );

    if (filterActiveTab === "attente_piece") {
      list = list.filter(r => r.status === "en_attente_pièce");
    } else if (filterActiveTab === "diagnostic") {
      list = list.filter(r => r.status === "reçu" || r.status === "en_diagnostic");
    } else if (filterActiveTab === "urgents") {
      list = list.filter(r => r.priorite === "urgente" || r.priorite === "haute");
    }

    return list.sort((a, b) => {
      // Prioritize "urgente"
      if (a.priorite === "urgente" && b.priorite !== "urgente") return -1;
      if (b.priorite === "urgente" && a.priorite !== "urgente") return 1;
      return new Date(b.dateReception).getTime() - new Date(a.dateReception).getTime();
    });
  }, [repairs, filterActiveTab]);

  // List: "Choses réparées" (Terminés prêts pour retrait & Livrés récents)
  const completedRepairs = useMemo(() => {
    return repairs
      .filter(r => r.status === "terminé" || r.status === "livré")
      .sort((a, b) => {
        // "terminé" first so the shop sees who needs to pick up their PC
        if (a.status === "terminé" && b.status === "livré") return -1;
        if (b.status === "terminé" && a.status === "livré") return 1;
        return new Date(b.dateReception).getTime() - new Date(a.dateReception).getTime();
      })
      .slice(0, 7);
  }, [repairs]);

  // Alert stock parts needed for repairs
  const criticalParts = useMemo(() => {
    return stock
      .filter(s => s.status !== "en_stock")
      .sort((a, b) => a.quantite - b.quantite)
      .slice(0, 6);
  }, [stock]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5 text-foreground">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Wrench className="w-6 h-6" />
            </span>
            Tableau de Bord Atelier & Boutique
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestion du flux technique : appareils à réparer, appareils prêts et pièces de rechange
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate("/reparations")}
            className="gap-2 shadow-sm font-semibold"
          >
            <PlusCircle className="w-4 h-4" /> Nouveau Ticket SAV
          </Button>
          <Button
            variant="outline"
            onClick={refreshData}
            size="icon"
            className="h-10 w-10 text-muted-foreground"
            title="Rafraîchir"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ——— QUICK INTAKE FORM (SAISIE DIRECTE CLIENT) ——— */}
      <div className="bg-card border-2 border-primary/30 rounded-xl shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowIntakeForm(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <ClipboardPlus className="w-4 h-4" />
            </span>
            <div className="text-left">
              <p className="font-bold text-sm text-foreground">Saisie Directe Client (Prise en Charge Rapide)</p>
              <p className="text-xs text-muted-foreground">Enregistrer immédiatement un client, son appareil et l'opération demandée</p>
            </div>
          </div>
          {showIntakeForm ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showIntakeForm && (
          <div className="border-t border-border/50 px-5 py-4">
            <form onSubmit={handleIntakeSubmit}>
              {/* Operation type tabs */}
              <div className="flex gap-1.5 mb-4 bg-muted/50 p-1 rounded-lg w-fit">
                {(["SAV", "Achat", "Dépôt", "Vente"] as const).map(op => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setIntake(f => ({ ...f, operationType: op }))}
                    className={cn(
                      "px-3 py-1 rounded text-xs font-semibold transition-colors",
                      intake.operationType === op
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {op === "SAV" ? "🔧 SAV / Réparation" :
                     op === "Achat" ? "🛒 Achat" :
                     op === "Dépôt" ? "📦 Dépôt" : "💰 Vente"}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1 block">NOM CLIENT *</Label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      className="pl-8 h-9 text-sm"
                      placeholder="Nom & Prénom"
                      value={intake.clientNom}
                      onChange={e => setIntake(f => ({ ...f, clientNom: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1 block">TÉLÉPHONE *</Label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      className="pl-8 h-9 text-sm"
                      placeholder="20 123 456 / 98 123 456"
                      value={intake.clientTel}
                      onChange={e => setIntake(f => ({ ...f, clientTel: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1 block">APPAREIL / OBJET *</Label>
                  <div className="relative">
                    <Laptop className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      className="pl-8 h-9 text-sm"
                      placeholder="Laptop HP, Téléphone, etc."
                      value={intake.appareil}
                      onChange={e => setIntake(f => ({ ...f, appareil: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1 block">MARQUE / MODÈLE</Label>
                  <Input
                    className="h-9 text-sm"
                    placeholder="HP, Samsung, Apple..."
                    value={intake.marque}
                    onChange={e => setIntake(f => ({ ...f, marque: e.target.value }))}
                  />
                </div>
              </div>

              {/* Ligne 2 : PIN, Schéma, Coût & Avance */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-blue-50/50 dark:bg-blue-950/20 p-2.5 rounded-lg border border-blue-200/60 dark:border-blue-900/40">
                <div>
                  <Label className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-blue-600" /> CODE PIN / MDP
                  </Label>
                  <Input
                    className="h-8 text-xs font-mono bg-white dark:bg-card"
                    placeholder="ex: 1234, 0000"
                    value={intake.pinAppareil}
                    onChange={e => setIntake(f => ({ ...f, pinAppareil: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1 block">
                    SCHÉMA (1-9)
                  </Label>
                  <Input
                    className="h-8 text-xs font-mono bg-white dark:bg-card"
                    placeholder="ex: 1-2-5-8"
                    value={intake.schemaUnlock}
                    onChange={e => setIntake(f => ({ ...f, schemaUnlock: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    COÛT ESTIMÉ (DT)
                  </Label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    className="h-8 text-xs bg-white dark:bg-card"
                    placeholder="0.000"
                    value={intake.coutEstime}
                    onChange={e => setIntake(f => ({ ...f, coutEstime: e.target.value }))}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs font-bold text-blue-700 dark:text-blue-300">
                      AVANCE (DT)
                    </Label>
                    {intake.coutEstime && Number(intake.coutEstime) > 0 && (
                      <button
                        type="button"
                        onClick={handlePayFullIntake}
                        className="text-[10px] text-emerald-600 hover:underline font-semibold"
                      >
                        ✓ Tout payer
                      </button>
                    )}
                  </div>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    className="h-8 text-xs bg-white dark:bg-card"
                    placeholder="0.000"
                    value={intake.avancePayee}
                    onChange={e => setIntake(f => ({ ...f, avancePayee: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <Label className="text-xs font-semibold text-muted-foreground mb-1 block">PROBLÈME / OPÉRATION *</Label>
                  <Textarea
                    className="text-sm resize-none"
                    rows={2}
                    placeholder="Description du problème ou de l'opération demandée..."
                    value={intake.problemeDecrit}
                    onChange={e => setIntake(f => ({ ...f, problemeDecrit: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1 block">PRIORITÉ</Label>
                  <Select value={intake.priorite} onValueChange={(v: RepairPriority) => setIntake(f => ({ ...f, priorite: v }))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basse">🟢 Basse</SelectItem>
                      <SelectItem value="normale">🔵 Normale</SelectItem>
                      <SelectItem value="haute">🟠 Haute</SelectItem>
                      <SelectItem value="urgente">🔴 URGENTE</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="mt-2">
                    <Label className="text-xs font-semibold text-muted-foreground mb-1 block">TECHNICIEN</Label>
                    <Input
                      className="h-9 text-sm"
                      placeholder="Sofiane, Riad..."
                      value={intake.technicien}
                      onChange={e => setIntake(f => ({ ...f, technicien: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex flex-col justify-end gap-2">
                  <Button
                    type="button"
                    className="gap-2 h-9 font-semibold w-full bg-blue-600 hover:bg-blue-700 text-white text-xs"
                    onClick={() => handleIntakeSubmit(undefined, true)}
                  >
                    <Printer className="w-4 h-4" />
                    Enregistrer & Imprimer 2 Tickets
                  </Button>
                  <Button
                    type="submit"
                    variant="default"
                    className="gap-2 h-9 font-semibold w-full text-xs"
                  >
                    <ClipboardPlus className="w-4 h-4" />
                    Enregistrer la Prise en Charge
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Rappels d'appels clients actifs */}
      {reminders.length > 0 && (
        <div className="bg-amber-50/70 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-600 animate-bounce" />
              Rappels d'Appels Téléphoniques à Passer ({reminders.length})
            </h3>
            <Link to="/rappels" className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline">
              Voir tous les rappels →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {reminders.slice(0, 3).map(r => (
              <div key={r.id} className="p-3 rounded-lg bg-card border border-amber-200 dark:border-amber-900/60 text-xs flex items-center justify-between gap-2 shadow-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground truncate">{r.clientNom}</p>
                  <p className="text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-amber-600" /> {r.clientTel}
                  </p>
                  <p className="text-amber-700 dark:text-amber-300 font-medium truncate mt-0.5">{r.message}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[11px] text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 flex-shrink-0 font-semibold"
                  onClick={() => {
                    reminderStorage.update(r.id, { status: "effectué", dateEffectue: new Date().toISOString() });
                    refreshData();
                    toast.success("Rappel marqué comme effectué !");
                  }}
                >
                  <Check className="w-3 h-3 mr-1" /> Appel Fait
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Operational KPIs - ZERO CURRENCY */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* À réparer (Total) */}
        <div className="bg-card border-2 border-blue-200 dark:border-blue-900/60 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                À Réparer en Atelier
              </p>
              <p className="text-3xl font-extrabold text-foreground mt-1.5">{stats.totalAReparer}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.enCoursReparation} en cours · {stats.enAttenteDiagnostic} diagnostic
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
              <Wrench className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Charge de travail atelier</span>
            <span className="font-semibold text-blue-600">Actif</span>
          </div>
        </div>

        {/* Bloqué: Attente de pièce */}
        <div className="bg-card border-2 border-orange-200 dark:border-orange-900/60 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                En Attente de Pièce
              </p>
              <p className="text-3xl font-extrabold text-foreground mt-1.5">{stats.enAttentePiece}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Bloqués pour composant
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center">
              <Hourglass className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Pièces à commander</span>
            <Link to="/commandes" className="font-semibold text-orange-600 hover:underline">
              Commander →
            </Link>
          </div>
        </div>

        {/* Choses Réparées: Prêts pour retrait */}
        <div className="bg-card border-2 border-green-200 dark:border-green-900/60 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">
                Réparés · Prêts au Retrait
              </p>
              <p className="text-3xl font-extrabold text-foreground mt-1.5">{stats.reparesPrets}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Clients à avertir / restituer
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-green-100 dark:bg-green-950/60 text-green-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Total clôturés : {stats.livresClotures}</span>
            <span className="font-semibold text-green-600">Prêt</span>
          </div>
        </div>

        {/* Pièces critiques / Ruptures atelier */}
        <div className="bg-card border-2 border-red-200 dark:border-red-900/60 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
                Pièces en Alerte / Rupture
              </p>
              <p className="text-3xl font-extrabold text-foreground mt-1.5">{stats.piecesRupture + stats.piecesFaibles}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.piecesRupture} épuisés · {stats.piecesFaibles} niveau bas
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Composants requis</span>
            <Link to="/stock" className="font-semibold text-red-600 hover:underline">
              Vérifier Stock →
            </Link>
          </div>
        </div>
      </div>

      {/* Main Process Workflow (Pipeline de l'Atelier) */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Processus Principal de l'Atelier (Flux SAV)
          </h3>
          <span className="text-xs text-muted-foreground">
            {stats.totalAReparer} appareil(s) en transit technique
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40">
            <span className="text-blue-600 font-bold block text-lg">{stats.enAttenteDiagnostic}</span>
            <span className="text-muted-foreground font-medium">1. Diagnostic</span>
          </div>
          <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40">
            <span className="text-orange-600 font-bold block text-lg">{stats.enAttentePiece}</span>
            <span className="text-muted-foreground font-medium">2. Attente Pièce</span>
          </div>
          <div className="p-3 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-900/40">
            <span className="text-cyan-600 font-bold block text-lg">{stats.enCoursReparation}</span>
            <span className="text-muted-foreground font-medium">3. En Réparation</span>
          </div>
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/40">
            <span className="text-green-600 font-bold block text-lg">{stats.reparesPrets}</span>
            <span className="text-muted-foreground font-medium">4. Réparé (Prêt)</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/40 border border-border">
            <span className="text-slate-700 dark:text-slate-300 font-bold block text-lg">{stats.livresClotures}</span>
            <span className="text-muted-foreground font-medium">5. Livré Client</span>
          </div>
        </div>
      </div>

      {/* Main Grid: LES CHOSES À RÉPARER vs LES CHOSES RÉPARÉES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* SECTION 1 : LES CHOSES À RÉPARER (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Wrench className="w-4 h-4 text-blue-600" />
                  Pièces & Appareils à Réparer ({pendingRepairs.length})
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Appareils pris en charge nécessitant une intervention technique
                </p>
              </div>

              {/* Sub-filters for pending repairs */}
              <div className="flex flex-wrap gap-1 bg-muted/60 p-1 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setFilterActiveTab("all_pending")}
                  className={cn(
                    "px-2.5 py-1 rounded font-medium transition-colors",
                    filterActiveTab === "all_pending" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Tous ({stats.totalAReparer})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterActiveTab("attente_piece")}
                  className={cn(
                    "px-2.5 py-1 rounded font-medium transition-colors",
                    filterActiveTab === "attente_piece" ? "bg-card text-orange-600 shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Attente Pièce ({stats.enAttentePiece})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterActiveTab("diagnostic")}
                  className={cn(
                    "px-2.5 py-1 rounded font-medium transition-colors",
                    filterActiveTab === "diagnostic" ? "bg-card text-purple-600 shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Diagnostic ({stats.enAttenteDiagnostic})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterActiveTab("urgents")}
                  className={cn(
                    "px-2.5 py-1 rounded font-medium transition-colors",
                    filterActiveTab === "urgents" ? "bg-card text-red-600 shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Urgents ({stats.urgents})
                </button>
              </div>
            </div>

            {/* List of items to repair */}
            {pendingRepairs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-lg">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500 opacity-60" />
                <p className="text-sm font-medium">Aucun appareil en attente pour ce filtre !</p>
                <p className="text-xs text-muted-foreground mt-1">Tous les appareils sont réparés ou à jour.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                {pendingRepairs.map(item => (
                  <div
                    key={item.id}
                    className={cn(
                      "p-3.5 rounded-xl border transition-all",
                      item.priorite === "urgente"
                        ? "border-red-300 bg-red-50/40 dark:bg-red-950/20 dark:border-red-900/60"
                        : item.status === "en_attente_pièce"
                        ? "border-orange-300 bg-orange-50/40 dark:bg-orange-950/20 dark:border-orange-900/60"
                        : "border-border hover:border-border/80 bg-card"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {item.numeroTicket}
                        </span>
                        <span className={cn("badge-status text-xs", STATUS_LABELS[item.status].badgeClass)}>
                          {STATUS_LABELS[item.status].label}
                        </span>
                        {item.priorite === "urgente" && (
                          <span className="badge-status priority-urgente text-xs font-bold">
                            ⚠️ URGENT
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] text-muted-foreground">
                        Reçu le {formatDateTime(item.dateReception)}
                      </span>
                    </div>

                    {/* Device & Client info */}
                    <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div>
                        <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          <Laptop className="w-4 h-4 text-muted-foreground" />
                          {item.appareil}
                          {item.marque && <span className="text-xs font-normal text-muted-foreground">({item.marque} {item.modele})</span>}
                        </h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1 font-medium text-foreground">
                            <User className="w-3 h-3 text-muted-foreground" /> {item.clientNom}
                          </span>
                          {item.clientTel && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-muted-foreground" /> {item.clientTel}
                            </span>
                          )}
                        </p>
                      </div>

                      {item.technicien && (
                        <div className="text-right text-xs text-muted-foreground">
                          Tech : <span className="font-medium text-foreground">{item.technicien}</span>
                        </div>
                      )}
                    </div>

                    {/* Problem description */}
                    <div className="mt-2.5 p-2 rounded-lg bg-muted/50 text-xs">
                      <p className="font-semibold text-foreground">Panne signalée :</p>
                      <p className="text-muted-foreground mt-0.5 line-clamp-2">{item.problemeDecrit}</p>
                      {item.diagnostic && (
                        <p className="text-blue-700 dark:text-blue-400 mt-1 font-medium">
                          🔍 Diagnostic : {item.diagnostic}
                        </p>
                      )}
                      {item.piecesNecessaires && item.piecesNecessaires.length > 0 && (
                        <p className="text-orange-700 dark:text-orange-400 mt-1 font-medium flex items-center gap-1">
                          ⏳ Pièce(s) requise(s) : {item.piecesNecessaires.join(", ")}
                        </p>
                      )}
                    </div>

                    {/* Action buttons right on dashboard */}
                    <div className="mt-3 pt-2.5 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground">Action rapide :</span>
                        {item.status === "reçu" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2.5 text-purple-600 border-purple-200"
                            onClick={() => handleQuickStatusChange(item.id, "en_diagnostic")}
                          >
                            Diagnostiquer →
                          </Button>
                        )}
                        {(item.status === "en_diagnostic" || item.status === "en_attente_pièce") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2.5 text-cyan-600 border-cyan-200"
                            onClick={() => handleQuickStatusChange(item.id, "en_cours")}
                          >
                            Lancer réparation →
                          </Button>
                        )}
                        {item.status === "en_cours" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2.5 text-green-600 border-green-300 font-bold hover:bg-green-50"
                            onClick={() => handleQuickStatusChange(item.id, "terminé")}
                          >
                            ✓ Marquer Réparé
                          </Button>
                        )}
                      </div>

                      <Link
                        to="/reparations"
                        className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                      >
                        Détails ticket <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2 : LES CHOSES RÉPARÉES & COMPOSANTS CRITIQUES (5 cols) */}
        <div className="lg:col-span-5 space-y-4">

          {/* CHOSES RÉPARÉES (Prêts à être récupérés / Livrés) */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Appareils Réparés ({stats.reparesPrets} prêts)
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Terminés avec succès, prêts pour retrait ou récemment livrés
                </p>
              </div>
              <Link to="/reparations" className="text-xs text-primary hover:underline">
                Voir tout →
              </Link>
            </div>

            {completedRepairs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs border border-dashed rounded-lg">
                Aucun appareil réparé récemment
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {completedRepairs.map(item => (
                  <div
                    key={item.id}
                    className={cn(
                      "p-3 rounded-lg border text-xs flex items-center justify-between gap-2",
                      item.status === "terminé"
                        ? "bg-green-50/60 dark:bg-green-950/20 border-green-200 dark:border-green-900/60"
                        : "bg-muted/30 border-border"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-mono font-bold text-primary">{item.numeroTicket}</span>
                        <span className={cn("badge-status text-[10px]", STATUS_LABELS[item.status].badgeClass)}>
                          {item.status === "terminé" ? "Prêt au retrait" : "Livré"}
                        </span>
                      </div>
                      <p className="font-bold text-foreground truncate">{item.appareil}</p>
                      <p className="text-muted-foreground text-[11px] flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3" /> {item.clientNom}
                        {item.clientTel && ` · ${item.clientTel}`}
                      </p>
                    </div>

                    <div>
                      {item.status === "terminé" ? (
                        <Button
                          size="sm"
                          className="h-7 text-xs px-2.5 gap-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                          onClick={() => handleQuickStatusChange(item.id, "livré")}
                        >
                          <Check className="w-3 h-3" /> Remettre au client
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">
                          Clôturé
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* COMPOSANTS & PIÈCES DE RECHANGE (Stock critique pour l'atelier) */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2 text-foreground">
                  <Cpu className="w-4 h-4 text-orange-600" />
                  Pièces & Composants Critiques
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pièces nécessaires pour les réparations PC & laptops
                </p>
              </div>
              <Link to="/commandes" className="text-xs text-primary hover:underline">
                Commander →
              </Link>
            </div>

            {criticalParts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                ✅ Toutes les pièces de réparation sont disponibles en stock suffisant
              </p>
            ) : (
              <div className="space-y-2">
                {criticalParts.map(part => (
                  <div
                    key={part.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/50 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">{part.nom}</p>
                      <p className="text-muted-foreground text-[11px]">{part.categorie} · {part.marque}</p>
                    </div>

                    <div className="flex items-center gap-2 ml-2">
                      <div className="text-right">
                        <span className={cn(
                          "font-bold text-sm block",
                          part.quantite === 0 ? "text-red-600" : "text-yellow-600"
                        )}>
                          {part.quantite} dispo
                        </span>
                        <span className="text-[10px] text-muted-foreground">seuil: {part.seuilAlerte}</span>
                      </div>
                      <span className={cn(
                        "badge-status text-[10px]",
                        part.status === "rupture" ? "status-rupture" : "status-stock_faible"
                      )}>
                        {part.status === "rupture" ? "Épuisé" : "Bas"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>Commandes fournisseurs en cours : <strong>{stats.commandesEnTransit}</strong></span>
              <Link to="/commandes" className="text-primary hover:underline">
                Gérer réapprovisionnement →
              </Link>
            </div>
          </div>

          {/* Quick links to shop modules */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Button
              variant="outline"
              className="h-9 justify-start gap-2"
              onClick={() => navigate("/reparations")}
            >
              <Wrench className="w-3.5 h-3.5 text-blue-600" />
              Tous les Tickets SAV
            </Button>
            <Button
              variant="outline"
              className="h-9 justify-start gap-2"
              onClick={() => navigate("/commandes")}
            >
              <ShoppingCart className="w-3.5 h-3.5 text-orange-600" />
              Pièces à Commander
            </Button>
          </div>

        </div>
      </div>

      {/* Modal d'impression directe des 2 tickets depuis le Dashboard */}
      <RepairTicketsModal
        repair={printTicket}
        open={!!printTicket}
        onOpenChange={o => { if (!o) setPrintTicket(null); }}
      />
    </div>
  );
}
