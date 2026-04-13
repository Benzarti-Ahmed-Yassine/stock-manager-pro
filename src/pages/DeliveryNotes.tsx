import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { store } from '@/lib/store';
import { Client, Product, DeliveryNote, DeliveryNoteItem, ClientSheet } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Printer, Plus, Trash2, Search, FileText, Edit, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useReactToPrint } from 'react-to-print';
import { PrintableDeliveryNote } from '@/components/PrintableDeliveryNote';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function DeliveryNotes() {
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clientSheets, setClientSheets] = useState<ClientSheet[]>([]);
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Creation / Edition state
  const [isCreating, setIsCreating] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedSheetId, setSelectedSheetId] = useState<string>('');
  const [items, setItems] = useState<Partial<DeliveryNoteItem>[]>([]);
  const [stampVal, setStampVal] = useState(1.000); // 1 DT
  const [globalDiscount, setGlobalDiscount] = useState(0); // Optional global discount?

  // Payment state
  const [isPaid, setIsPaid] = useState(false);
  const [acompte, setAcompte] = useState<number>(0);

  // Printing state
  const printRef = useRef<HTMLDivElement>(null);
  const [printingNote, setPrintingNote] = useState<{ note: DeliveryNote, client: Client } | null>(null);

  useEffect(() => {
    setDeliveryNotes(store.getDeliveryNotes() || []);
    setClients(store.getClients());
    setProducts(store.getProducts());
    setClientSheets(store.getClientSheets() || []);
  }, []);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsCreating(true);
      const clientId = searchParams.get('client');
      const sheetId = searchParams.get('sheet');
      if (clientId) {
        setSelectedClientId(clientId);
      }
      // Defer sheet selection so that clientId is set first
      if (sheetId) {
        setTimeout(() => handleSheetChange(sheetId), 50);
      }
      setSearchParams(new URLSearchParams());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearchParams]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: printingNote ? `BL_${printingNote.note.noteNumber}` : 'Document',
    onAfterPrint: () => setPrintingNote(null),
  });

  const doPrint = (note: DeliveryNote) => {
    const client = clients.find(c => c.id === note.clientId);
    if (!client) return;
    setPrintingNote({ note, client });
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  const addItemRow = () => {
    setItems([...items, { id: crypto.randomUUID(), quantity: 1, vat: 19, discount: 0 }]);
  };

  const updateItem = (index: number, changes: Partial<DeliveryNoteItem>) => {
    const newItems = [...items];
    const item = { ...newItems[index], ...changes };
    if (changes.productId) {
      const prod = products.find(p => p.id === changes.productId);
      if (prod) {
        item.productName = prod.name;
        item.unitPrice = prod.price;
      }
    }
    // Calculate row total
    if (item.quantity && item.unitPrice !== undefined) {
      const totalHTBrut = item.quantity * item.unitPrice;
      const discount = item.discount || 0;
      const totalHT = totalHTBrut * (1 - discount / 100);
      const vat = item.vat || 19;
      const totalTTC = totalHT * (1 + vat / 100);
      item.totalHT = totalHT;
      item.totalTTC = totalTTC;
    }
    newItems[index] = item;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    let subTotalHT = 0;
    let totalDiscount = 0;
    let totalVat = 0;
    let totalTTC = 0;

    items.forEach(item => {
      // Re-calculate accurately
      const qty = item.quantity || 0;
      const price = item.unitPrice || 0;
      const disc = item.discount || 0;
      const vat = item.vat || 19;

      const brutHT = qty * price;
      const discAmt = brutHT * (disc / 100);
      const netHT = brutHT - discAmt;
      const vatAmt = netHT * (vat / 100);
      const ttc = netHT + vatAmt;

      subTotalHT += netHT;
      totalDiscount += discAmt;
      totalVat += vatAmt;
      totalTTC += ttc;
    });

    totalTTC += stampVal;
    
    return { subTotalHT, totalDiscount, totalVat, stampVal, totalTTC };
  };
  const getDeliveredQty = (sheetId: string, productId: string) => {
    const linkedNotes = deliveryNotes.filter(n => n.clientSheetId === sheetId && n.id !== editingNoteId);
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

  const handleSheetChange = (sheetId: string) => {
    if (sheetId === "none") {
      setSelectedSheetId('');
      setItems([]);
      return;
    }
    setSelectedSheetId(sheetId);
    if (!sheetId) {
      setItems([]);
      return;
    }
    const sheet = clientSheets.find(s => s.id === sheetId);
    if (!sheet) return;

    const newItems = sheet.items.map(i => {
      const delivered = getDeliveredQty(sheetId, i.productId);
      const remaining = Math.max(0, i.quantity - delivered);
      if (remaining > 0) {
        return {
          id: crypto.randomUUID(),
          productId: i.productId,
          productName: i.productName,
          quantity: remaining,
        };
      }
      return null;
    }).filter(Boolean) as Partial<DeliveryNoteItem>[];

    setItems(newItems);
  };

  const handleSave = () => {
    if (!selectedClientId) { toast.error('Sélectionnez un client'); return; }
    if (items.length === 0 || items.some(i => !i.productId)) { toast.error('Veuillez ajouter des produits valides'); return; }

    const totals = calculateTotals();
    
    let noteNumber = `${new Date().getFullYear()}00${Math.floor(Math.random()*10000)}`;
    let id: string = crypto.randomUUID();
    let date = new Date().toISOString();

    if (editingNoteId) {
      const existing = deliveryNotes.find(n => n.id === editingNoteId);
      if (existing) {
        id = existing.id;
        noteNumber = existing.noteNumber;
        date = existing.date; // Keep original date
      }
    }

    const computedReste = isPaid ? 0 : Math.max(0, totals.totalTTC - acompte);

    const newNote: DeliveryNote = {
      id,
      noteNumber,
      clientId: selectedClientId,
      clientSheetId: selectedSheetId || undefined,
      date,
      items: items as DeliveryNoteItem[],
      subTotalHT: totals.subTotalHT,
      totalDiscount: totals.totalDiscount,
      totalVat: totals.totalVat,
      stamp: totals.stampVal,
      totalTTC: totals.totalTTC,
      paid: isPaid || acompte >= totals.totalTTC,
      acompte: acompte > 0 ? acompte : undefined,
      resteAPayer: computedReste > 0 ? computedReste : undefined,
    };

    if (editingNoteId) {
      store.updateDeliveryNote(newNote);
      toast.success('Bon de Livraison modifié avec succès');
    } else {
      store.addDeliveryNote(newNote);
      toast.success('Bon de Livraison créé avec succès');
    }

    setDeliveryNotes(store.getDeliveryNotes());
    setIsCreating(false);
    setEditingNoteId(null);
    setItems([]);
    setSelectedClientId('');
    setSelectedSheetId('');
    setIsPaid(false);
    setAcompte(0);
  };

  const handleEdit = (note: DeliveryNote) => {
    setEditingNoteId(note.id);
    setSelectedClientId(note.clientId);
    setSelectedSheetId(note.clientSheetId || '');
    setItems([...note.items]);
    setStampVal(note.stamp || 1.000);
    setIsPaid(note.paid || false);
    setAcompte(note.acompte || 0);
    setIsCreating(true);
  };
  
  const openNew = () => {
    setEditingNoteId(null);
    setSelectedClientId('');
    setSelectedSheetId('');
    setItems([]);
    setStampVal(1.000);
    setIsPaid(false);
    setAcompte(0);
    setIsCreating(true);
  };

  const totals = calculateTotals();
  const filteredNotes = deliveryNotes.filter(n => n.noteNumber.includes(search));

  return (
    <div className="space-y-6">
      {/* Hidden Print Wrapper */}
      <div className="hidden">
        {printingNote && <PrintableDeliveryNote ref={printRef} deliveryNote={printingNote.note} client={printingNote.client} />}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Bons de Livraison</h1>
          <p className="text-muted-foreground mt-1">{deliveryNotes.length} documents générés</p>
        </div>
        
        <Dialog open={isCreating} onOpenChange={val => {
          setIsCreating(val);
          if (!val) setEditingNoteId(null);
        }}>
          <DialogTrigger asChild>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" /> Nouveau BL
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingNoteId ? 'Modifier le Bon de Livraison' : 'Créer un Bon de Livraison'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              
              <div className="grid grid-cols-2 gap-4 bg-muted p-4 rounded-lg">
                <div>
                  <Label>Client *</Label>
                  <Select value={selectedClientId} onValueChange={id => {
                    setSelectedClientId(id);
                    setSelectedSheetId('');
                  }}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.company ? `${c.name} - ${c.company}` : c.name} {c.parentId ? '(Sous-client)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={new Date().toISOString().split('T')[0]} readOnly disabled />
                </div>
                
                {selectedClientId && clientSheets.some(s => s.clientId === selectedClientId) && (
                  <div className="col-span-2">
                    <Label className="text-secondary-foreground font-bold">Lier à une Fiche Chantier/Matériel (Optionnel)</Label>
                    <Select value={selectedSheetId} onValueChange={handleSheetChange}>
                      <SelectTrigger className="border-accent"><SelectValue placeholder="Aucune (Mode manuel)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucune (Mode manuel)</SelectItem>
                        {clientSheets.filter(s => s.clientId === selectedClientId).map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">Articles</h3>
                  <Button variant="outline" size="sm" onClick={addItemRow}>
                    <Plus className="h-4 w-4 mr-1"/> Ajouter un produit
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={item.id} className="flex gap-2 items-end border p-3 rounded bg-card relative">
                       <Button variant="ghost" size="icon" className="absolute top-1 right-1 text-destructive h-6 w-6" onClick={() => removeItem(index)}>
                          <Trash2 className="h-4 w-4" />
                       </Button>
                       <div className="flex-1">
                         <Label className="text-xs">Produit</Label>
                         <Select value={item.productId} onValueChange={v => updateItem(index, { productId: v })}>
                           <SelectTrigger><SelectValue placeholder="Choisir un produit..." /></SelectTrigger>
                           <SelectContent>
                             {products.map(p => (
                               <SelectItem key={p.id} value={p.id}>
                                 {p.reference} - {p.name} ({p.quantity} en stock)
                               </SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       </div>
                       <div className="w-24">
                         <Label className="text-xs">Qté</Label>
                         <Input type="number" min="1" value={item.quantity || 1} onChange={e => updateItem(index, { quantity: Number(e.target.value) })} />
                       </div>
                       <div className="w-32">
                         <Label className="text-xs">Prix Unit (HT)</Label>
                         <Input type="number" step="0.001" value={item.unitPrice || 0} onChange={e => updateItem(index, { unitPrice: Number(e.target.value) })} disabled={!item.productId} />
                       </div>
                       <div className="w-20">
                         <Label className="text-xs">Remise %</Label>
                         <Input type="number" min="0" max="100" value={item.discount || 0} onChange={e => updateItem(index, { discount: Number(e.target.value) })} />
                       </div>
                       <div className="w-24">
                         <Label className="text-xs">TVA %</Label>
                         <Select value={String(item.vat || 19)} onValueChange={v => updateItem(index, { vat: Number(v) })}>
                           <SelectTrigger><SelectValue /></SelectTrigger>
                           <SelectContent>
                             <SelectItem value="7">7%</SelectItem>
                             <SelectItem value="13">13%</SelectItem>
                             <SelectItem value="19">19%</SelectItem>
                           </SelectContent>
                         </Select>
                       </div>
                       <div className="w-32 flex flex-col justify-end pb-2">
                          <span className="text-xs font-bold w-full text-right">
                             {item.totalHT ? item.totalHT.toFixed(3) : '0.000'} DT
                          </span>
                       </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded">
                       Aucun article ajouté.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t gap-12">
                <div className="w-48 space-y-2">
                  <div className="flex justify-between text-sm">
                     <span className="text-muted-foreground">Total HT:</span>
                     <span className="font-medium">{totals.subTotalHT.toFixed(3)} DT</span>
                  </div>
                  <div className="flex justify-between text-sm">
                     <span className="text-muted-foreground">Remise:</span>
                     <span className="font-medium text-green-600">-{totals.totalDiscount.toFixed(3)} DT</span>
                  </div>
                  <div className="flex justify-between text-sm">
                     <span className="text-muted-foreground">TVA:</span>
                     <span className="font-medium">{totals.totalVat.toFixed(3)} DT</span>
                  </div>
                  <div className="flex justify-between text-sm items-center">
                     <span className="text-muted-foreground">Timbre:</span>
                     <Input type="number" step="0.100" className="w-24 h-7 text-right" value={stampVal} onChange={e => setStampVal(Number(e.target.value))} />
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                     <span>TTC:</span>
                     <span>{totals.totalTTC.toFixed(3)} DT</span>
                  </div>
                </div>
              </div>

               {/* Payment / Acompte Section */}
               <div className="border-t pt-4 mt-4">
                 <h3 className="font-semibold mb-3 text-sm">💰 Paiement</h3>
                 <div className="flex flex-col gap-3 max-w-md">
                   <label className="flex items-center gap-2 cursor-pointer">
                     <input
                       type="checkbox"
                       checked={isPaid}
                       onChange={e => {
                         setIsPaid(e.target.checked);
                         if (e.target.checked) setAcompte(0);
                       }}
                       className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                     />
                     <span className="text-sm font-medium">Marquer comme payé intégralement</span>
                     {isPaid && <CheckCircle2 className="h-4 w-4 text-success" />}
                   </label>

                   {!isPaid && (
                     <div className="flex items-center gap-4">
                       <div className="flex-1">
                         <Label className="text-xs text-muted-foreground">Acompte versé (DT)</Label>
                         <Input
                           type="number"
                           step="0.001"
                           min={0}
                           max={totals.totalTTC}
                           value={acompte}
                           onChange={e => setAcompte(Number(e.target.value))}
                           placeholder="0.000"
                         />
                       </div>
                       {acompte > 0 && (
                         <div className="flex-1 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                           <span className="text-xs text-muted-foreground block">Reste à payer</span>
                           <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                             {Math.max(0, totals.totalTTC - acompte).toFixed(3)} DT
                           </span>
                         </div>
                       )}
                     </div>
                   )}
                 </div>
               </div>

            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsCreating(false)}>Annuler</Button>
              <Button onClick={handleSave} className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={items.length === 0}>
                Générer et Déduire Stock
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-10" placeholder="Rechercher par N° BL..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid gap-3">
         {filteredNotes.length === 0 ? (
           <Card className="glass-card">
             <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
               <FileText className="h-12 w-12 mb-4 opacity-40" />
               <p>Aucun bon de livraison trouvé</p>
             </CardContent>
           </Card>
         ) : (
           filteredNotes.map(n => {
             const c = clients.find(cl => cl.id === n.clientId);
             return (
               <Card key={n.id} className="glass-card hover:shadow-md transition-shadow">
                 <CardContent className="flex items-center justify-between py-4 px-6">
                   <div>
                     <p className="font-semibold flex items-center gap-2">
                       <FileText className="h-4 w-4 text-accent" />
                       BL N° {n.noteNumber}
                     </p>
                     <p className="text-xs text-muted-foreground mt-1">
                       {format(new Date(n.date), "dd/MM/yyyy 'à' HH:mm", { locale: fr })} · {c ? c.name : 'Client Inconnu'} · {n.items.length} article(s)
                     </p>
                   </div>
                   <div className="flex items-center gap-4">
                      {/* Payment badge */}
                      {n.paid ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                          <CheckCircle2 className="h-3 w-3" /> Payé
                        </span>
                      ) : n.acompte && n.acompte > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          <Clock className="h-3 w-3" /> Acompte: {n.acompte.toFixed(3)} DT
                        </span>
                      ) : null}
                     <span className="font-bold text-accent">{n.totalTTC.toFixed(3)} DT</span>
                     <Button size="icon" variant="ghost" onClick={() => handleEdit(n)}>
                       <Edit className="h-4 w-4" />
                     </Button>
                     <Button size="sm" variant="outline" onClick={() => doPrint(n)}>
                       <Printer className="h-4 w-4 mr-2" /> Imprimer
                     </Button>
                     <Button size="icon" variant="ghost" className="text-destructive" onClick={() => {
                        store.deleteDeliveryNote(n.id);
                        setDeliveryNotes(store.getDeliveryNotes());
                        toast.success('Brouillon BL supprimé');
                     }}>
                       <Trash2 className="h-4 w-4"/>
                     </Button>
                   </div>
                 </CardContent>
               </Card>
             );
           })
         )}
      </div>

    </div>
  );
}
