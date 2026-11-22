import { useState, useMemo } from "react";
import {
  Users, Plus, Search, Edit2, Trash2, Phone, Mail, MapPin,
  Building2, UserCheck, ShoppingBag, FileSpreadsheet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { clientStorage } from "@/lib/storage";
import { exportClientsToExcel } from "@/lib/excel";
import { formatPrice, formatDate, cn } from "@/lib/utils";
import type { Client } from "@/types";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

type ClientFormData = {
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  adresse: string;
  ville: string;
  type: "particulier" | "entreprise";
  entreprise: string;
  notes: string;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>(() => clientStorage.getAll());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [openDialog, setOpenDialog] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);

  const { register, handleSubmit, reset, setValue, watch } = useForm<ClientFormData>({
    defaultValues: { type: "particulier" }
  });

  const selectedType = watch("type");

  const refresh = () => setClients(clientStorage.getAll());

  const filtered = useMemo(() => {
    return clients
      .filter(c => {
        const q = search.toLowerCase();
        return (
          c.nom.toLowerCase().includes(q) ||
          (c.prenom && c.prenom.toLowerCase().includes(q)) ||
          c.telephone.includes(q) ||
          (c.entreprise && c.entreprise.toLowerCase().includes(q)) ||
          c.code.toLowerCase().includes(q)
        );
      })
      .filter(c => typeFilter === "all" || c.type === typeFilter)
      .sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime());
  }, [clients, search, typeFilter]);

  const openAdd = () => {
    setEditClient(null);
    reset({ type: "particulier" });
    setOpenDialog(true);
  };

  const openEdit = (client: Client) => {
    setEditClient(client);
    Object.entries(client).forEach(([k, v]) => setValue(k as any, v));
    setOpenDialog(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce client ?")) return;
    clientStorage.delete(id);
    refresh();
    toast.success("Client supprimé");
  };

  const onSubmit = (data: ClientFormData) => {
    if (editClient) {
      clientStorage.update(editClient.id, data);
      toast.success("Client mis à jour");
    } else {
      clientStorage.add(data);
      toast.success("Client créé avec succès");
    }
    setOpenDialog(false);
    setEditClient(null);
    reset();
    refresh();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> Gestion des Clients
          </h1>
          <p className="page-subtitle">Particuliers & Entreprises clientes pour la vente et le SAV</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportClientsToExcel} className="gap-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-700">
            <FileSpreadsheet className="w-4 h-4" /> Exporter Excel
          </Button>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="w-4 h-4" /> Nouveau client
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-foreground">{clients.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total clients</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-blue-600">
            {clients.filter(c => c.type === "particulier").length}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Particuliers</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-purple-600">
            {clients.filter(c => c.type === "entreprise").length}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Entreprises</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher nom, prénom, téléphone, entreprise..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="border border-input rounded-md px-3 py-2 text-sm bg-background w-44"
        >
          <option value="all">Tous les types</option>
          <option value="particulier">Particuliers</option>
          <option value="entreprise">Entreprises</option>
        </select>
      </div>

      {/* Clients Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Aucun client trouvé</p>
          </div>
        ) : (
          filtered.map(client => (
            <div key={client.id} className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      {client.code}
                    </span>
                    <span className={cn(
                      "badge-status text-xs",
                      client.type === "entreprise" ? "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400" : "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400"
                    )}>
                      {client.type === "entreprise" ? "Entreprise" : "Particulier"}
                    </span>
                  </div>
                </div>

                <h3 className="font-bold text-base text-foreground">
                  {client.nom} {client.prenom || ""}
                </h3>
                {client.entreprise && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3.5 h-3.5" /> {client.entreprise}
                  </p>
                )}

                <div className="mt-3 space-y-1.5 text-xs text-muted-foreground border-t border-border/50 pt-2.5">
                  <p className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-primary" /> {client.telephone}
                  </p>
                  {client.email && (
                    <p className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-primary" /> {client.email}
                    </p>
                  )}
                  {client.ville && (
                    <p className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-primary" /> {client.ville} {client.adresse ? `(${client.adresse})` : ""}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Cumul achats:</span>
                  <span className="font-bold text-sm text-foreground">{formatPrice(client.totalAchats || 0)}</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(client)}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(client.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={openDialog} onOpenChange={o => { setOpenDialog(o); if (!o) { setEditClient(null); reset(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editClient ? "Modifier le client" : "Nouveau client"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Type de client *</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {(["particulier", "entreprise"] as const).map(t => (
                  <label key={t} className="flex items-center gap-2 border p-2 rounded-md cursor-pointer text-sm">
                    <input type="radio" value={t} {...register("type")} />
                    <span className="capitalize">{t}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nom / Raison Sociale *</Label>
                <Input {...register("nom", { required: true })} placeholder="Nom" />
              </div>
              <div>
                <Label>Prénom</Label>
                <Input {...register("prenom")} placeholder="Prénom" />
              </div>
            </div>

            {selectedType === "entreprise" && (
              <div>
                <Label>Nom de la Société / Entreprise</Label>
                <Input {...register("entreprise")} placeholder="ex: SARL Informatique Plus" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Téléphone *</Label>
                <Input {...register("telephone", { required: true })} placeholder="2X XXX XXX" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" {...register("email")} placeholder="client@exemple.tn" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ville</Label>
                <Input {...register("ville")} placeholder="ex: Tunis, Sousse, Sfax..." />
              </div>
              <div>
                <Label>Adresse</Label>
                <Input {...register("adresse")} placeholder="Adresse..." />
              </div>
            </div>

            <div>
              <Label>Remarques</Label>
              <Textarea {...register("notes")} placeholder="Informations complémentaires..." rows={2} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setOpenDialog(false); setEditClient(null); reset(); }}>
                Annuler
              </Button>
              <Button type="submit">{editClient ? "Mettre à jour" : "Créer le client"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

