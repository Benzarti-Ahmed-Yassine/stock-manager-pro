import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { store } from '@/lib/store';
import { Client, Product, ClientSheet, ClientSheetItem, DeliveryNote } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Search, FileText, FileSignature, Edit, SearchCheck } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { useReactToPrint } from 'react-to-print';
import { useRef } from 'react';
import { PrintableClientSheet } from '@/components/PrintableClientSheet';
import { Printer } from 'lucide-react';

export default function ClientSheets() {
  const [sheets, setSheets] = useState<ClientSheet[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [notes, setNotes] = useState<DeliveryNote[]>([]);

  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Creation state
  const [isCreating, setIsCreating] = useState(false);
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);

  const [sheetName, setSheetName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [items, setItems] = useState<Partial<ClientSheetItem>[]>([]);

  // Printing state
  const [printingSheetId, setPrintingSheetId] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Fiche_Materiel_${printingSheetId}`,
  });

  const triggerPrint = (id: string) => {
    setPrintingSheetId(id);
    // Give state a moment to update before triggering
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  useEffect(() => {
    setSheets(store.getClientSheets() || []);
    setClients(store.getClients());
    setProducts(store.getProducts());
    setNotes(store.getDeliveryNotes());
  }, []);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsCreating(true);
      const clientId = searchParams.get('client');
      if (clientId) {
        setSelectedClientId(clientId);
      }
      setSearchParams(new URLSearchParams());
    }
  }, [searchParams, setSearchParams]);

  const topLevelClients = clients.filter(c => c.category !== 'comptoir');

  const filteredSheets = sheets.filter(s => {
    const c = clients.find(cl => cl.id === s.clientId);
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      (c && c.name.toLowerCase().includes(search.toLowerCase()));
    return matchSearch;
  });

  const addItemRow = () => {
    setItems([...items, { id: crypto.randomUUID(), productId: '', productName: '', quantity: 1 }]);
  };

  const updateItem = (index: number, changes: Partial<ClientSheetItem>) => {
    const newItems = [...items];
    if (changes.productId) {
      const p = products.find(prod => prod.id === changes.productId);
      if (p) {
        changes.productName = p.name;
      }
    }
    newItems[index] = { ...newItems[index], ...changes };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!selectedClientId) { toast.error('Sélectionnez un client'); return; }
    if (!sheetName) { toast.error('Nom de la fiche requis'); return; }
    if (items.length === 0 || items.some(i => !i.productId)) { toast.error('Veuillez ajouter des produits valides'); return; }

    let id: string = crypto.randomUUID();
    let date = new Date().toISOString();

    if (editingSheetId) {
      const existing = sheets.find(s => s.id === editingSheetId);
      if (existing) {
        id = existing.id;
        date = existing.date;
      }
    }

    const newSheet: ClientSheet = {
      id,
      clientId: selectedClientId,
      name: sheetName,
      date,
      items: items as ClientSheetItem[],
    };

    if (editingSheetId) {
      store.updateClientSheet(newSheet);
      toast.success('Fiche modifiée avec succès');
    } else {
      store.addClientSheet(newSheet);
      toast.success('Fiche créée avec succès');
    }

    setSheets(store.getClientSheets());
    setIsCreating(false);
    setEditingSheetId(null);
    setItems([]);
    setSelectedClientId('');
    setSheetName('');
  };

  const openNew = () => {
    setEditingSheetId(null);
    setSelectedClientId('');
    setSheetName('');
    setItems([]);
    setIsCreating(true);
  };

  const handleEdit = (s: ClientSheet) => {
    setEditingSheetId(s.id);
    setSelectedClientId(s.clientId);
    setSheetName(s.name);
    setItems([...s.items]);
    setIsCreating(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer cette fiche ? Les BL liés perdront leur dépendance.')) {
      store.deleteClientSheet(id);
      setSheets(store.getClientSheets());
      toast.success('Fiche supprimée');
    }
  };

  // Helper to compute delivered quantity
  const getDeliveredQty = (sheetId: string, productId: string) => {
    const linkedNotes = notes.filter(n => n.clientSheetId === sheetId);
    let qty = 0;
    linkedNotes.forEach(n => {
      n.items.forEach(item => {
        if (item.productId === productId) {
          qty += item.quantity;
        }
      });
    });
    return qty;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <FileSignature className="h-6 w-6 text-accent" />
            Fiches Matériel
          </h1>
          <p className="text-muted-foreground mt-1">{sheets.length} fiches enregistrées</p>
        </div>

        <Dialog open={isCreating} onOpenChange={val => {
          setIsCreating(val);
          if (!val) setEditingSheetId(null);
        }}>
          <DialogTrigger asChild>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" /> Nouvelle Fiche
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSheetId ? 'Modifier la Fiche Matériel' : 'Créer une Fiche Matériel'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-4">

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Client (Entreprise ou Nommé) *</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez..." />
                    </SelectTrigger>
                    <SelectContent>
                      {topLevelClients.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.company ? `${c.name} - ${c.company}` : c.name} {c.parentId ? '(Sous-client)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nom de la Fiche (ex: Chantier X) *</Label>
                  <Input value={sheetName} onChange={e => setSheetName(e.target.value)} placeholder="Nom du projet..." />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Articles prévus</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItemRow}>
                    <Plus className="h-4 w-4 mr-2" /> Ajouter Ligne
                  </Button>
                </div>

                {items.length === 0 ? (
                  <div className="text-center p-6 border-2 border-dashed rounded-lg text-muted-foreground">
                    Aucun article. Cliquez sur "Ajouter Ligne".
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div key={item.id} className="flex items-end gap-3 bg-muted/40 p-3 rounded-lg border border-border/50">
                        <div className="flex-1 space-y-2">
                          <Label className="text-xs text-muted-foreground">Produit</Label>
                          <Select value={item.productId} onValueChange={v => updateItem(index, { productId: v })}>
                            <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                            <SelectContent>
                              {products.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} ({p.reference})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="w-24 space-y-2">
                          <Label className="text-xs text-muted-foreground">Quantité Prévue</Label>
                          <Input type="number" min="1" value={item.quantity || 1} onChange={e => updateItem(index, { quantity: Number(e.target.value) })} />
                        </div>

                        <Button type="button" variant="destructive" size="icon" onClick={() => removeItem(index)} className="mb-px">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSave}>
                {editingSheetId ? 'Sauvegarder les modifications' : 'Enregistrer la fiche'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher par nom de fiche ou client..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredSheets.length === 0 ? (
          <div className="col-span-full text-center p-12 glass-card">
            <FileSignature className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">Aucune fiche matériel trouvée</p>
          </div>
        ) : (
          filteredSheets.map(s => {
            const c = clients.find(cl => cl.id === s.clientId);
            // Compute overall progress?
            let totalItems = 0;
            let totalDelivered = 0;
            s.items.forEach(i => {
              totalItems += i.quantity;
              totalDelivered += Math.min(getDeliveredQty(s.id, i.productId), i.quantity);
            });
            const progress = totalItems === 0 ? 0 : Math.round((totalDelivered / totalItems) * 100);

            return (
              <Card key={s.id} className="glass-card overflow-hidden">
                <CardHeader className="bg-muted/30 pb-4 border-b border-border/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl font-bold flex items-center gap-2">
                        {s.name}
                        {progress === 100 && <SearchCheck className="text-success h-5 w-5" />}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Client: {c?.name || 'Inconnu'} · Créé le {format(new Date(s.date), "dd/MM/yyyy", { locale: fr })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-8 shadow-sm" onClick={() => navigate(`/bons-livraison?new=true&client=${s.clientId}&sheet=${s.id}`)}>
                        <FileText className="h-3 w-3 mr-1" /> Créer BL
                      </Button>
                      <Button size="icon" variant="ghost" title="Imprimer la fiche complète" onClick={() => triggerPrint(s.id)}>
                        <Printer className="h-4 w-4 text-accent" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(s)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(s.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold">Progression globale</span>
                      <span className="font-bold text-accent">{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-accent transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>

                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Matériel Prévu</h4>
                  <div className="space-y-2">
                    {s.items.map(item => {
                      const delivered = getDeliveredQty(s.id, item.productId);
                      const remaining = Math.max(0, item.quantity - delivered);
                      return (
                        <div key={item.id} className="flex items-center justify-between bg-muted/20 p-2 rounded text-sm">
                          <span className="font-medium truncate max-w-[150px]">{item.productName}</span>
                          <div className="flex text-xs gap-4 text-center">
                            <div><span className="block text-muted-foreground">Prévu</span><span className="font-bold">{item.quantity}</span></div>
                            <div><span className="block text-success/80">Livré</span><span className="font-bold text-success">{delivered}</span></div>
                            <div><span className="block text-accent/80">Reste</span><span className="font-bold text-accent">{remaining}</span></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Hidden Printable Component */}
      <div className="hidden">
        {printingSheetId && (
          <PrintableClientSheet 
            ref={printRef}
            sheet={sheets.find(s => s.id === printingSheetId)!}
            client={clients.find(c => c.id === sheets.find(s => s.id === printingSheetId)?.clientId)!}
            notes={notes.filter(n => n.clientSheetId === printingSheetId)}
          />
        )}
      </div>
    </div>
  );
}
