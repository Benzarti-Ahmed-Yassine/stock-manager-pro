import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { store } from '@/lib/store';
import { Client, ClientCategory, CLIENT_CATEGORY_LABELS } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Edit, Trash2, Users, Building2, User, ShoppingBag, CornerDownRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const emptyClient = (parentId?: string): Client => ({
  id: crypto.randomUUID(),
  category: parentId ? 'client_nomme' : 'comptoir', // Default for new, but parentId dictates sub-client
  name: '',
  phone: '',
  email: '',
  address: '',
  company: '',
  matriculeFiscal: '',
  parentId,
  createdAt: new Date().toISOString(),
});

const categoryIcons: Record<ClientCategory, React.ReactNode> = {
  comptoir: <ShoppingBag className="h-4 w-4" />,
  client_nomme: <User className="h-4 w-4" />,
  entreprise: <Building2 className="h-4 w-4" />,
};

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<Client>(emptyClient());
  const [createSheet, setCreateSheet] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { setClients(store.getClients()); }, []);

  const topLevelClients = clients.filter(c => !c.parentId);

  const filtered = topLevelClients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.company && c.company.toLowerCase().includes(search.toLowerCase()));
    const matchTab = tab === 'all' || c.category === tab;
    return matchSearch && matchTab;
  });

  const handleSave = () => {
    const finalForm = { ...form };
    if (finalForm.category !== 'comptoir' && !finalForm.name) { toast.error('Nom requis'); return; }
    if (finalForm.category === 'comptoir' && !finalForm.name) {
      finalForm.name = 'Client Comptoir';
    }
    
    let isNewComptoir = false;

    if (editing) {
      store.updateClient(finalForm);
      toast.success(finalForm.parentId ? 'Sous-client modifié' : 'Client modifié');
    } else {
      store.addClient(finalForm);
      toast.success(finalForm.parentId ? 'Sous-client ajouté' : 'Client ajouté');
      if (finalForm.category === 'comptoir' && !finalForm.parentId) {
        isNewComptoir = true;
      }
    }
    
    setClients(store.getClients());
    setDialogOpen(false);
    setEditing(null);

    if (isNewComptoir) {
      navigate(`/bons-livraison?new=true&client=${finalForm.id}`);
    } else if (createSheet) {
      navigate(`/fiches-materiel?new=true&client=${finalForm.id}`);
    }
    
    setForm(emptyClient());
    setCreateSheet(false);
  };

  const handleEdit = (c: Client) => {
    setEditing(c);
    setForm({ ...c });
    setDialogOpen(true);
  };

  const handleDelete = (id: string, isParent: boolean) => {
    if (isParent) {
      // Also delete sub-clients
      const subClients = clients.filter(c => c.parentId === id);
      subClients.forEach(sub => store.deleteClient(sub.id));
    }
    store.deleteClient(id);
    setClients(store.getClients());
    toast.success('Supprimé avec succès');
  };

  const openNew = (parentId?: string) => {
    setEditing(null);
    setForm(emptyClient(parentId));
    setCreateSheet(false);
    setDialogOpen(true);
  };

  const counts = {
    all: topLevelClients.length,
    comptoir: topLevelClients.filter(c => c.category === 'comptoir').length,
    client_nomme: topLevelClients.filter(c => c.category === 'client_nomme').length,
    entreprise: topLevelClients.filter(c => c.category === 'entreprise').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Clients</h1>
          <p className="text-muted-foreground mt-1">{topLevelClients.length} clients principaux</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openNew()} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4 mr-2" /> Nouveau Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editing ? 'Modifier' : 'Ajouter'} {form.parentId ? 'un sous-client' : 'un client'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {!form.parentId && (
                <div>
                  <Label>Catégorie</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v as ClientCategory })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CLIENT_CATEGORY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {form.parentId && (
                 <div className="bg-muted p-2 rounded-md text-sm border-l-2 border-accent">
                   Création d'un sous-client attaché.
                 </div>
              )}

              <div>
                <Label>Nom {form.category !== 'comptoir' && '*'}</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={form.category === 'comptoir' ? "Client Comptoir (Optionnel)" : (form.parentId ? "Nom du sous-client" : "Nom du client")} />
              </div>
              
              {!form.parentId && form.category === 'entreprise' && (
                <div>
                  <Label>Nom de l'entreprise</Label>
                  <Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="SARL, EURL..." />
                </div>
              )}

              {form.category !== 'comptoir' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Téléphone</Label>
                      <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="0555..." />
                    </div>
                    <div>
                      <Label>Matricule Fiscal</Label>
                      <Input value={form.matriculeFiscal || ''} onChange={e => setForm({ ...form, matriculeFiscal: e.target.value })} placeholder="12345/A/M/000" />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Email</Label>
                    <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@exemple.com" />
                  </div>
                  
                  <div>
                    <Label>Adresse</Label>
                    <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Adresse complète" />
                  </div>
                </>
              )}
              
              {form.category !== 'comptoir' && !editing && (
                <div className="flex items-center space-x-2 pt-2">
                  <input 
                     type="checkbox" 
                     id="createSheet" 
                     className="rounded border-gray-300 text-accent focus:ring-accent"
                     checked={createSheet}
                     onChange={(e) => setCreateSheet(e.target.checked)}
                  />
                  <Label htmlFor="createSheet" className="cursor-pointer font-medium text-accent">Préparer une fiche matériel (Chantier) pour ce client</Label>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleSave} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {editing ? 'Modifier' : 'Ajouter'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">Tous ({counts.all})</TabsTrigger>
          <TabsTrigger value="comptoir">Comptoir ({counts.comptoir})</TabsTrigger>
          <TabsTrigger value="client_nomme">Nommés ({counts.client_nomme})</TabsTrigger>
          <TabsTrigger value="entreprise">Entreprises ({counts.entreprise})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-10" placeholder="Rechercher un client..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid gap-4">
        {filtered.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mb-4 opacity-40" />
              <p>Aucun client trouvé</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((c, i) => {
            const subClients = clients.filter(sub => sub.parentId === c.id);
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="glass-card hover:shadow-md transition-shadow">
                  <CardContent className="flex flex-col py-4 px-6 gap-3">
                    
                    {/* Parent Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                          {categoryIcons[c.category]}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{c.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {CLIENT_CATEGORY_LABELS[c.category]}
                            {c.company && ` · ${c.company}`}
                            {c.phone && ` · ${c.phone}`}
                            {c.matriculeFiscal && ` · MF: ${c.matriculeFiscal}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        {c.category !== 'comptoir' && (
                          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openNew(c.id)}>
                            <Plus className="h-3 w-3 mr-1" /> Sous-client
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(c)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(c.id, true)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Sub-clients List */}
                    {subClients.length > 0 && (
                      <div className="ml-12 pl-4 border-l-2 border-accent/20 space-y-2 mt-2">
                        {subClients.map(sub => (
                          <div key={sub.id} className="flex justify-between items-center py-2 bg-muted/40 px-3 rounded-md">
                            <div className="flex items-center gap-2">
                              <CornerDownRight className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <span className="text-sm font-medium">{sub.name}</span>
                                {sub.phone && <span className="text-xs text-muted-foreground ml-2">({sub.phone})</span>}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(sub)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(sub.id, false)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
