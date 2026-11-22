import { useState, useMemo, useEffect } from "react";
import {
  Bell, PlusCircle, RefreshCw, Phone, Trash2, Check,
  Clock, AlertCircle, BellOff, Calendar, User, Wrench
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
import { reminderStorage, repairStorage, clientStorage } from "@/lib/storage";
import { formatDate, cn } from "@/lib/utils";
import type { Reminder, ReminderRepeat } from "@/types";

const REPEAT_LABELS: Record<ReminderRepeat, string> = {
  aucune: "Une seule fois",
  quotidien: "Quotidien",
  hebdomadaire: "Hebdomadaire",
};

const EMPTY_FORM = {
  clientNom: "",
  clientTel: "",
  repairId: "",
  message: "",
  dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  repeat: "aucune" as ReminderRepeat,
  notes: "",
};

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>(() => reminderStorage.getAll());
  const [repairs] = useState(() => repairStorage.getAll());
  const [clients] = useState(() => clientStorage.getAll());
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterStatus, setFilterStatus] = useState<"actif" | "tous" | "effectué">("actif");

  const refresh = () => setReminders(reminderStorage.getAll());

  // ——— Reminders dus (overdue) check ———
  useEffect(() => {
    const due = reminderStorage.getDue();
    due.forEach(r => {
      toast.warning(`📞 Rappel : ${r.message}`, {
        description: `${r.clientNom} · ${r.clientTel}`,
        duration: 8000,
      });
    });
  }, []);

  const filtered = useMemo(() => {
    let list = [...reminders];
    if (filterStatus !== "tous") list = list.filter(r => r.status === filterStatus);
    return list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [reminders, filterStatus]);

  const counts = useMemo(() => ({
    actif: reminders.filter(r => r.status === "actif").length,
    effectué: reminders.filter(r => r.status === "effectué").length,
    overdue: reminders.filter(r => r.status === "actif" && new Date(r.dueDate) < new Date()).length,
  }), [reminders]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientNom.trim()) return toast.error("Nom du client requis");
    if (!form.message.trim()) return toast.error("Message requis");
    if (!form.dueDate) return toast.error("Date requise");

    reminderStorage.add({
      clientNom: form.clientNom.trim(),
      clientTel: form.clientTel.trim(),
      repairId: form.repairId || undefined,
      message: form.message.trim(),
      dueDate: new Date(form.dueDate).toISOString(),
      repeat: form.repeat,
      status: "actif",
      notes: form.notes.trim() || undefined,
    });
    toast.success("Rappel créé !");
    setShowDialog(false);
    setForm(EMPTY_FORM);
    refresh();
  };

  const handleMarkDone = (id: string) => {
    reminderStorage.update(id, { status: "effectué", dateEffectue: new Date().toISOString() });
    toast.success("Rappel marqué comme effectué");
    refresh();
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Supprimer ce rappel ?")) return;
    reminderStorage.delete(id);
    toast.success("Rappel supprimé");
    refresh();
  };

  const isOverdue = (r: Reminder) => r.status === "actif" && new Date(r.dueDate) < new Date();
  const isDueSoon = (r: Reminder) => {
    const diff = new Date(r.dueDate).getTime() - Date.now();
    return r.status === "actif" && diff > 0 && diff < 2 * 60 * 60 * 1000; // within 2h
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5 text-foreground">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <Bell className="w-6 h-6" />
            </span>
            Rappels & Notifications
            {counts.overdue > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold">
                {counts.overdue}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Rappels pour appels clients, notifications de retrait et suivi des réparations
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowDialog(true)} className="gap-2 bg-amber-600 hover:bg-amber-700">
            <PlusCircle className="w-4 h-4" /> Nouveau Rappel
          </Button>
          <Button variant="outline" size="icon" onClick={refresh} className="h-10 w-10">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border-2 border-amber-200 dark:border-amber-900/60 rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-extrabold text-amber-600">{counts.actif}</p>
          <p className="text-xs text-muted-foreground mt-1">Actifs</p>
        </div>
        <div className={cn(
          "bg-card border-2 rounded-xl p-4 shadow-sm text-center",
          counts.overdue > 0 ? "border-red-300 dark:border-red-800" : "border-border"
        )}>
          <p className={cn("text-2xl font-extrabold", counts.overdue > 0 ? "text-red-600" : "text-foreground")}>
            {counts.overdue}
          </p>
          <p className="text-xs text-muted-foreground mt-1">En retard</p>
        </div>
        <div className="bg-card border-2 border-border rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-extrabold text-emerald-600">{counts.effectué}</p>
          <p className="text-xs text-muted-foreground mt-1">Effectués</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-muted/60 p-1 rounded-lg text-sm w-fit">
        {(["actif", "tous", "effectué"] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={cn(
              "px-3 py-1.5 rounded font-medium transition-colors",
              filterStatus === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {s === "actif" ? "Actifs" : s === "tous" ? "Tous" : "Effectués"}
          </button>
        ))}
      </div>

      {/* Reminders list */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-border rounded-xl">
          <BellOff className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium text-muted-foreground">Aucun rappel trouvé</p>
          <Button className="mt-3 gap-2 bg-amber-600 hover:bg-amber-700" size="sm" onClick={() => setShowDialog(true)}>
            <PlusCircle className="w-4 h-4" /> Créer un rappel
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div
              key={r.id}
              className={cn(
                "p-4 rounded-xl border-2 transition-all shadow-sm",
                isOverdue(r) ? "border-red-300 bg-red-50/40 dark:bg-red-950/20 dark:border-red-800" :
                isDueSoon(r) ? "border-amber-300 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-800" :
                r.status === "effectué" ? "border-border opacity-60 bg-card" : "border-border bg-card"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                    isOverdue(r) ? "bg-red-100 dark:bg-red-900/40 text-red-600" :
                    r.status === "effectué" ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600" :
                    "bg-amber-100 dark:bg-amber-900/40 text-amber-600"
                  )}>
                    {r.status === "effectué" ? <Check className="w-5 h-5" /> :
                     isOverdue(r) ? <AlertCircle className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {isOverdue(r) && (
                        <span className="text-[11px] font-bold bg-red-600 text-white px-2 py-0.5 rounded-full">
                          EN RETARD
                        </span>
                      )}
                      {isDueSoon(r) && (
                        <span className="text-[11px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">
                          BIENTÔT
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground capitalize px-2 py-0.5 rounded-full border border-border">
                        {REPEAT_LABELS[r.repeat]}
                      </span>
                    </div>

                    <p className="font-semibold text-foreground text-sm">{r.message}</p>

                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />{r.clientNom}
                      </span>
                      {r.clientTel && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />{r.clientTel}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(r.dueDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {r.repairId && (
                        <span className="flex items-center gap-1">
                          <Wrench className="w-3.5 h-3.5" />Ticket lié
                        </span>
                      )}
                    </div>

                    {r.notes && (
                      <p className="mt-1.5 text-xs text-muted-foreground italic">{r.notes}</p>
                    )}

                    {r.status === "effectué" && r.dateEffectue && (
                      <p className="mt-1 text-[11px] text-emerald-600 font-medium">
                        ✓ Effectué le {formatDate(r.dateEffectue)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-1 flex-shrink-0">
                  {r.status === "actif" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 gap-1"
                      onClick={() => handleMarkDone(r.id)}
                    >
                      <Check className="w-3.5 h-3.5" /> Effectué
                    </Button>
                  )}
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="p-2 rounded text-muted-foreground hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog: Nouveau rappel */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-600" /> Nouveau Rappel
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client *</Label>
                <Input
                  placeholder="Nom du client"
                  value={form.clientNom}
                  onChange={e => setForm(f => ({ ...f, clientNom: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input
                  placeholder="2X XXX XXX / 9X XXX XXX"
                  value={form.clientTel}
                  onChange={e => setForm(f => ({ ...f, clientTel: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Ticket SAV lié (optionnel)</Label>
              <Select value={form.repairId || "none"} onValueChange={v => {
                if (v === "none") {
                  setForm(f => ({ ...f, repairId: "" }));
                  return;
                }
                const r = repairs.find(x => x.id === v);
                if (r) setForm(f => ({ ...f, repairId: v, clientNom: r.clientNom, clientTel: r.clientTel }));
                else setForm(f => ({ ...f, repairId: v }));
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un ticket..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun ticket lié</SelectItem>
                  {repairs.filter(r => !["livré", "annulé"].includes(r.status)).map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.numeroTicket} · {r.clientNom} · {r.appareil}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Message / Action *</Label>
              <Textarea
                placeholder="Rappeler le client pour retrait, vérifier pièce disponible..."
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                rows={2}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date & Heure *</Label>
                <Input
                  type="datetime-local"
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Répétition</Label>
                <Select value={form.repeat} onValueChange={(v: ReminderRepeat) => setForm(f => ({ ...f, repeat: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(REPEAT_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Notes (optionnel)</Label>
              <Input
                placeholder="Infos complémentaires..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Annuler</Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700">Créer le Rappel</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
