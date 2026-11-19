import { useState, useMemo } from "react";
import {
  Plus, Search, Wrench, Edit2, Trash2, Clock, AlertCircle,
  CheckCircle2, XCircle, Filter, Phone, User, FileSpreadsheet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { repairStorage } from "@/lib/storage";
import { exportRepairsToExcel } from "@/lib/excel";
import { formatDateTime, cn } from "@/lib/utils";
import type { RepairItem, RepairStatus, RepairPriority } from "@/types";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

const STATUS_OPTIONS: { value: RepairStatus; label: string }[] = [
  { value: "reçu", label: "Reçu" },
  { value: "en_diagnostic", label: "En diagnostic" },
  { value: "en_attente_pièce", label: "En attente de pièce" },
  { value: "en_cours", label: "En cours de réparation" },
  { value: "terminé", label: "Terminé" },
  { value: "livré", label: "Livré au client" },
  { value: "annulé", label: "Annulé" },
];

const PRIORITY_OPTIONS: { value: RepairPriority; label: string }[] = [
  { value: "basse", label: "Basse" },
  { value: "normale", label: "Normale" },
  { value: "haute", label: "Haute" },
  { value: "urgente", label: "Urgente" },
];

function StatusIcon({ status }: { status: RepairStatus }) {
  if (status === "terminé" || status === "livré") return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  if (status === "annulé") return <XCircle className="w-4 h-4 text-red-500" />;
  if (status === "en_attente_pièce") return <AlertCircle className="w-4 h-4 text-orange-500" />;
  return <Clock className="w-4 h-4 text-blue-500" />;
}

type FormData = {
  clientNom: string;
  clientTel: string;
  appareil: string;
  marque: string;
  modele: string;
  serialNumber: string;
  problemeDecrit: string;
  diagnostic: string;
  solution: string;
  status: RepairStatus;
  priorite: RepairPriority;
  technicien: string;
  coutEstime: number;
  coutFinal: number;
  notes: string;
};

export default function RepairsPage() {
  const [items, setItems] = useState<RepairItem[]>(() => repairStorage.getAll());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [openDialog, setOpenDialog] = useState(false);
  const [editItem, setEditItem] = useState<RepairItem | null>(null);
  const [viewItem, setViewItem] = useState<RepairItem | null>(null);

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormData>({
    defaultValues: { status: "reçu", priorite: "normale" }
  });

  const refresh = () => setItems(repairStorage.getAll());

  const filtered = useMemo(() => items
    .filter(r => {
      const q = search.toLowerCase();
      return (
        r.numeroTicket.toLowerCase().includes(q) ||
        r.clientNom.toLowerCase().includes(q) ||
        r.appareil.toLowerCase().includes(q) ||
        r.marque.toLowerCase().includes(q)
      );
    })
    .filter(r => statusFilter === "all" || r.status === statusFilter)
    .filter(r => priorityFilter === "all" || r.priorite === priorityFilter)
    .sort((a, b) => new Date(b.dateReception).getTime() - new Date(a.dateReception).getTime()),
    [items, search, statusFilter, priorityFilter]
  );

  const stats = useMemo(() => ({
    total: items.length,
    actives: items.filter(r => ["reçu", "en_diagnostic", "en_attente_pièce", "en_cours"].includes(r.status)).length,
    attente_pièce: items.filter(r => r.status === "en_attente_pièce").length,
    terminees: items.filter(r => ["terminé", "livré"].includes(r.status)).length,
    urgentes: items.filter(r => r.priorite === "urgente" && !["terminé", "livré", "annulé"].includes(r.status)).length,
  }), [items]);

  const openEdit = (item: RepairItem) => {
    setEditItem(item);
    Object.entries(item).forEach(([k, v]) => setValue(k as any, v));
    setOpenDialog(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Supprimer cette réparation ?")) return;
    repairStorage.delete(id);
    refresh();
    toast.success("Réparation supprimée");
  };

  const onSubmit = (data: FormData) => {
    if (editItem) {
      repairStorage.update(editItem.id, {
        ...data,
        coutEstime: data.coutEstime ? Number(data.coutEstime) : undefined,
        coutFinal: data.coutFinal ? Number(data.coutFinal) : undefined,
      });
      toast.success("Réparation mise à jour");
    } else {
      repairStorage.add({
        ...data,
        clientId: "",
        coutEstime: data.coutEstime ? Number(data.coutEstime) : undefined,
        coutFinal: data.coutFinal ? Number(data.coutFinal) : undefined,
      });
      toast.success("Réparation enregistrée");
    }
    setOpenDialog(false);
    setEditItem(null);
    reset({ status: "reçu", priorite: "normale" });
    refresh();
  };

  const quickStatus = (id: string, status: RepairStatus) => {
    repairStorage.update(id, { status });
    refresh();
    toast.success(`Statut mis à jour: ${STATUS_OPTIONS.find(s => s.value === status)?.label}`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Wrench className="w-6 h-6 text-primary" /> SAV / Réparations
          </h1>
          <p className="page-subtitle">Gestion du service après-vente et des réparations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportRepairsToExcel} className="gap-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-700">
            <FileSpreadsheet className="w-4 h-4" /> Exporter Excel
          </Button>
          <Button onClick={() => { setEditItem(null); reset({ status: "reçu", priorite: "normale" }); setOpenDialog(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Nouvelle réparation
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "En cours", value: stats.actives, color: "text-blue-600" },
          { label: "Attente pièce", value: stats.attente_pièce, color: "text-orange-600" },
          { label: "Terminées", value: stats.terminees, color: "text-green-600" },
          { label: "Urgentes", value: stats.urgentes, color: "text-red-600" },
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
          <Input placeholder="Ticket, client, appareil..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
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
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Priorité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes priorités</SelectItem>
            {PRIORITY_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Filter className="w-3.5 h-3.5" /> {filtered.length} résultat(s)
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-muted-foreground">
            <Wrench className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Aucune réparation trouvée</p>
          </div>
        ) : (
          filtered.map(item => (
            <div key={item.id} className={cn(
              "bg-card border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow",
              item.priorite === "urgente" && !["terminé", "livré", "annulé"].includes(item.status)
                ? "border-red-300 dark:border-red-800"
                : "border-border"
            )}>
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <StatusIcon status={item.status} />
                  <span className="font-mono text-xs text-primary font-semibold">{item.numeroTicket}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={cn("badge-status text-xs", `priority-${item.priorite}`)}>
                    {item.priorite}
                  </span>
                </div>
              </div>

              {/* Client */}
              <div className="flex items-center gap-2 mb-2">
                <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium truncate">{item.clientNom}</span>
                {item.clientTel && (
                  <>
                    <Phone className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{item.clientTel}</span>
                  </>
                )}
              </div>

              {/* Appareil */}
              <div className="bg-muted/40 rounded-lg p-2.5 mb-3">
                <p className="text-sm font-semibold">{item.appareil}</p>
                {item.modele && <p className="text-xs text-muted-foreground">{item.marque} · {item.modele}</p>}
              </div>

              {/* Problème */}
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{item.problemeDecrit}</p>

              {/* Status badge */}
              <div className="flex items-center justify-between mb-3">
                <span className={cn("badge-status", `status-${item.status}`)}>
                  {STATUS_OPTIONS.find(s => s.value === item.status)?.label}
                </span>
                {item.technicien && (
                  <span className="text-xs text-muted-foreground">👤 {item.technicien}</span>
                )}
              </div>

              {/* Pièce en attente highlight */}
              {item.status === "en_attente_pièce" && (
                <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-2 mb-3">
                  <p className="text-xs text-orange-700 dark:text-orange-400 font-medium">
                    ⏳ En attente de pièce(s) pour procéder à la réparation
                  </p>
                </div>
              )}

              {/* Date */}
              <p className="text-xs text-muted-foreground mb-3">📅 {formatDateTime(item.dateReception)}</p>

              {/* Quick status update */}
              <div className="flex flex-wrap gap-1 mb-2">
                {item.status === "reçu" && (
                  <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => quickStatus(item.id, "en_diagnostic")}>→ Diagnostic</Button>
                )}
                {item.status === "en_diagnostic" && (
                  <>
                    <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => quickStatus(item.id, "en_attente_pièce")}>→ Attente pièce</Button>
                    <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => quickStatus(item.id, "en_cours")}>→ En cours</Button>
                  </>
                )}
                {item.status === "en_attente_pièce" && (
                  <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => quickStatus(item.id, "en_cours")}>→ En cours</Button>
                )}
                {item.status === "en_cours" && (
                  <Button size="sm" variant="outline" className="h-6 text-xs px-2 text-green-600 border-green-300" onClick={() => quickStatus(item.id, "terminé")}>✓ Terminé</Button>
                )}
                {item.status === "terminé" && (
                  <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => quickStatus(item.id, "livré")}>→ Livré</Button>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-1 pt-2 border-t border-border">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => openEdit(item)}>
                  <Edit2 className="w-3 h-3" /> Modifier
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onOpenChange={o => { setOpenDialog(o); if (!o) { setEditItem(null); reset({ status: "reçu", priorite: "normale" }); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              {editItem ? "Modifier la réparation" : "Nouvelle réparation"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Client */}
            <div className="bg-muted/30 rounded-lg p-3 space-y-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Informations client</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nom du client *</Label>
                  <Input {...register("clientNom", { required: true })} placeholder="Nom et prénom" />
                </div>
                <div>
                  <Label>Téléphone *</Label>
                  <Input {...register("clientTel", { required: true })} placeholder="06XXXXXXXX" />
                </div>
              </div>
            </div>

            {/* Appareil */}
            <div className="bg-muted/30 rounded-lg p-3 space-y-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Appareil</p>
              <div>
                <Label>Désignation appareil *</Label>
                <Input {...register("appareil", { required: true })} placeholder="ex: Laptop HP EliteBook 840" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Marque</Label>
                  <Input {...register("marque")} placeholder="HP, Dell, Apple..." />
                </div>
                <div>
                  <Label>Modèle</Label>
                  <Input {...register("modele")} placeholder="EliteBook 840 G7" />
                </div>
              </div>
              <div>
                <Label>N° de série</Label>
                <Input {...register("serialNumber")} placeholder="Numéro de série optionnel" />
              </div>
            </div>

            {/* Diagnostic */}
            <div className="space-y-3">
              <div>
                <Label>Problème décrit par le client *</Label>
                <Textarea {...register("problemeDecrit", { required: true })} placeholder="Description du problème..." rows={2} />
              </div>
              <div>
                <Label>Diagnostic technique</Label>
                <Textarea {...register("diagnostic")} placeholder="Résultat du diagnostic..." rows={2} />
              </div>
              <div>
                <Label>Solution / Travaux effectués</Label>
                <Textarea {...register("solution")} placeholder="Description des travaux effectués..." rows={2} />
              </div>
            </div>

            {/* Status & Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Statut *</Label>
                <select {...register("status", { required: true })} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background">
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Priorité *</Label>
                <select {...register("priorite", { required: true })} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background">
                  {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>

            {/* Technicien & Coûts */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Technicien</Label>
                <Input {...register("technicien")} placeholder="Prénom" />
              </div>
              <div>
                <Label>Coût estimé (DT)</Label>
                <Input type="number" step="0.001" min="0" {...register("coutEstime")} />
              </div>
              <div>
                <Label>Coût final (DT)</Label>
                <Input type="number" step="0.001" min="0" {...register("coutFinal")} />
              </div>
            </div>

            <div>
              <Label>Notes internes</Label>
              <Textarea {...register("notes")} placeholder="Notes internes..." rows={2} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setOpenDialog(false); setEditItem(null); reset({ status: "reçu", priorite: "normale" }); }}>
                Annuler
              </Button>
              <Button type="submit">
                {editItem ? "Enregistrer" : "Créer le ticket"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

